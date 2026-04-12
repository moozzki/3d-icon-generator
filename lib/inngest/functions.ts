import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { db } from "../db";
import { generations, userCredits } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { uploadToR2 } from "../r2";
import sharp from "sharp";

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
  [key: string]: unknown;
};

async function falPost(
  endpoint: string,
  body: Record<string, unknown>
): Promise<FalResponse> {
  const response = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();

    // 422 Content Policy Violation — do NOT retry, fail immediately
    if (response.status === 422) {
      let userMessage = "Your prompt was flagged by the content policy. Please revise and try again.";
      try {
        const errJson = JSON.parse(errText);
        const detail = errJson?.detail?.[0];
        if (detail?.type === "content_policy_violation") {
          userMessage = "Content policy violation: your prompt contains material that cannot be processed. Please remove brand names, logos, or sensitive content and try again.";
        }
      } catch { /* ignore JSON parse fails */ }
      throw new NonRetriableError(userMessage);
    }

    // Other 4xx errors — also non-retriable (won't succeed on retry)
    if (response.status >= 400 && response.status < 500) {
      throw new NonRetriableError(
        `Fal API [${endpoint}] client error (${response.status}): ${errText}`
      );
    }

    // 5xx — retriable (transient server errors)
    throw new Error(
      `Fal API [${endpoint}] server error (${response.status}): ${errText}`
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Inngest Function
// ---------------------------------------------------------------------------

// ============================================================================
// NOTE on Fal.ai Recraft Crisp Upscaler:
//   - API only accepts `image_url` — there is NO configurable `scale` param.
//   - Crisp is a confirmed 2x multiplier: 1024×1024 input → 2048×2048 output.
//   - Therefore the strategy for flux-2-pro is:
//       • Base generation: always at 1024×1024 (cheapest Flux cost ~$0.040)
//       • To get 2K output: 1x Crisp call (1K→2K), total ~$0.044
//       • To get 4K output: 2x Crisp calls "Double Crisp" (1K→2K, 2K→4K), ~$0.048
//       This is far cheaper than generating natively at 2048×2048 (~$0.075).
//
// Pipeline matrix:
//   flux-2-pro   + 2K → gen 1K → 1x Crisp (2K)                   → ~$0.044
//   flux-2-pro   + 4K → gen 1K → 1x Crisp (2K) → 1x Crisp (4K)  → ~$0.048
//   nano-banana-2 + 2K → native 2048×2048, skip Crisp             → ~$0.14
//   nano-banana-2 + 4K → native 2048×2048 → 1x Crisp (4K)        → ~$0.144
// ============================================================================

export const iconGenerate = inngest.createFunction(
  {
    id: "generate-icon",
    name: "Generate Icon",
    triggers: [{ event: "audora/icon.generate" }],
    retries: 2,
    onFailure: async ({ event, error }) => {
      // Wrap in try-catch — if onFailure itself errors, credits are lost
      try {
        const originalEvent = event.data.event.data as IconGenerateEvent["data"];
        const { jobId, userId, creditCost } = originalEvent;
        const failReason = error?.message ?? "An unexpected error occurred.";
        console.error(`[onFailure] Job ${jobId} failed. Reason: ${failReason}`);
        console.log(`[onFailure] Attempting refund of ${creditCost} credit(s) for user ${userId}`);

        // Refund credits — guard against double-refund using creditRefunded flag.
        const [gen] = await db
          .select({ creditRefunded: generations.creditRefunded })
          .from(generations)
          .where(eq(generations.jobId, jobId))
          .limit(1);

        console.log(`[onFailure] DB row found: ${!!gen}, creditRefunded: ${gen?.creditRefunded}`);

        if (gen && !gen.creditRefunded) {
          await db.batch([
            db
              .update(userCredits)
              .set({ balance: sql`${userCredits.balance} + ${creditCost}` })
              .where(eq(userCredits.userId, userId)),

            db
              .update(generations)
              .set({ status: "failed", creditRefunded: true, failReason })
              .where(eq(generations.jobId, jobId)),
          ]);
          console.log(`[onFailure] ✅ Refunded ${creditCost} credit(s) for job ${jobId}`);
        } else {
          // Already refunded — just ensure status + failReason are updated
          await db
            .update(generations)
            .set({ status: "failed", failReason })
            .where(eq(generations.jobId, jobId));
          console.log(`[onFailure] Credits already refunded for job ${jobId}, updated status only.`);
        }
      } catch (onFailureError) {
        console.error(`[onFailure] ❌ CRITICAL: onFailure handler itself errored!`, onFailureError);
        // Still try to mark status as failed even if refund fails
        try {
          const { jobId } = event.data.event.data as IconGenerateEvent["data"];
          await db
            .update(generations)
            .set({ status: "failed", failReason: "Refund failed - contact support" })
            .where(eq(generations.jobId, jobId));
        } catch { /* last resort - nothing we can do */ }
      }
    },
  },
  async ({ event, step }) => {
    const {
      jobId,
      userId,
      prompt,
      aiModel,
      resolution,
      referenceImage,
    } = event.data as IconGenerateEvent["data"];

    // -------------------------------------------------------------------------
    // Branch A: flux-2-pro
    //
    //   Cost-optimized pipeline — always generate at 1K base, then upscale.
    //   Because Crisp inherently outputs 4096px (4K) from a 1024px input, we:
    //   - 4K path: Return the 4096px Crisp output as-is
    //   - 2K path: Downscale the 4096px Crisp output to exactly 2048px (Sharp)
    // -------------------------------------------------------------------------
    if (aiModel === "flux-2-pro") {
      // Step 1: Generate base image at 1K
      const baseUrl = await step.run("generate-base-flux-1k", async () => {
        if (referenceImage) {
          const body: Record<string, unknown> = {
            prompt,
            image_urls: [referenceImage],
            image_size: "square_hd",
            output_format: "png",
            safety_tolerance: "5",
            enable_safety_checker: false,
          };
          const json = await falPost("fal-ai/flux-2-pro/edit", body);
          const url = json.images?.[0]?.url ?? json.image?.url ?? json.url;
          if (!url) throw new Error("flux-2-pro/edit returned no image URL");
          return url as string;
        } else {
          const body: Record<string, unknown> = {
            prompt,
            image_size: { width: 1024, height: 1024 },
            output_format: "png",
            safety_tolerance: "5",
            enable_safety_checker: false,
          };
          const json = await falPost("fal-ai/flux-2-pro", body);
          const url = json.images?.[0]?.url ?? json.image?.url ?? json.url;
          if (!url) throw new Error("flux-2-pro returned no image URL");
          return url as string;
        }
      });

      // Step 2: Upload Base 1K to R2
      const baseR2Url = await step.run("upload-base-r2", async () => {
        const res = await fetch(baseUrl);
        if (!res.ok) throw new Error("Failed to download base image from Fal.ai");
        const inputBuffer = Buffer.from(await res.arrayBuffer());
        
        const sharpInstance = sharp(inputBuffer).png({ compressionLevel: 9, quality: 100 });
        const buffer = await sharpInstance.toBuffer();

        const objectKey = `generations/${userId}/base-${jobId}.png`;
        await uploadToR2(objectKey, buffer, "image/png");
        return `https://cdn.useaudora.com/${objectKey}`;
      });

      // Step 3: SeedVR Upscale
      const upscaledUrl = await step.run("upscale-seedvr", async () => {
        const upscaleFactor = resolution === "4K" ? 4 : 2;
        const json = await falPost("fal-ai/seedvr/upscale/image", {
          image_url: baseR2Url,
          upscale_mode: "factor",
          upscale_factor: upscaleFactor,
          output_format: "png",
          safety_tolerance: "5",
          enable_safety_checker: false,
        });
        const url = json.image?.url ?? json.images?.[0]?.url ?? json.url;
        if (!url) throw new Error("SeedVR returned no image URL");
        return url as string;
      });

      // Step 4: Upload final to R2 & Finalize DB
      const r2Url = await step.run("upload-to-r2-and-finalize", async () =>
        finalizeJob({ jobId, userId, imageUrl: upscaledUrl, baseImageUrl: baseR2Url, resolution })
      );

      return { jobId, url: r2Url, pipeline: "flux-2-pro", resolution };
    }

    // -------------------------------------------------------------------------
    // Branch B: nano-banana-2
    //
    //   Native output is 2048×2048 (2K).
    //   2K path: Use native output directly — Crisp is NOT called.
    //   4K path: Native 2K output → Crisp upscale → ~4096×4096.
    // -------------------------------------------------------------------------
    if (aiModel === "nano-banana-2") {
      // Phase 1: Base generation at native 2K (2048×2048)
      const baseImageUrl = await step.run(
        "generate-base-banana-2k",
        async () => {
          const body: Record<string, unknown> = {
            prompt,
            image_size: { width: 2048, height: 2048 },
            safety_tolerance: "5",
            enable_safety_checker: false,
          };
          if (referenceImage) body.image_url = referenceImage;

          const json = await falPost("fal-ai/nano-banana-2", body);
          const url =
            json.images?.[0]?.url ?? json.image?.url ?? json.url;
          if (!url) throw new Error("nano-banana-2 returned no image URL");
          return url as string;
        }
      );

      // Phase 2: Conditional upscale — only for 4K
      const finalImageUrl = await step.run(
        "conditional-upscale-banana",
        async () => {
          if (resolution === "4K") {
            // Crisp: ~2048px input → ~4096px output (4K)
            const json = await falPost("fal-ai/recraft/upscale/crisp", {
              image_url: baseImageUrl,
              safety_tolerance: "5",
              enable_safety_checker: false,
            });
            const url =
              json.image?.url ?? json.images?.[0]?.url ?? json.url;
            if (!url)
              throw new Error("Recraft Crisp upscaler returned no image URL");
            return url as string;
          }
          // resolution === "2K": native 2K output — return directly, no API call
          return baseImageUrl;
        }
      );

      // Phase 3: R2 upload + DB finalize
      const r2Url = await step.run(
        "upload-to-r2-and-finalize",
        async () => {
          return finalizeJob({
            jobId,
            userId,
            imageUrl: finalImageUrl,
            resolution,
          });
        }
      );

      return { jobId, url: r2Url, pipeline: "nano-banana-2", resolution };
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
  baseImageUrl,
  resolution,
}: {
  jobId: string;
  userId: string;
  imageUrl: string;
  baseImageUrl?: string;
  resolution?: "2K" | "4K";
}): Promise<string> {
  // 1. Buffer the image from the temporary Fal.ai URL
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Failed to download final image from Fal.ai");
  const inputBuffer = Buffer.from(await res.arrayBuffer());

  // 2. Process with Sharp to ensure consistent PNG format and "Premium" quality
  let sharpInstance = sharp(inputBuffer);

  // Apply resize if 2K is requested
  if (resolution === "2K") {
    sharpInstance = sharpInstance.resize(2048, 2048, { fit: "fill" });
  }

  // Always convert to high-quality PNG for consistency and "Premium" feel
  // 4K will also go through this to ensure it's a clean PNG.
  const buffer = (await sharpInstance
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer()) as Buffer;

  const contentType = "image/png";
  const fileExt = "png";
  const objectKey = `generations/${userId}/${jobId}.${fileExt}`;

  // 3. Upload to Cloudflare R2
  await uploadToR2(objectKey, buffer, contentType);
  const cdnUrl = `https://cdn.useaudora.com/${objectKey}`;

  // 3. Finalize DB — mark completed + set permanent URL
  //    Note: credits were already deducted upfront at the API layer
  await db
    .update(generations)
    .set({ 
      status: "completed", 
      resultImageUrl: cdnUrl,
      ...(baseImageUrl ? { baseImageUrl } : {})
    })
    .where(eq(generations.jobId, jobId));

  return cdnUrl;
}
