## Documentation

Comprehensive project documentation can be found in the `doc/` directory:

- [**Master Documentation**](doc/master.md) - System overview, tech stack, and architecture.
- [AI Pipeline Details](doc/2pipeline-ai-integrations.md)
- [Auth Strategy](doc/security-auth-strategy.md)
- [Product Requirements (PRD)](doc/prd.md)

## Tech Stack

- **Next.js 16 (App Router)**
- **Neon + Drizzle ORM**
- **Better Auth**
- **Inngest**
- **Fal.ai**
- **Cloudflare R2**

## Getting Started

First, ensure you have your environment variables set up in `.env.local` (see [master.md](doc/master.md) for required keys).

Run the development server:
... (rest of the content)


```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
