
import "server-only";

import type { PlaidApi } from "plaid";
import { plaidClient } from "@/app/api/transactions/plaid-client";
import { decryptPlaidToken } from "@/lib/plaid-crypto";
import { withDb, withTransaction } from "@/lib/db";
import type { TransactionHistory } from "@/app/transactions/type";

type SyncResponse =
  Awaited<ReturnType<PlaidApi["transactionsSync"]>>["data"];

type PlaidTransaction = SyncResponse["added"][number];

type LinkedItem = {
  ItemID: number;
  AccessTokenEncrypted: string;
  TransactionsCursor: string | null;
};

type AccountRow = {
  account_id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  institution: string;
  balance_cents: number | null;
  currency: string | null;
};

type TransactionRow = {
  transaction_id: string;
  account_id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  pending: number;
  primary_category: string | null;
  detailed_category: string | null;
};

export type FinancialAccount = {
  accountId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  institution: string;
  currentBalance: number | null;
  currency: string;
};

export type FinancialSnapshot = {
  connected: boolean;
  source: "plaid-sandbox" | "plaid-production";
  accounts: FinancialAccount[];
  history: TransactionHistory;
  netBalance: number;
  cashBalance: number;
  debtBalance: number;
  monthlyIncome: number;
  monthlySpending: number;
  spendingByCategory: {
    name: string;
    amount: number;
  }[];
  warnings: string[];
};

function isMutationDuringPagination(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const response =
    "response" in error ? error.response : null;

  if (typeof response !== "object" || response === null) {
    return false;
  }

  const data = "data" in response ? response.data : null;

  return (
    typeof data === "object" &&
    data !== null &&
    "error_code" in data &&
    data.error_code ===
      "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"
  );
}

function currencyCents(
  value: number | null | undefined
): number | null {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.round(value * 100);
}

async function getChanges(
  client: PlaidApi,
  accessToken: string,
  startingCursor: string | null
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let cursor = startingCursor || undefined;

    let added: PlaidTransaction[] = [];
    let modified: PlaidTransaction[] = [];
    let removed: SyncResponse["removed"] = [];

    try {
      let pages = 0;

      while (true) {
        if (++pages > 100) {
          throw new Error("Plaid sync exceeded page limit.");
        }

        const response = await client.transactionsSync({
          access_token: accessToken,
          ...(cursor ? { cursor } : {}),
          count: 100,
        });

        added = added.concat(response.data.added);
        modified = modified.concat(response.data.modified);
        removed = removed.concat(response.data.removed);

        cursor = response.data.next_cursor || undefined;

        if (!response.data.has_more) {
          return {
            added,
            modified,
            removed,
            nextCursor: cursor || null,
          };
        }
      }
    } catch (error) {
      if (
        !isMutationDuringPagination(error) ||
        attempt === 2
      ) {
        throw error;
      }
    }
  }

  throw new Error("Plaid sync failed after retries.");
}

