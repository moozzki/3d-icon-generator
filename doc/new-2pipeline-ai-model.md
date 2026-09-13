Berikut adalah revisi PRD teknis untuk Audora, disesuaikan dengan arsitektur dua *pipeline* (Flux 2 Pro dan Nano Banana 2) yang berjalan secara asinkron menggunakan Inngest dan *provider* Fal.ai. 

Dokumen ini langsung siap pakai untuk *guide development* di Next.js.

---

# Asynchronous Multi-Model AI Generation Pipeline Implementation

This plan outlines the integration of an event-driven background pipeline (using Inngest) to manage the generation and SeedVR2 upscaling of 3D icons via the Fal.ai API. It accommodates two distinct AI models with different generation endpoints and credit costs, ensuring robust execution against Vercel timeout limits.

## User Review Required

> [!WARNING]
> Testing this background worker will require changes to your local development environment. You will need to install the Inngest Dev Server if not done already, and ensure `FAL_KEY` and any Cloudflare R2 credentials are present in your `.env.local`.

## Proposed Changes

---

### Database Schema (Drizzle ORM & Neon)
Updating the schema to support asynchronous generations, varying credit costs, and multi-model metadata tracking.

#### [MODIFY] `lib/db/schema.ts`
- Add `statusEnum` (`"pending"`, `"completed"`, `"failed"`).
- Add `aiModelEnum` (`"flux-2-pro"`, `"nano-banana-2"`).
- Add `resolutionEnum` (`"2k"`, `"4k"`).
- In the `generations` table:
  - Add `jobId: text("job_id").unique()`.
  - Add `status: statusEnum("status").default("pending")`.
  - Add `aiModel: aiModelEnum("ai_model").notNull()`.
  - Add `resolution: resolutionEnum("resolution").notNull()`.
  - Add `creditCost: integer("credit_cost").notNull()`.
  - Modify `resultImageUrl` to be `.default(null)`.

---

### Inngest Setup & Client
Basic configuration to serve Inngest within Next.js API Routes.

#### [NEW] `lib/inngest/client.ts`
- Export the initial `Inngest` client instance with an ID like `audora-backend`.

#### [NEW] `app/api/inngest/route.ts`
- Implement `GET`, `POST`, `PUT` using `serve()` exported from `inngest/next`, mapping the `audora/icon.generate` function to the handler.

---

### Phase 1–4: Inngest Worker Workflow (The Dual Pipeline)
This is the core background logic orchestrating the conditional Fal.ai calls based on the chosen AI model.

#### [NEW] `lib/inngest/functions.ts`
Defines the `audora/icon.generate` background function with conditional branching based on the `aiModel` payload:

**Branch A: `flux-2-pro`**
- **`step.run("generate-base-flux-1k")`**: Calls `fal-ai/flux-2-pro` (T2I) or `fal-ai/flux-2-pro/edit` (reference/refine), rendering a 1K base image (~$0.040).
- **`step.run("upscale-seedvr")`**: Shared SeedVR2 (`fal-ai/seedvr/upscale/image`) call to pull the 1K base up to 2K (factor 2) or 4K (factor 4).

**Branch B: `nano-banana-2`**
- **`step.run("generate-base-nano-1k")`**: Calls `fal-ai/nano-banana-2` (T2I, `resolution: "1K"`) or `fal-ai/nano-banana-2/edit` (reference/refine, `image_urls`), rendering a 1K base image.
- **`step.run("upscale-seedvr")`**: Same shared SeedVR2 upscale as flux — factor 2 for 2K, factor 4 for 4K.

Both branches always generate at 1K first and upscale, which is cheaper than native 2K/4K generation (Nano native: 2K $0.12, 4K $0.16; via SeedVR2: ~$0.0842 / ~$0.0968).

**Shared Final Steps (Runs for both branches):**
- **`step.run("upload-base-r2")`**: Buffers the 1K base image and pushes it to Cloudflare R2 (`baseImageUrl` — required by Refine + icon packs).
- **`step.run("upload-to-r2-and-finalize")`**: Buffers the upscaled image, pushes to Cloudflare R2, marks the `generations` row `"completed"`, and patches `resultImageUrl`.
- **Error Handling Branch (`onFailure` hook)**: Automatically triggers upon max retries to mark `status = 'failed'` in the `generations` table. *(Note: Credits are deducted upfront in the API route, so a refund logic should be added here to restore credits if the job fails entirely).*

---

### Vercel Function (API Endpoints)
The synchronous endpoints handling fast responses, credit deduction, and frontend polling.

#### [MODIFY] `app/api/generate/route.ts`
- Validate requests (Auth, Upstash Rate Limiting).
- **Dynamic Credit Calculation:**
  - Flux 2 Pro + 2K = 1 Credit
  - Flux 2 Pro + 4K = 2 Credits
  - Nano Banana 2 + 2K = 3 Credits
  - Nano Banana 2 + 4K = 4 Credits
- Validate if `user_credits` >= `calculated_cost`.
- Deduct credits transactionally.
- Insert a record into `generations` with `status: "pending"`, `aiModel`, `resolution`, and `creditCost`.
- Dispatch the processing job via `inngest.send({ name: "audora/icon.generate", data: { jobId, prompt, aiModel, resolution } })`.
- Instantly return the `jobId` so the frontend can display a loading state.

#### [NEW] `app/api/job-status/route.ts`
- A simple `GET` endpoint accepting a `jobId`.
- Returns `{ status, resultImageUrl }` from the `generations` table to power frontend polling via React Query.

---