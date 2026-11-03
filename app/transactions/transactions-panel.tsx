"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Transaction, TransactionHistory } from "@/app/transactions/type";
import { getDemoTransactions } from "./demo-data";
import {
  formatTransactionAmount,
  formatTransactionDate,
  getMerchantName,
  getTransactionCategory,
  formatAccountName,
  isMoneyIn,
} from "./format";

// Determines whether the panel is displayed on Home or Transactions.
type TransactionsPanelProps = {
  compact?: boolean;
};

type TransactionFilter = "all" | "in" | "out";

const PAGE_SIZE = 10;
const RECENT_LIMIT = 5;

// Retrieves an error message returned by our Next.js API.
async function getApiError(
  response: Response,
  fallback: string
): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return body?.error || fallback;
}

// Gets transaction data from our internal Next.js API.
// During development, an absent API route falls back to demo data.
async function fetchTransactionHistory(signal?: AbortSignal) {
  const response = await fetch("/api/transactions", {
    cache: "no-store",
    signal,
  });

  if (
    response.status === 404 &&
    process.env.NODE_ENV === "development"
  ) {
    return {
      data: getDemoTransactions(),
      fallbackDemo: true,
    };
  }

  if (!response.ok) {
    throw new Error(
      await getApiError(response, "Unable to retrieve transactions.")
    );
  }

  const data = (await response.json()) as TransactionHistory;

  return {
    data,
    fallbackDemo: false,
  };
}

