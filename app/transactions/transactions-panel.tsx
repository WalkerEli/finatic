
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  Transaction,
  TransactionHistory,
} from "@/app/transactions/type";
import {
  formatTransactionAmount,
  formatTransactionDate,
  getMerchantName,
  getTransactionCategory,
  formatAccountName,
  isMoneyIn,
} from "@/app/transactions/format";

type TransactionsPanelProps = {
  compact?: boolean;
  initialHistory?: TransactionHistory;
};

type TransactionFilter = "all" | "in" | "out";

const PAGE_SIZE = 10;
const RECENT_LIMIT = 5;

async function fetchTransactionHistory(
  signal?: AbortSignal
): Promise<TransactionHistory> {
  const response = await fetch("/api/transactions", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "Unable to retrieve transactions."
    );
  }

  if (
    !Array.isArray(result.transactions) ||
    !Array.isArray(result.accounts)
  ) {
    throw new Error("Invalid transaction data received.");
  }

  return result as TransactionHistory;
}

export default function TransactionsPanel({
  compact = false,
  initialHistory,
}: TransactionsPanelProps) {
  const [history, setHistory] =
    useState<TransactionHistory | null>(
      initialHistory ?? null
    );

  const [loading, setLoading] = useState(
    !initialHistory
  );

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] =
    useState("all");

  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>("all");

  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialHistory) {
      setHistory(initialHistory);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    fetchTransactionHistory(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setHistory(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load transactions."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [initialHistory]);

  async function reloadTransactions() {
    if (loading || refreshing) return;

    setRefreshing(true);
    setError(null);
    setMessage(null);

    try {
      const data = await fetchTransactionHistory();

      setHistory(data);
      setPage(1);

      setMessage(
        "Plaid transaction data refreshed successfully."
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

  const accountsById = useMemo(() => {
    return new Map(
      (history?.accounts ?? []).map((account) => [
        account.account_id,
        account,
      ])
    );
  }, [history]);

  const sortedTransactions = useMemo(() => {
    return [...(history?.transactions ?? [])].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.transaction_id.localeCompare(
          b.transaction_id
        )
    );
  }, [history]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortedTransactions.filter((transaction) => {
      const account = accountsById.get(
        transaction.account_id
      );

      const searchableText = [
        getMerchantName(transaction),
        transaction.name,
        getTransactionCategory(transaction),
        account?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(query);

      const matchesAccount =
        accountFilter === "all" ||
        transaction.account_id === accountFilter;

      const matchesType =
        transactionFilter === "all" ||
        (transactionFilter === "in" &&
          transaction.amount < 0) ||
        (transactionFilter === "out" &&
          transaction.amount > 0);

      return (
        matchesSearch &&
        matchesAccount &&
        matchesType
      );
    });
  }, [
    sortedTransactions,
    accountsById,
    search,
    accountFilter,
    transactionFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleTransactions = compact
    ? filteredTransactions.slice(0, RECENT_LIMIT)
    : filteredTransactions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      );

  const hasConnection = history?.connected !== false;

  function renderTransaction(
    transaction: Transaction
  ) {
    const merchant = getMerchantName(transaction);
    const category = getTransactionCategory(transaction);

    const account = accountsById.get(
      transaction.account_id
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
        <div className="flex items-center gap-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_110px]">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {merchant}
              </p>

              <p className="mt-1 truncate text-xs text-slate-500">
                {category}
              </p>

              <p className="mt-1 truncate text-xs text-slate-400 md:hidden">
                {accountName} · {formattedDate}
              </p>

              {transaction.pending && (
                <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Pending
                </span>
              )}
            </div>
          </div>

          <p className="hidden truncate text-sm text-slate-600 md:block">
            {accountName}
          </p>

          <p className="hidden text-sm text-slate-600 md:block">
            {formattedDate}
          </p>

          <p
            className={`shrink-0 text-right text-sm font-semibold ${
              moneyIn
                ? "text-emerald-700"
                : "text-slate-900"
            }`}
          >
            {formattedAmount}
          </p>
        </div>
      </li>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {compact
              ? "Recent Transactions"
              : "Transaction History"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {history?.connected === false
              ? "Connect a bank account to get started."
              : "Transactions from your connected Plaid accounts."}
          </p>

          {history?.updatedAt && (
            <p className="mt-2 text-xs text-slate-400">
              Last updated:{" "}
              {new Date(
                history.updatedAt
              ).toLocaleString("en-US")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {compact && (
            <Link
              href="/transactions"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View All
            </Link>
          )}

          <button
            type="button"
            onClick={reloadTransactions}
            disabled={
              loading ||
              refreshing ||
              !hasConnection
            }
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Syncing..." : "Sync from Plaid"}
          </button>
        </div>
      </div>

      {!compact && hasConnection && (
        <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3 sm:px-6">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Search
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search transactions..."
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-blue-600"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Bank Account
            <select
              value={accountFilter}
              onChange={(event) => {
                setAccountFilter(event.target.value);
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

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Transaction Type
            <select
              value={transactionFilter}
              onChange={(event) => {
                setTransactionFilter(
                  event.target.value as TransactionFilter
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

      {history?.warnings?.map((warning, index) => (
        <p
          key={index}
          role="alert"
          className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:mx-6"
        >
          {warning}
        </p>
      ))}

      {message && (
        <p
          role="status"
          className="mx-5 mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 sm:mx-6"
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

      {loading && !history ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          Loading transactions...
        </p>
      ) : !history ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          Transaction history is unavailable.
        </p>
      ) : !hasConnection ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            No bank accounts are connected yet.
          </p>

          <Link
            href="/profile"
            className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Connect Bank Account
          </Link>
        </div>
      ) : visibleTransactions.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-slate-500">
          {sortedTransactions.length === 0
            ? "No transactions are available from Plaid yet."
            : "No transactions match your filters."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visibleTransactions.map(renderTransaction)}
        </ul>
      )}

      {!compact &&
        hasConnection &&
        filteredTransactions.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setPage(Math.max(1, currentPage - 1))
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage(
                    Math.min(totalPages, currentPage + 1)
                  )
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
    </section>
  );
}
