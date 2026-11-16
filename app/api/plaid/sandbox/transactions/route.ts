
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { withDb } from "@/lib/db";
import { decryptPlaidToken } from "@/lib/plaid-crypto";
import { plaidClient } from "@/app/api/transactions/plaid-client";
import { getFinancialSnapshot } from "@/lib/plaid-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LinkedAccount = {
  PlaidAccountID: string;
  AccessTokenEncrypted: string;
  AccountType: string;
  CurrencyCode: string | null;
};

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAID_ENV !== "sandbox"
  ) {
    return NextResponse.json(
      { error: "Sandbox testing is disabled." },
      { status: 403 }
    );
  }

  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session || session.demo) {
    return NextResponse.json(
      { error: "A registered account is required." },
      { status: 401 }
    );
  }

  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  const accountId = data.accountId;
  const amount = data.amount;
  const description = data.description;
  const direction = data.direction;

  if (
    typeof accountId !== "number" ||
    !Number.isSafeInteger(accountId) ||
    accountId <= 0 ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0.01 ||
    amount > 10000 ||
    Math.round(amount * 100) / 100 !== amount ||
    typeof description !== "string" ||
    description.trim().length < 2 ||
    description.trim().length > 100 ||
    (direction !== "expense" && direction !== "income")
  ) {
    return NextResponse.json(
      { error: "Invalid transaction information." },
      { status: 400 }
    );
  }

  try {
    const account = await withDb((db) =>
      db.get<LinkedAccount>(
        `SELECT
           l.PlaidAccountID,
           p.AccessTokenEncrypted,
           b.AccountType,
           COALESCE(
             l.CurrencyCode,
             l.UnofficialCurrencyCode
           ) AS CurrencyCode
         FROM PlaidAccountLinks l
         JOIN PlaidItems p
           ON p.ItemID = l.ItemID
           AND p.UserID = l.UserID
         JOIN BankAccounts b
           ON b.AccountID = l.AccountID
           AND b.UserID = l.UserID
         WHERE l.AccountID = ?
           AND l.UserID = ?
           AND p.Status = 'active'
         LIMIT 1`,
        [accountId, session.userId]
      )
    );

    if (!account) {
      return NextResponse.json(
        { error: "Bank account not found." },
        { status: 404 }
      );
    }

    if (
      account.AccountType !== "depository" &&
      account.AccountType !== "credit"
    ) {
      return NextResponse.json(
        {
          error:
            "Select a checking, savings, or credit account.",
        },
        { status: 400 }
      );
    }

    if (
      account.CurrencyCode &&
      account.CurrencyCode !== "USD"
    ) {
      return NextResponse.json(
        {
          error: "This tester currently supports USD accounts.",
        },
        { status: 400 }
      );
    }

    const accessToken = decryptPlaidToken(
      account.AccessTokenEncrypted
    );

    const today = new Date().toISOString().slice(0, 10);

    await plaidClient().sandboxTransactionsCreate({
      access_token: accessToken,
      transactions: [
        {
          account_id: account.PlaidAccountID,
          date_transacted: today,
          date_posted: today,
          amount:
            direction === "income"
              ? -amount
              : amount,
          description: description.trim(),
          iso_currency_code: "USD",
        },
      ],
    });

    const snapshot = await getFinancialSnapshot(
      session.userId
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sandbox transaction created.",
        transactionCount:
          snapshot.history.transactions.length,
        warnings: snapshot.warnings,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Sandbox transaction failed:", error);

    return NextResponse.json(
      {
        error: "Unable to create the Sandbox transaction.",
      },
      { status: 502 }
    );
  }
}
