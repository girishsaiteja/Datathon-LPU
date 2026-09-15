import { NextRequest, NextResponse } from "next/server";
import { getExecutiveLive } from "@/lib/live-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    const data = await getExecutiveLive(
      {
        merchantCategory: q.get("merchantCategory") || "All",
        merchantStatus: q.get("merchantStatus") || "All",
        riskSegment: q.get("riskSegment") || "All",
        userType: q.get("userType") || "All",
      },
      { from: q.get("from") || "2026-01-01", to: q.get("to") || "2026-12-03" },
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dashboard query failed" }, { status: 500 });
  }
}
