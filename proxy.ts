import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import { getSessionCookie } from "better-auth/cookies";

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

  const isAuthPage = request.nextUrl.pathname === "/sign-in" || request.nextUrl.pathname === "/sign-up";
  const isProtectedPage = request.nextUrl.pathname === "/";

  if (isAuthPage || isProtectedPage) {
    const sessionCookie = getSessionCookie(request);

    if (sessionCookie && isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!sessionCookie && isProtectedPage) {
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
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
