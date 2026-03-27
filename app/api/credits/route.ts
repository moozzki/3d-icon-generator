import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    if (currentCredits.length === 0) {
      // Initialize with 2 credits for new user
      await db.insert(userCredits).values({
        userId: session.user.id,
        balance: 2,
      });
      balance = 2;
    } else {
      balance = currentCredits[0].balance;
    }

    return NextResponse.json({ balance });
  } catch (err) {
    console.error("Credits fetch error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