async function syncItem(
  client: PlaidApi,
  userId: number,
  item: LinkedItem
) {
  const accessToken = decryptPlaidToken(
    item.AccessTokenEncrypted
  );

  const [accounts, changes] = await Promise.all([
    client.accountsGet({
      access_token: accessToken,
    }),
    getChanges(
      client,
      accessToken,
      item.TransactionsCursor
    ),
  ]);

  await withTransaction(async (db) => {
    const current = await db.get<{
      TransactionsCursor: string | null;
    }>(
      `SELECT TransactionsCursor
       FROM PlaidItems
       WHERE ItemID = ?
         AND UserID = ?
         AND Status = 'active'`,
      [item.ItemID, userId]
    );

    if (
      !current ||
      current.TransactionsCursor !== item.TransactionsCursor
    ) {
      return;
    }

    for (const account of accounts.data.accounts) {
      await db.run(
        `UPDATE PlaidAccountLinks
         SET
           CurrentBalanceCents = ?,
           AvailableBalanceCents = ?,
           CreditLimitCents = ?,
           CurrencyCode = ?,
           UnofficialCurrencyCode = ?,
           BalanceLastUpdatedAt = CURRENT_TIMESTAMP
         WHERE ItemID = ?
           AND UserID = ?
           AND PlaidAccountID = ?`,
        [
          currencyCents(account.balances.current),
          currencyCents(account.balances.available),
          currencyCents(account.balances.limit),
          account.balances.iso_currency_code ?? null,
          account.balances.unofficial_currency_code ?? null,
          item.ItemID,
          userId,
          account.account_id,
        ]
      );
    }

    for (const transaction of [
      ...changes.added,
      ...changes.modified,
    ]) {
      await db.run(
        `INSERT INTO PlaidTransactions
         (
           ItemID,
           UserID,
           PlaidTransactionID,
           PlaidAccountID,
           Name,
           MerchantName,
           Amount,
           CurrencyCode,
           TransactionDate,
           Pending,
           CategoryPrimary,
           CategoryDetailed
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (ItemID, PlaidTransactionID)
         DO UPDATE SET
           PlaidAccountID = excluded.PlaidAccountID,
           Name = excluded.Name,
           MerchantName = excluded.MerchantName,
           Amount = excluded.Amount,
           CurrencyCode = excluded.CurrencyCode,
           TransactionDate = excluded.TransactionDate,
           Pending = excluded.Pending,
           CategoryPrimary = excluded.CategoryPrimary,
           CategoryDetailed = excluded.CategoryDetailed`,
        [
          item.ItemID,
          userId,
          transaction.transaction_id,
          transaction.account_id,
          transaction.name,
          transaction.merchant_name ?? null,
          transaction.amount,
          transaction.iso_currency_code ?? null,
          transaction.date,
          transaction.pending ? 1 : 0,
          transaction.personal_finance_category?.primary ?? null,
          transaction.personal_finance_category?.detailed ?? null,
        ]
      );
    }

    for (const removed of changes.removed) {
      await db.run(
        `DELETE FROM PlaidTransactions
         WHERE ItemID = ?
           AND UserID = ?
           AND PlaidTransactionID = ?`,
        [
          item.ItemID,
          userId,
          removed.transaction_id,
        ]
      );
    }

    await db.run(
      `UPDATE PlaidItems
       SET
         TransactionsCursor = COALESCE(?, TransactionsCursor),
         UpdatedAt = CURRENT_TIMESTAMP
       WHERE ItemID = ?
         AND UserID = ?`,
      [
        changes.nextCursor,
        item.ItemID,
        userId,
      ]
    );
  });
}

