import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { globalIpRateLimit } from "@/lib/rate-limit";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting and auth for auth API endpoints & static assets
  const isAuthRoute = pathname.startsWith("/api/auth");
  if (isAuthRoute) return NextResponse.next();

  // ─── Layer 2: Global IP Rate Limit (DDoS / Brute Force) ────────────
  // 50 requests per minute per IP address.
  // Fail open: if Redis is down, don't block users.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    const { success } = await globalIpRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }
  } catch {
    // Redis down — fail open, allow request through
    console.warn("Global rate limit check failed, allowing request through");
  }

  // ─── Auth: Protect API Routes ──────────────────────────────────────
  const isProtectedApiRoute =
    pathname.startsWith("/api/generate") ||
    pathname.startsWith("/api/credits") ||
    pathname.startsWith("/api/library") ||
    pathname.startsWith("/api/payment"); // Payment routes require auth (webhooks excluded via /api/webhooks prefix)

  if (isProtectedApiRoute) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ─── Auth: Protect Page Routes ─────────────────────────────────────
  const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
  const isCheckoutPage = pathname === "/checkout";
  const isProtectedPage =
    pathname === "/" ||
    pathname === "/library" ||
    pathname === "/spotlight" ||
    pathname === "/account" ||
    pathname === "/transactions" ||
    isCheckoutPage;

  if (isAuthPage || isProtectedPage) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Redirect authenticated users away from auth pages
    if (session && isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Redirect unauthenticated users to sign-in.
    // For /checkout: carry the full original URL (including ?package=...) as callbackURL
    // so Better Auth returns the user to their intended checkout destination after login.
    if (!session && isProtectedPage) {
      if (isCheckoutPage) {
        const callbackURL = request.nextUrl.pathname + request.nextUrl.search;
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("callbackURL", callbackURL);
        return NextResponse.redirect(signInUrl);
      }
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets/ (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};
