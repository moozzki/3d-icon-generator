import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sybilDefenseLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentCredits = await db.select().from(userCredits).where(eq(userCredits.userId, session.user.id)).limit(1);

    let balance = 0;
    let zeroCreditByIp = false;

    if (currentCredits.length === 0) {
      // ─── Layer 3: Sybil Attack Defense ────────────────────────────
      // New user claiming free credits — check how many accounts
      // from this IP have already claimed today
      const headersList = await headers();
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "127.0.0.1";

      let creditAmount = 2; // Default: 2 free credits

      try {
        const { success } = await sybilDefenseLimit.limit(ip);
        if (!success) {
          // This IP has already claimed credits for 5+ accounts today
          // Allow registration but set credits to 0
          creditAmount = 0;
          zeroCreditByIp = true;
        }
      } catch {
        // If Redis is down, give credits anyway (fail open)
        console.warn("Sybil defense check failed, granting default credits");
      }

      await db.insert(userCredits).values({
        userId: session.user.id,
        balance: creditAmount,
      });
      balance = creditAmount;
    } else {
      balance = currentCredits[0].balance;
    }

    return NextResponse.json({ balance, zeroCreditByIp });
  } catch (err) {
    console.error("Credits fetch error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
