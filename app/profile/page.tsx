
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { withDb } from "@/lib/db";
import ConnectedAccounts from "@/app/components/connected-accounts";

type ProfileRecord = {
  Username: string;
  Email: string;
  CreatedAt: string;
  FirstName: string | null;
  LastName: string | null;
  PhoneNumber: string | null;
  Currency: string | null;
};

type ProfilePageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const currencies = ["USD", "CAD", "EUR", "GBP"];

async function updateProfile(formData: FormData) {
  "use server";

  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = verifySession(token);

  if (!session) {
    redirect("/login");
  }

  if (session.demo) {
    redirect("/profile?error=demo");
  }

  const firstNameValue = formData.get("firstName");
  const lastNameValue = formData.get("lastName");
  const phoneValue = formData.get("phoneNumber");
  const currencyValue = formData.get("currency");

  if (
    typeof firstNameValue !== "string" ||
    typeof lastNameValue !== "string" ||
    typeof phoneValue !== "string" ||
    typeof currencyValue !== "string"
  ) {
    redirect("/profile?error=invalid");
  }

  const firstName = firstNameValue.trim();
  const lastName = lastNameValue.trim();
  const phoneNumber = phoneValue.trim();
  const currency = currencyValue;

  if (
    firstName.length < 1 ||
    firstName.length > 80 ||
    lastName.length < 1 ||
    lastName.length > 80 ||
    phoneNumber.length > 25 ||
    !/^[+()\d\s.-]*$/.test(phoneNumber) ||
    !currencies.includes(currency)
  ) {
    redirect("/profile?error=invalid");
  }

  try {
    await withDb(async (db) => {
      await db.run(
        `INSERT INTO Profiles
          (UserID, FirstName, LastName, PhoneNumber, Currency)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(UserID)
         DO UPDATE SET
           FirstName = excluded.FirstName,
           LastName = excluded.LastName,
           PhoneNumber = excluded.PhoneNumber,
           Currency = excluded.Currency`,
        [
          session.userId,
          firstName,
          lastName,
          phoneNumber || null,
          currency,
        ]
      );
    });
  } catch {
    redirect("/profile?error=save");
  }

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default async function Profile({
  searchParams,
}: ProfilePageProps) {
  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;

  const profile: ProfileRecord | null = session.demo
    ? {
        Username: "demo",
        Email: session.email,
        CreatedAt: "",
        FirstName: "Demo",
        LastName: "User",
        PhoneNumber: null,
        Currency: "USD",
      }
    : (await withDb((db) =>
        db.get<ProfileRecord>(
          `SELECT
             u.Username,
             u.Email,
             u.CreatedAt,
             p.FirstName,
             p.LastName,
             p.PhoneNumber,
             p.Currency
           FROM Users u
           LEFT JOIN Profiles p ON u.UserID = p.UserID
           WHERE u.UserID = ?
           LIMIT 1`,
          [session.userId]
        )
      )) ?? null;

  if (!profile) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">
          Account unavailable
        </h1>
        <p className="mt-3 text-slate-500">
          We could not find your account information.
          Please sign out and contact support.
        </p>
      </main>
    );
  }

  const fullName =
    [profile.FirstName, profile.LastName]
      .filter(Boolean)
      .join(" ") || "Finatic User";

  const initials =
    [profile.FirstName, profile.LastName]
      .filter(Boolean)
      .map((name) => name!.charAt(0).toUpperCase())
      .join("") || profile.Email.charAt(0).toUpperCase();

  const rawDate = profile.CreatedAt
    ? new Date(profile.CreatedAt.replace(" ", "T") + "Z")
    : null;

  const memberSince =
    rawDate && !Number.isNaN(rawDate.getTime())
      ? rawDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : "Not available";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Account Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your personal information, financial accounts,
            and preferences.
          </p>
        </div>

        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-blue-950 via-blue-800 to-sky-600 sm:h-36" />

          <div className="flex flex-col gap-4 px-6 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-5">
              <div className="-mt-9 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-3xl font-bold text-blue-800 shadow-md">
                {initials}
              </div>

              <div className="pb-1">
                <h2 className="text-2xl font-bold">
                  {fullName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {profile.Email}
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
              Active Account
            </span>
          </div>
        </section>

        {params.saved === "1" && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800"
          >
            Your profile has been updated successfully.
          </div>
        )}

        {params.error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700"
          >
            {params.error === "demo"
              ? "Demo accounts cannot be edited."
              : params.error === "invalid"
                ? "Please check your profile information and try again."
                : "Unable to save your changes right now."}
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <form action={updateProfile}>
              <fieldset disabled={session.demo}>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="border-b border-slate-100 pb-5">
                    <h2 className="text-xl font-bold">
                      Personal Information
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Update the information associated with your account.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        First Name
                      </label>

                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        required
                        maxLength={80}
                        defaultValue={profile.FirstName ?? ""}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="lastName"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Last Name
                      </label>

                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        required
                        maxLength={80}
                        defaultValue={profile.LastName ?? ""}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="phoneNumber"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Phone Number
                      </label>

                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        autoComplete="tel"
                        placeholder="(555) 123-4567"
                        maxLength={25}
                        defaultValue={profile.PhoneNumber ?? ""}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="border-b border-slate-100 pb-5">
                    <h2 className="text-xl font-bold">
                      Financial Preferences
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Customize your preferred account settings.
                    </p>
                  </div>

                  <div className="mt-6">
                    <label
                      htmlFor="currency"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Preferred Currency
                    </label>

                    <select
                      id="currency"
                      name="currency"
                      defaultValue={
                        currencies.includes(profile.Currency ?? "")
                          ? profile.Currency!
                          : "USD"
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="USD">
                        USD - US Dollar
                      </option>
                      <option value="CAD">
                        CAD - Canadian Dollar
                      </option>
                      <option value="EUR">
                        EUR - Euro
                      </option>
                      <option value="GBP">
                        GBP - British Pound
                      </option>
                    </select>

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Currency preferences are saved to your profile.
                      Dashboard currency conversion is not implemented yet.
                    </p>
                  </div>
                </section>

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </fieldset>
            </form>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Account Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your Finatic account information.
              </p>

              <div className="mt-5">
                <Detail
                  label="Username"
                  value={profile.Username}
                />

                <Detail
                  label="Email Address"
                  value={profile.Email}
                />

                <Detail
                  label="Member Since"
                  value={memberSince}
                />

                <Detail
                  label="Account Status"
                  value="Active"
                />

                <Detail
                  label="Account Type"
                  value={
                    session.demo
                      ? "Development Demo"
                      : "Personal"
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Security
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Keep your account credentials protected.
              </p>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Account Password
                </p>

                <p className="mt-2 text-sm tracking-widest text-slate-500">
                  ••••••••••••
                </p>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Password changes and account recovery will be
                  available in a future update.
                </p>
              </div>
            </section>

            <ConnectedAccounts
              userId={session.userId}
              demo={session.demo}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
