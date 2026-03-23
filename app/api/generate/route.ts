import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits, generations, positionEnum, qualityEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
// import { generationRateLimit } from "@/lib/rate-limit"; // Assuming rate limit is set up with standard configs

const POSITION_PROMPTS: Record<string, string> = {
  isometric: "isometric 3D render, perfectly orthographic projection, uniform scale",
  front_facing: "straight-on front view, symmetrical composition, zero degree angle",
  back_facing: "straight-on back view, rear angle, symmetrical",
  side_facing: "pure side profile view, orthogonal side camera",
  three_quarter: "3/4 perspective angle, dynamic three-quarter view exposing front and side",
  top_down: "top-down flat-lay view, bird's eye perspective, perfectly straight from above",
  dimetric: "dimetric 3D render, angled perspective showing subtle depth"
};

const QUALITY_SETTINGS: Record<string, { width: number; height: number; cost: number }> = {
  "2K": { width: 2048, height: 2048, cost: 1 },
  "4K": { width: 3840, height: 3840, cost: 2 }
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userPrompt, position, quality, referenceImage = null } = await request.json();

    if (!POSITION_PROMPTS[position] || !QUALITY_SETTINGS[quality]) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Checking user credit
    const currentCredits = await db.select().from(userCredits).where(eq(userCredits.userId, session.user.id)).limit(1);
    const balance = currentCredits[0]?.balance || 0;
    const requiredCredits = QUALITY_SETTINGS[quality].cost;

    if (balance < requiredCredits) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
    }

    // Prompt Engineering
    const engineeredPrompt = `A high quality 3D icon of ${userPrompt}. ${POSITION_PROMPTS[position]}. rendered in a modern 3D style, soft lighting, highly detailed, clean design, isolated on a pure white background.`;
    
    // Simulate Fal APi (As this is MVP base setup)
    // 1. Call fal.ai API with engineeredPrompt and dimensions
    // 2. Upload to Cloudflare R2
    
    // DUMMY RESPONSE FOR NOW
    const dummyResultUrl = "https://example.com/dummy-3d-icon.png";

    // Deduct credits and insert record
    await db.update(userCredits)
      .set({ balance: balance - requiredCredits })
      .where(eq(userCredits.userId, session.user.id));
      
    await db.insert(generations).values({
      userId: session.user.id,
      prompt: userPrompt,
      position: position as any,
      quality: quality as any,
      cost: requiredCredits,
      referenceImage,
      resultImageUrl: dummyResultUrl
    });

    return NextResponse.json({ success: true, resultUrl: dummyResultUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
