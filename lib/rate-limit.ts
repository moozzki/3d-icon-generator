import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Use fallback dummy params if env is missing to prevent crash during build/dev without env
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://dummy.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy_token",
});

// Allow 5 generation requests per 60 seconds per user
export const generationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:generate",
});
