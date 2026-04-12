## Documentation

Comprehensive project documentation can be found in the `doc/` directory:

- [**Master Documentation**](doc/master.md) - System overview, tech stack, and architecture.
- [AI Pipeline & SeedVR2](doc/2pipeline-ai-integrations.md)
- [Master Prompt System](doc/master-prompt.md)
- [Auth Strategy](doc/security-auth-strategy.md)
- [Product Requirements (PRD)](doc/prd.md)

## Tech Stack

- **Next.js 16.2 (App Router)**
- **React 19**
- **Tailwind CSS 4**
- **Neon + Drizzle ORM**
- **Better Auth** (Magic Link + Social)
- **Inngest** (Multi-Pipeline Workflows)
- **Fal.ai** (Flux 2 Pro + SeedVR2)
- **Cloudflare R2** (CDN Storage)

## Getting Started

First, ensure you have your environment variables set up in `.env.local` (see [master.md](doc/master.md) for required keys).

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) for typography optimization and **Framer Motion** for premium micro-animations.

## Credits & Features

- **SeedVR2 Upscaling**: Native 2x/4x upscaling integrated into the generation pipeline.
- **Reference Image Mode**: Generate 3D icons based on uploaded sketches or reference photos.
- **Refine (Iterative Edit)**: Fine-tune existing icons with new prompts while preserving the base structure.
- **Master Prompt Engineering**: Automatic refinement of raw user input for perfect 3D results.
- **Studio Dashboard**: Unconstrained canvas with collapsible controls and automated credit refunds.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
