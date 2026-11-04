import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { firstName, lastName, email, password } = await request.json();

        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
        }

        const db = await getDb();

        // Check if user already exists
        const existingUser = await db.get('SELECT UserID FROM Users WHERE Email = ?', [email]);
        if (existingUser) {
            return NextResponse.json({ message: 'An account with that email already exists' }, { status: 409 });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Transaction for atomic insert (User + Profile)
        await db.exec('BEGIN TRANSACTION');
        try {
            const result = await db.run(
                'INSERT INTO Users (Username, Email, PasswordHash) VALUES (?, ?, ?)',
                [email.split('@')[0], email, passwordHash]
            );

            const userId = result.lastID;

            await db.run(
                'INSERT INTO Profiles (UserID, FirstName, LastName) VALUES (?, ?, ?)',
                [userId, firstName, lastName]
            );

            await db.exec('COMMIT');
        } catch (err) {
            await db.exec('ROLLBACK');
            throw err;
        }

        return NextResponse.json({ message: 'Account created successfully' }, { status: 201 });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
