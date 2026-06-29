import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "https://useaudora.com";

  // Validate callbackUrl — only allow useaudora.com domains or localhost (for development)
  const isAllowed = /^https?:\/\/([\w-]+\.)?useaudora\.com(\/.*)?$/.test(callbackUrl) || callbackUrl.startsWith("http://localhost:");
  const safeUrl = isAllowed ? callbackUrl : "https://useaudora.com";

  // Sign out server-side — this deletes the session from DB and returns response headers
  const signOutRes = await auth.api.signOut({
    headers: req.headers,
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

  // Also append an explicit deletion cookie for .useaudora.com just in case
  redirectRes.cookies.set("better-auth.session_token", "", {
    maxAge: 0,
    domain: ".useaudora.com",
    path: "/",
  });

  return redirectRes;
}
