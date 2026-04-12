# master.md

# Audora - AI 3D Icon Generator

Audora is a SaaS platform designed for developers, designers, and marketers to generate high-quality 3D icons (2K & 4K) instantly using AI. The platform provides granular control over camera angles and image quality, integrated into a seamless dashboard experience using the **SeedVR2** upscaling pipeline and **Flux 2 Pro Edit** for refinement.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)
- **Database**: [Neon (Serverless PostgreSQL)](https://neon.tech/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://better-auth.com/) (Password-less: Magic Link & Social)
- **Background Jobs**: [Inngest](https://www.inngest.com/)
- **AI Provider**: [Fal.ai](https://fal.ai/) (Models: Flux 2 Pro, Flux 2 Pro Edit, SeedVR2 Upscaler)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3-compatible, zero egress fees)
- **Email**: [Resend](https://resend.com/)
- **Infrastructure**: [Upstash Redis](https://upstash.com/) (Rate limiting & caching)

---

## 🏗️ System Architecture

### 1. Frontend
- **Dashboard**: Main workspace for users to input prompts, upload reference images, and select generation parameters.
- **Library**: Personal gallery where users can view, download, and manage their generated icons.
- **Studio**: Advanced canvas area featuring:
  - **Reference Image Upload**: Client-side compression to 1024x1024 before R2 upload.
  - **Refine Mode**: Iterative editing of existing assets using previous base renders.
  - **Unconstrained Canvas**: Smooth pan/zoom area.

### 2. AI Generation Pipeline (Inngest)
The system uses a multi-branch workflow via Inngest to handle different generation types while maintaining cost control (~$0.03 per 1K edit).

**Workflows:**
1.  **Text-to-Image**:
    - **Base**: Flux 2 Pro (1K).
    - **Upscale**: SeedVR2 (2x for 2K, 4x for 4K).
2.  **Generate by Reference**:
    - **Base**: Flux 2 Pro Edit (1K) using user-uploaded reference + prompt.
    - **Upscale**: SeedVR2 (2x or 4x).
3.  **Refine (Iterative Edit)**:
    - **Base**: Flux 2 Pro Edit (1K) using an existing `baseImageUrl` as the reference.
    - **Upscale**: SeedVR2 (2x or 4x).

*All final images are served via a custom CDN domain (`cdn.useaudora.com`).*

### 3. Credit System
- **Sign-up Bonus**: 2 Credits for new users.
- **Generation Cost**:
  - **1K/2K Resolution**: 1 Credit.
  - **4K Resolution (SeedVR2)**: 2 Credits.
- **Fail-Safe**: Real-time validation and automated refunds for job failures or content policy blocks.

### 4. Storage Architecture
- **Reference Images**: Uploaded to R2 via Presigned URLs (Dimension locked at 1024px).
- **Generated Assets**: Stored in R2. We maintain a `baseImageUrl` (1K) for refinement and a `resultImageUrl` for display/download.

---

## 📊 Database Schema

The system uses a normalized PostgreSQL schema managed by Drizzle ORM:
- **`users`**: Core user data (linked to Better Auth).
- **`user_credits`**: Tracks current balance and updates.
- **`generations`**: Detailed history of every generation task.
  - `prompt`: User input.
  - `masterPrompt`: Style-engineered prompt.
  - `baseImageUrl`: 1K raw render (required for Refine/Edit).
  - `resultImageUrl`: High-res upscaled asset.
- **`transactions`**: Payment and top-up history.

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router (Dashboard, Auth, API)
├── components/           # UI Components (Studio, Shared, Dashboard)
├── doc/                  # Technical Documentation & PRDs
├── hooks/                # Custom React Hooks
├── lib/                  # Core Utilities
│   ├── auth/            # Better Auth config (Magic Link + Social)
│   ├── db/              # Drizzle schema (generations, credits)
│   ├── inngest/         # Workflow branches (Generate, Edit, Refine)
│   └── r2.ts            # Cloudflare R2 S3 client
├── public/               # Static Assets (Logos, Icons)
└── drizzle.config.ts     # Database migration config
```

---

## 🛠️ Getting Started

### Environment Variables
Required values in `.env.local`:
- `DATABASE_URL`: Neon connection string
- `BETTER_AUTH_SECRET`: Auth secret
- `FAL_KEY`: Fal.ai API key
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`: Cloudflare storage

### Commands
- `npm run dev`: Start Next.js dev server
- `npm run dev:inngest`: Start Inngest local dev server
- `npm run db:studio`: Open Drizzle Studio
- `npm run db:push`: Sync schema

---

## 📚 Related Documentation
For more detailed information on specific modules, refer to:
- [Pipeline AI Integrations](doc/2pipeline-ai-integrations.md)
- [SeedVR2 Upscaling & Edit](doc/seedvr-upscale.md)
- [Auth Strategy](doc/security-auth-strategy.md)
- [Master Prompt Engineering](doc/master-prompt.md)
- [Product Requirements (PRD)](doc/prd.md)
