import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const callbackUrl =
    req.nextUrl.searchParams.get("callbackUrl") ?? "https://app.zupericon.com/sign-in";

  // Validate callbackUrl — only allow app.zupericon.com, app.useaudora.com, or localhost (for development)
  const isAllowed =
    /^https?:\/\/app\.zupericon\.com(\/.*)?$/.test(callbackUrl) ||
    /^https?:\/\/app\.useaudora\.com(\/.*)?$/.test(callbackUrl) ||
    callbackUrl.startsWith("http://localhost:");
  const safeUrl = isAllowed ? callbackUrl : "https://app.zupericon.com/sign-in";

  // Sign out server-side — this deletes the session from DB and returns response headers
  const signOutRes = await auth.api.signOut({
    headers: await headers(),
    returnHeaders: true,
  });

  // Redirect to the landing page (or wherever callbackUrl points)
  const redirectRes = NextResponse.redirect(safeUrl, { status: 302 });

  // Forward the Set-Cookie headers from better-auth so the
  // session cookie is cleared in the browser (host-only per domain)
  if (signOutRes.headers) {
    const cookies = signOutRes.headers.getSetCookie();
    for (const cookie of cookies) {
      redirectRes.headers.append("set-cookie", cookie);
    }
  }

  // Also append explicit deletion cookies just in case.
  // Cookies are host-only (no `domain` attribute) — auth no longer uses cross-subdomain cookies.
  // We clear both secure and non-secure, with/without prefixes, and both token/cache cookies.
  const isProd = process.env.NODE_ENV === "production";

  // 1. Non-secure cookies (dev)
  redirectRes.cookies.set("better-auth.session_token", "", {
    maxAge: 0,
    path: "/",
  });
  redirectRes.cookies.set("better-auth.session_data", "", {
    maxAge: 0,
    path: "/",
  });

  // 2. Secure cookies (prod)
  if (isProd) {
    redirectRes.cookies.set("__Secure-better-auth.session_token", "", {
      maxAge: 0,
      path: "/",
      secure: true,
      sameSite: "lax",
    });
    redirectRes.cookies.set("__Secure-better-auth.session_data", "", {
      maxAge: 0,
      path: "/",
      secure: true,
      sameSite: "lax",
    });
  }

  return redirectRes;
}
