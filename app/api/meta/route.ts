import { NextResponse } from "next/server";
import { getMeta } from "@/lib/live-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMeta();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load meta" }, { status: 500 });
  }
}
