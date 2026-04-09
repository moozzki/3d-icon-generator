import { inngest } from "./client";
import { db } from "../db";
import { generations, userCredits } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { uploadToR2 } from "../r2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IconGenerateEvent = {
  data: {
    jobId: string;
    userId: string;
    prompt: string;
    aiModel: "flux-2-pro" | "nano-banana-2";
    resolution: "2K" | "4K";
    referenceImage?: string | null;
    creditCost: number;
  };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAL_BASE = "https://fal.run";

// ---------------------------------------------------------------------------
// Helper: call Fal.ai
// ---------------------------------------------------------------------------

type FalResponse = {
  images?: { url: string }[];
  image?: { url: string };
  url?: string;
  [key: string]: unknown; // Allow other fields
};

async function falPost(endpoint: string, body: Record<string, unknown>): Promise<FalResponse> {
  const response = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errInfo = await response.text();
    throw new Error(`Fal API [${endpoint}] failed (${response.status}): ${errInfo}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Inngest Function
// ---------------------------------------------------------------------------

export const iconGenerate = inngest.createFunction(
  {
    id: "generate-icon",
    name: "Generate Icon",
    triggers: [{ event: "audora/icon.generate" }],
    retries: 2,
    onFailure: async ({ event, error }) => {
      const { jobId, userId, creditCost } = event.data.event.data as IconGenerateEvent["data"];
      console.error(`Job ${jobId} failed completely.`, error);

      // Refund credits — they were deducted upfront at the API layer
      await db.batch([
        db.update(userCredits)
          .set({ balance: sql`${userCredits.balance} + ${creditCost}` })
          .where(eq(userCredits.userId, userId)),

        db.update(generations)
          .set({ status: "failed" })
          .where(eq(generations.jobId, jobId)),
      ]);
    },
  },
  async ({ event, step }) => {
    const { jobId, userId, prompt, aiModel, resolution, referenceImage, creditCost } =
      event.data as IconGenerateEvent["data"];

    // -------------------------------------------------------------------------
    // Branch A: flux-2-pro
    //   Step 1: Generate 1K base image
    //   Step 2: Mandatory upscale to 2K or 4K (Recraft Crisp)
    // -------------------------------------------------------------------------
    if (aiModel === "flux-2-pro") {
      // Phase 1: Base generation at 1K
      const baseImageUrl = await step.run("generate-base-flux", async () => {
        const body: Record<string, unknown> = {
          prompt,
          image_size: { width: 1024, height: 1024 },
        };
        if (referenceImage) body.image_url = referenceImage;

        const json = await falPost("fal-ai/flux-2-pro", body);
        const url = json.images?.[0]?.url ?? json.image?.url ?? json.url;
        if (!url) throw new Error("flux-2-pro returned no image URL");
        return url as string;
      });

      // Phase 2: Mandatory upscale (1K → 2K or 4K)
      const upscaledUrl = await step.run("upscale-flux-crisp", async () => {
        const scale = resolution === "4K" ? 4 : 2;
        const json = await falPost("fal-ai/recraft/upscale/crisp", {
          image_url: baseImageUrl,
          scale,
        });
        const url = json.image?.url ?? json.images?.[0]?.url ?? json.url;
        if (!url) throw new Error("Recraft Crisp upscaler returned no image URL");
        return url as string;
      });

      // Phase 3 & 4: R2 upload + DB finalize
      const r2Url = await step.run("upload-to-r2-and-finalize", async () => {
        return finalizeJob({ jobId, userId, imageUrl: upscaledUrl, creditCost });
      });

      return { jobId, url: r2Url, pipeline: "flux-2-pro" };
    }

    // -------------------------------------------------------------------------
    // Branch B: nano-banana-2
    //   Step 1: Generate native 2K base image
    //   Step 2: Conditional — upscale to 4K only if resolution === "4K"
    // -------------------------------------------------------------------------
    if (aiModel === "nano-banana-2") {
      // Phase 1: Base generation at native 2K
      const baseImageUrl = await step.run("generate-base-banana", async () => {
        const body: Record<string, unknown> = {
          prompt,
          image_size: { width: 2048, height: 2048 },
        };
        if (referenceImage) body.image_url = referenceImage;

        const json = await falPost("fal-ai/nano-banana-2", body);
        const url = json.images?.[0]?.url ?? json.image?.url ?? json.url;
        if (!url) throw new Error("nano-banana-2 returned no image URL");
        return url as string;
      });

      // Phase 2: Conditional upscale (only if 4K — skip when 2K)
      const finalImageUrl = await step.run("conditional-upscale-banana", async () => {
        if (resolution === "4K") {
          const json = await falPost("fal-ai/recraft/upscale/crisp", {
            image_url: baseImageUrl,
            scale: 2, // 2K → 4K = scale factor 2
          });
          const url = json.image?.url ?? json.images?.[0]?.url ?? json.url;
          if (!url) throw new Error("Recraft Crisp upscaler returned no image URL");
          return url as string;
        }
        // resolution === "2K": return the native 2K directly — no API call needed
        return baseImageUrl;
      });

      // Phase 3 & 4: R2 upload + DB finalize
      const r2Url = await step.run("upload-to-r2-and-finalize", async () => {
        return finalizeJob({ jobId, userId, imageUrl: finalImageUrl, creditCost });
      });

      return { jobId, url: r2Url, pipeline: "nano-banana-2" };
    }

    throw new Error(`Unknown aiModel: ${aiModel}`);
  }
);

// ---------------------------------------------------------------------------
// Shared finalization logic
// ---------------------------------------------------------------------------

async function finalizeJob({
  jobId,
  userId,
  imageUrl,
  creditCost,
}: {
  jobId: string;
  userId: string;
  imageUrl: string;
  creditCost: number;
}): Promise<string> {
  // 1. Buffer the image from the temporary Fal.ai URL
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Failed to download final image from Fal.ai");
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/png";
  const fileExt = contentType === "image/jpeg" ? "jpg" : "png";
  const objectKey = `generations/${userId}/${jobId}.${fileExt}`;

  // 2. Upload to Cloudflare R2
  await uploadToR2(objectKey, buffer, contentType);
  const cdnUrl = `https://cdn.useaudora.com/${objectKey}`;

  // 3. Finalize DB — mark completed + set permanent URL
  //    Note: credits were already deducted upfront at the API layer
  await db
    .update(generations)
    .set({ status: "completed", resultImageUrl: cdnUrl })
    .where(eq(generations.jobId, jobId));

  return cdnUrl;
}
