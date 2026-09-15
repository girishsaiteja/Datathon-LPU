import { formatNumber, formatPct } from "@/lib/format";
import { num, query } from "@/lib/db";
import { assertReadOnlySelect, withLimit } from "@/lib/agent/sql-guard";
import type { ToolResult } from "@/lib/agent/types";

function inr(value: number) {
  if (Math.abs(value) >= 1e7) return `₹ ${formatNumber(value / 1e7, 2)} Cr`;
  if (Math.abs(value) >= 1e5) return `₹ ${formatNumber(value / 1e5, 2)} Lakh`;
  return `₹ ${formatNumber(Math.round(value))}`;
}

export const TOOL_SPECS = [
  {
    name: "daily_transaction_volume",
    description: "Daily transaction count and amount trend. Use only for volume/trend over time, not for failures, categories, or clusters.",
  },
  {
    name: "amount_by_merchant_category",
    description: "Total transaction amount grouped by merchant category. Use for category spend or sales-by-category.",
  },
  {
    name: "success_vs_failed_by_day",
    description: "Daily successful vs failed transaction counts. Use only when the user asks to compare success and failures.",
  },
  {
    name: "top_merchants_by_chargeback_count",
    description: "Merchants ranked by chargeback count. Use for highest chargebacks.",
  },
  {
    name: "top_merchants_by_disputed_amount",
    description: "Merchants ranked by disputed amount.",
  },
  {
    name: "category_disputed_amount",
    description: "Disputed amount by merchant category.",
  },
  {
    name: "chargeback_reason_distribution",
    description: "Chargeback counts by reason code.",
  },
  {
    name: "top_users_by_disputed_amount",
    description: "Top users/customers by disputed amount.",
  },
  {
    name: "atv_trend",
    description: "Average transaction value trend over time.",
  },
  {
    name: "kyc_status_transaction_amount",
    description: "Transaction amount grouped by customer KYC status.",
  },
  {
    name: "chargebacks_by_severity",
    description: "Chargebacks compared by severity level.",
  },
  {
    name: "disputes_after_7_days",
    description: "Disputes reported more than 7 days after the original transaction.",
  },
  {
    name: "merchant_chargeback_ratio",
    description: "Merchants with the highest chargeback-to-transaction ratio. Use for rate-only rankings.",
  },
  {
    name: "chargeback_count_vs_rate",
    description:
      "Compare the merchant with the most chargebacks against the merchant with the highest chargeback rate. Use for yes/no questions like 'does the most-chargeback merchant also have the highest rate?'.",
  },
  {
    name: "amount_by_state",
    description: "Transaction amount by merchant state/region.",
  },
  {
    name: "merchant_amount_vs_chargebacks_scatter",
    description: "Scatter of merchant transaction amount vs chargeback count for correlation questions.",
  },
  {
    name: "amount_by_city",
    description: "Transaction amount grouped by merchant city. Use for city / which-city GMV questions, not failures.",
  },
  {
    name: "failed_by_merchant",
    description: "Merchants ranked by failed transaction count. Use for failed/failure rankings, not volume trends.",
  },
  {
    name: "chargebacks_by_state",
    description: "Chargeback count and disputed amount by merchant state. Use for state/region chargeback maps.",
  },
  {
    name: "unusual_low_volume_users",
    description:
      "Users with repeated chargebacks/disputes but low transaction amount. Use for unusual/outlier users, repeated chargebacks vs low volume, standout dispute cases. Never use daily volume for this.",
  },
  {
    name: "daily_chargeback_trend",
    description:
      "Daily chargeback count and chargeback-to-transaction rate. Use for why fraud/chargeback rate increased or decreased, fraud rate over time, or spikes by day.",
  },
  {
    name: "risk_leaderboard",
    description:
      "Top merchants (and the hottest cluster/user) by risk_score. Use for biggest/highest/most risk questions that are NOT specifically about a fraud cluster.",
  },
  {
    name: "highest_risk_cluster",
    description:
      "Highest-risk merchant-user fraud cluster vs the overall dataset (volume, failed rate, chargeback rate, disputed amount, risk). Use only for cluster / fraud-ring questions.",
  },
  {
    name: "run_sql",
    description: "Run a read-only SELECT on datathon.* when no other tool fits. Must be a single SELECT.",
  },
] as const;

export type ToolName = (typeof TOOL_SPECS)[number]["name"];

