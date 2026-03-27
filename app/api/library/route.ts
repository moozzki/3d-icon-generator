import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await db.select()
      .from(generations)
      .where(eq(generations.userId, session.user.id))
      .orderBy(desc(generations.createdAt));

    return NextResponse.json({ data: history });
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
