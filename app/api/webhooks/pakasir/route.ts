import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, userCredits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const PAKASIR_WEBHOOK_SECRET = process.env.PAKASIR_WEBHOOK_SECRET;

// Pakasir webhook body shape
interface PakasirWebhookBody {
  amount: number;
  order_id: string;
  project: string;
  status: string;
  payment_method: string;
  completed_at: string;
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Secret token validation ─────────────────────────────────────────
    // The webhook URL registered in Pakasir dashboard must include ?secret=xxx
    // e.g. https://app.useaudora.com/api/webhooks/pakasir?secret=audora_sec_9f8e7d6c5b
    const incomingSecret = req.nextUrl.searchParams.get("secret");
    if (!PAKASIR_WEBHOOK_SECRET || incomingSecret !== PAKASIR_WEBHOOK_SECRET) {
      console.warn("[webhook/pakasir] Invalid or missing secret token.");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 2. Parse body ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => null) as PakasirWebhookBody | null;

    if (!body || !body.order_id || !body.status || body.amount == null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ── 3. Ignore non-completed events (return 200 to stop Pakasir retries) ─
    if (body.status !== "completed") {
      return NextResponse.json({ received: true });
    }

    // ── 4. Look up transaction ─────────────────────────────────────────────
    const txId = parseInt(body.order_id, 10);
    if (isNaN(txId)) {
      console.warn("[webhook/pakasir] Non-numeric order_id:", body.order_id);
      return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });
    }

    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txId))
      .limit(1);

    if (!tx) {
      console.warn("[webhook/pakasir] Transaction not found for id:", txId);
      // Return 200 so Pakasir doesn't keep retrying unknown orders
      return NextResponse.json({ received: true });
    }

    // ── 5. Verify payment provider & amount ────────────────────────────────
    if (tx.paymentProvider !== "pakasir") {
      console.warn("[webhook/pakasir] Wrong provider for txId:", txId);
      return NextResponse.json({ received: true });
    }

    const storedAmount = parseFloat(tx.amount);
    if (storedAmount !== body.amount) {
      console.error(
        `[webhook/pakasir] Amount mismatch for txId ${txId}: stored=${storedAmount}, received=${body.amount}`
      );
      // Amounts must match — this could be tampering
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // ── 6. Idempotency guard ───────────────────────────────────────────────
    if (tx.paymentStatus === "paid") {
      console.info("[webhook/pakasir] Already paid, skipping:", txId);
      return NextResponse.json({ received: true });
    }

    // ── 7. Atomic batch: mark paid + credit user ───────────────────────────
    // db.batch() sends both queries in a single HTTP request to Neon and
    // executes them atomically in one Postgres transaction — safe against
    // partial writes even though neon-http doesn't support db.transaction().
    await db.batch([
      db
        .update(transactions)
        .set({
          paymentStatus: "paid",
          paymentProviderRef: body.payment_method,
        })
        .where(eq(transactions.id, txId)),

      db
        .insert(userCredits)
        .values({
          userId: tx.userId,
          balance: tx.creditAmount,
        })
        .onConflictDoUpdate({
          target: userCredits.userId,
          set: {
            balance: sql`${userCredits.balance} + ${tx.creditAmount}`,
            updatedAt: sql`now()`,
          },
        }),
    ]);

    console.info(
      `[webhook/pakasir] ✓ txId=${txId} paid. Credited ${tx.creditAmount} to userId=${tx.userId}`
    );

    // ── 8. Mandatory 200 response ──────────────────────────────────────────
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/pakasir] Unhandled error:", err);
    // Return 500 so Pakasir will retry (transient DB errors should self-heal)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
