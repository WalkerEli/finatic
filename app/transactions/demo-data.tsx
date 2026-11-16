import type { TransactionHistory, Transaction } from "@/app/transactions/type" ;

// Fictional bank accounts used for development and testing.
const accounts = [
  {
    account_id: "demo-checking",
    name: "Everyday Checking",
    mask: "1234",
  },
  {
    account_id: "demo-credit",
    name: "Rewards Credit",
    mask: "5678",
  },
];

// Sample transactions:
// [name, account_id, amount, daysAgo, primary, detailed, pending]

const samples: Array<
  [string, string, number, number, string, string, boolean]
> = [
  ["Payroll Deposit", "demo-checking", -1925, 1, "INCOME", "INCOME_WAGES", false],
  ["Whole Foods Market", "demo-credit", 84.23, 2, "FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES", false],
  ["Shell", "demo-credit", 45.60, 3, "TRANSPORTATION", "TRANSPORTATION_GAS", false],
  ["Spotify", "demo-credit", 12.99, 4, "ENTERTAINMENT", "ENTERTAINMENT_TV_AND_MOVIES", false],
  ["Coffee House", "demo-checking", 6.75, 5, "FOOD_AND_DRINK", "FOOD_AND_DRINK_COFFEE", false],
  ["Electric Utility", "demo-checking", 119.80, 6, "RENT_AND_UTILITIES", "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY", false],
  ["Transfer from Savings", "demo-checking", -250, 7, "TRANSFER_IN", "TRANSFER_IN_ACCOUNT_TRANSFER", false],
  ["Target", "demo-credit", 63.48, 8, "GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_SUPERSTORES", false],
  ["Chipotle", "demo-credit", 14.70, 9, "FOOD_AND_DRINK", "FOOD_AND_DRINK_RESTAURANT", false],
  ["Amazon", "demo-credit", 39.99, 10, "GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES", false],
  ["Pharmacy", "demo-checking", 22.35, 11, "MEDICAL", "MEDICAL_PHARMACIES_AND_SUPPLEMENTS", false],
  ["Pending Grocery Purchase", "demo-credit", 31.20, 0, "FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES", true],
];

// Generates a transaction date relative to today.
function daysAgo(days: number): string {
  const date = new Date();

  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

// Returns sample transactions in the format our frontend expects.
export function getDemoTransactions(): TransactionHistory {
  const transactions: Transaction[] = samples.map(
    ([name, account_id, amount, days, primary, detailed, pending], index) => ({
      transaction_id: `demo-${index + 1}`,
      account_id,
      name,
      merchant_name: name,
      amount,
      iso_currency_code: "USD",
      date: daysAgo(days),
      pending,
      personal_finance_category: {
        primary,
        detailed,
      },
    })
  );

  return {
    accounts,
    transactions,
    demo: true,
    updatedAt: null,
  };
}
