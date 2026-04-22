import { NextRequest, NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { db } from "@/lib/db";
import { transactions, userCredits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // ── 1. Read raw body — required for signature validation ─────────────────
  const rawBody = await req.text();

  let event: ReturnType<typeof validateEvent>;
  try {
    // Convert headers to a plain object for the SDK validator
    event = validateEvent(
      rawBody,
      Object.fromEntries(req.headers.entries()),
      POLAR_WEBHOOK_SECRET,
    );
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.warn("[webhook/polar] Invalid webhook signature.");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }

  // ── 2. Only handle order.paid — return 200 for all other events ──────────
  if (event.type !== "order.paid") {
    return NextResponse.json({ received: true });
  }

  // ── 3. Extract transactionId from metadata ───────────────────────────────
  const metadata = (event.data as { metadata?: Record<string, unknown> }).metadata ?? {};
  const rawTxId  = typeof metadata.transactionId === "string" ? metadata.transactionId : undefined;
  const txId     = rawTxId ? parseInt(rawTxId, 10) : NaN;

  if (isNaN(txId)) {
    console.warn("[webhook/polar] Missing or invalid transactionId in metadata.", metadata);
    return NextResponse.json({ error: "Bad metadata" }, { status: 400 });
  }

  // ── 4. Fetch transaction ─────────────────────────────────────────────────
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, txId))
    .limit(1);

  if (!tx) {
    // Unknown order — return 200 so Polar stops retrying
    console.warn("[webhook/polar] Transaction not found for id:", txId);
    return NextResponse.json({ received: true });
  }

  // ── 5. Verify this transaction belongs to Polar ──────────────────────────
  if (tx.paymentProvider !== "polar") {
    console.warn("[webhook/polar] Wrong provider for txId:", txId, tx.paymentProvider);
    return NextResponse.json({ received: true });
  }

  // ── 6. Idempotency guard ─────────────────────────────────────────────────
  if (tx.paymentStatus === "paid") {
    console.info("[webhook/polar] Already paid, skipping:", txId);
    return NextResponse.json({ received: true });
  }

  // ── 7. Atomic batch: mark paid + credit user ─────────────────────────────
  // db.batch() sends both in one HTTP round-trip to Neon and executes them
  // atomically — same pattern used in the Pakasir webhook handler.
  await db.batch([
    db
      .update(transactions)
      .set({
        paymentStatus: "paid",
        paymentProviderRef: (event.data as { id?: string }).id ?? null,
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
    `[webhook/polar] ✓ txId=${txId} paid. Credited ${tx.creditAmount} to userId=${tx.userId}`,
  );

  // ── 8. Mandatory 200 response ────────────────────────────────────────────
  return NextResponse.json({ received: true });
}
