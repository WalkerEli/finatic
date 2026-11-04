// import { NextResponse } from 'next/server';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { getDb } from '@/lib/db';

// const JWT_SECRET = process.env.JWT_SECRET;

// if (!JWT_SECRET) {
//     throw new Error('JWT_SECRET is not defined in environment variables');
// }

// export async function POST(request: Request) {
//     try {
//         const { email, password } = await request.json();

//         if (!email || !password) {
//             return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
//         }

//         const db = await getDb();
//         const user = await db.get('SELECT * FROM Users WHERE Email = ?', [email]);

//         if (!user) {
//             return NextResponse.json({ message: 'Incorrect email or password' }, { status: 401 });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
//         if (!isPasswordValid) {
//             return NextResponse.json({ message: 'Incorrect email or password' }, { status: 401 });
//         }

//         // Generate JWT
//         const token = jwt.sign(
//             { userId: user.UserID, email: user.Email },
//             JWT_SECRET,
//             { expiresIn: '24h' }
//         );

//         const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });

//         // Set JWT in httpOnly cookie for security
//         response.cookies.set('auth_token', token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//             sameSite: 'lax',
//             maxAge: 60 * 60 * 24, // 24 hours
//             path: '/',
//         });

//         return response;
//     } catch (error) {
//         console.error('Login error:', error);
//         return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
//     }
// }



import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  getJwtSecret,
  SESSION_MAX_AGE_SECONDS,
  COOKIE_NAME,
} from "@/lib/auth";

export const runtime = "nodejs";

const INVALID_LOGIN = "Incorrect email or password.";

type UserCredentials = {
  UserID: number;
  Email: string;
  PasswordHash: string;
};

export async function POST(request: Request) {
  // Validate incoming JSON
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Please provide a valid email and password." },
      { status: 400 }
    );
  }

  const fields = body as Record<string, unknown>;

  if (
    typeof fields.email !== "string" ||
    typeof fields.password !== "string"
  ) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 }
    );
  }

  const email = fields.email.trim().toLowerCase();
  const password = fields.password;

  const validEmail =
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (
    !validEmail ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return NextResponse.json(
      { message: INVALID_LOGIN },
      { status: 401 }
    );
  }

  // Ensure JWT authentication is configured
  const secret = getJwtSecret();

  if (!secret) {
    console.error("JWT_SECRET missing. Run: npm run setup:dev");

    return NextResponse.json(
      {
        message:
          "Authentication setup is incomplete. Run npm run setup:dev.",
      },
      { status: 500 }
    );
  }

  // Development-only demo account
  const isDemoLogin =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" &&
    email === DEMO_EMAIL &&
   password === DEMO_PASSWORD;

  try {
    // Demo login bypasses SQLite.
    // Registered users are authenticated against SQLite.
    const user = isDemoLogin
      ? {
          UserID: 1,
          Email: DEMO_EMAIL,
          PasswordHash: "",
        }
      : await withDb((db) =>
          db.get<UserCredentials>(
            `SELECT UserID, Email, PasswordHash
             FROM Users
             WHERE Email = ? COLLATE NOCASE
             LIMIT 1`,
            [email]
          )
        );

    // Verify the account and password
    if (
      !user ||
      (!isDemoLogin &&
        !(await bcrypt.compare(password, user.PasswordHash)))
    ) {
      return NextResponse.json(
        { message: INVALID_LOGIN },
        { status: 401 }
      );
    }

    // Generate a signed JWT session
    const token = jwt.sign(
      {
        userId: user.UserID,
        email: user.Email,
        ...(isDemoLogin ? { demo: true } : {}),
      },
      secret,
      {
        algorithm: "HS256",
        expiresIn: SESSION_MAX_AGE_SECONDS,
        issuer: "finatic",
        audience: "finatic-web",
      }
    );

    // Send successful response
    const response = NextResponse.json(
      { message: "Login successful" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    // Store JWT in a secure HTTP-only cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(
      "Login request failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { message: "Unable to sign in right now." },
      { status: 500 }
    );
  }
}
