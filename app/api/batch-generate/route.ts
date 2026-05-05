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
} from "@/lib/prompts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BATCH_SIZE = 9;

type AiModel = "flux-2-pro";
type Quality = "2K" | "4K";

const CREDIT_COST_MATRIX: Record<AiModel, Record<Quality, number>> = {
  "flux-2-pro": { "2K": 1, "4K": 2 },
};

const VALID_AI_MODELS: AiModel[] = ["flux-2-pro"];
const VALID_QUALITIES: Quality[] = ["2K", "4K"];

// ---------------------------------------------------------------------------
// POST /api/batch-generate
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Rate Limiting
    const { success, limit, remaining, reset } = await generationRateLimit.limit(
      `batch:${session.user.id}`
    );
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
      stylePrompt,
      items,
      position,
      style = "plastic",
      quality,
      aiModel = "flux-2-pro",
      color = null,
    } = await request.json();

    // 2. Validate parameters
    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > MAX_BATCH_SIZE ||
      !POSITION_PROMPTS[position] ||
      !STYLE_MASTER_PROMPTS[style as StyleKey] ||
      !VALID_QUALITIES.includes(quality) ||
      !VALID_AI_MODELS.includes(aiModel)
    ) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: `items must be 1–${MAX_BATCH_SIZE} non-empty strings`,
        },
        { status: 400 }
      );
    }

    // Sanitize items: trim and filter empty strings
    const sanitizedItems: string[] = items
      .map((i: unknown) => (typeof i === "string" ? i.trim() : ""))
      .filter((i: string) => i.length > 0);

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid item name is required" },
        { status: 400 }
      );
    }

    // 3. Calculate total credit cost
    const creditCostPerItem = CREDIT_COST_MATRIX[aiModel as AiModel][quality as Quality];
    const totalCreditCost = sanitizedItems.length * creditCostPerItem;

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

      if (balance < totalCreditCost) {
        return NextResponse.json(
          {
            error: "Insufficient credits",
            required: totalCreditCost,
            available: balance,
          },
          { status: 403 }
        );
      }

      // 5. Deduct ALL credits upfront (before dispatching)
      //    On individual item failure, onFailure hook in functions.ts refunds that item's cost.
      await db
        .update(userCredits)
        .set({ balance: sql`${userCredits.balance} - ${totalCreditCost}` })
        .where(eq(userCredits.userId, session.user.id));
    }

    // ---------------------------------------------------------------------------
    // 6. Generate shared batchId and seed
    //
    //    CRITICAL: The SAME seed is passed to EVERY Fal.ai request in this batch.
    //    This is what makes the lighting, texture, and color palette look identical
    //    across all icons — turning them into a cohesive, professional-looking set.
    // ---------------------------------------------------------------------------
    const batchId = crypto.randomUUID();

    // Generate a random seed in Fal.ai's valid range (0 – 9,999,999,999)
    // Math.random() gives [0, 1) → multiply by 1e10 and floor → integer in [0, 9999999999]
    const sharedSeed = Math.floor(Math.random() * 10_000_000_000);

    const formattedPosition = position as string;

    // 7. Build engineered prompts + job IDs for all items
    const batchJobs = sanitizedItems.map((itemName) => {
      // Use the item name directly as the user prompt.
      // stylePrompt is intentionally empty — the master style is baked in via buildEngineeredPrompt.
      const itemPrompt = `${itemName} icon`;
      const engineeredPrompt = buildEngineeredPrompt(
        itemPrompt,
        style as StyleKey,
        formattedPosition,
        quality,
        color
      );
      return {
        jobId: crypto.randomUUID(),
        itemName,
        engineeredPrompt,
        creditCostPerItem,
      };
    });

    // 8. Bulk insert all pending generation rows
    await db.insert(generations).values(
      batchJobs.map(({ jobId, itemName, engineeredPrompt, creditCostPerItem: cost }) => ({
        userId: session.user.id,
        jobId,
        status: "pending" as const,
        aiModel: aiModel as AiModel,
        prompt: engineeredPrompt,
        userPrompt: itemName, // display item name on frontend
        position: formattedPosition as
          | "isometric"
          | "front_facing"
          | "back_facing"
          | "side_facing"
          | "three_quarter"
          | "top_down"
          | "dimetric",
        style: style as "plastic" | "clay" | "glass" | "plush" | "toy_block" | "metallic",
        quality: quality as Quality,
        cost,
        creditCost: cost,
        color,
        batchId,
        seed: sharedSeed,
      }))
    );

    // 9. Dispatch all Inngest events in parallel
    //    Promise.all ensures all items start generating simultaneously —
    //    not sequentially (which would be slow and risk Vercel timeouts).
    await Promise.all(
      batchJobs.map(({ jobId, engineeredPrompt, creditCostPerItem: cost }) =>
        inngest.send({
          name: "audora/icon.generate",
          data: {
            jobId,
            userId: session.user.id,
            prompt: engineeredPrompt,
            aiModel,
            resolution: quality,
            referenceImage: null,
            creditCost: cost,
            // CRITICAL: pass the identical seed to ALL events in this batch
            seed: sharedSeed,
            batchId,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      batchId,
      jobIds: batchJobs.map((j) => ({ jobId: j.jobId, itemName: j.itemName })),
      totalCreditCost,
      seed: sharedSeed, // returned for debugging / display purposes
    });
  } catch (error) {
    console.error("Batch generate error:", error);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      {
        error: "Internal Server Error",
        ...(isDev && error instanceof Error ? { details: error.stack } : {}),
      },
      { status: 500 }
    );
  }
}
