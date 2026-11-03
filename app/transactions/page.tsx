import type { Metadata } from "next";
import TransactionsPanel from "@/app/transactions/transactions-panel";

export const metadata: Metadata = {
  title: "Transactions | Finatic",
  description:
    "View, search, and manage your bank transaction history.",
};

export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Transactions
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and manage your transaction history
            across all connected bank accounts.
          </p>
        </div>

        {/* Transaction History Component */}
        <TransactionsPanel />

      </div>
    </main>
  );
}
