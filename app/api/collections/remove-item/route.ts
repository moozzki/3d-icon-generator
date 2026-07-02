import { NextResponse } from "next/server";
import { removeItemFromCollection } from "@/app/actions/collections";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const collectionId = String(body.collectionId || "");
    const generationId = Number(body.generationId);

    if (!collectionId || !generationId) {
      return NextResponse.json({ error: "collectionId and generationId are required" }, { status: 400 });
    }

    const result = await removeItemFromCollection(collectionId, generationId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to remove item from collection" }, { status: 500 });
  }
}
