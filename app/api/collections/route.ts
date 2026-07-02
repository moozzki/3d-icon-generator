import { NextResponse } from "next/server";
import { getUserCollections, createCollection } from "@/app/actions/collections";

export async function GET() {
  try {
    const data = await getUserCollections();
    return NextResponse.json({ collections: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch collections" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const result = await createCollection(body.name);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create collection" }, { status: 500 });
  }
}
