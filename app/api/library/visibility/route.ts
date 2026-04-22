import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm"; // Make sure eq and and are used

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, isPublic } = await req.json();

    if (!jobId || typeof isPublic !== "boolean") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const result = await db
      .update(generations)
      .set({ isPublic })
      .where(and(eq(generations.jobId, jobId), eq(generations.userId, session.user.id)))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Generation not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, isPublic: result[0].isPublic });
  } catch (err) {
    console.error("Visibility toggle error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
