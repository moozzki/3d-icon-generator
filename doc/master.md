# master.md

# Audora - AI 3D Icon Generator

Audora is a SaaS platform designed for developers, designers, and marketers to generate high-quality 3D icons (2K & 4K) instantly using AI. The platform provides granular control over camera angles and image quality, integrated into a seamless dashboard experience.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)
- **Database**: [Neon (Serverless PostgreSQL)](https://neon.tech/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Background Jobs**: [Inngest](https://www.inngest.com/)
- **AI Provider**: [Fal.ai](https://fal.ai/) (Models: Flux 2 Pro, Nano Banana 2, Recraft Crisp Upscaler)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3-compatible, zero egress fees)
- **Email**: [Resend](https://resend.com/)
- **Infrastructure**: [Upstash Redis](https://upstash.com/) (Rate limiting & caching)

---

## 🏗️ System Architecture

### 1. Frontend
- **Dashboard**: Main workspace for users to input prompts, upload reference images, and select generation parameters.
- **Library**: Personal gallery where users can view, download (2K/4K), and manage their generated icons.
- **Studio**: Advanced canvas area for refining and interacting with 3D icons.

### 2. AI Generation Pipeline (Inngest)
The generation process is handled asynchronously via Inngest to manage long-running API calls and handle retries/failures gracefully.

**Workflow:**
1. User submits a prompt through the Studio.
2. Credits are validated and deducted upfront.
3. An Inngest event `audora/icon.generate` is triggered.
4. **Processing**:
   - **Flux 2 Pro**: Generates at 2K natively or 4K via the Crisp upscaler.
   - **Nano Banana 2**: Generates at 2K natively or 4K via the Crisp upscaler.
5. Final images are downloaded from Fal.ai, uploaded to **Cloudflare R2**, and the database is updated with the permanent CDN URL.

### 3. Credit System
- **Sign-up Bonus**: 2 Credits for new users.
- **Generation Cost**:
  - **2K Resolution**: 1 Credit.
  - **4K Resolution**: 2 Credits.
- **Top-up**: Integrated tier-based credit purchase system.

### 4. Storage Architecture
- **Reference Images**: Uploaded to R2 via Presigned URLs.
- **Generated Assets**: Stored in R2 and served via a custom CDN domain (`cdn.useaudora.com`).

---

## 📊 Database Schema

The system uses a normalized PostgreSQL schema managed by Drizzle ORM:
- **`users`**: Core user data (linked to Better Auth).
- **`user_credits`**: Tracks current balance and updates.
- **`generations`**: Detailed history of every generation task (jobId, prompt, model, resolution, R2 URL, status).
- **`transactions`**: Payment and top-up history.

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router (Dashboard, Auth, API)
├── components/           # UI Components (Shared, Dashboard, Landing)
├── doc/                  # Technical Documentation & PRDs
├── hooks/                # Custom React Hooks
├── lib/                  # Core Utilities & Library Configs
│   ├── auth/            # Better Auth configuration
│   ├── db/              # Drizzle schema and client
│   ├── inngest/         # Background job functions and client
│   └── r2.ts            # Cloudflare R2 S3 client
├── public/               # Static Assets
└── drizzle.config.ts     # Database migration config
```

---

## 🛠️ Getting Started

### Environment Variables
Required values in `.env.local`:
- `DATABASE_URL`: Neon connection string
- `BETTER_AUTH_SECRET`: Auth secret
- `FAL_KEY`: Fal.ai API key
- `INNGEST_EVENT_KEY`: Inngest event signature
- `INNGEST_SIGNING_KEY`: Inngest signing key
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`: Cloudflare storage

### Commands
- `npm run dev`: Start Next.js dev server
- `npm run dev:inngest`: Start Inngest local dev server
- `npm run db:studio`: Open Drizzle Studio for DB management
- `npm run db:push`: Sync schema to database

---

## 📚 Related Documentation
For more detailed information on specific modules, refer to:
- [Pipeline AI Integrations](file:///d:/3d-icon-generator/doc/2pipeline-ai-integrations.md)
- [Canvas Zoom System](file:///d:/3d-icon-generator/doc/canvas-zoom.prd)
- [Auth Strategy](file:///d:/3d-icon-generator/doc/security-auth-strategy.md)
- [Product Requirements (PRD)](file:///d:/3d-icon-generator/doc/prd.md)
