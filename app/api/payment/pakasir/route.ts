import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { IDR_PACKAGES, IdrPackageId } from "@/lib/pakasir/packages";

const PAKASIR_SLUG = process.env.PAKASIR_SLUG!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse & validate request body ──────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { packageId } = body as { packageId?: string };

    if (!packageId || !(packageId in IDR_PACKAGES)) {
      return NextResponse.json(
        { error: "Invalid or missing packageId." },
        { status: 400 }
      );
    }

    const pkg = IDR_PACKAGES[packageId as IdrPackageId];

    // ── 3. Insert pending transaction ──────────────────────────────────────
    const [tx] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        creditAmount: pkg.credits,
        amount: String(pkg.amount),  // numeric column stored as string by Drizzle
        currency: "IDR",
        paymentProvider: "pakasir",
        paymentStatus: "pending",
      })
      .returning({ id: transactions.id });

    if (!tx) {
      throw new Error("Failed to create transaction record.");
    }

    // ── 4. Build Pakasir hosted-payment URL (Option B) ─────────────────────
    // Format: https://app.pakasir.com/pay/{slug}/{amount}?order_id={id}&redirect={url}
    const successUrl = `${APP_URL}/?payment=success`;
    const pakasirUrl = new URL(
      `https://app.pakasir.com/pay/${PAKASIR_SLUG}/${pkg.amount}`
    );
    pakasirUrl.searchParams.set("order_id", String(tx.id));
    pakasirUrl.searchParams.set("redirect", successUrl);

    // ── 5. Return the checkout URL ─────────────────────────────────────────
    return NextResponse.json({ checkoutUrl: pakasirUrl.toString() });
  } catch (err) {
    console.error("[payment/pakasir] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
