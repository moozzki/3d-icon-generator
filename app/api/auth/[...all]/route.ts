import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Destructure individual method handlers so each export is a plain function,
// which satisfies Next.js 16's strict RouteHandlerConfig type constraint.
const { GET, POST } = toNextJsHandler(auth);

export { GET, POST };

// OPTIONS handler for CORS preflight (cross-subdomain auth from landing page)
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}