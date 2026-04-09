import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits, generations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { generationRateLimit } from "@/lib/rate-limit";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Prompt engineering maps
// ---------------------------------------------------------------------------

const POSITION_PROMPTS: Record<string, string> = {
  isometric: "isometric 3D render, perfectly orthographic projection, uniform scale",
  front_facing: "straight-on front view, symmetrical composition, zero degree angle",
  back_facing: "straight-on back view, rear angle, symmetrical",
  side_facing: "pure side profile view, orthogonal side camera",
  three_quarter: "3/4 perspective angle, dynamic three-quarter view exposing front and side",
  top_down: "top-down flat-lay view, bird's eye perspective, perfectly straight from above",
  dimetric: "dimetric 3D render, angled perspective showing subtle depth",
};

const STYLE_PROMPTS: Record<string, string> = {
  plastic: "smooth plastic material, glossy finish, clean subtle reflections, solid pure color, smooth and sleek",
  clay: "clay material, soft matte finish, rounded smooth shapes, clay render style",
  glass: "transparent glass material, reflections, caustics, glass render style",
  plush: "plush fabric texture, soft fluffy, stuffed toy style",
  toy_block: "blocky voxel shapes, toy building block style, LEGO-like",
  metallic: "metallic chrome material, reflective surface, metal render style",
};

// ---------------------------------------------------------------------------
// Credit cost matrix
//   flux-2-pro  + 2K = 1 Credit
//   flux-2-pro  + 4K = 2 Credits
//   nano-banana-2 + 2K = 2 Credits
//   nano-banana-2 + 4K = 3 Credits
// ---------------------------------------------------------------------------

type AiModel = "flux-2-pro" | "nano-banana-2";
type Quality = "2K" | "4K";

const CREDIT_COST_MATRIX: Record<AiModel, Record<Quality, number>> = {
  "flux-2-pro": { "2K": 1, "4K": 2 },
  "nano-banana-2": { "2K": 2, "4K": 3 },
};

const VALID_AI_MODELS: AiModel[] = ["flux-2-pro", "nano-banana-2"];
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
    } = await request.json();

    // 2. Validate parameters
    if (
      !POSITION_PROMPTS[position] ||
      !STYLE_PROMPTS[style] ||
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

    // 6. Prompt Engineering
    const engineeredPrompt = `A high quality 3D icon of ${userPrompt}. ${POSITION_PROMPTS[position]}. Style: ${STYLE_PROMPTS[style]}. Rendered in a modern 3D style, soft lighting, highly detailed, clean design, isolated on a pure white background.`;

    // 7. Insert pending generation row & dispatch job
    const jobId = crypto.randomUUID();

    await db.insert(generations).values({
      userId: session.user.id,
      jobId,
      status: "pending",
      aiModel: aiModel as AiModel,
      prompt: engineeredPrompt,
      position: position as "isometric" | "front_facing" | "back_facing" | "side_facing" | "three_quarter" | "top_down" | "dimetric",
      style: style as "plastic" | "clay" | "glass" | "plush" | "toy_block" | "metallic",
      quality: quality as Quality,
      cost: creditCost,
      creditCost,
      referenceImage,
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
      },
    });

    // Immediately return jobId — frontend polls /api/job-status
    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
