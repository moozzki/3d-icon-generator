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
// Position labels (human-readable, injected into style templates)
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

// ---------------------------------------------------------------------------
// Master prompt templates — one unique template per style
// Placeholders: {subject}, {position}, {quality}
// ---------------------------------------------------------------------------

type StyleKey = "plastic" | "clay" | "glass" | "plush" | "toy_block" | "metallic";

const STYLE_MASTER_PROMPTS: Record<StyleKey, string> = {
  plastic:
    "A highly detailed 3D icon of {subject} in a smooth plastic material style, featuring soft reflections, subtle surface highlights and subtle shadow. {position}, clean composition. Rendered with soft, diffused studio lighting, minimal shadows, and a modern aesthetic. Isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  clay:
    "A stylized 3D icon of {subject} made of soft clay material, with slightly imperfect edges and handcrafted texture details. {position}, balanced composition. Rendered with soft lighting to enhance depth and tactile feel. Clean and minimal, isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  glass:
    "A premium 3D icon of {subject} made of translucent glass material, featuring realistic refraction, reflections, and light dispersion. {position}, elegant composition. Rendered with studio lighting to emphasize transparency and highlights. Isolated on a pure white background with a subtle shadow. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  plush:
    "A cute 3D icon of {subject} in a plush fabric style, with soft fibers, fuzzy texture, and rounded shapes. {position}, friendly and playful composition. Rendered with soft lighting and subtle shadow to enhance warmth and depth. Clean background, isolated on pure white. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  toy_block:
    "A playful 3D icon of {subject} in a toy building block style, featuring bold shapes, vibrant colors, and smooth surfaces. {position}, structured composition. Rendered in a clean modern 3D aesthetic with soft lighting and subtle shadow. Isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  metallic:
    "A high-end 3D icon of {subject} in a metallic chrome material style, featuring polished surfaces, sharp reflections, realistic highlights and subtle shadow. {position}, strong composition. Rendered with studio lighting to enhance contrast and material depth. Clean and minimal, isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",
};

// ---------------------------------------------------------------------------
// Master prompt templates for IMAGE-TO-IMAGE (Reference Upload)
// Placeholders: {subject}, {position}, {quality}
// ---------------------------------------------------------------------------

const STYLE_REF_PROMPTS: Record<StyleKey, string> = {
  plastic:
    "Transform {subject} into a highly detailed 3D character/icon in a premium matte vinyl designer toy style. {position}, clean composition. Maintain the core identity and clothing style of the reference, but render it as a smooth, non-glossy plastic figure. Feature soft, diffused ambient lighting with minimal shadows and no harsh specular highlights. Muted, elegant color palette. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  clay:
    "Transform {subject} into a stylized 3D icon made of soft clay material. {position}, balanced composition. Maintain the core identity of the reference. Add slightly imperfect edges and handcrafted texture details. Rendered with soft lighting to enhance tactile depth. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  glass:
    "Transform {subject} into a premium 3D icon made of translucent glass material. {position}, elegant composition. Maintain the core identity of the reference. Feature realistic refraction, reflections, and light dispersion. Rendered with studio lighting. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF) with a subtle shadow. Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  plush:
    "Transform {subject} into a cute 3D icon in a plush fabric style. {position}, friendly and playful composition. Maintain the core identity of the reference. Feature soft fibers, fuzzy texture, and rounded shapes. Rendered with soft lighting and subtle shadow. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  toy_block:
    "Transform {subject} into a playful 3D icon in a toy building block style. {position}, structured composition. Maintain the core identity of the reference. Feature bold shapes, vibrant colors, and smooth interlocking surfaces. Rendered with soft lighting. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  metallic:
    "Transform {subject} into a high-end 3D icon in a metallic chrome material style. {position}, strong composition. Maintain the core identity of the reference. Feature polished surfaces, sharp reflections, realistic highlights, and subtle shadow. Rendered with studio lighting. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildEngineeredPrompt(
  userPrompt: string,
  style: StyleKey,
  position: string,
  quality: string
): string {
  const positionLabel = POSITION_PROMPTS[position] ?? position;
  const template = STYLE_MASTER_PROMPTS[style];
  return template
    .replace("{subject}", userPrompt)
    .replace("{position}", positionLabel)
    .replace("{quality}", quality);
}

// ---------------------------------------------------------------------------
// Prompt builder specifically for Reference Image workflow
// ---------------------------------------------------------------------------

function buildRefEngineeredPrompt(
  userPrompt: string | undefined | null,
  style: StyleKey,
  position: string,
  quality: string
): string {
  // Graceful fallback for empty inputs
  const rawSubject = userPrompt?.trim() || "";
  const finalSubject = rawSubject !== ""
    ? rawSubject
    : "the exact main subject from the provided reference image";

  // Re-map position parameter
  const positionLabel = POSITION_PROMPTS[position] ?? position;
  const template = STYLE_REF_PROMPTS[style];

  return template
    .replace("{subject}", finalSubject)
    .replace("{position}", positionLabel)
    .replace("{quality}", quality);
}

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

    // 6. Build engineered prompt — branch T2I vs I2I based on referenceImage
    const engineeredPrompt = hasReference
      ? buildRefEngineeredPrompt(
          userPrompt?.trim(),
          style as StyleKey,
          position,
          quality
        )
      : buildEngineeredPrompt(
          userPrompt.trim(),
          style as StyleKey,
          position,
          quality
        );

    // 7. Insert pending generation row & dispatch job
    const jobId = crypto.randomUUID();

    await db.insert(generations).values({
      userId: session.user.id,
      jobId,
      status: "pending",
      aiModel: aiModel as AiModel,
      prompt: engineeredPrompt,          // full engineered prompt → sent to Fal.ai
      userPrompt: userPrompt.trim(),     // raw user input → shown on frontend
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
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error", 
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}
