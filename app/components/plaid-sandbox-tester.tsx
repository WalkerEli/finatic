
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SandboxAccount = {
  accountId: number;
  institution: string;
  name: string;
  mask: string | null;
};

type Props = {
  accounts: SandboxAccount[];
};

type SandboxResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  transactionCount?: number;
  warnings?: string[];
};

export default function PlaidSandboxTester({
  accounts,
}: Props) {
  const router = useRouter();

  const [accountId, setAccountId] = useState(
    accounts[0]?.accountId.toString() ?? ""
  );

  const [description, setDescription] = useState(
    "Finatic Sandbox Purchase"
  );

  const [amount, setAmount] = useState("25.00");

  const [direction, setDirection] = useState<
    "expense" | "income"
  >("expense");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const parsedAmount = Number(amount);
    const parsedAccountId = Number(accountId);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0.01 ||
      parsedAmount > 10000
    ) {
      setError("Enter an amount between $0.01 and $10,000.");
      return;
    }

    if (!Number.isSafeInteger(parsedAccountId)) {
      setError("Select a valid bank account.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/plaid/sandbox/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            accountId: parsedAccountId,
            amount: parsedAmount,
            description: description.trim(),
            direction,
          }),
        }
      );

      const data: SandboxResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Transaction creation failed."
        );
      }

      setSuccess(
        data.warnings?.length
          ? `Transaction created. ${data.warnings.join(" ")}`
          : "Transaction created in Plaid Sandbox. Check your dashboard."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create transaction."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-900">
        Create a Sandbox Transaction
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Add a test transaction directly to your linked Plaid
        Sandbox account.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
      >
        <div>
          <label
            htmlFor="sandbox-account"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Bank Account
          </label>

          <select
            id="sandbox-account"
            value={accountId}
            onChange={(event) =>
              setAccountId(event.target.value)
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
          >
            {accounts.map((account) => (
              <option
                key={account.accountId}
                value={account.accountId}
              >
                {account.institution} — {account.name}
                {account.mask
                  ? ` ••••${account.mask}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="sandbox-description"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Description
          </label>

          <input
            id="sandbox-description"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="sandbox-amount"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Amount (USD)
          </label>

          <input
            id="sandbox-amount"
            type="number"
            min="0.01"
            max="10000"
            step="0.01"
            required
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="sandbox-direction"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Transaction Type
          </label>

          <select
            id="sandbox-direction"
            value={direction}
            onChange={(event) =>
              setDirection(
                event.target.value as "expense" | "income"
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
          >
            <option value="expense">Expense</option>
            <option value="income">Income / Deposit</option>
          </select>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || accounts.length === 0}
          className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {loading
            ? "Creating Transaction..."
            : "Create Test Transaction"}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          View Dashboard
        </Link>

        <Link
          href="/transactions"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          View Transactions
        </Link>
      </div>
    </div>
  );
}
