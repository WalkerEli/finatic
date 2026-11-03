
import "server-only";

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} from "plaid";

// Plaid supports Sandbox and Production.
type PlaidEnvironment = "sandbox" | "production";

// Determines which Plaid environment we are using.
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

// Initializes and returns our Plaid API client.
export function plaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  // Make sure credentials exist before contacting Plaid.
  if (!clientId || !secret) {
    throw new Error(
      "Missing Plaid credentials. Check your .env.local file."
    );
  }

  const environment = getPlaidEnvironment();

  // Select the correct Plaid API server.
  const basePath =
    environment === "production"
      ? PlaidEnvironments.production
      : PlaidEnvironments.sandbox;

  // Configure authentication for Plaid requests.
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

// Returns a Sandbox access token for local testing only.
// This must never be used as a shared production user token.
export function plaidAccessToken(): string | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (getPlaidEnvironment() !== "sandbox") {
    return null;
  }

  return process.env.PLAID_SANDBOX_ACCESS_TOKEN?.trim() || null;
}
