import { NextResponse } from "next/server";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import sharp from "sharp";

// Icon size definitions
const ICON_SIZES: Array<{ folder: string; filename: string; size: number }> = [
  // iOS
  { folder: "iOS", filename: "icon-1024.png", size: 1024 },
  { folder: "iOS", filename: "icon-180.png", size: 180 },
  { folder: "iOS", filename: "icon-120.png", size: 120 },
  // Android
  { folder: "Android", filename: "icon-512.png", size: 512 },
  { folder: "Android", filename: "icon-192.png", size: 192 },
  // Web
  { folder: "Web", filename: "apple-touch-icon.png", size: 180 },
  { folder: "Web", filename: "favicon-32.png", size: 32 },
  { folder: "Web", filename: "favicon-16.png", size: 16 },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  const filenameParam = searchParams.get("filename") || "audora-icon-pack";

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
  }

  // 1. Fetch the base image (1K/1024×1024) from R2 into memory
  let sourceBuffer: Buffer;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch source image" },
        { status: 404 }
      );
    }
    sourceBuffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch source image" },
      { status: 500 }
    );
  }

  // 2. Resize all sizes in parallel using Sharp
  let resizedBuffers: Array<{ folder: string; filename: string; buffer: Buffer }>;
  try {
    resizedBuffers = await Promise.all(
      ICON_SIZES.map(async ({ folder, filename, size }) => {
        const buffer = await sharp(sourceBuffer)
          .resize(size, size, { fit: "cover" })
          .png()
          .toBuffer();
        return { folder, filename, buffer };
      })
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to resize images" },
      { status: 500 }
    );
  }

  // 3. Stream ZIP back to the client via PassThrough → ReadableStream
  const zipFilename = `${filenameParam}.zip`;

  const passThrough = new PassThrough();

  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err) => {
    console.error("[EXPORT_PACK] Archiver error:", err);
    passThrough.destroy(err);
  });

  // Pipe archiver output into our PassThrough stream
  archive.pipe(passThrough);

  // Append all resized buffers into the archive
  for (const { folder, filename, buffer } of resizedBuffers) {
    archive.append(buffer, { name: `${folder}/${filename}` });
  }

  // Finalize — begins emitting data through the pipe
  archive.finalize();

  // 4. Wrap Node PassThrough into a Web ReadableStream for NextResponse
  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      passThrough.on("end", () => controller.close());
      passThrough.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Cache-Control": "no-store",
    },
  });
}
