import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { generations } from "../../../lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = await db.query.generations.findFirst({
      where: eq(generations.jobId, jobId),
      columns: {
        status: true,
        resultImageUrl: true,
        failReason: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: job.status,
      resultImageUrl: job.resultImageUrl,
      failReason: job.failReason ?? null,
    });
  } catch (error: unknown) {
    console.error("Job status check error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
