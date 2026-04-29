import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits, generations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { generationRateLimit } from "@/lib/rate-limit";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

import { 
  POSITION_PROMPTS, 
  STYLE_MASTER_PROMPTS, 
  type StyleKey, 
  buildEngineeredPrompt, 
  buildRefEngineeredPrompt, 
  buildRefineEngineeredPrompt 
} from "@/lib/prompts";

// ---------------------------------------------------------------------------
// Credit cost matrix
//   flux-2-pro  + 2K = 1 Credit
//   flux-2-pro  + 4K = 2 Credits
// ---------------------------------------------------------------------------

type AiModel = "flux-2-pro";
type Quality = "2K" | "4K";

const CREDIT_COST_MATRIX: Record<AiModel, Record<Quality, number>> = {
  "flux-2-pro": { "2K": 1, "4K": 2 },
};

const VALID_AI_MODELS: AiModel[] = ["flux-2-pro"];
const VALID_QUALITIES: Quality[] = ["2K", "4K"];

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Rate Limiting (Upstash Redis)
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
      userPrompt,
      position,
      style = "plastic",
      quality,
      aiModel = "flux-2-pro",
      referenceImage = null,
      isRefine = false,
      color = null,
      keepMultiplePeople = false,
    } = await request.json();

    // 2. Validate parameters
    //    userPrompt is optional when a referenceImage is provided (I2I fallback)
    const hasPrompt = !!userPrompt?.trim();
    const hasReference = !!referenceImage;

    if (
      (!hasPrompt && !hasReference) ||
      !POSITION_PROMPTS[position] ||
      !STYLE_MASTER_PROMPTS[style as StyleKey] ||
      !VALID_QUALITIES.includes(quality) ||
      !VALID_AI_MODELS.includes(aiModel)
    ) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 3. Calculate dynamic credit cost
    const creditCost = CREDIT_COST_MATRIX[aiModel as AiModel][quality as Quality];

    // 4. Check user credit balance
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

      // 5. Deduct credits UPFRONT (before dispatching to Inngest)
      //    If the job fails, onFailure hook in functions.ts will refund them.
      await db
        .update(userCredits)
        .set({ balance: sql`${userCredits.balance} - ${creditCost}` })
        .where(eq(userCredits.userId, session.user.id));
    }

    // 6. Build engineered prompt — branch T2I vs I2I vs Refine based on flags
    let engineeredPrompt = "";
    if (isRefine && hasReference) {
      engineeredPrompt = buildRefineEngineeredPrompt(
        userPrompt?.trim(),
        style as StyleKey,
        position,
        quality,
        color
      );
    } else if (hasReference) {
      engineeredPrompt = buildRefEngineeredPrompt(
        userPrompt?.trim(),
        style as StyleKey,
        position,
        quality,
        color,
        keepMultiplePeople
      );
    } else {
      engineeredPrompt = buildEngineeredPrompt(
        userPrompt?.trim() || "",
        style as StyleKey,
        position,
        quality,
        color
      );
    }

    // 7. Insert pending generation row & dispatch job
    const jobId = crypto.randomUUID();

    await db.insert(generations).values({
      userId: session.user.id,
      jobId,
      status: "pending",
      aiModel: aiModel as AiModel,
      prompt: engineeredPrompt,          // full engineered prompt → sent to Fal.ai
      userPrompt: userPrompt?.trim() || "",     // raw user input → shown on frontend
      position: position as "isometric" | "front_facing" | "back_facing" | "side_facing" | "three_quarter" | "top_down" | "dimetric",
      style: style as "plastic" | "clay" | "glass" | "plush" | "toy_block" | "metallic",
      quality: quality as Quality,
      cost: creditCost,
      creditCost,
      referenceImage,
      color,
    });

    await inngest.send({
      name: "audora/icon.generate",
      data: {
        jobId,
        userId: session.user.id,
        prompt: engineeredPrompt,
        aiModel,
        resolution: quality,
        referenceImage,
        creditCost,
        keepMultiplePeople,
      },
    });

    // Immediately return jobId — frontend polls /api/job-status
    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error", 
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}
