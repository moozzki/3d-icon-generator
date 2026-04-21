import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { IDR_PACKAGES, IdrPackageId } from "@/lib/pakasir/packages";

const PAKASIR_SLUG = process.env.PAKASIR_SLUG!;
const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY!;
const PAKASIR_API_BASE = "https://app.pakasir.com/api/transactioncreate";

// All payment methods supported by Pakasir (Option C)
const VALID_METHODS = new Set([
  "qris",
  "cimb_niaga_va",
  "bni_va",
  "sampoerna_va",
  "bnc_va",
  "maybank_va",
  "permata_va",
  "atm_bersama_va",
  "artha_graha_va",
  "bri_va",
]);

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse & validate request body ──────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { packageId, paymentMethod } = body as {
      packageId?: string;
      paymentMethod?: string;
    };

    if (!packageId || !(packageId in IDR_PACKAGES)) {
      return NextResponse.json({ error: "Invalid or missing packageId." }, { status: 400 });
    }
    if (!paymentMethod || !VALID_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: "Invalid or missing paymentMethod." }, { status: 400 });
    }

    const pkg = IDR_PACKAGES[packageId as IdrPackageId];

    // ── 3. Set expiry (1 hour from now) ────────────────────────────────────
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // ── 4. Insert pending transaction into DB ─────────────────────────────
    const [tx] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        creditAmount: pkg.credits,
        amount: String(pkg.amount),
        currency: "IDR",
        paymentProvider: "pakasir",
        paymentStatus: "pending",
        paymentProviderRef: paymentMethod,
        expiresAt,
      })
      .returning({ id: transactions.id });

    if (!tx) throw new Error("Failed to create transaction record.");

    // ── 5. Call Pakasir Option C API ───────────────────────────────────────
    const pakasirRes = await fetch(`${PAKASIR_API_BASE}/${paymentMethod}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: PAKASIR_SLUG,
        order_id: String(tx.id),
        amount: pkg.amount,
        api_key: PAKASIR_API_KEY,
      }),
    });

    if (!pakasirRes.ok) {
      const errText = await pakasirRes.text().catch(() => "Unknown error");
      console.error("[payment/pakasir] Pakasir API error:", errText);
      return NextResponse.json(
        { error: "Payment provider error. Please try again." },
        { status: 502 }
      );
    }

    const pakasirData = await pakasirRes.json();
    const payment = pakasirData?.payment;

    if (!payment) {
      return NextResponse.json({ error: "Invalid response from payment provider." }, { status: 502 });
    }

    // ── 6. Return raw payment data to client ───────────────────────────────
    return NextResponse.json({
      transactionId: tx.id,
      expiresAt: expiresAt.toISOString(),
      paymentMethod,
      // QRIS: payment_number is the QR string
      // VA: payment_number is the virtual account number
      paymentNumber: payment.payment_number,
      totalPayment: payment.total_payment,
      fee: payment.fee,
    });
  } catch (err) {
    console.error("[payment/pakasir] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
