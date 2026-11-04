
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
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.demo) {
    return NextResponse.json(
      { error: "A registered account is required." },
      { status: 403 }
    );
  }

  try {
    const snapshot = await getFinancialSnapshot(
      session.userId
    );

    return NextResponse.json(
      {
        connected: snapshot.connected,
        source: snapshot.source,
        accounts: snapshot.accounts,
        netBalance: snapshot.netBalance,
        cashBalance: snapshot.cashBalance,
        debtBalance: snapshot.debtBalance,
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
    console.error("Plaid accounts request failed:", error);

    return NextResponse.json(
      { error: "Unable to retrieve bank accounts." },
      { status: 502 }
    );
  }
}
