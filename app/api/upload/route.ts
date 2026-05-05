import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUploadPresignedUrl } from "@/lib/r2";

// Only allow image uploads — no executables, HTML, SVG, etc.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

// Map allowed MIME types to safe file extensions
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Filename and contentType required" }, { status: 400 });
    }

    // ── File type allowlist ────────────────────────────────────────────────
    if (!ALLOWED_CONTENT_TYPES.has(contentType as string)) {
      return NextResponse.json(
        { error: "Unsupported file type. Only PNG, JPEG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // ── Safe extension — derived from MIME type, NOT from user-supplied filename
    const safeExt = MIME_TO_EXT[contentType as string];
    const uniqueId = crypto.randomUUID();
    const objectKey = `temp-uploads/references/${session.user.id}/${uniqueId}.${safeExt}`;

    const uploadUrl = await getUploadPresignedUrl(objectKey);

    return NextResponse.json({
      uploadUrl,
      objectKey,
      fileUrl: `https://cdn.useaudora.com/${objectKey}`
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

