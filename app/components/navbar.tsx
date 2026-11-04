import FinaticLogo from "./finac-logo";
import LogoutButton from "./logout-button";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import Link from "next/link";

export default async function Navbar() {
  // Retrieve the user's authentication cookie.
  const token = (await cookies()).get(COOKIE_NAME)?.value;

  // Verify whether the user has a valid session.
  const isAuthenticated = Boolean(verifySession(token));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        {/* Logo links to the dashboard */}
        <Link
          href="/"
          aria-label="Finatic — dashboard"
          className="flex shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <FinaticLogo
            alt="Finatic"
            width={88}
            height={88}
            priority
            className="h-[72px] w-[72px] object-contain sm:h-[80px] sm:w-[80px]"
          />
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-3"
          >
            Dashboard
          </Link>

          {isAuthenticated ? (
            // Navigation for logged-in users
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="rounded-lg px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                Profile
              </Link>

              <LogoutButton />
            </div>
          ) : (
            // Navigation for visitors
            <>
              <Link
                href="/login"
                className="rounded-lg px-2 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-3"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-4"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
