import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits, animations, generations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { generationRateLimit } from "@/lib/rate-limit";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Credit cost matrix for animations
//   720p = 2 Credits  |  1080p = 3 Credits
// ---------------------------------------------------------------------------

type AnimationResolution = "720p" | "1080p";
type AnimationAspectRatio = "16:9" | "9:16";

const CREDIT_COST: Record<AnimationResolution, number> = {
  "720p": 2,
  "1080p": 3,
};

const VALID_RESOLUTIONS: AnimationResolution[] = ["720p", "1080p"];
const VALID_ASPECT_RATIOS: AnimationAspectRatio[] = ["16:9", "9:16"];

// ---------------------------------------------------------------------------
// POST /api/animate
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Rate Limiting (reuse generation rate limit)
    const { success, limit, remaining, reset } = await generationRateLimit.limit(session.user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    const {
      sourceGenerationId,
      actionPrompt,
      resolution = "720p",
      aspectRatio = "16:9",
      backgroundColor = "#FFFFFF",
    } = await request.json();

    // 2. Validate parameters
    if (
      !sourceGenerationId ||
      !actionPrompt?.trim() ||
      !VALID_RESOLUTIONS.includes(resolution) ||
      !VALID_ASPECT_RATIOS.includes(aspectRatio) ||
      !/^#[0-9A-Fa-f]{6}$/.test(backgroundColor)
    ) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 3. Fetch source generation — must exist and have a baseImageUrl
    const [sourceGen] = await db
      .select({
        id: generations.id,
        userId: generations.userId,
        baseImageUrl: generations.baseImageUrl,
        status: generations.status,
      })
      .from(generations)
      .where(eq(generations.id, sourceGenerationId))
      .limit(1);

    if (!sourceGen || sourceGen.userId !== session.user.id) {
      return NextResponse.json({ error: "Source icon not found" }, { status: 404 });
    }

    if (sourceGen.status !== "completed" || !sourceGen.baseImageUrl) {
      return NextResponse.json(
        { error: "Source icon is not ready. Please wait for generation to complete." },
        { status: 400 }
      );
    }

    // 4. Calculate credit cost
    const creditCost = CREDIT_COST[resolution as AnimationResolution];

    // 5. Check & deduct credits (skip for admin)
    const isAdmin = (session.user as { role?: string }).role === "admin";

    if (!isAdmin) {
      let balance = 0;
      const currentCredits = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, session.user.id))
        .limit(1);

      if (currentCredits.length === 0) {
        await db.insert(userCredits).values({ userId: session.user.id, balance: 2 });
        balance = 2;
      } else {
        balance = currentCredits[0].balance;
      }

      if (balance < creditCost) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
      }

      // Deduct credits UPFRONT — onFailure handler refunds on error
      await db
        .update(userCredits)
        .set({ balance: sql`${userCredits.balance} - ${creditCost}` })
        .where(eq(userCredits.userId, session.user.id));
    }

    // 6. Insert pending animation row & dispatch Inngest job
    const jobId = crypto.randomUUID();

    await db.insert(animations).values({
      userId: session.user.id,
      jobId,
      status: "pending",
      sourceGenerationId,
      baseImageUrl: sourceGen.baseImageUrl,
      actionPrompt: actionPrompt.trim(),
      resolution: resolution as AnimationResolution,
      aspectRatio: aspectRatio as AnimationAspectRatio,
      backgroundColor,
      creditCost,
    });

    await inngest.send({
      name: "audora/animation.generate",
      data: {
        jobId,
        userId: session.user.id,
        baseImageUrl: sourceGen.baseImageUrl,
        actionPrompt: actionPrompt.trim(),
        resolution,
        aspectRatio,
        backgroundColor,
        creditCost,
      },
    });

    // Immediately return jobId — frontend polls /api/animation-status
    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("Animate error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
