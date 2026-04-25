
---

### 📄 PRD: PostHog Setup + Reverse Proxy + User Identify (Backend)

> "We need to integrate PostHog for analytics and session replay in our Next.js 15+ App Router application (Dashboard/Backend). We must bypass ad-blockers using a reverse proxy, and critically, we need to identify users when they log in.
> 
> **Action Required:**
> 
> **1. Install PostHog:**
> Run `npm install posthog-js`
> 
> **2. Set up Reverse Proxy (`next.config.ts`):**
> Add rewrites to forward `/ingest` to PostHog's US servers.
> ```typescript
> import type { NextConfig } from "next";
> const nextConfig: NextConfig = {
>   // ... keep your existing config (like CORS headers)
>   async rewrites() {
>     return [
>       { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
>       { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
>     ];
>   },
> };
> export default nextConfig;
> ```
> 
> **3. Create PostHog Provider (`app/providers/PostHogProvider.tsx`):**
> Create this exact file. Make sure to use the `/ingest` proxy and include `ui_host` for session replays.
> ```tsx
> 'use client';
> import posthog from 'posthog-js';
> import { PostHogProvider as PHProvider } from 'posthog-js/react';
> import { ReactNode } from 'react';
> 
> if (typeof window !== 'undefined') {
>   posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
>     api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
>     ui_host: 'https://us.i.posthog.com',
>     person_profiles: 'identified_only',
>     capture_pageview: false 
>   });
> }
> export function PostHogProvider({ children }: { children: ReactNode }) {
>   return <PHProvider client={posthog}>{children}</PHProvider>;
> }
> ```
> 
> **4. Wrap the App (`app/layout.tsx`):**
> Wrap your layout's `{children}` with the new `<PostHogProvider>`. Also, implement a `$pageview` tracker component that uses `usePathname` and `useSearchParams` to manually trigger `posthog.capture('$pageview')` on route changes.
> 
> **5. Implement User Identification (Better Auth):**
> - Find the client component where you fetch the Better Auth session (e.g., your dashboard layout, AuthWrapper, or navigation).
> - Use a `useEffect` to watch the session.
> - If `session.user` exists, call `posthog.identify(session.user.id, { email: session.user.email, name: session.user.name })`.
> 
> **6. Implement Reset on Logout:**
> - Find your 'Sign Out' button logic.
> - Immediately after the auth sign-out function succeeds, call `posthog.reset()` to clear tracking data for the next user."

---
