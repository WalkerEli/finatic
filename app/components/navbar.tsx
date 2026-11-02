import Image from "next/image";
import Link from "next/link";

type NavbarProps = {
  // Supply this from a verified server session once authentication is connected.
  // It defaults to false while we are testing without a backend.
  isAuthenticated?: boolean;
};

export default function Navbar({ isAuthenticated = false }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
      >
        {/* The logo returns to the dashboard at the root route. */}
        <Link
          href="/"
          aria-label="Finatic — dashboard"
          className="flex shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <Image
            src="/assets/Finatic_Logo.png"
            alt="Finatic"
            width={88}
            height={88}
            priority
            className="h-[72px] w-[72px] object-contain sm:h-[80px] sm:w-[80px]"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-3"
          >
            Dashboard
          </Link>

          {isAuthenticated ? (
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Signed in
            </span>
          ) : (
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
