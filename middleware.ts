import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
}

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;

    // Public routes that don't require authentication
    const isPublicRoute =
        request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/signup';

    if (!token && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isPublicRoute) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    try {
        if (token) {
            jwt.verify(token, JWT_SECRET);
        }
    } catch (e) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)'],
};
