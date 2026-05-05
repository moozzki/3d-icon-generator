import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { db } from "../db";
import { generations, userCredits, animations } from "../db/schema";
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
    aiModel: "flux-2-pro";
    resolution: "2K" | "4K";
    referenceImage?: string | null;
    creditCost: number;
    seed?: number;    // Shared seed for all items in a batch — guarantees visual consistency
    batchId?: string; // Shared batch identifier — null for single generations
  };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FAL_BASE = "https://fal.run";
const FAL_QUEUE_BASE = "https://queue.fal.run";

// ---------------------------------------------------------------------------
// Helper: call Fal.ai (synchronous — for fast endpoints like upscale)
// ---------------------------------------------------------------------------

type FalResponse = {
  images?: { url: string }[];
  image?: { url: string };
  url?: string;
  [key: string]: unknown;
};

function handleFalError(endpoint: string, status: number, errText: string): never {
  // 422 Content Policy Violation — do NOT retry, fail immediately
  if (status === 422) {
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
  if (status >= 400 && status < 500) {
    throw new NonRetriableError(
      `Fal API [${endpoint}] client error (${status}): ${errText}`
    );
  }

  // 5xx — retriable (transient server errors)
  throw new Error(
    `Fal API [${endpoint}] server error (${status}): ${errText}`
  );
}

async function falPost(
  endpoint: string,
  body: Record<string, unknown>
): Promise<FalResponse> {
  let response: Response | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(`${FAL_BASE}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      console.warn(`[falPost] submit failed attempt ${attempt}:`, err);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!response) throw new Error(`Failed to POST to [${endpoint}]`);

  if (!response.ok) {
    const errText = await response.text();
    handleFalError(endpoint, response.status, errText);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Helper: call Fal.ai via Queue API (for large payloads / long-running jobs)
//   Using Inngest step.run and step.sleep to avoid Vercel timeouts.
// ---------------------------------------------------------------------------

async function falPostQueueInngest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any,
  stepPrefix: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<FalResponse> {
  const authHeader = `Key ${process.env.FAL_KEY}`;

  return step.run(`${stepPrefix}-sync-poll`, async () => {
    // 1. Submit to queue
    let submitRes: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        submitRes = await fetch(`${FAL_QUEUE_BASE}/${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!submitRes) throw new Error(`[${stepPrefix}] Failed to submit to fal queue`);

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      handleFalError(endpoint, submitRes.status, errText);
    }

    const submitJson = (await submitRes.json()) as { 
      request_id: string; 
      status_url: string; 
      response_url: string; 
    };
    
    if (!submitJson.request_id || !submitJson.status_url || !submitJson.response_url) {
      throw new Error(`Fal queue returned incomplete response. Missing URLs or request_id.`);
    }

    const { request_id, status_url, response_url } = submitJson;

    // 2. Poll for completion synchronously
    let isCompleted = false;
    let pollCount = 0;
    // 37 attempts * 1.5s sleep = ~55.5s timeout (protects Vercel's 60s hard limit)
    while (!isCompleted && pollCount < 37) {
      pollCount++;
      await new Promise(r => setTimeout(r, 1500));

      let errToThrow: Error | null = null;
      try {
        const statusRes = await fetch(status_url, { 
          headers: { Authorization: authHeader } 
        });

        if (!statusRes.ok) continue; // Transient API error, keep polling

        const statusData = (await statusRes.json()) as { status: string };
        const statusUpper = (statusData.status || "").toUpperCase();

        if (statusUpper === "FAILED") {
          errToThrow = new NonRetriableError(
            `Fal queue [${endpoint}] job ${request_id} failed on Fal.ai side.`
          );
        } else if (statusUpper === "COMPLETED") {
          isCompleted = true;
          break;
        }
      } catch {
        // Transient network error parsing json or fetching, keep polling
      }

      if (errToThrow) throw errToThrow;
    }

    if (!isCompleted) {
      throw new Error(`[${stepPrefix}] Polling timed out (55s) for request ${request_id}`);
    }

    // 3. Fetch the final result
    let resultRes: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        resultRes = await fetch(response_url, { 
          headers: { Authorization: authHeader } 
        });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!resultRes) throw new Error(`[${stepPrefix}] Failed to fetch result`);

    if (!resultRes.ok) {
      const errText = await resultRes.text();
      handleFalError(endpoint, resultRes.status, errText);
    }

    return resultRes.json();
  });
}


