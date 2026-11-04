
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/plaid-data";
import TransactionsPanel from "@/app/transactions/transactions-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transactions | Finatic",
  description: "View transactions from connected bank accounts.",
};

export default async function TransactionsPage() {
  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session) {
    redirect("/login");
  }

  if (session.demo) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">
          Transactions
        </h1>

        <p className="mt-4 text-slate-600">
          Sign in with a registered account to view
          connected bank transactions.
        </p>
      </main>
    );
  }

  try {
    const snapshot = await getFinancialSnapshot(
      session.userId
    );

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Back to Dashboard
            </Link>

            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              Transactions
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View your transaction history across all
              connected financial accounts.
            </p>

            <p className="mt-2 text-xs font-medium text-blue-700">
              {snapshot.source === "plaid-sandbox"
                ? "Plaid Sandbox"
                : "Plaid Production"}
            </p>
          </div>

          <TransactionsPanel
            initialHistory={{
              ...snapshot.history,
              connected: snapshot.connected,
              warnings: snapshot.warnings,
            }}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Transactions page failed:", error);

    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">
          Transactions
        </h1>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800">
            Unable to load your transactions.
            Check your Plaid connection and try again.
          </p>
        </div>

        <Link
          href="/profile"
          className="mt-6 inline-block font-semibold text-blue-700"
        >
          Manage bank connections
        </Link>
      </main>
    );
  }
}
