import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "generation.png";

  if (!imageUrl) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");

    const arrayBuffer = await response.arrayBuffer();
    const headers = new Headers();
    
    // Pass along the content type or default to image/png
    const contentType = response.headers.get("Content-Type") || "image/png";
    headers.set("Content-Type", contentType);
    
    // Force download with filename
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[DOWNLOAD_ERROR]", error);
    return new NextResponse("Failed to download image", { status: 500 });
  }
}