// ---------------------------------------------------------------------------
// Inngest Function
// ---------------------------------------------------------------------------

// ============================================================================
// NOTE on Fal.ai Recraft Crisp Upscaler:
//   - API only accepts `image_url` — there is NO configurable `scale` param.
//   - Crisp is a confirmed 2x multiplier: 1024×1024 input → 2048×2048 output.
//   - Strategy for flux-2-pro:
//       • Base generation: always at 1024×1024 (cheapest Flux cost ~$0.040)
//       • To get 2K output: 1x SeedVR call (1K→2K), total ~$0.044
//       • To get 4K output: 1x SeedVR call (1K→4K),              ~$0.048
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
      seed,
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
      let baseUrl: string;
      if (referenceImage) {
        const body = await step.run("prepare-ref-image", async () => {
          // Download the reference image from R2 and encode it as a base64 data URI.
          // Fal.ai explicitly supports data URI file inputs, which avoids any CDN
          // accessibility issues that arise when Fal.ai tries to fetch from our CDN.
          const refRes = await fetch(referenceImage);
          if (!refRes.ok) throw new Error(`Failed to download reference image from CDN: ${refRes.status}`);
          const refBuffer = await refRes.arrayBuffer();
          const contentType = refRes.headers.get("content-type") || "image/png";
          const base64 = Buffer.from(refBuffer).toString("base64");
          const dataUri = `data:${contentType};base64,${base64}`;

          return {
            prompt,
            image_urls: [dataUri],
            image_size: "square_hd",
            output_format: "png",
            safety_tolerance: "5",
            enable_safety_checker: false,
          };
        });

        // Use standard durable execution to poll the Fal queue, avoiding Vercel timeouts.
        const json = await falPostQueueInngest(step, "flux-edit", "fal-ai/flux-2-pro/edit", body);
        baseUrl = (json.images?.[0]?.url ?? json.image?.url ?? json.url) as string;
        if (!baseUrl) throw new NonRetriableError("flux-2-pro/edit returned no image URL");
      } else {
        baseUrl = await step.run("generate-base-flux-1k", async () => {
          const payload: Record<string, unknown> = {
            prompt,
            image_size: { width: 1024, height: 1024 },
            output_format: "png",
            safety_tolerance: "5",
            enable_safety_checker: false,
            // CRITICAL: inject the exact same seed for every item in a batch.
            // This locks the lighting, texture, and color palette to be consistent
            // across all icons in the same set.
            ...(seed != null ? { seed } : {}),
          };
          const json = await falPost("fal-ai/flux-2-pro", payload);
          const url = json.images?.[0]?.url ?? json.image?.url ?? json.url;
          if (!url) throw new Error("flux-2-pro returned no image URL");
          return url as string;
        });
      }

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

// ---------------------------------------------------------------------------
// Helper: Durable Fal.ai Queue Polling (for long-running jobs like video gen)
//   Uses step.sleep + step.run pairs — each poll is a separate Vercel
//   invocation, so there is NO timeout limit. Suitable for jobs > 55s.
// ---------------------------------------------------------------------------

type FalVideoResponse = {
  video?: { url: string; content_type?: string; file_name?: string; file_size?: number };
  [key: string]: unknown;
};

