"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

// UI testing only. Replace with false when the backend is ready.
const USE_MOCK_SIGNUP = process.env.NODE_ENV === "development";

type SignupResponse = {
  message?: string;
};

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /\d/.test(password) },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please complete your name and email address.");
      return;
    }

    if (!passwordRules.every((rule) => rule.passed)) {
      setError("Your password does not meet all the requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (USE_MOCK_SIGNUP) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const data: SignupResponse = await response
          .json()
          .catch(() => ({} as SignupResponse));

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("The sign-up API has not been connected yet.");
          }
          if (response.status === 409) {
            throw new Error("An account with that email address already exists.");
          }
          throw new Error(data.message || "Unable to create an account. Please try again.");
        }
      }


      setPassword("");
      setConfirmPassword("");
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:flex lg:items-center lg:justify-center lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-2">
        {/* Match the branding on app/login/page.tsx. */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-sky-700 p-12 text-white lg:flex">
          <div className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />

          <div className="relative">
            <Link
              href="/"
              aria-label="Finatic home"
              className="mb-12 inline-flex items-center rounded-2xl bg-white p-2 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <Image
                src="/assets/Finatic_Logo.png"
                alt="Finatic"
                width={100}
                height={100}
                className="h-20 w-20 object-contain"
                priority
              />
            </Link>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-200">
              Start your financial journey
            </p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight tracking-tight">
              Build better money habits with Finatic.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-blue-100">
              Bring budgeting, savings, and investing into one simple dashboard.
            </p>
          </div>

          <div className="relative mt-16 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-lg font-semibold">Your money, all in one place.</p>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Set goals, follow your spending, and keep the bigger picture in view.
            </p>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-14 lg:py-16">
          <div className="mb-7 lg:hidden">
            <Link href="/" aria-label="Finatic home" className="inline-block">
              <Image
                src="/assets/Finatic_Logo.png"
                alt="Finatic"
                width={110}
                height={110}
                className="h-24 w-24 object-contain"
                priority
              />
            </Link>
          </div>

          <p className="text-sm font-semibold uppercase text-blue-700">
            Get started
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Create your account
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your financial dashboard starts here.
          </p>

          {USE_MOCK_SIGNUP && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Development preview — no database needed</p>
              <p className="mt-1 leading-6">
                This form tests registration and validation only. It does not save
                an account or create a login session.
              </p>
            </div>
          )}

          {isComplete ? (
            <div role="status" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
              <h3 className="text-xl font-bold">
                {USE_MOCK_SIGNUP ? "Sign-up form tested successfully!" : "Account created!"}
              </h3>
              <p className="mt-3 text-sm leading-6">
                {USE_MOCK_SIGNUP
                  ? "Your information passed validation. No user was saved, so your new email and password will not work on the demo login page yet."
                  : "Your registration was accepted. You can now sign in with your account."}
              </p>
              <Link
                href="/login"
                className="mt-5 block rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                {USE_MOCK_SIGNUP ? "Try the existing demo login" : "Go to login"}
              </Link>
              <Link
                href="/"
                className="mt-4 block text-center text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                View dashboard
              </Link>
              {USE_MOCK_SIGNUP && (
                <button
                  type="button"
                  onClick={() => setIsComplete(false)}
                  className="mt-4 w-full text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Test another sign-up
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="signup-first-name" className="mb-2 block text-sm font-semibold text-slate-700">
                    First name
                  </label>
                  <input
                    id="signup-first-name"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    maxLength={80}
                    required
                    disabled={isSubmitting}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label htmlFor="signup-last-name" className="mb-2 block text-sm font-semibold text-slate-700">
                    Last name
                  </label>
                  <input
                    id="signup-last-name"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    maxLength={80}
                    required
                    disabled={isSubmitting}
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <input
                  id="signup-email"
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
                <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    required
                    disabled={isSubmitting}
                    aria-describedby="signup-password-rules"
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
                <ul id="signup-password-rules" className="mt-3 grid gap-x-3 gap-y-1 sm:grid-cols-2">
                  {passwordRules.map((rule) => (
                    <li
                      key={rule.label}
                      className={`text-xs ${rule.passed ? "text-emerald-700" : "text-slate-500"}`}
                    >
                      <span aria-hidden="true">{rule.passed ? "✓" : "○"}</span> {rule.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    required
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute inset-y-0 right-4 text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          {!isComplete && (
            <p className="mt-7 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-900">
                Log in
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
