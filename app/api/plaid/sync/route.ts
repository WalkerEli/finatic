
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { getFinancialSnapshot } from "@/lib/plaid-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      { error: "Demo accounts cannot sync Plaid data." },
      { status: 403 }
    );
  }

  try {
    const snapshot = await getFinancialSnapshot(
      session.userId
    );

    if (!snapshot.connected) {
      return NextResponse.json(
        { error: "No bank accounts are connected." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: snapshot.warnings.length === 0,
        accountCount: snapshot.accounts.length,
        transactionCount: snapshot.history.transactions.length,
        updatedAt: snapshot.history.updatedAt,
        warnings: snapshot.warnings,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Plaid synchronization failed:", error);

    return NextResponse.json(
      { error: "Unable to synchronize financial data." },
      { status: 502 }
    );
  }
}
