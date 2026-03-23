import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { userCredits, generations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generationRateLimit } from "@/lib/rate-limit";
import { uploadToR2 } from "@/lib/r2";

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

    // 1. Rate Limiting Check (Upstash Redis)
    const { success, limit, remaining, reset } = await generationRateLimit.limit(session.user.id);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString()
        }
      });
    }

    const { userPrompt, position, quality, referenceImage = null } = await request.json();

    if (!POSITION_PROMPTS[position] || !QUALITY_SETTINGS[quality]) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 2. Checking user credit
    const isAdmin = (session.user as any).role === "admin";
    let balance = 0;
    const requiredCredits = QUALITY_SETTINGS[quality].cost;

    if (!isAdmin) {
      const currentCredits = await db.select().from(userCredits).where(eq(userCredits.userId, session.user.id)).limit(1);
      
      if (currentCredits.length === 0) {
        await db.insert(userCredits).values({
          userId: session.user.id,
          balance: 2,
        });
        balance = 2;
      } else {
        balance = currentCredits[0].balance;
      }

      if (balance < requiredCredits) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 403 });
      }
    }

    // 3. Prompt Engineering
    const engineeredPrompt = `A high quality 3D icon of ${userPrompt}. ${POSITION_PROMPTS[position]}. rendered in a modern 3D style, soft lighting, highly detailed, clean design, isolated on a pure white background.`;
    
    // Simulate Fal APi (As this is MVP base setup)
    // Here we download a dummy image to simulate AI Generation taking some time and returning an image.
    // If you have FAL_KEY, you would call Fal.ai here, get the resulting image URL, and download it.
    const imageRes = await fetch("https://picsum.photos/512/512");
    if (!imageRes.ok) {
      throw new Error("Failed to generate image from AI provider");
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload to Cloudflare R2
    const ext = "png";
    const uniqueId = crypto.randomUUID();
    const objectKey = `generations/${session.user.id}/${uniqueId}.${ext}`;
    
    const resultUrl = await uploadToR2(objectKey, buffer, "image/png");

    // 5. Deduct credits and insert record
    if (!isAdmin) {
      await db.update(userCredits)
        .set({ balance: balance - requiredCredits })
        .where(eq(userCredits.userId, session.user.id));
    }
      
    await db.insert(generations).values({
      userId: session.user.id,
      prompt: userPrompt,
      position: position as any,
      quality: quality as any,
      cost: requiredCredits,
      referenceImage,
      resultImageUrl: resultUrl
    });

    return NextResponse.json({ success: true, resultUrl });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
