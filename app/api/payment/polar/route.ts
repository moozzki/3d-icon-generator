import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { USD_PACKAGES, UsdPackageId } from "@/lib/polar/packages";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth guard ────────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse & validate request body ────────────────────────────────────
    const body = await req.json().catch(() => ({})) as { packageId?: string };
    const { packageId } = body;

    if (!packageId || !(packageId in USD_PACKAGES)) {
      return NextResponse.json({ error: "Invalid or missing packageId." }, { status: 400 });
    }

    const pkg = USD_PACKAGES[packageId as UsdPackageId];

    // ── 3. Insert pending transaction into DB ────────────────────────────────
    const [tx] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        creditAmount: pkg.credits,
        amount: String(pkg.amount),
        currency: "USD",
        paymentProvider: "polar",
        paymentStatus: "pending",
      })
      .returning({ id: transactions.id });

    if (!tx) throw new Error("Failed to create transaction record.");

    // ── 4. Create Polar hosted checkout session ──────────────────────────────
    // Store our internal transactionId in metadata so the webhook can reconcile.
    const checkout = await polar.checkouts.create({
      products: [pkg.polarProductId],
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/transactions?payment=success`,
      metadata: { transactionId: String(tx.id) },
    });

    // ── 5. Return checkout URL to client for redirect ────────────────────────
    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (err) {
    console.error("[payment/polar] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