async function falPostDurableInngest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any,
  stepPrefix: string,
  endpoint: string,
  body: Record<string, unknown>,
  pollIntervalSec: number = 5,
  maxPolls: number = 36,  // 36 × 5s = 3 minutes max
): Promise<FalVideoResponse> {
  const authHeader = `Key ${process.env.FAL_KEY}`;

  // Step 1: Submit to Fal queue
  const queueInfo = await step.run(`${stepPrefix}-submit`, async () => {
    let submitRes: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        submitRes = await fetch(`${FAL_QUEUE_BASE}/${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!submitRes) throw new Error(`[${stepPrefix}] Failed to submit to fal queue`);

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      handleFalError(endpoint, submitRes.status, errText);
    }

    const json = (await submitRes.json()) as {
      request_id: string;
      status_url: string;
      response_url: string;
    };

    if (!json.request_id || !json.status_url || !json.response_url) {
      throw new Error("Fal queue returned incomplete response. Missing URLs or request_id.");
    }

    return {
      request_id: json.request_id,
      status_url: json.status_url,
      response_url: json.response_url,
    };
  });

  // Step 2: Durable poll loop — each iteration is sleep + run
  let isCompleted = false;
  for (let i = 0; i < maxPolls; i++) {
    await step.sleep(`${stepPrefix}-wait-${i}`, `${pollIntervalSec}s`);

    const status = await step.run(`${stepPrefix}-poll-${i}`, async () => {
      try {
        const res = await fetch(queueInfo.status_url, {
          headers: { Authorization: authHeader },
        });
        if (!res.ok) return "IN_PROGRESS"; // transient error, keep polling
        const data = (await res.json()) as { status: string };
        return (data.status || "").toUpperCase();
      } catch {
        return "IN_PROGRESS"; // transient network error, keep polling
      }
    });

    if (status === "COMPLETED") {
      isCompleted = true;
      break;
    }
    if (status === "FAILED") {
      throw new NonRetriableError(
        `Fal queue [${endpoint}] job ${queueInfo.request_id} failed on Fal.ai side.`
      );
    }
  }

  if (!isCompleted) {
    throw new Error(
      `[${stepPrefix}] Polling timed out (${maxPolls * pollIntervalSec}s) for request ${queueInfo.request_id}`
    );
  }

  // Step 3: Fetch final result
  return step.run(`${stepPrefix}-fetch-result`, async () => {
    let resultRes: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        resultRes = await fetch(queueInfo.response_url, {
          headers: { Authorization: authHeader },
        });
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!resultRes) throw new Error(`[${stepPrefix}] Failed to fetch result`);

    if (!resultRes.ok) {
      const errText = await resultRes.text();
      handleFalError(endpoint, resultRes.status, errText);
    }

    return resultRes.json();
  });
}

// ---------------------------------------------------------------------------
// Types — Animation
// ---------------------------------------------------------------------------

type AnimationGenerateEvent = {
  data: {
    jobId: string;
    userId: string;
    baseImageUrl: string;
    actionPrompt: string;
    resolution: "720p" | "1080p";
    aspectRatio: "16:9" | "9:16";
    backgroundColor: string;
    creditCost: number;
  };
};

// Canvas pixel dimensions for each resolution + aspect ratio combination
const CANVAS_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "720p-16:9": { width: 1280, height: 720 },
  "720p-9:16": { width: 720, height: 1280 },
  "1080p-16:9": { width: 1920, height: 1080 },
  "1080p-9:16": { width: 1080, height: 1920 },
};

// ---------------------------------------------------------------------------
// Inngest Function — Animation Generate
// ---------------------------------------------------------------------------

export const animationGenerate = inngest.createFunction(
  {
    id: "generate-animation",
    name: "Generate Animation",
    triggers: [{ event: "audora/animation.generate" }],
    retries: 2,
    onFailure: async ({ event, error }) => {
      try {
        const originalEvent = event.data.event.data as AnimationGenerateEvent["data"];
        const { jobId, userId, creditCost } = originalEvent;
        const failReason = error?.message ?? "An unexpected error occurred.";
        console.error(`[animation:onFailure] Job ${jobId} failed. Reason: ${failReason}`);
        console.log(`[animation:onFailure] Attempting refund of ${creditCost} credit(s) for user ${userId}`);

        const [anim] = await db
          .select({ creditRefunded: animations.creditRefunded })
          .from(animations)
          .where(eq(animations.jobId, jobId))
          .limit(1);

        if (anim && !anim.creditRefunded) {
          await db
            .update(userCredits)
            .set({ balance: sql`${userCredits.balance} + ${creditCost}` })
            .where(eq(userCredits.userId, userId));

          await db
            .update(animations)
            .set({ status: "failed", creditRefunded: true, failReason })
            .where(eq(animations.jobId, jobId));

          console.log(`[animation:onFailure] ✅ Refunded ${creditCost} credit(s) for job ${jobId}`);
        } else {
          await db
            .update(animations)
            .set({ status: "failed", failReason })
            .where(eq(animations.jobId, jobId));
          console.log(`[animation:onFailure] Credits already refunded for job ${jobId}, updated status only.`);
        }
      } catch (onFailureError) {
        console.error(`[animation:onFailure] ❌ CRITICAL: onFailure handler itself errored!`, onFailureError);
        try {
          const { jobId } = event.data.event.data as AnimationGenerateEvent["data"];
          await db
            .update(animations)
            .set({ status: "failed", failReason: "Refund failed - contact support" })
            .where(eq(animations.jobId, jobId));
        } catch { /* last resort */ }
      }
    },
  },
  async ({ event, step }) => {
    const {
      jobId,
      userId,
      baseImageUrl,
      actionPrompt,
      resolution,
      aspectRatio,
      backgroundColor,
    } = event.data as AnimationGenerateEvent["data"];

    // Step 1: Remove background from the base 3D icon
    const transparentUrl = await step.run("remove-background", async () => {
      const json = await falPost("fal-ai/birefnet/v2", {
        image_url: baseImageUrl,
      });
      const url = json.image?.url ?? json.images?.[0]?.url ?? json.url;
      if (!url) throw new Error("birefnet/v2 returned no image URL");
      return url as string;
    });

    // Step 2: Compose canvas — fill bg color + composite transparent icon at center
    const composedCanvasUrl = await step.run("compose-canvas", async () => {
      const dims = CANVAS_DIMENSIONS[`${resolution}-${aspectRatio}`];
      if (!dims) throw new NonRetriableError(`Invalid resolution/aspect ratio: ${resolution}-${aspectRatio}`);

      // Download the transparent PNG
      const res = await fetch(transparentUrl);
      if (!res.ok) throw new Error("Failed to download transparent image");
      const transparentBuffer = Buffer.from(await res.arrayBuffer());

      // Get transparent image metadata for sizing
      const metadata = await sharp(transparentBuffer).metadata();
      const imgW = metadata.width || 512;
      const imgH = metadata.height || 512;

      // Scale icon to fit within 70% of canvas while preserving aspect ratio
      const maxW = Math.round(dims.width * 0.7);
      const maxH = Math.round(dims.height * 0.7);
      const scale = Math.min(maxW / imgW, maxH / imgH, 1);
      const fitW = Math.round(imgW * scale);
      const fitH = Math.round(imgH * scale);

      const resizedIcon = await sharp(transparentBuffer)
        .resize(fitW, fitH, { fit: "inside" })
        .png()
        .toBuffer();

      // Parse backgroundColor HEX to RGB
      const hex = backgroundColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) || 255;
      const g = parseInt(hex.substring(2, 4), 16) || 255;
      const b = parseInt(hex.substring(4, 6), 16) || 255;

      // Create canvas with background color and composite icon at center
      const canvas = await sharp({
        create: {
          width: dims.width,
          height: dims.height,
          channels: 3,
          background: { r, g, b },
        },
      })
        .png()
        .composite([
          {
            input: resizedIcon,
            gravity: "centre",
          },
        ])
        .png({ compressionLevel: 6 })
        .toBuffer();

      // Upload to R2 in temp-uploads/ path
      const objectKey = `temp-uploads/${userId}/anim-canvas-${jobId}.png`;
      await uploadToR2(objectKey, canvas, "image/png");
      return `https://cdn.useaudora.com/${objectKey}`;
    });

    // Step 3: Generate video using Veo 3.1 Lite (durable polling)
    const videoResult = await falPostDurableInngest(
      step,
      "veo-video",
      "fal-ai/veo3.1/lite/image-to-video",
      {
        prompt: actionPrompt,
        image_url: composedCanvasUrl,
        duration: "4s",
        resolution: resolution,
        aspect_ratio: aspectRatio,
        generate_audio: false,
        safety_tolerance: "6",
        negative_prompt: "blurry, low quality, distorted, deformed",
      },
      5,  // poll every 5 seconds
      36, // max 36 polls = 3 minutes
    );

    // Step 4: Upload video to R2 and finalize DB
    const cdnUrl = await step.run("upload-and-finalize", async () => {
      // Response shape: { video: { url: "...", content_type: "...", ... } }
      const videoUrl = videoResult.video?.url;
      if (!videoUrl) throw new NonRetriableError("Veo 3.1 Lite returned no video URL");

      // Download the video from Fal.ai temporary URL
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error("Failed to download video from Fal.ai");
      const videoBuffer = Buffer.from(await res.arrayBuffer());

      // Upload to R2
      const objectKey = `animations/${userId}/${jobId}.mp4`;
      await uploadToR2(objectKey, videoBuffer, "video/mp4");
      const finalUrl = `https://cdn.useaudora.com/${objectKey}`;

      // Update DB — mark as completed
      await db
        .update(animations)
        .set({
          status: "completed",
          resultVideoUrl: finalUrl,
        })
        .where(eq(animations.jobId, jobId));

      return finalUrl;
    });

    return { jobId, url: cdnUrl, pipeline: "veo3.1-lite", resolution, aspectRatio };
  }
);
