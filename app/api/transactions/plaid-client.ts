
import "server-only";

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} from "plaid";

type PlaidEnvironment = "sandbox" | "production";

function getPlaidEnvironment(): PlaidEnvironment {
  const environment = process.env.PLAID_ENV || "sandbox";

  if (
    environment !== "sandbox" &&
    environment !== "production"
  ) {
    throw new Error(
      "Invalid PLAID_ENV. Use 'sandbox' or 'production'."
    );
  }

  return environment;
}

export function plaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error(
      "Missing Plaid credentials. Check your .env.local file."
    );
  }

  const environment = getPlaidEnvironment();

  const basePath =
    environment === "production"
      ? PlaidEnvironments.production
      : PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export function plaidAccessToken(): string | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (getPlaidEnvironment() !== "sandbox") {
    return null;
  }

  return process.env.PLAID_SANDBOX_ACCESS_TOKEN?.trim() || null;
}
