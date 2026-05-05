import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generations, user } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publicGenerations = await db
      .select({
        id: generations.id,
        jobId: generations.jobId,
        status: generations.status,
        aiModel: generations.aiModel,
        // userPrompt only — NOT the full engineered prompt (proprietary)
        userPrompt: generations.userPrompt,
        position: generations.position,
        style: generations.style,
        quality: generations.quality,
        color: generations.color,
        resultImageUrl: generations.resultImageUrl,
        isPublic: generations.isPublic,
        createdAt: generations.createdAt,
        userName: user.name,
      })
      .from(generations)
      .innerJoin(user, eq(generations.userId, user.id))
      .where(eq(generations.isPublic, true))
      .orderBy(desc(generations.createdAt));

    return NextResponse.json({ data: publicGenerations });
  } catch (err) {
    console.error("Spotlight fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
