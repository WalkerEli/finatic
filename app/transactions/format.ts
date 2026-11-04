import type { Transaction, BankAccount } from "@/app/transactions/type";

export function formatTransactionAmount(
  transaction: Transaction
): string {
  const currency = transaction.iso_currency_code ?? "USD";

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Math.abs(transaction.amount));

  if (transaction.amount > 0) {
    return `-${formatted}`;
  }

  if (transaction.amount < 0) {
    return `+${formatted}`;
  }

  return formatted;
}

// Converts YYYY-MM-DD into a readable date.
export function formatTransactionDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Converts Plaid category codes into readable labels.
export function formatCategory(
  category: string | null | undefined
): string {
  if (!category) {
    return "Uncategorized";
  }

  return category
    .toLowerCase()
    .split("_")
    .map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

// Returns the merchant name when available.
// Otherwise, falls back to the transaction name.
export function getMerchantName(
  transaction: Transaction
): string {
  return transaction.merchant_name?.trim() || transaction.name;
}

// Returns a readable transaction category.
export function getTransactionCategory(
  transaction: Transaction
): string {
  return formatCategory(
    transaction.personal_finance_category?.primary
  );
}

// Formats account names with their masked account number.
export function formatAccountName(
  account: BankAccount | undefined
): string {
  if (!account) {
    return "Unknown Account";
  }

  if (!account.mask) {
    return account.name;
  }

  return `${account.name} ••••${account.mask}`;
}

// Determines whether money entered the account.
export function isMoneyIn(
  transaction: Transaction
): boolean {
  return transaction.amount < 0;
}

// Identifies transfers between accounts.
export function isTransfer(
  transaction: Transaction
): boolean {
  const category =
    transaction.personal_finance_category?.primary ?? "";

  return category === "TRANSFER_IN" ||
         category === "TRANSFER_OUT";
}
