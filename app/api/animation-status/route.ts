import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { animations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Retry wrapper for transient Neon serverless connection failures
async function queryWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === retries - 1;
      if (isLast) throw err;
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }
  throw new Error("queryWithRetry: unreachable");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await queryWithRetry(() =>
      db.query.animations.findFirst({
        where: eq(animations.jobId, jobId),
        columns: {
          status: true,
          baseImageUrl: true,
          resultVideoUrl: true,
          failReason: true,
        },
      })
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: job.status,
      baseImageUrl: job.baseImageUrl,
      resultVideoUrl: job.resultVideoUrl,
      failReason: job.failReason ?? null,
    });
  } catch (error: unknown) {
    console.error("Animation status check error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
