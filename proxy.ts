import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

// Clear expired or invalid authentication cookies.
function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

// Main Next.js 16 Proxy function.
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Retrieve authentication token.
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Verify the user's session.
  const session = verifySession(token);

  // Handle public pages (login and signup).
  if (PUBLIC_ROUTES.has(pathname)) {
    // Redirect authenticated users to dashboard.
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const response = NextResponse.next();

    // Clear invalid authentication cookies.
    return token ? clearAuthCookie(response) : response;
  }

  // Redirect unauthenticated users to login.
  if (!session) {
    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    return token ? clearAuthCookie(response) : response;
  }

  // Allow authenticated users to access protected pages.
  return NextResponse.next();
}

// Apply authentication to pages, excluding APIs and static files.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets|.*\\..*).*)",
  ],
};
