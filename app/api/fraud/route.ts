import { NextRequest, NextResponse } from "next/server";
import { getFraudLive } from "@/lib/live-data";
import { cachedJson } from "@/lib/query-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    const data = await cachedJson(`fraud:${q.toString()}`, () =>
      getFraudLive({
        riskLevel: q.get("riskLevel") || "All",
        minTransactions: q.get("minTransactions") || "All",
        merchantCategory: q.get("merchantCategory") || "All",
      }),
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fraud query failed" }, { status: 500 });
  }
}
