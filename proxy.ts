import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function proxy(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth");
  // Skip proxy for auth endpoints
  if (isAuthRoute) return NextResponse.next();

  // Temporary checking mechanism for API routes to enforce user login
  const isProtectedApiRoute = request.nextUrl.pathname.startsWith("/api/generate") ||
                              request.nextUrl.pathname.startsWith("/api/credits") ||
                              request.nextUrl.pathname.startsWith("/api/gallery");

  if (isProtectedApiRoute) {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const isAuthPage = request.nextUrl.pathname === "/sign-in" || request.nextUrl.pathname === "/sign-up";
  const isProtectedPage = request.nextUrl.pathname === "/";

  if (isAuthPage || isProtectedPage) {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (session && isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!session && isProtectedPage) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs", // Required for auth.api calls
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
