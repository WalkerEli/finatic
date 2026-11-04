
import Link from "next/link";
import PlaidLinkButton from "@/app/components/plaid-link-button";
import { withDb } from "@/lib/db";

type AccountRow = {
  ItemID: number;
  AccountID: number | null;
  InstitutionName: string | null;
  AccountName: string | null;
  AccountType: string | null;
  AccountSubtype: string | null;
  AccountLast4: string | null;
  CurrentBalanceCents: number | null;
  CurrencyCode: string | null;
};

function formatBalance(
  cents: number | null,
  currency: string | null
): string {
  if (cents === null) {
    return "Not synced yet";
  }

  const amount = cents / 100;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || "USD"}`;
  }
}

export default async function ConnectedAccounts({
  userId,
  demo = false,
}: {
  userId: number;
  demo?: boolean;
}) {
  const accounts: AccountRow[] = demo
    ? []
    : await withDb((db) =>
        db.all<AccountRow[]>(
          `SELECT
             p.ItemID,
             l.AccountID,
             p.InstitutionName,
             l.AccountName,
             b.AccountType,
             l.AccountSubtype,
             b.AccountLast4,
             l.CurrentBalanceCents,
             COALESCE(
               l.CurrencyCode,
               l.UnofficialCurrencyCode
             ) AS CurrencyCode
           FROM PlaidItems p
           LEFT JOIN PlaidAccountLinks l
             ON l.ItemID = p.ItemID
             AND l.UserID = p.UserID
           LEFT JOIN BankAccounts b
             ON b.AccountID = l.AccountID
             AND b.UserID = p.UserID
           WHERE p.UserID = ?
             AND p.Status = 'active'
           ORDER BY
             p.InstitutionName,
             l.AccountName`,
          [userId]
        )
      );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Connected Accounts
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          View and manage financial accounts connected
          through Plaid.
        </p>
      </div>

      {accounts.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {accounts.map((account) => (
            <li
              key={`${account.ItemID}-${account.AccountID ?? "none"}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {account.InstitutionName || "Connected Bank"}
              </p>

              <p className="mt-2 text-sm text-slate-600">
                {account.AccountName || "Bank Connection"}
                {account.AccountLast4
                  ? ` ••••${account.AccountLast4}`
                  : ""}
              </p>

              {account.AccountType && (
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {account.AccountSubtype ||
                    account.AccountType}
                </p>
              )}

              {account.AccountID !== null && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500">
                    Current Balance
                  </p>

                  <p className="mt-1 text-lg font-bold text-blue-800">
                    {formatBalance(
                      account.CurrentBalanceCents,
                      account.CurrencyCode
                    )}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No Bank Accounts Connected
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Connect a bank to view balances and transactions.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {demo ? (
          <p className="text-sm text-amber-700">
            Sign in with a registered Finatic account
            to connect a bank.
          </p>
        ) : (
          <PlaidLinkButton />
        )}

        {accounts.length > 0 && (
          <Link
            href="/"
            className="block text-sm font-semibold text-blue-700 hover:underline"
          >
            View Bank Data on Dashboard
          </Link>
        )}
      </div>
    </section>
  );
}
