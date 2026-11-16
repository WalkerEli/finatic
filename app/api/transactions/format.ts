
import type {
  Transaction,
  BankAccount,
} from "@/app/transactions/type";

export function formatTransactionAmount(
  transaction: Transaction
): string {
  const currency = transaction.iso_currency_code ?? "USD";

  let formatted: string;

  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Math.abs(transaction.amount));
  } catch {
    formatted = `${Math.abs(transaction.amount).toFixed(2)} ${currency}`;
  }

  if (transaction.amount > 0) {
    return `-${formatted}`;
  }

  if (transaction.amount < 0) {
    return `+${formatted}`;
  }

  return formatted;
}

export function formatTransactionDate(
  date: string
): string {
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

export function formatCategory(
  category: string | null | undefined
): string {
  if (!category) {
    return "Uncategorized";
  }

  return category
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export function getMerchantName(
  transaction: Transaction
): string {
  return (
    transaction.merchant_name?.trim() ||
    transaction.name
  );
}

export function getTransactionCategory(
  transaction: Transaction
): string {
  return formatCategory(
    transaction.personal_finance_category?.primary
  );
}

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

export function isMoneyIn(
  transaction: Transaction
): boolean {
  return transaction.amount < 0;
}

export function isTransfer(
  transaction: Transaction
): boolean {
  const category =
    transaction.personal_finance_category?.primary ?? "";

  return (
    category === "TRANSFER_IN" ||
    category === "TRANSFER_OUT"
  );
}
