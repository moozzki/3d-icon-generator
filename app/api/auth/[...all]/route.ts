import { auth } from "@/lib/auth";

export const GET = auth.handler;
export const POST = auth.handler;
export const OPTIONS = auth.handler; // Critical: handles CORS preflight for cross-origin requests
