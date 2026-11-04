
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResponse = {
  success?: boolean;
  accountCount?: number;
  transactionCount?: number;
  updatedAt?: string | null;
  warnings?: string[];
  error?: string;
};

export default function PlaidSyncButton() {
  const router = useRouter();

  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function syncAccounts() {
    if (syncing) return;

    setSyncing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/plaid/sync", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      const data: SyncResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to sync bank accounts."
        );
      }

      if (data.warnings?.length) {
        setError(data.warnings.join(" "));
      } else {
        setMessage(
          `Synced ${data.accountCount ?? 0} accounts and ${
            data.transactionCount ?? 0
          } transactions.`
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={syncAccounts}
        disabled={syncing}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {syncing ? "Syncing accounts..." : "Sync and refresh"}
      </button>

      {error && (
        <p role="alert" className="max-w-sm text-xs text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="max-w-sm text-xs text-emerald-700">
          {message}
        </p>
      )}
    </div>
  );
}
