
export type Transaction = {
  transaction_id: string;
  account_id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  pending: boolean;
  personal_finance_category: {
    primary: string;
    detailed: string;
  } | null;
};

export type BankAccount = {
  account_id: string;
  name: string;
  mask: string | null;
};

export type TransactionHistory = {
  transactions: Transaction[];
  accounts: BankAccount[];
  demo: boolean;
  updatedAt: string | null;
  connected?: boolean;
  warnings?: string[];
};
