
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/plaid-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = verifySession(
    (await cookies()).get(COOKIE_NAME)?.value
  );

  if (!session) {
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401 }
    );
  }

  if (session.demo) {
    return NextResponse.json(
      {
        error: "A registered account is required to connect Plaid.",
      },
      { status: 403 }
    );
  }

  try {
    const snapshot = await getFinancialSnapshot(session.userId);

    return NextResponse.json(
      {
        ...snapshot.history,
        connected: snapshot.connected,
        warnings: snapshot.warnings,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Transactions request failed:", error);

    return NextResponse.json(
      {
        error:
          "Unable to retrieve Plaid transactions. Check your server logs.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
