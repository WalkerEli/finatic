import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        const db = await getDb();
        const user = await db.get('SELECT * FROM Users WHERE Email = ?', [email]);

        if (!user) {
            return NextResponse.json({ message: 'Incorrect email or password' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Incorrect email or password' }, { status: 401 });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.UserID, email: user.Email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });

        // Set JWT in httpOnly cookie for security
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
