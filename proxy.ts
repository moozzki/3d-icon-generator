import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";

export async function proxy(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth");
  // Skip proxy for auth endpoints
  if (isAuthRoute) return NextResponse.next();

  // Temporary checking mechanism for API routes to enforce user login
  const isProtectedApiRoute = request.nextUrl.pathname.startsWith("/api/generate") ||
                              request.nextUrl.pathname.startsWith("/api/credits") ||
                              request.nextUrl.pathname.startsWith("/api/gallery");

  if (isProtectedApiRoute) {
    const { data: session } = await betterFetch<any>("/api/auth/get-session", {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Same logic can be applied if we want strict page level auth protection
  // However Better Auth provides client side and server side helpers too.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