export default function TransactionsPanel({
  compact = false,
}: TransactionsPanelProps) {
  // Transaction data and loading status.
  const [history, setHistory] = useState<TransactionHistory | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Messages shown to the user.
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Search, filtering, and pagination.
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("all");
  const [page, setPage] = useState(1);

  // Fetch transactions when the component first loads.
  useEffect(() => {
    const controller = new AbortController();

    fetchTransactionHistory(controller.signal)
      .then(({ data, fallbackDemo }) => {
        if (controller.signal.aborted) return;

        setHistory(data);
        setError(null);

        if (fallbackDemo) {
          setMessage(
            "Transactions API not configured yet. Showing demo data."
          );
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load transactions."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Reload the transaction list from our API.
  async function reloadTransactions() {
    if (loading || refreshing) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, fallbackDemo } =
        await fetchTransactionHistory();

      setHistory(data);
      setPage(1);

      if (fallbackDemo) {
        setMessage(
          "Demo transactions reloaded. No bank connection is active."
        );
      } else {
        setMessage(
          data.demo
            ? "Demo transactions reloaded."
            : "Transaction list reloaded successfully."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reload transactions."
      );
    } finally {
      setLoading(false);
    }
  }

  // Request a new bank transaction update from Plaid.
  async function refreshTransactions() {
    if (!history || history.demo || refreshing || loading) {
      return;
    }

    setRefreshing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/transactions/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            "Unable to refresh bank transactions."
          )
        );
      }

      setMessage(
        "Bank refresh requested. New transactions may take time " +
          "to become available. Use Reload to check for updates."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh transactions."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // Sort transactions from newest to oldest.
  const sortedTransactions = useMemo(() => {
    if (!history) return [];

    return [...history.transactions].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.transaction_id.localeCompare(b.transaction_id)
    );
  }, [history]);

  // Apply search and account/type filters.
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortedTransactions.filter((transaction) => {
      const account = history?.accounts.find(
        (a) => a.account_id === transaction.account_id
      );

      const searchableText = [
        getMerchantName(transaction),
        transaction.name,
        getTransactionCategory(transaction),
        account?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(query);

      const matchesAccount =
        accountFilter === "all" ||
        transaction.account_id === accountFilter;

      const matchesType =
        transactionFilter === "all" ||
        (transactionFilter === "in" &&
          transaction.amount < 0) ||
        (transactionFilter === "out" &&
          transaction.amount > 0);

      return matchesSearch && matchesAccount && matchesType;
    });
  }, [
    sortedTransactions,
    history,
    search,
    accountFilter,
    transactionFilter,
  ]);

  // Calculate pagination for the full transaction page.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  // Home shows only five recent transactions.
  // The full page shows the filtered, paginated history.
  const visibleTransactions = compact
    ? sortedTransactions.slice(0, RECENT_LIMIT)
    : filteredTransactions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      );

  // Create a reusable transaction row.
  function renderTransaction(transaction: Transaction) {
    const merchant = getMerchantName(transaction);
    const category = getTransactionCategory(transaction);

    const account = history?.accounts.find(
      (a) => a.account_id === transaction.account_id
    );

    const accountName = formatAccountName(account);

    const formattedDate = formatTransactionDate(
      transaction.date
    );

    const formattedAmount = formatTransactionAmount(
      transaction
    );

    const moneyIn = isMoneyIn(transaction);

    const initials =
      merchant
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("") || "TX";

    return (
      <li
        key={transaction.transaction_id}
        className="px-5 py-4 sm:px-6"
      >
        <div
          className={
            compact
              ? "flex items-center gap-3"
              : "flex items-center gap-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_110px]"
          }
        >
          {/* Merchant information */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700"
            >
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {merchant}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500">
                {category}
              </p>

              {/* Mobile and compact account information */}
              <p
                className={
                  compact
                    ? "mt-1 truncate text-xs text-slate-400"
                    : "mt-1 truncate text-xs text-slate-400 md:hidden"
                }
              >
                {accountName} · {formattedDate}
              </p>

              {transaction.pending && (
                <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Account and date columns on the full page */}
          {!compact && (
            <>
              <p className="hidden truncate text-sm text-slate-600 md:block">
                {accountName}
              </p>

              <p className="hidden text-sm text-slate-600 md:block">
                {formattedDate}
              </p>
            </>
          )}

          {/* Transaction amount */}
          <p
            className={`shrink-0 text-right text-sm font-semibold ${
              moneyIn ? "text-emerald-700" : "text-slate-900"
            }`}
          >
            {formattedAmount}
          </p>
        </div>
      </li>
    );
  }

  return (
    <section
      aria-label="Transaction history"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Panel heading */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {compact
                ? "Recent Transactions"
                : "Transaction History"}
            </h2>

            {history?.demo && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Demo Data
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {history?.demo
              ? "Example transactions for testing."
              : "Activity across your connected accounts."}
          </p>

          {history?.updatedAt && (
            <p className="mt-1 text-xs text-slate-400">
              Retrieved:{" "}
              {new Date(history.updatedAt).toLocaleString(
                "en-US"
              )}
            </p>
          )}
        </div>

        {/* Header actions */}
        <div className="flex flex-wrap items-center gap-2">
          {compact && (
            <Link
              href="/transactions"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              View All
            </Link>
          )}

          <button
            type="button"
            onClick={reloadTransactions}
            disabled={loading || refreshing}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Reload"}
          </button>

          {history && !history.demo && (
            <button
              type="button"
              onClick={refreshTransactions}
              disabled={loading || refreshing}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh Bank"}
            </button>
          )}
        </div>
      </div>

      {/* Filters only appear on the full Transactions page */}
      {!compact && (
        <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3 sm:px-6">
          {/* Search */}
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Search Transactions
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search merchants..."
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-blue-600"
            />
          </label>

          {/* Bank account filter */}
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Bank Account
            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All Accounts</option>

              {history?.accounts.map((account) => (
                <option
                  key={account.account_id}
                  value={account.account_id}
                >
                  {formatAccountName(account)}
                </option>
              ))}
            </select>
          </label>

          {/* Money in / money out filter */}
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Transaction Type
            <select
              value={transactionFilter}
              onChange={(e) => {
                setTransactionFilter(
                  e.target.value as TransactionFilter
                );
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All Transactions</option>
              <option value="in">Money In</option>
              <option value="out">Money Out</option>
            </select>
          </label>
        </div>
      )}

      {/* User feedback */}
      {message && (
        <p
          role="status"
          className="mx-5 mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 sm:mx-6"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6"
        >
          {error}
        </p>
      )}

      {/* Column headings */}
      {!compact && history && visibleTransactions.length > 0 && (
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_110px] gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Transaction</span>
          <span>Account</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
        </div>
      )}

      {/* Transaction list */}
      {loading && !history ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          Loading transactions...
        </p>
      ) : !history ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          Transaction history is unavailable.
        </p>
      ) : visibleTransactions.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          No matching transactions found.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visibleTransactions.map(renderTransaction)}
        </ul>
      )}

      {/* Pagination for the full Transactions page */}
      {!compact &&
        history &&
        filteredTransactions.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages} ·{" "}
              {filteredTransactions.length} transactions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setPage(Math.max(1, currentPage - 1))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage(Math.min(totalPages, currentPage + 1))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
    </section>
  );
}
