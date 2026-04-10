import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations, userCredits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// POST /api/cancel-job
// Manually cancels a stuck/failed job and refunds credits.
// Handles the case where Inngest's onFailure hook doesn't fire
// (e.g. the run was cancelled from the Inngest dashboard mid-execution).

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Fetch the generation row — verify ownership
    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.jobId, jobId))
      .limit(1);

    if (!gen) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only the job owner (or admin) can cancel
    const isAdmin = (session.user as { role?: string }).role === "admin";
    if (gen.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only refund if status is not already "completed"
    if (gen.status === "completed") {
      return NextResponse.json(
        { error: "Cannot cancel a completed job" },
        { status: 400 }
      );
    }

    // Guard against double-refund using creditRefunded flag
    if (gen.creditRefunded) {
      // Already refunded — just ensure status is marked failed
      await db
        .update(generations)
        .set({ status: "failed" })
        .where(eq(generations.jobId, jobId));

      return NextResponse.json({
        success: true,
        refunded: false,
        message: "Job marked as failed. Credits were already refunded previously.",
      });
    }

    // Refund credits + mark failed + set creditRefunded flag
    const creditCost = gen.creditCost;
    await db.batch([
      db
        .update(userCredits)
        .set({ balance: sql`${userCredits.balance} + ${creditCost}` })
        .where(eq(userCredits.userId, gen.userId)),

      db
        .update(generations)
        .set({ status: "failed", creditRefunded: true })
        .where(eq(generations.jobId, jobId)),
    ]);

    return NextResponse.json({
      success: true,
      refunded: true,
      creditsReturned: creditCost,
      message: `Job cancelled. ${creditCost} credit(s) refunded.`,
    });
  } catch (error) {
    console.error("Cancel job error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
