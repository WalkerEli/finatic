"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type LoginResponse = {
  message?: string;
};

// Development-only preview. Set to false when you want to test the real API.
const USE_MOCK_LOGIN = process.env.NODE_ENV === "development";
const DEMO_EMAIL = "demo@finatic.test";
const DEMO_PASSWORD = "Finatic123!";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isDemoSignedIn, setIsDemoSignedIn] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (USE_MOCK_LOGIN) {
        await new Promise((resolve) => setTimeout(resolve, 450));

        if (
          email.trim().toLowerCase() !== DEMO_EMAIL ||
          password !== DEMO_PASSWORD
        ) {
          throw new Error("Incorrect demo credentials. Use the test account shown below.");
        }

        setIsDemoSignedIn(true);
        return;
      }

      // Our Next.js API route will forward these credentials to the backend.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data: LoginResponse = await response
        .json()
        .catch(() => ({} as LoginResponse));

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("The login API has not been connected yet.");
        }
        throw new Error(
          response.status === 401
            ? "Incorrect email or password. Please try again."
            : data.message || "Unable to sign in right now. Please try again."
        );
      }

      // Only navigate after the server confirms successful authentication.
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A network error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:flex lg:items-center lg:justify-center lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-sky-700 p-12 text-white lg:flex">
          <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />

          <div className="relative">
            <div className="mb-12 inline-flex items-center rounded-2xl bg-white p-2 shadow-sm">
              <Image
                src="/assets/Finatic_Logo.png"
                alt="Finatic"
                width={100}
                height={100}
                className="h-20 w-20 object-contain"
                priority
              />
            </div>
            <p className="mb-3 text-sm font-semibold tracking-widest text-cyan-200 uppercase">
              Your finances, simplified
            </p>
            <h1 className="max-w-sm text-4xl leading-tight font-bold tracking-tight">
              Take control of your financial future.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-blue-100">
              Keep your spending, savings, and investments organized in one place.
            </p>
          </div>

          <div className="relative mt-20 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-lg font-semibold">One dashboard. More clarity.</p>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Understand where your money goes and make decisions with confidence.
            </p>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-14 lg:py-20">
          <div className="mb-8 lg:hidden">
            <Image
              src="/assets/Finatic_Logo.png"
              alt="Finatic"
              width={110}
              height={110}
              className="h-24 w-24 object-contain"
              priority
            />
          </div>

          <p className="text-sm font-semibold text-blue-700">WELCOME BACK</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Sign in to Finatic
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Enter your account details to access your dashboard.
          </p>

          {USE_MOCK_LOGIN && (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Development demo — no database needed</p>
              <p className="mt-2 break-all">
                Email: <span className="font-mono">{DEMO_EMAIL}</span>
              </p>
              <p className="mt-1">
                Password: <span className="font-mono">{DEMO_PASSWORD}</span>
              </p>
              {!isDemoSignedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail(DEMO_EMAIL);
                    setPassword(DEMO_PASSWORD);
                    setError("");
                  }}
                  className="mt-3 font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                >
                  Fill demo credentials
                </button>
              )}
            </div>
          )}

          {isDemoSignedIn && USE_MOCK_LOGIN ? (
            <div
              role="status"
              className="mt-9 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950"
            >
              <h3 className="text-xl font-bold">Demo sign-in successful!</h3>
              <p className="mt-3 text-sm leading-6">
                The login form is working in test mode. No database was queried,
                and no real session was created.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-5 w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                View demo dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDemoSignedIn(false);
                  setPassword("");
                  setError("");
                }}
                className="mt-4 w-full text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Test another sign-in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-9 space-y-6">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-4 text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <p className="mt-9 text-center text-xs leading-5 text-slate-400">
            {USE_MOCK_LOGIN
              ? "Demo mode is for local UI testing only; it does not authenticate users."
              : "Your credentials are sent to the server for secure verification."}
          </p>
        </section>
      </div>
    </div>
  );
}
