// import { NextResponse } from 'next/server';
// import bcrypt from 'bcryptjs';
// import { getDb } from '@/lib/db';

// export async function POST(request: Request) {
//     try {
//         const { firstName, lastName, email, password } = await request.json();

//         if (!firstName || !lastName || !email || !password) {
//             return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
//         }

//         const db = await getDb();

//         // Check if user already exists
//         const existingUser = await db.get('SELECT UserID FROM Users WHERE Email = ?', [email]);
//         if (existingUser) {
//             return NextResponse.json({ message: 'An account with that email already exists' }, { status: 409 });
//         }

//         // Hash password
//         const salt = await bcrypt.genSalt(10);
//         const passwordHash = await bcrypt.hash(password, salt);

//         // Transaction for atomic insert (User + Profile)
//         await db.exec('BEGIN TRANSACTION');
//         try {
//             const result = await db.run(
//                 'INSERT INTO Users (Username, Email, PasswordHash) VALUES (?, ?, ?)',
//                 [email.split('@')[0], email, passwordHash]
//             );

//             const userId = result.lastID;

//             await db.run(
//                 'INSERT INTO Profiles (UserID, FirstName, LastName) VALUES (?, ?, ?)',
//                 [userId, firstName, lastName]
//             );

//             await db.exec('COMMIT');
//         } catch (err) {
//             await db.exec('ROLLBACK');
//             throw err;
//         }

//         return NextResponse.json({ message: 'Account created successfully' }, { status: 201 });
//     } catch (error) {
//         console.error('Signup error:', error);
//         return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
//     }
// }



import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";

// SQLite requires the Node.js runtime.
export const runtime = "nodejs";

class DuplicateEmailError extends Error {}

// Detect unique-constraint errors from SQLite.
function isUniqueUserConstraint(error: unknown): boolean {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed: Users\.(Email|Username)/i.test(
      error.message
    )
  );
}

export async function POST(request: Request) {
  // Parse incoming JSON safely.
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Please provide valid registration information." },
      { status: 400 }
    );
  }

  const fields = body as Record<string, unknown>;

  // Validate incoming data types.
  if (
    typeof fields.firstName !== "string" ||
    typeof fields.lastName !== "string" ||
    typeof fields.email !== "string" ||
    typeof fields.password !== "string"
  ) {
    return NextResponse.json(
      {
        message:
          "First name, last name, email, and password are required.",
      },
      { status: 400 }
    );
  }

  // Normalize account information.
  const firstName = fields.firstName.trim();
  const lastName = fields.lastName.trim();
  const email = fields.email.trim().toLowerCase();

  // Do not trim passwords.
  const password = fields.password;

  // Validate names.
  if (
    !firstName ||
    !lastName ||
    firstName.length > 80 ||
    lastName.length > 80
  ) {
    return NextResponse.json(
      { message: "First and last names must be 1–80 characters." },
      { status: 400 }
    );
  }

  // Validate email.
  const validEmail =
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!validEmail) {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // Validate password strength.
  const strongEnough =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  if (!strongEnough) {
    return NextResponse.json(
      {
        message:
          "Password must be at least 8 characters and include " +
          "uppercase, lowercase, and a number.",
      },
      { status: 400 }
    );
  }

  // bcrypt only handles 72 UTF-8 bytes.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return NextResponse.json(
      { message: "Password must be 72 UTF-8 bytes or fewer." },
      { status: 400 }
    );
  }

  try {
    // Hash password before starting a transaction.
    const passwordHash = await bcrypt.hash(password, 12);

    // Create the account and profile in one transaction.
    await withTransaction(async (db) => {
      // Check whether email is registered.
      const existing = await db.get<{ UserID: number }>(
        "SELECT UserID FROM Users WHERE Email = ? COLLATE NOCASE",
        [email]
      );

      if (existing) {
        throw new DuplicateEmailError("Email already registered");
      }

      // Generate username from email address.
      const base =
        email
          .split("@")[0]
          .replace(/[^a-z0-9._-]/g, "")
          .slice(0, 32) || "user";

      let username = base;
      let available = false;

      // Generate a unique username if necessary.
      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) {
          username = `${base}_${randomBytes(4).toString("hex")}`;
        }

        const match = await db.get(
          "SELECT 1 FROM Users WHERE Username = ? COLLATE NOCASE",
          [username]
        );

        if (!match) {
          available = true;
          break;
        }
      }

      if (!available) {
        throw new Error("Unable to generate an available username");
      }

      // Insert user into database.
      const result = await db.run(
        `INSERT INTO Users (Username, Email, PasswordHash)
         VALUES (?, ?, ?)`,
        [username, email, passwordHash]
      );

      if (typeof result.lastID !== "number") {
        throw new Error("User insert did not return an ID");
      }

      // Create associated profile.
      await db.run(
        `INSERT INTO Profiles (UserID, FirstName, LastName)
         VALUES (?, ?, ?)`,
        [result.lastID, firstName, lastName]
      );
    });

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json(
        {
          message:
            "An account with that email address already exists.",
        },
        { status: 409 }
      );
    }

    if (isUniqueUserConstraint(error)) {
      return NextResponse.json(
        {
          message:
            "This account conflicts with an existing registration.",
        },
        { status: 409 }
      );
    }

    // Avoid exposing database errors or sensitive information.
    console.error("Signup failed:", error);

    return NextResponse.json(
      { message: "Unable to create an account right now." },
      { status: 500 }
    );
  }
}