export async function runTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
  const limit = Math.min(50, Math.max(5, Number(args.limit ?? 10)));

  switch (name) {
    case "daily_transaction_volume":
      return dailyVolume();
    case "amount_by_merchant_category":
      return amountByCategory();
    case "success_vs_failed_by_day":
      return successVsFailed();
    case "top_merchants_by_chargeback_count":
      return topMerchantsChargebacks(limit);
    case "top_merchants_by_disputed_amount":
      return topMerchantsDisputed(limit);
    case "category_disputed_amount":
      return categoryDisputed();
    case "chargeback_reason_distribution":
      return reasonDistribution();
    case "top_users_by_disputed_amount":
      return topUsersDisputed(limit);
    case "atv_trend":
      return atvTrend();
    case "kyc_status_transaction_amount":
      return kycAmount();
    case "chargebacks_by_severity":
      return severityCompare();
    case "disputes_after_7_days":
      return delayedDisputes();
    case "merchant_chargeback_ratio":
      return merchantRatio(limit);
    case "chargeback_count_vs_rate":
      return chargebackCountVsRate();
    case "amount_by_state":
      return amountByState();
    case "merchant_amount_vs_chargebacks_scatter":
      return merchantScatter();
    case "amount_by_city":
      return amountByCity();
    case "failed_by_merchant":
      return failedByMerchant(limit);
    case "chargebacks_by_state":
      return chargebacksByState();
    case "unusual_low_volume_users":
      return unusualLowVolumeUsers(limit);
    case "daily_chargeback_trend":
      return dailyChargebackTrend();
    case "risk_leaderboard":
      return riskLeaderboard(limit);
    case "highest_risk_cluster":
      return highestRiskCluster();
    case "run_sql":
      return runSql(String(args.sql ?? ""), String(args.title ?? ""));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function dailyVolume(): Promise<ToolResult> {
  const rows = await query<{ d: string; volume: string; amount: string }>(
    `SELECT to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS d,
            COUNT(*)::text AS volume,
            COALESCE(SUM(amount),0)::text AS amount
     FROM datathon.fact_transactions
     WHERE timestamp IS NOT NULL
     GROUP BY 1 ORDER BY 1`,
  );
  const data = rows.map((r) => ({ date: r.d, volume: num(r.volume), amount: num(r.amount) }));
  const peak = data.reduce((a, b) => (b.volume > a.volume ? b : a), data[0] ?? { date: "-", volume: 0, amount: 0 });
  const totalAmt = data.reduce((s, r) => s + r.amount, 0);
  return {
    title: "Daily transaction volume",
    chartType: "line",
    xKey: "date",
    series: [{ key: "volume", label: "Transactions" }],
    data,
    facts: [
      `There are ${formatNumber(data.reduce((s, r) => s + r.volume, 0))} transactions totaling ${inr(totalAmt)}.`,
      peak ? `Peak volume was ${formatNumber(peak.volume)} on ${peak.date}.` : "",
    ].filter(Boolean),
  };
}

async function dailyChargebackTrend(): Promise<ToolResult> {
  const rows = await query<{ d: string; txns: string; chargebacks: string; fraud_rate: string }>(
    `WITH tx AS (
        SELECT date_trunc('day', timestamp)::date AS d, COUNT(*)::numeric AS txns
        FROM datathon.fact_transactions
        WHERE timestamp IS NOT NULL
        GROUP BY 1
      ), cb AS (
        SELECT date_trunc('day', COALESCE(transaction_timestamp, reported_timestamp))::date AS d,
               COUNT(*)::numeric AS chargebacks
        FROM datathon.fact_chargebacks
        WHERE COALESCE(transaction_timestamp, reported_timestamp) IS NOT NULL
        GROUP BY 1
      )
      SELECT to_char(tx.d, 'YYYY-MM-DD') AS d,
             tx.txns::text,
             COALESCE(cb.chargebacks, 0)::text AS chargebacks,
             ROUND(100.0 * COALESCE(cb.chargebacks, 0) / NULLIF(tx.txns, 0), 2)::text AS fraud_rate
      FROM tx
      LEFT JOIN cb ON cb.d = tx.d
      ORDER BY tx.d`,
  );
  const data = rows.map((r) => ({
    date: r.d,
    chargebacks: num(r.chargebacks),
    fraudRate: num(r.fraud_rate, 2),
  }));
  const peak = data.reduce((a, b) => (b.fraudRate > a.fraudRate ? b : a), data[0] ?? { date: "-", chargebacks: 0, fraudRate: 0 });
  const peakCbs = data.reduce((a, b) => (b.chargebacks > a.chargebacks ? b : a), data[0] ?? { date: "-", chargebacks: 0, fraudRate: 0 });
  return {
    title: "Daily chargeback rate",
    chartType: "line",
    xKey: "date",
    series: [
      { key: "fraudRate", label: "Chargeback rate %" },
      { key: "chargebacks", label: "Chargebacks" },
    ],
    data,
    facts: [
      peak ? `Chargeback rate peaked at ${peak.fraudRate}% on ${peak.date}.` : "",
      peakCbs ? `Most chargebacks in a day: ${formatNumber(peakCbs.chargebacks)} on ${peakCbs.date}.` : "",
    ].filter(Boolean),
  };
}

async function amountByCategory(): Promise<ToolResult> {
  const rows = await query<{ category: string; amount: string; txns: string }>(
    `SELECT COALESCE(merchant_category, 'Unmatched') AS category,
            COALESCE(SUM(transaction_amount),0)::text AS amount,
            COALESCE(SUM(transaction_count),0)::text AS txns
     FROM datathon.merchant_risk_scores
     GROUP BY 1
     ORDER BY SUM(transaction_amount) DESC NULLS LAST`,
  );
  const data = rows.map((r) => ({ category: r.category, amountCr: num(num(r.amount) / 1e7, 2), txns: num(r.txns) }));
  const top = data[0];
  return {
    title: "Transaction amount by merchant category",
    chartType: "bar",
    xKey: "category",
    series: [{ key: "amountCr", label: "Amount (Cr)" }],
    data,
    table: {
      columns: [
        { key: "category", label: "Category" },
        { key: "txns", label: "Transactions" },
        { key: "amountCr", label: "Amount (Cr)" },
      ],
      rows: data,
    },
    facts: top ? [`${top.category} leads with ${inr(num(rows[0]?.amount))}.`] : [],
  };
}

async function successVsFailed(): Promise<ToolResult> {
  const rows = await query<{ d: string; success: string; failed: string }>(
    `SELECT to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS d,
            COUNT(*) FILTER (WHERE status = 'Success')::text AS success,
            COUNT(*) FILTER (WHERE status = 'Failed')::text AS failed
     FROM datathon.fact_transactions
     WHERE timestamp IS NOT NULL
     GROUP BY 1 ORDER BY 1`,
  );
  const data = rows.map((r) => ({ date: r.d, success: num(r.success), failed: num(r.failed) }));
  const suc = data.reduce((s, r) => s + r.success, 0);
  const fail = data.reduce((s, r) => s + r.failed, 0);
  return {
    title: "Successful vs failed transactions by day",
    chartType: "line",
    xKey: "date",
    series: [
      { key: "success", label: "Success" },
      { key: "failed", label: "Failed" },
    ],
    data,
    facts: [`Successful: ${formatNumber(suc)}. Failed: ${formatNumber(fail)} (${formatPct(suc + fail ? (fail / (suc + fail)) * 100 : 0)}).`],
  };
}

async function topMerchantsChargebacks(limit: number): Promise<ToolResult> {
  const rows = await query<{ merchant_name: string; merchant_category: string; chargeback_count: string; disputed_amount: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(merchant_category, 'Unknown') AS merchant_category,
            COALESCE(chargeback_count,0)::text AS chargeback_count,
            COALESCE(disputed_amount,0)::text AS disputed_amount
     FROM datathon.merchant_risk_scores
     ORDER BY chargeback_count DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  const data = rows.map((r) => ({
    merchant: r.merchant_name,
    category: r.merchant_category,
    chargebacks: num(r.chargeback_count),
    disputed: num(r.disputed_amount),
  }));
  const top = data[0];
  return {
    title: `Top ${limit} merchants by chargeback count`,
    chartType: "bar",
    xKey: "merchant",
    series: [{ key: "chargebacks", label: "Chargebacks" }],
    data,
    table: {
      columns: [
        { key: "merchant", label: "Merchant" },
        { key: "category", label: "Category" },
        { key: "chargebacks", label: "Chargebacks" },
      ],
      rows: data,
    },
    facts: top ? [`${top.merchant} has the highest chargeback count at ${formatNumber(top.chargebacks)}.`] : [],
  };
}

async function topMerchantsDisputed(limit: number): Promise<ToolResult> {
  const rows = await query<{ merchant_name: string; merchant_category: string; chargeback_count: string; disputed_amount: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(merchant_category, 'Unknown') AS merchant_category,
            COALESCE(chargeback_count,0)::text AS chargeback_count,
            COALESCE(disputed_amount,0)::text AS disputed_amount
     FROM datathon.merchant_risk_scores
     ORDER BY disputed_amount DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  const data = rows.map((r) => ({
    merchant: r.merchant_name,
    category: r.merchant_category,
    chargebacks: num(r.chargeback_count),
    disputedCr: num(num(r.disputed_amount) / 1e7, 3),
    disputed: num(r.disputed_amount),
  }));
  const top = data[0];
  return {
    title: `Top ${limit} merchants by disputed amount`,
    chartType: "bar",
    xKey: "merchant",
    series: [{ key: "disputedCr", label: "Disputed (Cr)" }],
    data,
    table: {
      columns: [
        { key: "merchant", label: "Merchant" },
        { key: "category", label: "Category" },
        { key: "chargebacks", label: "Chargebacks" },
        { key: "disputed", label: "Disputed (₹)" },
      ],
      rows: data,
    },
    facts: top ? [`${top.merchant} has the highest disputed amount at ${inr(top.disputed)}.`] : [],
  };
}

async function categoryDisputed(): Promise<ToolResult> {
  const rows = await query<{ category: string; amount: string; n: string }>(
    `SELECT COALESCE(merchant_category, 'Unmatched') AS category,
            COALESCE(SUM(disputed_amount),0)::text AS amount,
            COALESCE(SUM(chargeback_count),0)::text AS n
     FROM datathon.merchant_risk_scores
     GROUP BY 1
     ORDER BY SUM(disputed_amount) DESC NULLS LAST`,
  );
  const data = rows.map((r) => ({ category: r.category, disputedCr: num(num(r.amount) / 1e7, 3), chargebacks: num(r.n) }));
  const top = data[0];
  return {
    title: "Disputed amount by merchant category",
    chartType: "bar",
    xKey: "category",
    series: [{ key: "disputedCr", label: "Disputed (Cr)" }],
    data,
    facts: top ? [`${top.category} has the highest disputed amount.`] : [],
  };
}

async function reasonDistribution(): Promise<ToolResult> {
  const rows = await query<{ reason: string; n: string; amount: string }>(
    `SELECT COALESCE(reason_code, 'Unknown') AS reason,
            COUNT(*)::text AS n,
            COALESCE(SUM(disputed_amount),0)::text AS amount
     FROM datathon.fact_chargebacks
     GROUP BY 1 ORDER BY COUNT(*) DESC`,
  );
  const total = rows.reduce((s, r) => s + num(r.n), 0) || 1;
  const data = rows.map((r) => ({ reason: r.reason, count: num(r.n), share: num((num(r.n) / total) * 100, 1) }));
  return {
    title: "Chargeback reason distribution",
    chartType: "bar",
    xKey: "reason",
    series: [{ key: "count", label: "Chargebacks" }],
    data,
    facts: data[0] ? [`Most common reason is ${data[0].reason} (${data[0].share}%).`] : [],
  };
}

async function topUsersDisputed(limit: number): Promise<ToolResult> {
  const rows = await query<{ user_id: string; full_name: string; disputed_amount: string; dispute_count: string }>(
    `SELECT user_id,
            COALESCE(full_name, user_id) AS full_name,
            COALESCE(disputed_amount,0)::text AS disputed_amount,
            COALESCE(dispute_count,0)::text AS dispute_count
     FROM datathon.customer_risk_scores
     ORDER BY disputed_amount DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  const data = rows.map((r) => ({
    user: r.full_name || r.user_id,
    userId: r.user_id,
    disputed: num(r.disputed_amount),
    disputes: num(r.dispute_count),
  }));
  return {
    title: `Top ${limit} users by disputed amount`,
    chartType: "bar",
    xKey: "user",
    series: [{ key: "disputed", label: "Disputed amount (₹)" }],
    data,
    table: {
      columns: [
        { key: "user", label: "User" },
        { key: "userId", label: "User ID" },
        { key: "disputes", label: "Disputes" },
        { key: "disputed", label: "Disputed (₹)" },
      ],
      rows: data,
    },
    facts: data[0] ? [`${data[0].user} has the highest disputed amount at ${inr(data[0].disputed)}.`] : [],
  };
}

async function atvTrend(): Promise<ToolResult> {
  const rows = await query<{ d: string; atv: string }>(
    `SELECT to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS d,
            COALESCE(AVG(amount),0)::text AS atv
     FROM datathon.fact_transactions
     WHERE timestamp IS NOT NULL
     GROUP BY 1 ORDER BY 1`,
  );
  const data = rows.map((r) => ({ date: r.d, atv: num(r.atv, 0) }));
  const avg = data.length ? data.reduce((s, r) => s + r.atv, 0) / data.length : 0;
  return {
    title: "Average transaction value over time",
    chartType: "line",
    xKey: "date",
    series: [{ key: "atv", label: "ATV (₹)" }],
    data,
    facts: [`Average ticket across the period is ${inr(avg)}.`],
  };
}

async function kycAmount(): Promise<ToolResult> {
  const rows = await query<{ kyc_status: string; amount: string; txns: string }>(
    `SELECT COALESCE(kyc_status, 'Unknown') AS kyc_status,
            COALESCE(SUM(transaction_amount),0)::text AS amount,
            COUNT(*)::text AS txns
     FROM datathon.customer_risk_scores
     GROUP BY 1
     ORDER BY SUM(transaction_amount) DESC NULLS LAST`,
  );
  const data = rows.map((r) => ({ kyc: r.kyc_status, amountCr: num(num(r.amount) / 1e7, 2), txns: num(r.txns) }));
  return {
    title: "Transaction amount by KYC status",
    chartType: "bar",
    xKey: "kyc",
    series: [{ key: "amountCr", label: "Amount (Cr)" }],
    data,
    facts: data[0] ? [`${data[0].kyc} KYC customers contribute the most transaction amount (${data[0].amountCr} Cr) across ${formatNumber(data[0].txns)} scored customers.`] : [],
  };
}

async function severityCompare(): Promise<ToolResult> {
  const rows = await query<{ severity: string; n: string; amount: string }>(
    `SELECT COALESCE(severity, 'Unknown') AS severity,
            COUNT(*)::text AS n,
            COALESCE(SUM(disputed_amount),0)::text AS amount
     FROM datathon.fact_chargebacks
     GROUP BY 1
     ORDER BY CASE COALESCE(severity,'Unknown') WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 ELSE 5 END`,
  );
  const data = rows.map((r) => ({ severity: r.severity, chargebacks: num(r.n), disputedCr: num(num(r.amount) / 1e7, 3) }));
  return {
    title: "Chargebacks by severity",
    chartType: "bar",
    xKey: "severity",
    series: [
      { key: "chargebacks", label: "Count" },
      { key: "disputedCr", label: "Disputed (Cr)" },
    ],
    data,
    facts: data.map((r) => `${r.severity}: ${formatNumber(r.chargebacks)} chargebacks.`),
  };
}

async function delayedDisputes(): Promise<ToolResult> {
  const [summary] = await query<{ total: string; delayed: string; amount: string }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (
         WHERE reported_timestamp - transaction_timestamp > INTERVAL '7 days'
       )::text AS delayed,
       COALESCE(SUM(disputed_amount) FILTER (
         WHERE reported_timestamp - transaction_timestamp > INTERVAL '7 days'
       ),0)::text AS amount
     FROM datathon.fact_chargebacks
     WHERE transaction_timestamp IS NOT NULL AND reported_timestamp IS NOT NULL`,
  );
  const buckets = await query<{ bucket: string; n: string }>(
    `SELECT bucket, COUNT(*)::text AS n FROM (
        SELECT CASE
          WHEN reported_timestamp - transaction_timestamp <= INTERVAL '1 day' THEN '0-1 days'
          WHEN reported_timestamp - transaction_timestamp <= INTERVAL '3 days' THEN '1-3 days'
          WHEN reported_timestamp - transaction_timestamp <= INTERVAL '7 days' THEN '3-7 days'
          WHEN reported_timestamp - transaction_timestamp <= INTERVAL '30 days' THEN '7-30 days'
          ELSE '30+ days'
        END AS bucket
        FROM datathon.fact_chargebacks
        WHERE transaction_timestamp IS NOT NULL AND reported_timestamp IS NOT NULL
          AND reported_timestamp >= transaction_timestamp
     ) s
     GROUP BY 1
     ORDER BY CASE bucket
       WHEN '0-1 days' THEN 1 WHEN '1-3 days' THEN 2 WHEN '3-7 days' THEN 3
       WHEN '7-30 days' THEN 4 ELSE 5 END`,
  );
  const data = buckets.map((r) => ({ delay: r.bucket, disputes: num(r.n) }));
  const delayed = num(summary?.delayed);
  const total = num(summary?.total) || 1;
  return {
    title: "Dispute reporting delay",
    chartType: "bar",
    xKey: "delay",
    series: [{ key: "disputes", label: "Disputes" }],
    data,
    facts: [
      `${formatNumber(delayed)} disputes were reported after 7 days (${formatPct((delayed / total) * 100)} of timed disputes).`,
      `Disputed amount in those late reports: ${inr(num(summary?.amount))}.`,
    ],
  };
}

async function merchantRatio(limit: number): Promise<ToolResult> {
  const rows = await query<{ merchant_name: string; merchant_category: string; ratio: string; txns: string; cbs: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(merchant_category, 'Unknown') AS merchant_category,
            ROUND((COALESCE(chargeback_count,0)::numeric / NULLIF(transaction_count, 0)), 2)::text AS ratio,
            COALESCE(transaction_count,0)::text AS txns,
            COALESCE(chargeback_count,0)::text AS cbs
     FROM datathon.merchant_risk_scores
     WHERE COALESCE(transaction_count,0) >= 3
       AND COALESCE(chargeback_count,0) > 0
     ORDER BY (COALESCE(chargeback_count,0)::numeric / NULLIF(transaction_count, 0)) DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  const data = rows.map((r) => ({
    merchant: r.merchant_name,
    category: r.merchant_category,
    ratio: num(r.ratio, 2),
    txns: num(r.txns),
    chargebacks: num(r.cbs),
  }));
  return {
    title: "Highest merchant chargeback-to-transaction ratio",
    chartType: "bar",
    xKey: "merchant",
    series: [{ key: "ratio", label: "Chargebacks per transaction" }],
    data,
    table: {
      columns: [
        { key: "merchant", label: "Merchant" },
        { key: "category", label: "Category" },
        { key: "txns", label: "Txns" },
        { key: "chargebacks", label: "Chargebacks" },
        { key: "ratio", label: "Ratio" },
      ],
      rows: data,
    },
    facts: data[0]
      ? [
          `${data[0].merchant} has the highest chargeback-to-transaction ratio at ${data[0].ratio} (${formatNumber(data[0].chargebacks)} chargebacks on ${formatNumber(data[0].txns)} transactions).`,
        ]
      : [],
  };
}

async function chargebackCountVsRate(): Promise<ToolResult> {
  const rows = await query<{ merchant_name: string; chargebacks: string; txns: string; rate: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(chargeback_count,0)::text AS chargebacks,
            COALESCE(transaction_count,0)::text AS txns,
            ROUND((COALESCE(chargeback_count,0)::numeric / NULLIF(transaction_count, 0)) * 100, 2)::text AS rate
     FROM datathon.merchant_risk_scores
     WHERE COALESCE(transaction_count,0) >= 3
       AND COALESCE(chargeback_count,0) > 0
     ORDER BY chargeback_count DESC NULLS LAST
     LIMIT 12`,
  );
  const [topRate] = await query<{ merchant_name: string; chargebacks: string; txns: string; rate: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(chargeback_count,0)::text AS chargebacks,
            COALESCE(transaction_count,0)::text AS txns,
            ROUND((COALESCE(chargeback_count,0)::numeric / NULLIF(transaction_count, 0)) * 100, 2)::text AS rate
     FROM datathon.merchant_risk_scores
     WHERE COALESCE(transaction_count,0) >= 3
       AND COALESCE(chargeback_count,0) > 0
     ORDER BY (COALESCE(chargeback_count,0)::numeric / NULLIF(transaction_count, 0)) DESC NULLS LAST
     LIMIT 1`,
  );
  const data = rows.map((r) => ({
    merchant: r.merchant_name,
    chargebacks: num(r.chargebacks),
    txns: num(r.txns),
    ratePct: num(r.rate, 2),
  }));
  const mostCbs = data[0];
  const highestRate = topRate
    ? {
        merchant: topRate.merchant_name,
        chargebacks: num(topRate.chargebacks),
        txns: num(topRate.txns),
        ratePct: num(topRate.rate, 2),
      }
    : null;
  const same = Boolean(mostCbs && highestRate && mostCbs.merchant === highestRate.merchant);
  return {
    title: "Most chargebacks vs highest chargeback rate",
    chartType: "bar",
    xKey: "merchant",
    series: [
      { key: "chargebacks", label: "Chargebacks" },
      { key: "ratePct", label: "Chargeback rate %" },
    ],
    data,
    table: {
      columns: [
        { key: "merchant", label: "Merchant" },
        { key: "txns", label: "Txns" },
        { key: "chargebacks", label: "Chargebacks" },
        { key: "ratePct", label: "Rate %" },
      ],
      rows: data,
    },
    facts: [
      mostCbs
        ? `${mostCbs.merchant} has the most chargebacks (${formatNumber(mostCbs.chargebacks)} on ${formatNumber(mostCbs.txns)} txns, rate ${mostCbs.ratePct}%).`
        : "No merchants with chargebacks were returned.",
      highestRate
        ? `${highestRate.merchant} has the highest chargeback rate at ${highestRate.ratePct}% (${formatNumber(highestRate.chargebacks)} chargebacks on ${formatNumber(highestRate.txns)} txns).`
        : "",
      mostCbs && highestRate
        ? same
          ? `Yes — ${mostCbs.merchant} leads both chargeback count and chargeback rate.`
          : `No — the count leader (${mostCbs.merchant}) is not the rate leader (${highestRate.merchant}).`
        : "",
    ].filter(Boolean),
  };
}

async function amountByState(): Promise<ToolResult> {
  const rows = await query<{ state: string; amount: string; txns: string }>(
    `SELECT COALESCE(state, 'Unmatched') AS state,
            COALESCE(SUM(transaction_amount),0)::text AS amount,
            COALESCE(SUM(transaction_count),0)::text AS txns
     FROM datathon.merchant_risk_scores
     GROUP BY 1
     ORDER BY SUM(transaction_amount) DESC NULLS LAST`,
  );
  const data = rows.map((r) => ({ state: r.state, amountCr: num(num(r.amount) / 1e7, 2), txns: num(r.txns) }));
  return {
    title: "Transaction amount by state",
    chartType: "bar",
    xKey: "state",
    series: [{ key: "amountCr", label: "Amount (Cr)" }],
    data,
    facts: data[0] ? [`${data[0].state} has the highest transaction amount.`] : [],
  };
}

async function merchantScatter(): Promise<ToolResult> {
  const rows = await query<{ merchant_name: string; amount: string; cbs: string; score: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(transaction_amount,0)::text AS amount,
            COALESCE(chargeback_count,0)::text AS cbs,
            COALESCE(risk_score,0)::text AS score
     FROM datathon.merchant_risk_scores
     WHERE COALESCE(transaction_count,0) > 0
     ORDER BY transaction_amount DESC NULLS LAST
     LIMIT 80`,
  );
  const data = rows.map((r) => ({
    merchant: r.merchant_name,
    amountCr: num(num(r.amount) / 1e7, 3),
    chargebacks: num(r.cbs),
    risk: num(r.score),
  }));
  return {
    title: "Merchant amount vs chargebacks",
    chartType: "scatter",
    xKey: "amountCr",
    series: [{ key: "chargebacks", label: "Chargebacks" }],
    data,
    facts: ["Each point is a merchant: X = transaction amount (Cr), Y = chargeback count."],
  };
}

async function amountByCity(): Promise<ToolResult> {
  const rows = await query<{ city: string; amount: string; txns: string }>(
    `SELECT COALESCE(city, 'Unmatched') AS city,
            COALESCE(SUM(transaction_amount),0)::text AS amount,
            COALESCE(SUM(transaction_count),0)::text AS txns
     FROM datathon.merchant_risk_scores
     GROUP BY 1
     ORDER BY SUM(transaction_amount) DESC NULLS LAST
     LIMIT 15`,
  );
  const data = rows.map((r) => ({ city: r.city, amountCr: num(num(r.amount) / 1e7, 2), txns: num(r.txns) }));
  return {
    title: "Transaction amount by city",
    chartType: "bar",
    xKey: "city",
    series: [{ key: "amountCr", label: "Amount (Cr)" }],
    data,
    facts: data[0] ? [`${data[0].city} has the highest transaction amount at ${data[0].amountCr} Cr.`] : [],
  };
}

async function failedByMerchant(limit: number): Promise<ToolResult> {
  const rows = await query<{ merchant: string; failed: string; txns: string }>(
    `SELECT COALESCE(m.merchant_name, t.merchant_id) AS merchant,
            COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed,
            COUNT(*)::text AS txns
     FROM datathon.fact_transactions t
     LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
     GROUP BY 1
     HAVING COUNT(*) FILTER (WHERE t.status = 'Failed') > 0
     ORDER BY COUNT(*) FILTER (WHERE t.status = 'Failed') DESC
     LIMIT $1`,
    [limit],
  );
  const data = rows.map((r) => ({ merchant: r.merchant, failed: num(r.failed), txns: num(r.txns) }));
  return {
    title: "Merchants with the most failed transactions",
    chartType: "bar",
    xKey: "merchant",
    series: [{ key: "failed", label: "Failed transactions" }],
    data,
    facts: data[0]
      ? [`${data[0].merchant} has the most failed transactions (${formatNumber(data[0].failed)} of ${formatNumber(data[0].txns)}).`]
      : [],
  };
}

async function chargebacksByState(): Promise<ToolResult> {
  const rows = await query<{ state: string; chargebacks: string; disputed: string }>(
    `SELECT COALESCE(state, 'Unmatched') AS state,
            COALESCE(SUM(chargeback_count),0)::text AS chargebacks,
            COALESCE(SUM(disputed_amount),0)::text AS disputed
     FROM datathon.merchant_risk_scores
     GROUP BY 1
     ORDER BY SUM(chargeback_count) DESC NULLS LAST`,
  );
  const data = rows.map((r) => ({
    state: r.state,
    chargebacks: num(r.chargebacks),
    disputedCr: num(num(r.disputed) / 1e7, 3),
  }));
  return {
    title: "Chargebacks by state",
    chartType: "bar",
    xKey: "state",
    series: [{ key: "chargebacks", label: "Chargebacks" }],
    data,
    facts: data[0] ? [`${data[0].state} has the most chargebacks (${formatNumber(data[0].chargebacks)}).`] : [],
  };
}

async function unusualLowVolumeUsers(limit: number): Promise<ToolResult> {
  const rows = await query<{
    user_name: string;
    chargebacks: string;
    txn_amount: string;
    disputed_amount: string;
    risk_score: string;
    leak_ratio: string;
  }>(
    `SELECT COALESCE(full_name, user_id) AS user_name,
            COALESCE(dispute_count,0)::text AS chargebacks,
            COALESCE(transaction_amount,0)::text AS txn_amount,
            COALESCE(disputed_amount,0)::text AS disputed_amount,
            COALESCE(risk_score,0)::text AS risk_score,
            ROUND(
              (COALESCE(disputed_amount,0)::numeric / NULLIF(transaction_amount,0)) * 100
            , 2)::text AS leak_ratio
     FROM datathon.customer_risk_scores
     WHERE COALESCE(dispute_count,0) >= 2
       AND COALESCE(transaction_amount,0) > 0
     ORDER BY (COALESCE(dispute_count,0)::numeric / NULLIF(transaction_amount,0)) DESC,
              dispute_count DESC
     LIMIT $1`,
    [limit],
  );
  const data = rows.map((r) => ({
    user: r.user_name,
    chargebacks: num(r.chargebacks),
    txnAmount: num(r.txn_amount),
    disputed: num(r.disputed_amount),
    risk: num(r.risk_score, 0),
    leakPct: num(r.leak_ratio, 2),
  }));
  const top = data[0];
  return {
    title: "Users with repeated chargebacks vs low volume",
    chartType: "bar",
    xKey: "user",
    series: [{ key: "leakPct", label: "Disputed / txn amount %" }],
    data,
    table: {
      columns: [
        { key: "user", label: "User" },
        { key: "chargebacks", label: "Chargebacks" },
        { key: "txnAmount", label: "Txn amount (₹)" },
        { key: "disputed", label: "Disputed (₹)" },
        { key: "leakPct", label: "Leak %" },
      ],
      rows: data,
    },
    facts: top
      ? [
          `${top.user} is the most unusual: ${formatNumber(top.chargebacks)} chargebacks on only ${inr(top.txnAmount)} of transactions (leak ${top.leakPct}%).`,
          `These users have at least 2 chargebacks while their transaction volume is small relative to disputed amount.`,
          data[1]
            ? `${data[1].user} is next with ${formatNumber(data[1].chargebacks)} chargebacks and ${inr(data[1].txnAmount)} volume.`
            : "",
        ].filter(Boolean)
      : ["No users with repeated chargebacks were found."],
  };
}

async function riskLeaderboard(limit: number): Promise<ToolResult> {
  const merchants = await query<{ merchant_name: string; merchant_category: string; risk_score: string; chargeback_count: string; disputed_amount: string }>(
    `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
            COALESCE(merchant_category, 'Unknown') AS merchant_category,
            COALESCE(risk_score,0)::text AS risk_score,
            COALESCE(chargeback_count,0)::text AS chargeback_count,
            COALESCE(disputed_amount,0)::text AS disputed_amount
     FROM datathon.merchant_risk_scores
     ORDER BY risk_score DESC NULLS LAST, chargeback_count DESC
     LIMIT $1`,
    [limit],
  );
  const [cluster] = await query<{ cluster_id: string; risk_score: string; chargeback_count: string; user_count: string; merchant_count: string }>(
    `SELECT cluster_id::text, COALESCE(risk_score,0)::text AS risk_score,
            COALESCE(chargeback_count,0)::text AS chargeback_count,
            COALESCE(user_count,0)::text AS user_count,
            COALESCE(merchant_count,0)::text AS merchant_count
     FROM datathon.fraud_clusters
     WHERE cluster_id <> 2
     ORDER BY risk_score DESC NULLS LAST, chargeback_count DESC
     LIMIT 1`,
  );
  const [user] = await query<{ full_name: string; risk_score: string; dispute_count: string; disputed_amount: string }>(
    `SELECT COALESCE(full_name, user_id) AS full_name,
            COALESCE(risk_score,0)::text AS risk_score,
            COALESCE(dispute_count,0)::text AS dispute_count,
            COALESCE(disputed_amount,0)::text AS disputed_amount
     FROM datathon.customer_risk_scores
     ORDER BY risk_score DESC NULLS LAST, disputed_amount DESC
     LIMIT 1`,
  );
  const data = merchants.map((r) => ({
    merchant: r.merchant_name,
    category: r.merchant_category,
    risk: num(r.risk_score, 0),
    chargebacks: num(r.chargeback_count),
    disputed: num(r.disputed_amount),
  }));
  const top = data[0];
  const clusterId = cluster ? `CL-${cluster.cluster_id}` : "";
  return {
    title: "Highest-risk merchants",
    chartType: "bar",
    xKey: "merchant",
    series: [{ key: "risk", label: "Risk score" }],
    data,
    table: {
      columns: [
        { key: "merchant", label: "Merchant" },
        { key: "category", label: "Category" },
        { key: "risk", label: "Risk" },
        { key: "chargebacks", label: "Chargebacks" },
      ],
      rows: data,
    },
    facts: [
      top
        ? `${top.merchant} is the highest-risk merchant (score ${top.risk}, ${formatNumber(top.chargebacks)} chargebacks).`
        : "No merchant risk scores were returned.",
      cluster
        ? `Hottest cluster is ${clusterId} at risk ${num(cluster.risk_score, 0)} with ${formatNumber(num(cluster.chargeback_count))} chargebacks across ${formatNumber(num(cluster.user_count))} users.`
        : "",
      user
        ? `Highest-risk user is ${user.full_name} (score ${num(user.risk_score, 0)}, ${formatNumber(num(user.dispute_count))} disputes).`
        : "",
    ].filter(Boolean),
  };
}

async function highestRiskCluster(): Promise<ToolResult> {
  const [top] = await query<{
    cluster_id: string;
    user_count: string;
    merchant_count: string;
    transaction_count: string;
    transaction_amount: string;
    failed_transaction_count: string;
    failed_rate: string;
    chargeback_count: string;
    disputed_amount: string;
    chargeback_rate: string;
    risk_score: string;
    risk_level: string;
  }>(
    `SELECT cluster_id::text, COALESCE(user_count,0)::text AS user_count,
            COALESCE(merchant_count,0)::text AS merchant_count,
            COALESCE(transaction_count,0)::text AS transaction_count,
            COALESCE(transaction_amount,0)::text AS transaction_amount,
            COALESCE(failed_transaction_count,0)::text AS failed_transaction_count,
            COALESCE(failed_rate,0)::text AS failed_rate,
            COALESCE(chargeback_count,0)::text AS chargeback_count,
            COALESCE(disputed_amount,0)::text AS disputed_amount,
            COALESCE(chargeback_rate,0)::text AS chargeback_rate,
            COALESCE(risk_score,0)::text AS risk_score,
            COALESCE(risk_level, 'Unknown') AS risk_level
     FROM datathon.fraud_clusters
     WHERE cluster_id <> 2
     ORDER BY risk_score DESC NULLS LAST, chargeback_count DESC NULLS LAST
     LIMIT 1`,
  );
  const [avg] = await query<{ risk_score: string; failed_rate: string; chargeback_rate: string }>(
    `SELECT COALESCE(AVG(risk_score),0)::text AS risk_score,
            COALESCE(AVG(failed_rate),0)::text AS failed_rate,
            COALESCE(AVG(chargeback_rate),0)::text AS chargeback_rate
     FROM datathon.fraud_clusters
     WHERE cluster_id <> 2`,
  );
  const [txn] = await query<{ total: string; failed: string; amount: string }>(
    `SELECT COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE status = 'Failed')::text AS failed,
            COALESCE(SUM(amount),0)::text AS amount
     FROM datathon.fact_transactions`,
  );
  const [cb] = await query<{ cbs: string; disputed: string }>(
    `SELECT COUNT(*)::text AS cbs, COALESCE(SUM(disputed_amount),0)::text AS disputed
     FROM datathon.fact_chargebacks`,
  );

  function ratePct(value: number) {
    return value <= 1.5 ? value * 100 : value;
  }

  const clusterId = `CL-${top?.cluster_id ?? "—"}`;
  const clusterTxns = num(top?.transaction_count);
  const clusterFailed = num(top?.failed_transaction_count);
  const clusterCbs = num(top?.chargeback_count);
  const clusterDisputed = num(top?.disputed_amount);
  const clusterRisk = num(top?.risk_score, 1);
  const clusterFailRate = ratePct(num(top?.failed_rate, 2));
  const clusterCbRate = ratePct(num(top?.chargeback_rate, 2));
  const overallTxns = num(txn?.total) || 1;
  const overallFailRate = (num(txn?.failed) / overallTxns) * 100;
  const overallCbRate = (num(cb?.cbs) / overallTxns) * 100;
  const overallRisk = num(avg?.risk_score, 1);
  const overallDisputed = num(cb?.disputed);
  const volumeShare = (clusterTxns / overallTxns) * 100;

  const data = [
    { metric: "Risk score", cluster: clusterRisk, overall: overallRisk },
    { metric: "Failed rate %", cluster: num(clusterFailRate, 2), overall: num(overallFailRate, 2) },
    { metric: "Chargeback rate %", cluster: num(clusterCbRate, 2), overall: num(overallCbRate, 2) },
  ];

  const tableRows = [
    { metric: "Cluster", cluster: clusterId, overall: "All transactions" },
    { metric: "Users", cluster: num(top?.user_count), overall: "—" },
    { metric: "Merchants", cluster: num(top?.merchant_count), overall: "—" },
    { metric: "Transactions", cluster: clusterTxns, overall: overallTxns },
    { metric: "Txn amount (₹)", cluster: num(top?.transaction_amount), overall: num(txn?.amount) },
    { metric: "Failed txns", cluster: clusterFailed, overall: num(txn?.failed) },
    { metric: "Failed rate %", cluster: num(clusterFailRate, 2), overall: num(overallFailRate, 2) },
    { metric: "Chargebacks", cluster: clusterCbs, overall: num(cb?.cbs) },
    { metric: "Chargeback rate %", cluster: num(clusterCbRate, 2), overall: num(overallCbRate, 2) },
    { metric: "Disputed amount (₹)", cluster: clusterDisputed, overall: overallDisputed },
    { metric: "Risk score", cluster: clusterRisk, overall: overallRisk },
  ];

  return {
    title: `${clusterId} vs overall dataset`,
    chartType: "bar",
    xKey: "metric",
    series: [
      { key: "cluster", label: clusterId },
      { key: "overall", label: "Overall" },
    ],
    data,
    table: {
      columns: [
        { key: "metric", label: "Metric" },
        { key: "cluster", label: clusterId },
        { key: "overall", label: "Overall dataset" },
      ],
      rows: tableRows,
    },
    facts: [
      `${clusterId} is the highest-risk merchant-user cluster (${top?.risk_level || "Unknown"} risk score ${clusterRisk} vs overall cluster average ${overallRisk}).`,
      `It has ${formatNumber(clusterTxns)} transactions (${formatPct(volumeShare, 2)} of portfolio volume), ${formatNumber(num(top?.user_count))} users and ${formatNumber(num(top?.merchant_count))} merchants.`,
      `Failed rate is ${formatPct(clusterFailRate)} vs overall ${formatPct(overallFailRate)}; chargeback rate is ${formatPct(clusterCbRate)} vs overall ${formatPct(overallCbRate)}.`,
      `Disputed amount in this cluster is ${inr(clusterDisputed)} against ${inr(overallDisputed)} across the full dataset.`,
    ],
  };
}

async function runSql(sql: string, title = ""): Promise<ToolResult> {
  const safe = withLimit(assertReadOnlySelect(sql), 100);
  const rows = await query<Record<string, unknown>>(safe);
  const normalized = rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v == null ? "" : typeof v === "number" || typeof v === "bigint" ? Number(v) : String(v);
    }
    return out;
  });
  const keys = Object.keys(normalized[0] ?? { value: 0 });
  const xKey = keys[0] ?? "label";
  const numericKeys = keys.filter((k) => normalized.every((r) => r[k] === "" || !Number.isNaN(Number(r[k]))));
  const yKeys = numericKeys.filter((k) => k !== xKey).slice(0, 2);
  const chartType = keys.some((k) => /date|day|month|time/i.test(k)) ? "line" : "bar";
  const data = normalized.map((r) => {
    const item: Record<string, string | number> = { ...r };
    for (const k of yKeys) item[k] = Number(r[k] || 0);
    return item;
  });
  const leadKey = (yKeys.length ? yKeys : keys.slice(1, 2))[0];
  const lead = data[0];
  const looksMoney = /amount|disputed|gmv|sales|value/i.test(String(leadKey || ""));
  const facts = lead && leadKey
    ? [
        `${String(lead[xKey])} leads this result on ${leadKey} (${
          looksMoney && Number(lead[leadKey]) >= 1000
            ? inr(Number(lead[leadKey]))
            : formatNumber(Number(lead[leadKey]) || 0)
        }).`,
      ]
    : ["This query returned no ranked rows for the question."];
  return {
    title: title.trim() || "Live analysis",
    chartType,
    xKey,
    series: (yKeys.length ? yKeys : keys.slice(1, 2)).map((k) => ({ key: k, label: k })),
    data,
    table: {
      columns: keys.map((k) => ({ key: k, label: k })),
      rows: normalized,
    },
    facts,
  };
}

const KEYWORD_RULES: { pattern: RegExp; tool: ToolName }[] = [
  { pattern: /why.{0,60}(fraud|chargeback|dispute) rate|(fraud|chargeback) rate.{0,30}(increase|decrease|trend|over time|by day)|daily (fraud|chargeback) rate|why.{0,40}chargebacks? (increase|rise|spike|drop)/i, tool: "daily_chargeback_trend" },
  { pattern: /cluster|fraud ring|merchant-user|merchant user|collus/i, tool: "highest_risk_cluster" },
  { pattern: /(biggest|highest|top|most|which).{0,50}risk|riskiest|biggest risk|highest risk|most risky/i, tool: "risk_leaderboard" },
  { pattern: /success(ful)? vs failed|failed vs success|compare successful vs failed|successful vs failed/i, tool: "success_vs_failed_by_day" },
  { pattern: /merchant.{0,40}fail|fail(ed)? (txn|transaction).{0,40}merchant/i, tool: "failed_by_merchant" },
  { pattern: /disputed amount by merchant category|highest disputed amount|category.*disputed/i, tool: "category_disputed_amount" },
  { pattern: /sales by categor|amount by merchant category|transaction amount by merchant category|gmv by categor|by merchant categor/i, tool: "amount_by_merchant_category" },
  { pattern: /most chargebacks.{0,80}(rate|ratio)|highest chargeback rate|chargeback count vs (rate|ratio)|also have the highest chargeback/i, tool: "chargeback_count_vs_rate" },
  { pattern: /chargeback-to-transaction ratio|chargeback to transaction|chargeback ratio|chargeback rate/i, tool: "merchant_chargeback_ratio" },
  { pattern: /highest chargeback count|top .*chargeback count|which merchant has the highest chargeback/i, tool: "top_merchants_by_chargeback_count" },
  { pattern: /top 10 users|users by disputed|user has the highest disputed|high-?value chargeback (user|customer)/i, tool: "top_users_by_disputed_amount" },
  { pattern: /merchants by disputed|top 10 merchants by disputed|disputed amount by merchant(?! category)/i, tool: "top_merchants_by_disputed_amount" },
  { pattern: /chargeback reason|reason (code|distribution|mix)/i, tool: "chargeback_reason_distribution" },
  { pattern: /average transaction value|atv trend|avg(erage)? txn/i, tool: "atv_trend" },
  { pattern: /kyc/i, tool: "kyc_status_transaction_amount" },
  { pattern: /severity/i, tool: "chargebacks_by_severity" },
  { pattern: /after 7 days|reported after|delay|late dispute/i, tool: "disputes_after_7_days" },
  { pattern: /chargeback.{0,30}(state|region)|(state|region).{0,30}chargeback/i, tool: "chargebacks_by_state" },
  { pattern: /sales by (state|region)|amount by state|gmv by (state|region)/i, tool: "amount_by_state" },
  { pattern: /by city|which city|city with|amount by city/i, tool: "amount_by_city" },
  { pattern: /scatter|correlation|vs chargeback/i, tool: "merchant_amount_vs_chargebacks_scatter" },
  { pattern: /daily (transaction )?volume|(transaction )?volume trend|volume over time/i, tool: "daily_transaction_volume" },
];

export function isDailyVolumeOnly(question: string) {
  const hasVolumeAsk =
    /daily (transaction )?volume|(transaction )?volume trend|volume over time|txn volume trend|show daily transaction/i.test(
      question,
    );
  if (!hasVolumeAsk) return false;
  return !/chargeback|dispute|repeated|unusual|relatively|user|customer|cluster|risk|fail|kyc|ratio|city|state|merchant/i.test(
    question.replace(/daily transaction volume( trend)?/gi, ""),
  );
}

export function isCompoundQuestion(question: string) {
  if (
    /but |relatively |unusual|repeated |stand out|identify the|most unusual|low (transaction )?volume|high (transaction )?volume|also have|also has|does the /i.test(
      question,
    )
  ) {
    return true;
  }
  const topics = ["chargeback", "dispute", "volume", "risk", "fail", "kyc", "ratio", "cluster", "user", "customer"].filter(
    (term) => new RegExp(term, "i").test(question),
  );
  return topics.length >= 3;
}

export function matchToolByKeywords(question: string): ToolName | null {
  if (/why.{0,60}(fraud|chargeback|dispute) rate|(fraud|chargeback) rate.{0,30}(increase|decrease|trend|over time|by day)|daily (fraud|chargeback) rate/i.test(question)) {
    return "daily_chargeback_trend";
  }
  if (/most chargebacks.{0,80}(rate|ratio)|also have the highest chargeback|chargeback count vs (rate|ratio)/i.test(question)) {
    return "chargeback_count_vs_rate";
  }
  if (isCompoundQuestion(question)) {
    if (/user|customer/i.test(question) && /chargeback|dispute/i.test(question) && /unusual|repeated|relatively|low (transaction )?volume/i.test(question)) {
      return "unusual_low_volume_users";
    }
    if (/cluster|fraud ring|merchant-user|collus/i.test(question)) return "highest_risk_cluster";
    return null;
  }

  const asksCluster = /cluster|fraud ring|merchant-user|collus/i.test(question);
  const asksRisk =
    /(biggest|highest|top|most|which).{0,50}risk|riskiest|biggest risk|highest risk|most risky/i.test(question);
  if (asksCluster) return "highest_risk_cluster";
  if (asksRisk) {
    if (/\b(user|customer)\b/i.test(question) && !/merchant/i.test(question)) return null;
    if (/categor/i.test(question)) return null;
    if (/\b(city|state|region)\b/i.test(question)) return null;
    return "risk_leaderboard";
  }
  if (/fail/i.test(question) && /\bcity\b/i.test(question)) return null;
  if (isDailyVolumeOnly(question)) return "daily_transaction_volume";
  const hit = KEYWORD_RULES.find((r) => r.pattern.test(question) && r.tool !== "daily_transaction_volume");
  return hit?.tool ?? null;
}
