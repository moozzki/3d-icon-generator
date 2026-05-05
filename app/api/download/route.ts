import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Trusted origins that this proxy is allowed to fetch from.
// Add new CDN hosts here as needed — never allow arbitrary URLs.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "cdn.useaudora.com",
  "fal.media",
  "v3.fal.media",
  "storage.googleapis.com",
]);

function isAllowedUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    if (protocol !== "https:") return false;
    return ALLOWED_ORIGINS.has(hostname);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  // ── 0. Auth guard ─────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "generation.png";

  if (!imageUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  // ── 1. SSRF guard — only allow trusted CDN origins ────────────────────────
  if (!isAllowedUrl(imageUrl)) {
    return new NextResponse("Forbidden: URL not allowed", { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");

    const arrayBuffer = await response.arrayBuffer();
    const responseHeaders = new Headers();

    // Pass along the content type or default to image/png
    const contentType = response.headers.get("Content-Type") || "image/png";
    responseHeaders.set("Content-Type", contentType);

    // Force download with filename
    responseHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[DOWNLOAD_ERROR]", error);
    return new NextResponse("Failed to download image", { status: 500 });
  }
}
