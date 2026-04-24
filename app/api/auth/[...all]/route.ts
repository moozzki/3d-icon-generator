import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// 1. Bungkus auth lu pake handler khusus Next.js App Router
const handler = toNextJsHandler(auth);

// 2. Export buat semua method, termasuk OPTIONS buat nembus CORS Landing Page lu
export { handler as GET, handler as POST, handler as OPTIONS };