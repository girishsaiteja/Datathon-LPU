import { NextRequest, NextResponse } from "next/server";
import { getFraudLive } from "@/lib/live-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    const data = await getFraudLive({
      riskLevel: q.get("riskLevel") || "All",
      minTransactions: q.get("minTransactions") || "All",
      merchantCategory: q.get("merchantCategory") || "All",
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fraud query failed" }, { status: 500 });
  }
}
