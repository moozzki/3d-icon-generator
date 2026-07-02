import { NextResponse } from "next/server";
import { getGenerationCollectionIds } from "@/app/actions/collections";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const { generationId } = await params;
    const genId = parseInt(generationId, 10);
    if (isNaN(genId)) {
      return NextResponse.json({ error: "Invalid generation ID" }, { status: 400 });
    }
    const collectionIds = await getGenerationCollectionIds(genId);
    return NextResponse.json({ collectionIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch collection IDs" }, { status: 500 });
  }
}
