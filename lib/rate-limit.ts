import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Use fallback dummy params if env is missing to prevent crash during build/dev without env
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://dummy.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy_token",
});

export { redis };

// ─── Layer 1: User ID Rate Limit (API Cost Protection) ──────────────
// Target: /api/generate endpoint
// Rule: Max 3 requests per 60 seconds per userId
// Purpose: Prevent spam-clicking "Generate" that drains Fal.ai budget
export const generationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 requests per minute selama demo day, balikin ke 3 setelahnya
  analytics: true,
  prefix: "ratelimit:generate",
});

// ─── Layer 2: Global IP Rate Limit (DDoS / Brute Force Protection) ──
// Target: All endpoints via Next.js Middleware
// Rule: Max 50 requests per 60 seconds per IP address
// Purpose: Block bots/scripts while staying safe for organic users on shared IPs
export const globalIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, "60 s"),// 1000 requests per minute selama demo day, balikin ke 50 setelahnya
  analytics: true,
  prefix: "ratelimit:global-ip",
});

// ─── Layer 3: Sybil Attack Defense (Sign-up Bonus Protection) ───────
// Target: Credit initialization logic in /api/credits
// Rule: Max 5 accounts per IP per day can claim free credits
// Purpose: Prevent one person creating dozens of accounts to monopolize free tier
// Note: Account #6+ from same IP can still sign up, but gets 0 credits
export const sybilDefenseLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "86400 s"), // 100 accounts per day selama demo day, balikin ke 5 setelahnya
  analytics: true,
  prefix: "ratelimit:sybil-defense",
});
