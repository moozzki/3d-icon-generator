import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: transactions.id,
        creditAmount: transactions.creditAmount,
        amount: transactions.amount,
        currency: transactions.currency,
        paymentProvider: transactions.paymentProvider,
        paymentStatus: transactions.paymentStatus,
        paymentProviderRef: transactions.paymentProviderRef,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, session.user.id))
      .orderBy(desc(transactions.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/transactions] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