export async function getFinancialSnapshot(
  userId: number
): Promise<FinancialSnapshot> {
  const items = await withDb((db) =>
    db.all<LinkedItem[]>(
      `SELECT
         ItemID,
         AccessTokenEncrypted,
         TransactionsCursor
       FROM PlaidItems
       WHERE UserID = ?
         AND Status = 'active'`,
      [userId]
    )
  );

  const warnings: string[] = [];

  if (items.length > 0) {
    const client = plaidClient();

    for (const item of items) {
      try {
        await syncItem(client, userId, item);
      } catch (error) {
        console.error(
          "Plaid sync failed for item:",
          item.ItemID,
          error
        );

        warnings.push(
          "One or more linked banks could not be updated. " +
          "Showing last saved values where available."
        );
      }
    }
  }

  const [accounts, transactionRows, lastUpdated] =
    await withDb(async (db) => {
      const accountRows = await db.all<AccountRow[]>(
        `SELECT
           l.PlaidAccountID AS account_id,
           l.AccountName AS name,
           b.AccountLast4 AS mask,
           b.AccountType AS type,
           l.AccountSubtype AS subtype,
           COALESCE(p.InstitutionName, b.BankName) AS institution,
           l.CurrentBalanceCents AS balance_cents,
           COALESCE(
             l.CurrencyCode,
             l.UnofficialCurrencyCode
           ) AS currency
         FROM PlaidAccountLinks l
         JOIN PlaidItems p
           ON p.ItemID = l.ItemID
           AND p.UserID = l.UserID
         JOIN BankAccounts b
           ON b.AccountID = l.AccountID
           AND b.UserID = l.UserID
         WHERE l.UserID = ?
           AND p.Status = 'active'
         ORDER BY institution, name`,
        [userId]
      );

      const rows = await db.all<TransactionRow[]>(
        `SELECT
           t.PlaidTransactionID AS transaction_id,
           t.PlaidAccountID AS account_id,
           t.Name AS name,
           t.MerchantName AS merchant_name,
           t.Amount AS amount,
           t.CurrencyCode AS iso_currency_code,
           t.TransactionDate AS date,
           t.Pending AS pending,
           t.CategoryPrimary AS primary_category,
           t.CategoryDetailed AS detailed_category
         FROM PlaidTransactions t
         JOIN PlaidItems p
           ON p.ItemID = t.ItemID
           AND p.UserID = t.UserID
         WHERE t.UserID = ?
           AND p.Status = 'active'
         ORDER BY
           t.TransactionDate DESC,
           t.PlaidTransactionID ASC`,
        [userId]
      );

      const latest = await db.get<{
        UpdatedAt: string | null;
      }>(
        `SELECT MAX(UpdatedAt) AS UpdatedAt
         FROM PlaidItems
         WHERE UserID = ?
           AND Status = 'active'`,
        [userId]
      );

      return [
        accountRows,
        rows,
        latest?.UpdatedAt ?? null,
      ] as const;
    });

  const formattedAccounts: FinancialAccount[] =
    accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      institution: account.institution,
      currentBalance:
        account.balance_cents === null
          ? null
          : account.balance_cents / 100,
      currency: account.currency || "USD",
    }));

  const history: TransactionHistory = {
    accounts: accounts.map((account) => ({
      account_id: account.account_id,
      name: account.name,
      mask: account.mask,
    })),

    transactions: transactionRows.map((transaction) => ({
      transaction_id: transaction.transaction_id,
      account_id: transaction.account_id,
      name: transaction.name,
      merchant_name: transaction.merchant_name,
      amount: transaction.amount,
      iso_currency_code: transaction.iso_currency_code,
      date: transaction.date,
      pending: Boolean(transaction.pending),
      personal_finance_category: transaction.primary_category
        ? {
            primary: transaction.primary_category,
            detailed:
              transaction.detailed_category ||
              transaction.primary_category,
          }
        : null,
    })),

    demo: false,

    updatedAt: lastUpdated
      ? new Date(
          lastUpdated.replace(" ", "T") + "Z"
        ).toISOString()
      : null,
  };

  const cashBalance = formattedAccounts
    .filter(
      (account) =>
        account.currency === "USD" &&
        (
          account.type === "depository" ||
          account.type === "investment"
        )
    )
    .reduce(
      (total, account) =>
        total + (account.currentBalance ?? 0),
      0
    );

  const debtBalance = formattedAccounts
    .filter(
      (account) =>
        account.currency === "USD" &&
        (
          account.type === "credit" ||
          account.type === "loan"
        )
    )
    .reduce(
      (total, account) =>
        total + (account.currentBalance ?? 0),
      0
    );

  const month = new Date().toISOString().slice(0, 7);

  const accountTypes = new Map(
    formattedAccounts.map((account) => [
      account.accountId,
      account.type,
    ])
  );

  let monthlyIncome = 0;
  let monthlySpending = 0;

  const spending = new Map<string, number>();

  for (const transaction of history.transactions) {
    if (
      !transaction.date.startsWith(month) ||
      transaction.pending ||
      (transaction.iso_currency_code || "USD") !== "USD"
    ) {
      continue;
    }

    const primary =
      transaction.personal_finance_category?.primary ||
      "OTHER";

    if (
      primary.startsWith("TRANSFER_") ||
      primary === "LOAN_PAYMENTS"
    ) {
      continue;
    }

    const type = accountTypes.get(transaction.account_id);

    if (
      transaction.amount < 0 &&
      type === "depository"
    ) {
      monthlyIncome += Math.abs(transaction.amount);
    } else if (
      transaction.amount > 0 &&
      (
        type === "depository" ||
        type === "credit"
      )
    ) {
      monthlySpending += transaction.amount;

      const category = primary
        .toLowerCase()
        .split("_")
        .map(
          (part) =>
            part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join(" ");

      spending.set(
        category,
        (spending.get(category) || 0) +
          transaction.amount
      );
    }
  }

  return {
    connected: items.length > 0,

    source:
      process.env.PLAID_ENV === "production"
        ? "plaid-production"
        : "plaid-sandbox",

    accounts: formattedAccounts,
    history,
    cashBalance,
    debtBalance,
    netBalance: cashBalance - debtBalance,
    monthlyIncome,
    monthlySpending,

    spendingByCategory: [...spending.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),

    warnings: [...new Set(warnings)],
  };
}
