
"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type PlaidMetadata = {
  institution?: {
    name?: string;
    institution_id?: string;
  } | null;
};

type PlaidError = {
  error_message?: string;
};

type PlaidHandler = {
  open: () => void;
  destroy: () => void;
};

type PlaidLinkOptions = {
  token: string;
  onSuccess: (
    publicToken: string,
    metadata: PlaidMetadata
  ) => void;
  onExit?: (error: PlaidError | null) => void;
};

declare global {
  interface Window {
    Plaid?: {
      create: (options: PlaidLinkOptions) => PlaidHandler;
    };
  }
}

type LinkTokenResponse = {
  link_token?: string;
  error?: string;
};

type ExchangeResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  accountCount?: number;
};

export default function PlaidLinkButton() {
  const router = useRouter();

  const handlerRef = useRef<PlaidHandler | null>(null);
  const busyRef = useRef(false);

  const [scriptReady, setScriptReady] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const prepareLink = useCallback(async () => {
    try {
      const response = await fetch("/api/plaid/link-token", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });

      const data: LinkTokenResponse = await response.json();

      if (!response.ok || !data.link_token) {
        throw new Error(
          data.error || "Unable to initialize Plaid Link."
        );
      }

      setLinkToken(data.link_token);
      setError(null);
    } catch (err) {
      setLinkToken(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to initialize Plaid Link."
      );
    }
  }, []);

  useEffect(() => {
    void prepareLink();
  }, [prepareLink]);

  useEffect(() => {
    if (
      !scriptReady ||
      !linkToken ||
      !window.Plaid
    ) {
      return;
    }

    const handler = window.Plaid.create({
      token: linkToken,

      onSuccess: async (publicToken, metadata) => {
        busyRef.current = true;
        setBusy(true);
        setError(null);
        setSuccess(null);

        try {
          const response = await fetch(
            "/api/plaid/exchange",
            {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                publicToken,
                institutionName:
                  metadata.institution?.name,
                institutionId:
                  metadata.institution?.institution_id,
              }),
            }
          );

          const data: ExchangeResponse =
            await response.json();

          if (!response.ok || !data.success) {
            throw new Error(
              data.error || "Unable to connect bank."
            );
          }

          setSuccess(
            data.message || "Bank connected successfully."
          );

          router.refresh();
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to connect bank."
          );
        } finally {
          busyRef.current = false;
          setBusy(false);
          setLinkToken(null);
          void prepareLink();
        }
      },

      onExit: (error) => {
        if (busyRef.current) return;

        if (error?.error_message) {
          setError(error.error_message);
        }

        setLinkToken(null);
        void prepareLink();
      },
    });

    handlerRef.current = handler;

    return () => {
      handlerRef.current = null;
      handler.destroy();
    };
  }, [linkToken, scriptReady, prepareLink, router]);

  function openLink() {
    setError(null);
    setSuccess(null);

    handlerRef.current?.open();
  }

  return (
    <div>
      <Script
        src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() =>
          setError("Unable to load Plaid Link.")
        }
      />

      <button
        type="button"
        onClick={openLink}
        disabled={!scriptReady || !linkToken || busy}
        className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy
          ? "Saving bank connection..."
          : scriptReady && linkToken
            ? "Connect Bank Account"
            : "Preparing Plaid..."}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-3 space-y-2"
        >
          <p className="text-sm text-red-700">
            {error}
          </p>

          {!busy && !linkToken && (
            <button
              type="button"
              onClick={() => void prepareLink()}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {success && (
        <p
          role="status"
          className="mt-3 text-sm text-emerald-700"
        >
          {success}
        </p>
      )}
    </div>
  );
}
