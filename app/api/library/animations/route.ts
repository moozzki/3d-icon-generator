import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { animations } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await db
      .select({
        id: animations.id,
        jobId: animations.jobId,
        status: animations.status,
        actionPrompt: animations.actionPrompt,
        resolution: animations.resolution,
        aspectRatio: animations.aspectRatio,
        backgroundColor: animations.backgroundColor,
        creditCost: animations.creditCost,
        resultVideoUrl: animations.resultVideoUrl,
        baseImageUrl: animations.baseImageUrl,
        createdAt: animations.createdAt,
      })
      .from(animations)
      .where(
        and(
          eq(animations.userId, session.user.id),
          eq(animations.status, "completed")
        )
      )
      .orderBy(desc(animations.createdAt));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Library animations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
