# Audora - AI 3D Isometric Icon Generator

Audora is a premium SaaS platform designed for developers, designers, and marketers to generate high-quality 3D icons (2K & 4K) instantly using AI. The platform provides a Figma-like workspace canvas, multi-icon batch generation, dynamic upscaling, animated video extensions, automated background removal, professional design export bundles, public sharing channels, and multi-currency billing packages.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)
- **Database**: [Neon (Serverless PostgreSQL)](https://neon.tech/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://better-auth.com/) (Password-less: Magic Link & Social)
- **Background Jobs**: [Inngest](https://www.inngest.com/)
- **AI Provider**: [Fal.ai](https://fal.ai/)
  - **Image Models**: Flux 2 Pro (High Fidelity), Nano Banana 2 (Hi-Res native 2K/4K output)
  - **Editing**: Flux 2 Pro Edit (Refinement & iterative edits)
  - **Upscaler**: SeedVR2
  - **Background Removal**: Background Isolation (BiRefNet v2)
  - **Video Models**: Veo 3.1 Lite (Image-to-Video looping animation)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3-compatible, zero egress fees)
- **Payment Gateways**:
  - **Pakasir**: IDR transactions supporting local QRIS and Bank Transfers.
  - **Polar.sh**: Global USD Merchant of Record (MoR) checkout for Credit Cards and Apple Pay.
- **Analytics**: [PostHog](https://posthog.com/) (User behavior tracking)
- **Email**: [Resend](https://resend.com/)
- **Infrastructure**: [Upstash Redis](https://upstash.com/) (Rate limiting & caching)

---

## 🏗️ System Architecture & Features

### 1. Canvas Workspace & Advanced Studio UX
- **Dynamic Helper Console**: Prompt input field containing a built-in Pro Tips / Prompt Helper helper (accessible via a `Lightbulb` icon) to suggest stylized modifiers.
- **Unconstrained Canvas**: Responsive work area featuring viewport panning (Spacebar + mouse click/drag) and smooth zooming (Ctrl + mouse scroll or standard hotkeys: `Ctrl +/-` and `Shift + 1` to fit).
- **Flexible Parameters**: Left sidebar panel allowing selection of Camera Position (Isometric, Front Facing, Side, Top Down), Style Presets (Plastic, Clay, Glass, Plushy, Toy Block, Metallic), Resolution (2K, 4K), and custom HEX background colors.
- **Reference Image Upload**: Supports drag-and-drop reference files. Automatically resizes client-side to 1024x1024 before uploading to Cloudflare R2 storage to minimize ingestion lag.
- **Refine Mode**: Allows selective modification on top of previous generation outputs using a layered base canvas structure.

### 2. Multi-Icon Batch Generation (Batch Mode)
- **Concept**: Generates up to 9 distinct icons at once by accepting a base visual prompt alongside a comma-separated list of items (e.g., `"House, Gear, Folder, Bell"`).
- **Style-Engineering**: Combines style prompts with target item strings under the hood to ensure styling parameters map cleanly.
- **Aesthetic Seed Locking**: Syncs the identical seed across all parallel job pipelines in a single batch to guarantee color, lighting, and style consistency.
- **Bulk Execution**: Dispatched asynchronously via Inngest serverless handlers (`Promise.all` queues to Fal.ai APIs).
- **ZIP Download**: Uses `jszip` client-side to compile and download all batch assets in one click.

### 3. Animated 3D Icons (Audora V2 Video Add-On)
- **Looping Videos**: Generates premium 4-second looping videos from static generation assets.
- **Pipeline**:
  1. **Background Clean**: Evaluates and isolates the core subject using BiRefNet v2.
  2. **Composite Canvas**: Centers the subject onto a chosen background canvas matching the workspace color palette (via `sharp`).
  3. **Motion Generation**: Dispatches the customized render to the `fal-ai/veo3.1/lite/image-to-video` model.
- **Controls**: Users can select between Landscape (16:9) and Portrait (9:16) aspect ratios, 720p or 1080p outputs, and custom background canvas modes.

### 4. On-Demand Background Removal
- **Zero-Delay Cache**: Searches the `transparentImageUrl` path in the database for the active generation first. If found, returns the isolated asset immediately.
- **High-Quality Extraction**: Leverages `fal-ai/birefnet/v2` on-demand to strip background colors and produce transparent alpha-channel web images.
- **Adaptive Execution Payload**: Standard scaling for 2K resolutions, and dynamic scaling workflows for high-resolution 4K images.

### 5. "Dev-Ready" Export Pack
- **Concept**: High-speed, serverless asset packaging targeting developers and designers.
- **Resizing Suite**: Converts the selected icon file into platform-specific configurations:
  - **iOS**: 1024x1024, 180x180, 120x120 pixels.
  - **Android**: 512x512, 192x192 pixels.
  - **Web**: 180x180 (Apple Touch Icon), 32x32 (Standard favicon), 16x16 (Browser favicon).
- **Streaming Service**: Standardizes filenames, groups them into iOS, Android, and Web subfolders, and streams a structured `.zip` archive on-the-fly using `sharp` and `archiver` under Vercel Serverless environment `/api/export-pack`.

### 6. Public Spotlight Visibility & Glassmorphism Share Card
- **Spotlight Feed**: Users can toggle generation status (`isPublic` in DB) to publish designs on the public Spotlight workspace gallery.
- **IG Share Card**: Generates a high-resolution, mobile-optimized 9:16 Instagram Story image incorporating:
  - A glassmorphism container floating on a modern, multi-layer gradient backdrop.
  - A customizable badge showcasing generation properties (Style, Preset, Camera Angle).
  - A CTA button ("Try Audora") promoting user referral growth.
- **Web Sharing**: Integrates the `html-to-image` rendering engine combined with the native browser Web Share (`navigator.share()`) API, falling back to instant PNG download if sharing APIs are unavailable.

---

## 💳 Credit System & Payments

Audora operates on an exact credit-deduction schema supporting multi-currency payment platforms:

### 1. Generation & Action Economics
- **New User Signup**: +2 free credits.
- **Flux 2 Pro**:
  - **2K Resolution**: 1 Credit
  - **4K Resolution**: 2 Credits
- **Nano Banana 2**:
  - **2K Resolution**: 2 Credits
  - **4K Resolution**: 3 Credits
- **Animation (Veo 3.1 Lite)**:
  - **720p Output**: 2 Credits
  - **1080p Output**: 3 Credits

### 2. Multi-Currency Stripe & Local Gateways
- **IDR Gateway (Pakasir)**: Integrates QRIS, local Virtual Accounts (VA), and Bank Transfers for Indonesian users.
- **USD Gateway (Polar.sh)**: Integrates global checkouts for international users. Processes payments securely via Stripe Merchant of Record (MoR) for Credit Cards and Apple Pay.

#### Pricing Plans & Packages

Audora dynamically segments payment options depending on the geolocation of the user (e.g., routing Indonesian buyers to Pakasir, and all other international buyers to Polar.sh checkouts):

##### Domestic Pricing (IDR via Pakasir)
| Package ID | Level | Cost | Credit Grant | Rate per Credit | Target Features & Use Cases |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `starter_idr` | Starter | Rp 30.000 | 10 Credits | Rp 3.000 / Credit | Essential image rendering, text prompts, isometric styles. |
| `creator_idr` | Creator | Rp 75.000 | 30 Credits | Rp 2.500 / Credit | Extended batch generations, high-resolution 4K upscales. |
| `studio_idr` | Studio | Rp 150.000 | 75 Credits | Rp 2.000 / Credit | High-volume batch rendering, animation videos, commercial exports. |

##### Global Pricing (USD via Polar.sh)
| Package ID | Level | Cost | Credit Grant | Rate per Credit | Polar Product ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `starter_usd` | Starter | $5.00 | 25 Credits | $0.20 / Credit | `50c025e4-bcb7-4d0f-95cf-ec5265aa1ce3` |
| `creator_usd` | Creator | $10.00 | 60 Credits | $0.16 / Credit | `51cc7934-3378-43ee-a69b-fc7c3401b585` |
| `studio_usd` | Studio | $25.00 | 175 Credits | $0.14 / Credit | `a792145f-9f27-4f73-934d-9c31cbb954de` |

### 3. Real-Time Refunds (Fail-Safe)
- Inngest background pipelines listen to `onFailure` event callbacks.
- If a render fails due to timeout, server error, or content moderation filter, the exact credit amount deducted for the transaction is instantly returned to the user's account.

---

## 📊 Database Schema

Audora uses Drizzle ORM to interface with PostgreSQL:

- **`users`**: Manages primary user profiles and authentications (handled via Better Auth).
- **`user_credits`**: Monitors the active balance and total lifetime credits.
- **`generations`**: The primary log table for all generation tasks. Key columns include:
  - `prompt` & `userPrompt`: Engineered vs. raw user-entered text prompt.
  - `aiModel`: Specifies generation model (`flux-2-pro` or `nano-banana-2`).
  - `color`: Custom background HEX value.
  - `transparentImageUrl`: Location of isolated background-removed files on Cloudflare R2.
  - `batchId`: References grouped generations spawned in Batch Mode.
  - `seed`: Locks exact random seeds across grouped jobs.
  - `isPublic`: Spotlight visibility toggle.
  - `creditRefunded` & `failReason`: Auditing columns for fail-safe transactions.
- **`animations`**: Tracks all video animations. Key columns include:
  - `sourceGenerationId`: Foreign key to parent static generation.
  - `resolution` & `aspectRatio`: 720p/1080p, 16:9/9:16.
  - `resultVideoUrl`: Saved video file path in R2.
- **`feedbacks`**: Logs rating points (1-5 stars) and user textual suggestions.
- **`transactions`**: Stores financial payments. Key columns:
  - `paymentProvider`: Gateway label (`pakasir` or `polar`).
  - `currency`: Transaction currency code (`IDR` or `USD`).
  - `paymentStatus`: Track states (`pending`, `completed`, `failed`).

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router (Dashboard, Auth, API endpoints)
│   ├── api/
│   │   ├── animate/      # Video animation endpoints
│   │   ├── export-pack/  # Sharp sizing & zip packaging
│   │   ├── feedback/     # User rating endpoints
│   │   ├── remove-bg/    # On-demand background removal
│   │   ├── spotlight/    # Spotlight visibility toggle endpoints
│   │   └── payment/      # Payment gateway handlers (Pakasir & Polar.sh)
├── components/           # UI Components (Figma Studio canvas, spotlight, dashboards)
├── doc/                  # System documentation & feature guides
├── hooks/                # Viewport dimensions & canvas hooks
├── lib/                  # Backend utilities & modules
│   ├── auth/            # Better Auth server configurations
│   ├── db/              # Drizzle PostgreSQL schemas & clients
│   ├── inngest/         # Inngest asynchronous pipelines
│   └── r2.ts            # Cloudflare R2 storage clients
├── public/               # Static web assets
└── drizzle.config.ts     # Migration configurations
```

---

## 🛠️ Getting Started

### Environment Variables
Configure the following inside `.env.local`:
```env
# Database & Auth
DATABASE_URL=postgresql://user:password@endpoint/db
BETTER_AUTH_SECRET=your_auth_secret_token

# AI Providers
FAL_KEY=fal_ai_access_token_key

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=r2_access_key
R2_SECRET_ACCESS_KEY=r2_secret_key
R2_BUCKET_NAME=bucket_name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

# Payment Gateways
PAKASIR_API_KEY=pakasir_auth_key
PAKASIR_SLUG=pakasir_project_slug
PAKASIR_WEBHOOK_SECRET=pakasir_webhook_auth
POLAR_ACCESS_TOKEN=polar_stripe_access_token
POLAR_WEBHOOK_SECRET=polar_webhook_auth
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Analytics & Marketing
NEXT_PUBLIC_POSTHOG_KEY=posthog_token
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Commands
- `npm run dev`: Bootstraps the local Next.js client.
- `npm run dev:inngest`: Opens local Inngest pipeline development interface.
- `npm run db:studio`: Starts local Drizzle dashboard interface.
- `npm run db:push`: Publishes structural modifications directly to your database.

---

## 📚 Related Documentation

For detailed information on specific features, pipelines, and settings, refer to:
- [User Flow Documentation](file:///d:/3d-icon-generator/doc/user-flow.md)
- [Pipeline AI Integrations](file:///d:/3d-icon-generator/doc/2pipeline-ai-integrations.md)
- [SeedVR2 Upscaling & Edit](file:///d:/3d-icon-generator/doc/seedvr-upscale.md)
- [Auth Strategy](file:///d:/3d-icon-generator/doc/security-auth-strategy.md)
- [Pakasir Integration](file:///d:/3d-icon-generator/doc/pakasir-integration.md)
- [PostHog Analytics](file:///d:/3d-icon-generator/doc/posthog-integration-backend.md)
- [Master Prompt Engineering](file:///d:/3d-icon-generator/doc/master-prompt.md)
- [Product Requirements (PRD)](file:///d:/3d-icon-generator/doc/prd.md)
- [Animated Icons (Audora V2)](file:///d:/3d-icon-generator/doc/animate-icon-feature.md)
- [Batch Icons Generation](file:///d:/3d-icon-generator/doc/batch-generations-feature.md)
- [Dev-Ready Export Pack](file:///d:/3d-icon-generator/doc/developer-icon-pack-size-feature.md)
- [On-Demand Background Removal](file:///d:/3d-icon-generator/doc/remove-background-feature.md)
- [Spotlight & IG Share Card](file:///d:/3d-icon-generator/doc/spotlight-feature.md)
- [Polar.sh Integration](file:///d:/3d-icon-generator/doc/polar-integration.md)
- [User Account Details](file:///d:/3d-icon-generator/doc/user-account.md)
