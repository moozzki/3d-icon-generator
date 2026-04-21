import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse body ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { transactionId } = body as { transactionId?: number };

    if (!transactionId || typeof transactionId !== "number") {
      return NextResponse.json({ error: "Missing or invalid transactionId." }, { status: 400 });
    }

    // ── 3. Look up transaction — must belong to the current user ──────────
    const [tx] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, session.user.id)
        )
      )
      .limit(1);

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    // ── 4. Only cancel pending transactions ────────────────────────────────
    if (tx.paymentStatus !== "pending") {
      return NextResponse.json(
        { error: `Cannot cancel a transaction with status '${tx.paymentStatus}'.` },
        { status: 409 }
      );
    }

    // ── 5. Update status to 'cancelled' ───────────────────────────────────
    await db
      .update(transactions)
      .set({ paymentStatus: "cancelled" })
      .where(eq(transactions.id, transactionId));

    // ── 6. (Optional) Hit Pakasir cancel API ──────────────────────────────
    // Pakasir does provide a cancel endpoint; call it best-effort (don't fail
    // the user-facing cancel if Pakasir is unreachable).
    try {
      await fetch("https://app.pakasir.com/api/transactioncancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: process.env.PAKASIR_SLUG,
          order_id: String(transactionId),
          amount: tx.amount,
          api_key: process.env.PAKASIR_API_KEY,
        }),
      });
    } catch (cancelErr) {
      // Log but don't surface to client — our DB is the source of truth
      console.warn("[payment/cancel] Pakasir cancel request failed:", cancelErr);
    }

    return NextResponse.json({ cancelled: true });
  } catch (err) {
    console.error("[payment/cancel] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
