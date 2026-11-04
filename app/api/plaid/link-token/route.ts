
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { plaidClient } from "@/app/api/transactions/plaid-client";

export const runtime = "nodejs";

export async function POST() {
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

  if (
    !/^[a-f0-9]{64}$/i.test(
      process.env.PLAID_TOKEN_ENCRYPTION_KEY || ""
    )
  ) {
    return NextResponse.json(
      { error: "Plaid encryption is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await plaidClient().linkTokenCreate({
      user: {
        client_user_id: `finatic-${session.userId}`,
      },
      client_name: "Finatic",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      transactions: {
        days_requested: 90,
      },
    });

    return NextResponse.json(
      {
        link_token: response.data.link_token,
        expiration: response.data.expiration,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Plaid Link initialization failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Unable to initialize bank connection." },
      { status: 502 }
    );
  }
}
