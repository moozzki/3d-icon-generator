import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUploadPresignedUrl } from "@/lib/r2";

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

    // Generate unique key using UUID or hash + original ext to prevent overwrites
    const ext = filename.split(".").pop();
    const uniqueId = crypto.randomUUID();
    const objectKey = `references/${session.user.id}/${uniqueId}.${ext}`;

    const uploadUrl = await getUploadPresignedUrl(objectKey);

    return NextResponse.json({
      uploadUrl,
      objectKey,
      fileUrl: `https://${process.env.R2_PUBLIC_DOMAIN_OR_BUCKET_URL}/${objectKey}`
    });
  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
