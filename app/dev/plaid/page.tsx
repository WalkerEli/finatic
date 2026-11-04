
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { withDb } from "@/lib/db";
import PlaidSandboxTester from "@/app/components/plaid-sandbox-tester";

export const dynamic = "force-dynamic";

type AccountRow = {
  AccountID: number;
  InstitutionName: string | null;
  AccountName: string;
  AccountLast4: string | null;
};

export default async function PlaidSandboxPage() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAID_ENV !== "sandbox"
  ) {
    notFound();
  }

  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session) {
    redirect("/login");
  }

  if (session.demo) {
    redirect("/profile");
  }

  const accounts = await withDb((db) =>
    db.all<AccountRow[]>(
      `SELECT
         l.AccountID,
         p.InstitutionName,
         l.AccountName,
         b.AccountLast4
       FROM PlaidAccountLinks l
       JOIN PlaidItems p
         ON p.ItemID = l.ItemID
         AND p.UserID = l.UserID
       JOIN BankAccounts b
         ON b.AccountID = l.AccountID
         AND b.UserID = l.UserID
       WHERE l.UserID = ?
         AND p.Status = 'active'
         AND b.AccountType IN ('depository', 'credit')
         AND COALESCE(
           l.CurrencyCode,
           l.UnofficialCurrencyCode,
           'USD'
         ) = 'USD'
       ORDER BY p.InstitutionName, l.AccountName`,
      [session.userId]
    )
  );

  const sandboxAccounts = accounts.map((account) => ({
    accountId: account.AccountID,
    institution:
      account.InstitutionName || "Connected Bank",
    name: account.AccountName,
    mask: account.AccountLast4,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Back to Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            Development Tools
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Plaid Sandbox Testing
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Test Finatic using transactions created through
            Plaid's Sandbox API.
          </p>
        </div>

        {sandboxAccounts.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-lg font-bold">
              No eligible bank accounts found
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Connect a Sandbox checking, savings, or credit
              account before testing transactions.
            </p>

            <Link
              href="/profile"
              className="mt-5 inline-block font-semibold text-blue-700"
            >
              Connect Bank Account
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <PlaidSandboxTester accounts={sandboxAccounts} />
          </div>
        )}
      </div>
    </main>
  );
}
