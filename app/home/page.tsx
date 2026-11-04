import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/plaid-data";
import {
  formatTransactionAmount,
  formatTransactionDate,
  getMerchantName,
  getTransactionCategory,
} from "@/app/transactions/format";

export const dynamic = "force-dynamic";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatBalance(
  amount: number | null,
  currency: string
) {
  if (amount === null) return "Unavailable";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default async function Home() {
  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session) redirect("/login");

  if (session.demo) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">
          Your dashboard
        </h1>

        <p className="mt-4 text-slate-600">
          Sign in with a registered account to see
          connected bank data.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-block font-semibold text-blue-700"
        >
          Go to login
        </Link>
      </main>
    );
  }

  let snapshot;

  try {
    snapshot = await getFinancialSnapshot(session.userId);
  } catch (error) {
    console.error("Dashboard data failed:", error);

    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900">
          Your dashboard
        </h1>

        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          Finatic could not load your bank information.
          Check your Plaid configuration and try
          refreshing the page.
        </p>
      </main>
    );
  }

  if (!snapshot.connected) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome to Finatic
          </h1>

          <p className="mt-4 text-slate-600">
            Connect a bank account to see balances,
            transactions, and spending.
          </p>

          <Link
            href="/profile"
            className="mt-7 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Connect a bank account
          </Link>
        </div>
      </main>
    );
  }

  const overview = [
    {
      label: "Net balance",
      amount: snapshot.netBalance,
      detail: "USD assets minus debts",
      color: "text-blue-800",
    },
    {
      label: "Assets",
      amount: snapshot.cashBalance,
      detail: "Linked USD asset accounts",
      color: "text-slate-900",
    },
    {
      label: "Debts",
      amount: snapshot.debtBalance,
      detail: "Linked USD credit and loans",
      color: "text-slate-900",
    },
    {
      label: "Money in",
      amount: snapshot.monthlyIncome,
      detail: "This month, excluding transfers",
      color: "text-emerald-700",
    },
    {
      label: "Spending",
      amount: snapshot.monthlySpending,
      detail: "This month, excluding transfers",
      color: "text-amber-700",
    },
  ];

  const recentTransactions =
    snapshot.history.transactions.slice(0, 5);

  const nonUsdAccounts = snapshot.accounts.some(
    (account) => account.currency !== "USD"
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              Finatic overview
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Your dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Data from your connected Plaid{" "}
              {snapshot.source === "plaid-sandbox"
                ? "Sandbox"
                : "Production"}{" "}
              accounts.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Sync and refresh
          </a>
        </header>

        {snapshot.warnings.map((warning) => (
          <p
            key={warning}
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
          >
            {warning}
          </p>
        ))}

        {nonUsdAccounts && (
          <p className="rounded-xl bg-blue-50 px-5 py-3 text-sm text-blue-900">
            Summary totals include USD accounts only.
            Other currencies are shown separately below.
          </p>
        )}

        <section
          aria-label="Financial summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {overview.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {item.label}
              </p>

              <p className={`mt-4 text-2xl font-bold ${item.color}`}>
                {usd.format(item.amount)}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {item.detail}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Linked accounts
            </h2>

            <Link
              href="/profile"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Manage accounts
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.accounts.map((account) => (
              <div
                key={account.accountId}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {account.institution}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {account.name}
                  {account.mask
                    ? ` ••••${account.mask}`
                    : ""}
                </p>

                <p className="mt-3 text-xl font-bold">
                  {formatBalance(
                    account.currentBalance,
                    account.currency
                  )}
                </p>

                <p className="mt-1 text-xs capitalize text-slate-500">
                  {account.subtype || account.type} current balance
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold">
                Recent transactions
              </h2>

              <Link
                href="/transactions"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                View all
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="px-6 py-10 text-sm text-slate-500">
                No Plaid transactions available yet.
                Try syncing again shortly.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentTransactions.map((transaction) => (
                  <li
                    key={transaction.transaction_id}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {getMerchantName(transaction)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {getTransactionCategory(transaction)}
                        {" · "}
                        {formatTransactionDate(transaction.date)}
                        {transaction.pending
                          ? " · Pending"
                          : ""}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 text-sm font-semibold ${
                        transaction.amount < 0
                          ? "text-emerald-700"
                          : "text-slate-900"
                      }`}
                    >
                      {formatTransactionAmount(transaction)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">
              Spending by category
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Posted transactions this month
            </p>

            {snapshot.spendingByCategory.length === 0 ? (
              <p className="mt-7 text-sm text-slate-500">
                No categorized spending yet.
              </p>
            ) : (
              <ul className="mt-6 space-y-5">
                {snapshot.spendingByCategory
                  .slice(0, 6)
                  .map((category) => (
                    <li key={category.name}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          {category.name}
                        </span>

                        <span>
                          {usd.format(category.amount)}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${
                              snapshot.monthlySpending > 0
                                ? (category.amount /
                                    snapshot.monthlySpending) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>

        <p className="pb-2 text-center text-xs text-slate-500">
          Financial totals come from Plaid. Budgets and
          savings goals are not configured yet.
          Balances may be cached by the financial institution.
        </p>
      </div>
    </main>
  );
}
