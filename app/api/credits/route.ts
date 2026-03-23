import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentCredits = await db.select().from(userCredits).where(eq(userCredits.userId, session.user.id)).limit(1);
    
    // Default config per PRD is 2 credits for new users. 
    // Usually we initialize this row when user signs up via better-auth hooks
    const balance = currentCredits.length > 0 ? currentCredits[0].balance : 2; 

    return NextResponse.json({ balance });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
