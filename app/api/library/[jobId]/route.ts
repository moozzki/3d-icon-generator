import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { generations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const generation = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.jobId, jobId),
          eq(generations.userId, session.user.id)
        )
      )
      .limit(1);

    if (generation.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: generation[0] });
  } catch (err) {
    console.error("Library item fetch error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // First fetch the item to get the resultImageUrl
    const targetJob = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.jobId, jobId),
          eq(generations.userId, session.user.id)
        )
      )
      .limit(1);

    if (targetJob.length === 0) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const item = targetJob[0];
    
    // Attempt to delete from R2 if we have a URL
    if (item.resultImageUrl) {
      try {
        const urlObj = new URL(item.resultImageUrl);
        // Assuming R2 URL format is domain/KEY
        // This splits by / and takes the remaining string as the key
        const key = urlObj.pathname.split("/").filter(Boolean).join("/");
        if (key) {
          await deleteFromR2(key);
        }
      } catch (r2err) {
        console.error("Error deleting from R2, continuing with DB deletion:", r2err);
      }
    }

    // Delete from DB
    await db
      .delete(generations)
      .where(
        and(
          eq(generations.jobId, jobId),
          eq(generations.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Library item delete error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
