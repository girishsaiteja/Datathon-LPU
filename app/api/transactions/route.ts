import { NextRequest, NextResponse } from "next/server";
import { getTransactionsLive } from "@/lib/live-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    const data = await getTransactionsLive(
      {
        status: q.get("status") || "All",
        merchantCategory: q.get("merchantCategory") || "All",
        amountMin: q.get("amountMin") || "",
        amountMax: q.get("amountMax") || "",
        userType: q.get("userType") || "All",
        merchantId: q.get("merchantId") || "All",
        userId: q.get("userId") || "All",
        search: q.get("search") || "",
      },
      { from: q.get("from") || "2026-01-01", to: q.get("to") || "2026-12-03" },
      Number(q.get("page") || 1),
      Number(q.get("pageSize") || 10),
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transaction query failed" }, { status: 500 });
  }
}
