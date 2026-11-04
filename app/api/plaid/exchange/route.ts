
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { plaidClient } from "@/app/api/transactions/plaid-client";
import { encryptPlaidToken } from "@/lib/plaid-crypto";
import { withTransaction } from "@/lib/db";

export const runtime = "nodejs";

type ExchangeRequest = {
  publicToken?: string;
  institutionName?: string;
  institutionId?: string;
};

function toCents(
  amount: number | null | undefined
): number | null {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return Math.round(amount * 100);
}

export async function POST(request: Request) {
  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.demo) {
    return NextResponse.json(
      { error: "Demo accounts cannot connect banks." },
      { status: 403 }
    );
  }

  const body: unknown = await request.json().catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const data = body as ExchangeRequest;

  if (
    typeof data.publicToken !== "string" ||
    !data.publicToken ||
    data.publicToken.length > 2048
  ) {
    return NextResponse.json(
      { error: "Invalid public token." },
      { status: 400 }
    );
  }

  const institutionName =
    typeof data.institutionName === "string"
      ? data.institutionName.trim().slice(0, 120) ||
        "Connected bank"
      : "Connected bank";

  const institutionId =
    typeof data.institutionId === "string"
      ? data.institutionId.trim().slice(0, 120) || null
      : null;

  try {
    const client = plaidClient();

    const exchange = await client.itemPublicTokenExchange({
      public_token: data.publicToken,
    });

    const accessToken = exchange.data.access_token;
    const plaidItemId = exchange.data.item_id;

    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });

    const encryptedToken = encryptPlaidToken(accessToken);

    await withTransaction(async (db) => {
      const existing = await db.get<{ ItemID: number }>(
        `SELECT ItemID
         FROM PlaidItems
         WHERE PlaidItemID = ?`,
        [plaidItemId]
      );

      if (existing) {
        throw new Error("ALREADY_LINKED");
      }

      const itemResult = await db.run(
        `INSERT INTO PlaidItems
         (
           UserID,
           PlaidItemID,
           InstitutionID,
           InstitutionName,
           AccessTokenEncrypted,
           Status
         )
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [
          session.userId,
          plaidItemId,
          institutionId,
          institutionName,
          encryptedToken,
        ]
      );

      if (typeof itemResult.lastID !== "number") {
        throw new Error("Unable to save Plaid Item.");
      }

      for (const account of accountsResponse.data.accounts) {
        const currentBalance = toCents(
          account.balances.current
        );

        const availableBalance = toCents(
          account.balances.available
        );

        const creditLimit = toCents(
          account.balances.limit
        );

        const bankResult = await db.run(
          `INSERT INTO BankAccounts
           (
             UserID,
             BankName,
             AccountType,
             AccountLast4,
             BalanceCents
           )
           VALUES (?, ?, ?, ?, ?)`,
          [
            session.userId,
            institutionName,
            account.type,
            account.mask ?? null,
            currentBalance ?? 0,
          ]
        );

        if (typeof bankResult.lastID !== "number") {
          throw new Error("Unable to save bank account.");
        }

        await db.run(
          `INSERT INTO PlaidAccountLinks
           (
             AccountID,
             UserID,
             ItemID,
             PlaidAccountID,
             AccountName,
             OfficialName,
             AccountSubtype,
             CurrentBalanceCents,
             AvailableBalanceCents,
             CreditLimitCents,
             CurrencyCode,
             UnofficialCurrencyCode,
             BalanceLastUpdatedAt
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            bankResult.lastID,
            session.userId,
            itemResult.lastID,
            account.account_id,
            account.name,
            account.official_name ?? null,
            account.subtype ?? null,
            currentBalance,
            availableBalance,
            creditLimit,
            account.balances.iso_currency_code ?? null,
            account.balances.unofficial_currency_code ?? null,
          ]
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Bank connected successfully.",
        accountCount: accountsResponse.data.accounts.length,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ALREADY_LINKED"
    ) {
      return NextResponse.json(
        { error: "This bank is already connected." },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes(
        "UNIQUE constraint failed: PlaidItems.PlaidItemID"
      )
    ) {
      return NextResponse.json(
        { error: "This bank is already connected." },
        { status: 409 }
      );
    }

    console.error(
      "Plaid account exchange failed:",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { error: "Unable to save bank connection." },
      { status: 502 }
    );
  }
}
