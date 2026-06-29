import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "https://useaudora.com";

  // Validate callbackUrl — only allow useaudora.com domains or localhost (for development)
  const isAllowed = /^https?:\/\/([\w-]+\.)?useaudora\.com(\/.*)?$/.test(callbackUrl) || callbackUrl.startsWith("http://localhost:");
  const safeUrl = isAllowed ? callbackUrl : "https://useaudora.com";

  // Sign out server-side — this deletes the session from DB and returns response headers
  const signOutRes = await auth.api.signOut({
    headers: await headers(),
    returnHeaders: true,
  });

  // Redirect to the landing page (or wherever callbackUrl points)
  const redirectRes = NextResponse.redirect(safeUrl, { status: 302 });

  // Forward the Set-Cookie headers from better-auth so the
  // session cookie is cleared in the browser on the .useaudora.com domain
  if (signOutRes.headers) {
    const cookies = signOutRes.headers.getSetCookie();
    for (const cookie of cookies) {
      redirectRes.headers.append("set-cookie", cookie);
    }
  }

  // Also append explicit deletion cookies for .useaudora.com just in case.
  // We clear both secure and non-secure, with/without prefixes, and both token/cache cookies.
  const isProd = process.env.NODE_ENV === "production";
  const domain = isProd ? ".useaudora.com" : undefined;

  // 1. Non-secure cookies (dev)
  redirectRes.cookies.set("better-auth.session_token", "", {
    maxAge: 0,
    domain,
    path: "/",
  });
  redirectRes.cookies.set("better-auth.session_data", "", {
    maxAge: 0,
    domain,
    path: "/",
  });

  // 2. Secure cookies (prod)
  if (isProd) {
    redirectRes.cookies.set("__Secure-better-auth.session_token", "", {
      maxAge: 0,
      domain,
      path: "/",
      secure: true,
      sameSite: "lax",
    });
    redirectRes.cookies.set("__Secure-better-auth.session_data", "", {
      maxAge: 0,
      domain,
      path: "/",
      secure: true,
      sameSite: "lax",
    });
  }

  return redirectRes;
}
