import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";
import { fal } from "@fal-ai/client";

// Configure fal client with server-side credentials
fal.config({
  credentials: process.env.FAL_KEY!,
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // 2. Query the generation row — ensure the user owns it
    const [generation] = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.jobId, jobId),
          eq(generations.userId, userId)
        )
      )
      .limit(1);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    if (!generation.resultImageUrl) {
      return NextResponse.json(
        { error: "Original image not available yet" },
        { status: 400 }
      );
    }

    // 3. Cache check — if transparentImageUrl already exists, return it immediately
    if (generation.transparentImageUrl) {
      return NextResponse.json({ url: generation.transparentImageUrl });
    }

    // 4. Call BiRefNet v2 via fal.subscribe
    const is4K = generation.quality === "4K";

    const result = await fal.subscribe("fal-ai/birefnet/v2", {
      input: {
        image_url: generation.resultImageUrl,
        model: is4K ? "General Use (Dynamic)" : "General Use (Light)",
        operating_resolution: is4K ? "2304x2304" : "2048x2048",
        refine_foreground: true,
        output_format: "png",
      },
      logs: false,
    });

    // Extract the image URL from the result
    const data = result.data as { image?: { url: string } };
    const transparentUrl = data?.image?.url;

    if (!transparentUrl) {
      console.error("[REMOVE_BG] BiRefNet returned no image URL", result);
      return NextResponse.json(
        { error: "Background removal failed — no image returned" },
        { status: 500 }
      );
    }

    // 5. Download the transparent image and upload to R2 for permanent caching
    const imgRes = await fetch(transparentUrl);
    if (!imgRes.ok) {
      throw new Error("Failed to download transparent image from Fal.ai");
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const objectKey = `generations/${userId}/transparent-${jobId}.png`;
    await uploadToR2(objectKey, buffer, "image/png");
    const permanentUrl = `https://cdn.useaudora.com/${objectKey}`;

    // 6. Update DB with the cached transparent URL
    await db
      .update(generations)
      .set({ transparentImageUrl: permanentUrl })
      .where(eq(generations.jobId, jobId));

    return NextResponse.json({ url: permanentUrl });
  } catch (error) {
    console.error("[REMOVE_BG_ERROR]", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
