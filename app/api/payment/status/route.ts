import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse transactionId ─────────────────────────────────────────────
    const transactionIdRaw = req.nextUrl.searchParams.get("transactionId");
    const transactionId = parseInt(transactionIdRaw ?? "", 10);

    if (!transactionIdRaw || isNaN(transactionId)) {
      return NextResponse.json(
        { error: "Missing or invalid transactionId." },
        { status: 400 }
      );
    }

    // ── 3. Look up transaction (scoped to the current user) ────────────────
    const [tx] = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        paymentStatus: transactions.paymentStatus,
      })
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    // ── 4. Ownership check — prevent cross-user status probing ─────────────
    if (tx.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 5. Return status ───────────────────────────────────────────────────
    return NextResponse.json({ status: tx.paymentStatus });
  } catch (err) {
    console.error("[payment/status] Error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
