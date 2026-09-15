import { NextResponse } from "next/server";
import { getMeta } from "@/lib/live-data";
import { cachedJson } from "@/lib/query-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await cachedJson("meta", getMeta);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load meta" }, { status: 500 });
  }
}
