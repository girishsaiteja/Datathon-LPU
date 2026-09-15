import { NextRequest, NextResponse } from "next/server";
import { getMerchantLive } from "@/lib/live-data";
import { cachedJson } from "@/lib/query-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    const data = await cachedJson(`merchants:${q.toString()}`, () =>
      getMerchantLive(
        {
          merchantState: q.get("merchantState") || "All",
          merchantCategory: q.get("merchantCategory") || "All",
          businessType: q.get("businessType") || "All",
          merchantStatus: q.get("merchantStatus") || "All",
          riskLevel: q.get("riskLevel") || "All",
        },
        { from: q.get("from") || "2026-01-01", to: q.get("to") || "2026-12-03" },
      ),
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Merchant query failed" }, { status: 500 });
  }
}
