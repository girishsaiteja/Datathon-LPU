import { formatCrore, formatINR, formatNumber, formatPct } from "@/lib/format";
import { num, query } from "@/lib/db";
import type {
  ClusterRow,
  DashboardFilters,
  DateRange,
  FraudFilters,
  KpiItem,
  MerchantFilters,
  MerchantRow,
  NetworkEdge,
  NetworkNode,
  SpikeRoseSlice,
  TransactionFilters,
  TransactionRow,
} from "@/lib/types";

const BUSINESS_OCCUPATIONS = ["Business Owner", "Self Employed", "Freelancer", "Gig Worker"];

const STATUS_COLORS: Record<string, string> = {
  Success: "#22C55E",
  Processing: "#3B82F6",
  Failed: "#EF4444",
  Pending: "#F59E0B",
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#DC2626",
  High: "#F97316",
  Medium: "#F59E0B",
  Low: "#22C55E",
};

const REASON_COLORS = ["#EF4444", "#F97316", "#3B82F6", "#8B5CF6", "#14B8A6", "#F59E0B", "#64748B", "#0EA5E9"];

const KYC_COLORS: Record<string, string> = {
  Approved: "#22C55E",
  Pending: "#F59E0B",
  "In Progress": "#3B82F6",
  Rejected: "#EF4444",
};

class Params {
  values: unknown[] = [];
  add(value: unknown) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function txnJoins() {
  return `
    FROM datathon.fact_transactions t
    LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
    LEFT JOIN datathon.dim_customer c ON c.user_id = t.user_id
  `;
}

function cbJoins() {
  return `
    FROM datathon.fact_chargebacks cb
    LEFT JOIN datathon.dim_merchant m ON m.merchant_id = cb.merchant_id
    LEFT JOIN datathon.dim_customer c ON c.user_id = cb.user_id
  `;
}

function dateBounds(p: Params, date: DateRange, column: string) {
  return `${column} >= ${p.add(date.from)}::timestamp AND ${column} < (${p.add(date.to)}::date + 1)`;
}

function applyCommonFilters(
  p: Params,
  filters: {
    merchantCategory?: string;
    merchantStatus?: string;
    riskSegment?: string;
    userType?: string;
    businessType?: string;
    merchantState?: string;
    riskLevel?: string;
    status?: string;
    merchantId?: string;
    userId?: string;
  },
  opts: { merchantAlias?: string; customerAlias?: string; txnAlias?: string } = {},
) {
  const m = opts.merchantAlias ?? "m";
  const c = opts.customerAlias ?? "c";
  const t = opts.txnAlias ?? "t";
  const clauses: string[] = [];

  if (filters.merchantCategory && filters.merchantCategory !== "All") {
    clauses.push(`${m}.merchant_category = ${p.add(filters.merchantCategory)}`);
  }
  if (filters.merchantStatus && filters.merchantStatus !== "All") {
    clauses.push(`${m}.merchant_status = ${p.add(filters.merchantStatus)}`);
  }
  if (filters.riskSegment && filters.riskSegment !== "All") {
    clauses.push(`lower(coalesce(${c}.risk_segment, '')) = lower(${p.add(filters.riskSegment)})`);
  }
  if (filters.userType && filters.userType !== "All") {
    const occ = p.add(BUSINESS_OCCUPATIONS);
    const expr = `CASE WHEN ${c}.occupation = ANY(${occ}::text[]) THEN 'Business' ELSE 'Personal' END`;
    clauses.push(`${expr} = ${p.add(filters.userType)}`);
  }
  if (filters.businessType && filters.businessType !== "All") {
    clauses.push(`${m}.business_type = ${p.add(filters.businessType)}`);
  }
  if (filters.merchantState && filters.merchantState !== "All") {
    clauses.push(`${m}.state = ${p.add(filters.merchantState)}`);
  }
  if (filters.status && filters.status !== "All") {
    clauses.push(`${t}.status = ${p.add(filters.status)}`);
  }
  if (filters.merchantId && filters.merchantId !== "All") {
    clauses.push(`${t}.merchant_id = ${p.add(filters.merchantId)}`);
  }
  if (filters.userId && filters.userId !== "All") {
    clauses.push(`${t}.user_id = ${p.add(filters.userId)}`);
  }
  return clauses;
}

function pctChange(current: number, previous: number): { value: string; direction: "up" | "down" | "neutral"; good?: boolean } | undefined {
  if (!previous) return undefined;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  return {
    value: `${Math.abs(delta).toFixed(1)}%`,
    direction: delta > 0.05 ? "up" : delta < -0.05 ? "down" : "neutral",
  };
}

function shiftRange(date: DateRange): DateRange {
  const from = new Date(`${date.from}T00:00:00`);
  const to = new Date(`${date.to}T00:00:00`);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(prevFrom), to: iso(prevTo) };
}

async function txnKpiCore(filters: DashboardFilters, date: DateRange) {
  const p = new Params();
  const where = [dateBounds(p, date, "t.timestamp"), ...applyCommonFilters(p, filters)];
  const rows = await query<{
    total: string;
    amount: string;
    avg: string;
    failed: string;
    pending: string;
    success: string;
    processing: string;
    invalid_utr: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COALESCE(SUM(t.amount),0)::text AS amount,
       COALESCE(AVG(t.amount),0)::text AS avg,
       COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed,
       COUNT(*) FILTER (WHERE t.status = 'Pending')::text AS pending,
       COUNT(*) FILTER (WHERE t.status = 'Success')::text AS success,
       COUNT(*) FILTER (WHERE t.status = 'Processing')::text AS processing,
       COUNT(*) FILTER (WHERE t.utr IS NULL OR t.utr !~ '^UTR[0-9]{10}$')::text AS invalid_utr
     ${txnJoins()}
     WHERE ${where.join(" AND ")}`,
    p.values,
  );
  const row = rows[0];
  const total = num(row?.total);
  return {
    total,
    amount: num(row?.amount),
    avg: num(row?.avg),
    failed: num(row?.failed),
    pending: num(row?.pending),
    success: num(row?.success),
    processing: num(row?.processing),
    invalidUtr: num(row?.invalid_utr),
    failRate: total ? (num(row?.failed) / total) * 100 : 0,
    pendingRate: total ? (num(row?.pending) / total) * 100 : 0,
  };
}

async function cbKpiCore(filters: DashboardFilters, date: DateRange) {
  const p = new Params();
  const where = [dateBounds(p, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"), ...applyCommonFilters(p, filters)];
  const rows = await query<{ count: string; amount: string }>(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(cb.disputed_amount),0)::text AS amount
     ${cbJoins()}
     WHERE ${where.join(" AND ")}`,
    p.values,
  );
  return { count: num(rows[0]?.count), amount: num(rows[0]?.amount) };
}

async function kycKpis() {
  const rows = await query<{
    total: string;
    approved: string;
    pending: string;
    rejected: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE kyc_status = 'Approved')::text AS approved,
       COUNT(*) FILTER (WHERE kyc_status IN ('Pending', 'In Progress'))::text AS pending,
       COUNT(*) FILTER (WHERE kyc_status = 'Rejected')::text AS rejected
     FROM datathon.dim_customer`,
  );
  const total = num(rows[0]?.total);
  return {
    total,
    completion: total ? (num(rows[0]?.approved) / total) * 100 : 0,
    pending: total ? (num(rows[0]?.pending) / total) * 100 : 0,
    rejection: total ? (num(rows[0]?.rejected) / total) * 100 : 0,
  };
}

function peakBy<T extends Record<string, string | number>>(rows: T[], key: keyof T) {
  if (!rows.length) return undefined;
  return rows.reduce((best, row) => (Number(row[key]) > Number(best[key]) ? row : best));
}

export async function getMeta() {
  const [range, categories, merchants, users, states] = await Promise.all([
    query<{ min: string; max: string }>(
      `SELECT MIN(timestamp)::date::text AS min, MAX(timestamp)::date::text AS max FROM datathon.fact_transactions`,
    ),
    query<{ merchant_category: string }>(
      `SELECT DISTINCT merchant_category FROM datathon.dim_merchant WHERE merchant_category IS NOT NULL ORDER BY 1`,
    ),
    query<{ merchant_id: string }>(
      `SELECT merchant_id FROM datathon.dim_merchant ORDER BY merchant_id LIMIT 80`,
    ),
    query<{ user_id: string }>(
      `SELECT user_id FROM datathon.fact_transactions GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 80`,
    ),
    query<{ state: string }>(
      `SELECT DISTINCT state FROM datathon.dim_merchant WHERE state IS NOT NULL ORDER BY 1`,
    ),
  ]);

  return {
    dateFrom: range[0]?.min ?? "2026-01-01",
    dateTo: range[0]?.max ?? "2026-12-03",
    merchantCategories: ["All", ...categories.map((r) => r.merchant_category)],
    merchantIds: ["All", ...merchants.map((r) => r.merchant_id)],
    userIds: ["All", ...users.map((r) => r.user_id)],
    merchantStates: ["All", ...states.map((r) => r.state)],
  };
}

export async function getExecutiveLive(filters: DashboardFilters, date: DateRange) {
  const prev = shiftRange(date);
  const delayParams = new Params();
  const delayWhere = [
    dateBounds(delayParams, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"),
    ...applyCommonFilters(delayParams, filters),
    "cb.transaction_timestamp IS NOT NULL",
    "cb.reported_timestamp IS NOT NULL",
    "cb.reported_timestamp >= cb.transaction_timestamp",
  ];

  const [cur, last, cb, cbLast, kyc, delayRow, hr] = await Promise.all([
    txnKpiCore(filters, date),
    txnKpiCore(filters, prev),
    cbKpiCore(filters, date),
    cbKpiCore(filters, prev),
    kycKpis(),
    query<{ avg_days: string; delayed: string }>(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (cb.reported_timestamp - cb.transaction_timestamp)) / 86400.0), 0)::text AS avg_days,
              COUNT(*) FILTER (WHERE cb.reported_timestamp - cb.transaction_timestamp > INTERVAL '7 days')::text AS delayed
       ${cbJoins()}
       WHERE ${delayWhere.join(" AND ")}`,
      delayParams.values,
    ),
    query<{ merchants: string; users: string }>(
      `SELECT
         (SELECT COUNT(*) FROM datathon.merchant_risk_scores WHERE risk_level IN ('High','Critical'))::text AS merchants,
         (SELECT COUNT(*) FROM datathon.customer_risk_scores WHERE risk_level IN ('High','Critical'))::text AS users`,
    ),
  ]);

  const avgDelay = num(delayRow[0]?.avg_days, 1);
  const delayedCount = num(delayRow[0]?.delayed);
  const cbRatio = cur.total ? (cb.count / cur.total) * 100 : 0;
  const prevCbRatio = last.total ? (cbLast.count / last.total) * 100 : 0;
  const highRiskMerchants = num(hr[0]?.merchants);
  const highRiskUsers = num(hr[0]?.users);

  const kpis: KpiItem[] = [
    { label: "Total Transactions", value: formatNumber(cur.total), change: pctChange(cur.total, last.total), tone: "blue" },
    { label: "Total Transaction Amount", value: formatCrore(cur.amount / 1e7), change: pctChange(cur.amount, last.amount), tone: "blue" },
    { label: "Average Transaction Value", value: `₹ ${formatNumber(Math.round(cur.avg))}`, change: pctChange(cur.avg, last.avg) },
    { label: "Failed Transaction Rate", value: formatPct(cur.failRate), change: pctChange(cur.failRate, last.failRate) ? { ...pctChange(cur.failRate, last.failRate)!, good: cur.failRate <= last.failRate } : undefined, tone: "red" },
    { label: "Pending Transaction Rate", value: formatPct(cur.pendingRate), change: pctChange(cur.pendingRate, last.pendingRate) ? { ...pctChange(cur.pendingRate, last.pendingRate)!, good: cur.pendingRate <= last.pendingRate } : undefined, tone: "orange" },
    { label: "Chargeback Count", value: formatNumber(cb.count), change: pctChange(cb.count, cbLast.count) ? { ...pctChange(cb.count, cbLast.count)!, good: false } : undefined, tone: "red" },
    { label: "Chargeback Amount", value: formatCrore(cb.amount / 1e7), change: pctChange(cb.amount, cbLast.amount) ? { ...pctChange(cb.amount, cbLast.amount)!, good: false } : undefined, tone: "red" },
    { label: "Chargeback-to-Transaction Ratio", value: formatPct(cbRatio, 2), change: pctChange(cbRatio, prevCbRatio) ? { ...pctChange(cbRatio, prevCbRatio)!, good: false } : undefined, tone: "orange" },
    { label: "KYC Completion Rate", value: formatPct(kyc.completion), tone: "green" },
    { label: "KYC Rejection Rate", value: formatPct(kyc.rejection), tone: "red" },
    { label: "Avg Dispute Reporting Delay", value: `${avgDelay.toFixed(1)} days`, tone: "orange" },
    { label: "High-Risk Merchants", value: formatNumber(highRiskMerchants), tone: "red" },
  ];

  const trendParams = new Params();
  const trendWhere = [dateBounds(trendParams, date, "t.timestamp"), ...applyCommonFilters(trendParams, filters)];
  const hourParams = new Params();
  const hourWhere = [dateBounds(hourParams, date, "t.timestamp"), ...applyCommonFilters(hourParams, filters)];
  const cbTrendParams = new Params();
  const cbTrendWhere = [
    dateBounds(cbTrendParams, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"),
    ...applyCommonFilters(cbTrendParams, filters),
  ];
  const reasonParams = new Params();
  const reasonWhere = [
    dateBounds(reasonParams, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"),
    ...applyCommonFilters(reasonParams, filters),
  ];
  const sevParams = new Params();
  const sevWhere = [
    dateBounds(sevParams, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"),
    ...applyCommonFilters(sevParams, filters),
  ];

  const [dailyRows, hourRows, cbTrendRows, reasonRows, sevRows, catRows, kycRows] = await Promise.all([
    query<{ d: string; volume: string; amount: string; failed: string; success: string; avg_value: string }>(
      `SELECT to_char(date_trunc('day', t.timestamp), 'Mon DD') AS d,
              COUNT(*)::text AS volume,
              (COALESCE(SUM(t.amount),0) / 10000000.0)::text AS amount,
              COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed,
              COUNT(*) FILTER (WHERE t.status = 'Success')::text AS success,
              COALESCE(AVG(t.amount),0)::text AS avg_value
       ${txnJoins()}
       WHERE ${trendWhere.join(" AND ")}
       GROUP BY date_trunc('day', t.timestamp)
       ORDER BY date_trunc('day', t.timestamp)`,
      trendParams.values,
    ),
    query<{ hour: string; failed: string; volume: string }>(
      `SELECT to_char(t.timestamp, 'HH24') AS hour,
              COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed,
              COUNT(*)::text AS volume
       ${txnJoins()}
       WHERE ${hourWhere.join(" AND ")}
       GROUP BY 1 ORDER BY 1`,
      hourParams.values,
    ),
    query<{ d: string; chargebacks: string; disputed: string }>(
      `SELECT to_char(date_trunc('day', COALESCE(cb.transaction_timestamp, cb.reported_timestamp)), 'Mon DD') AS d,
              COUNT(*)::text AS chargebacks,
              (COALESCE(SUM(cb.disputed_amount),0) / 100000.0)::text AS disputed
       ${cbJoins()}
       WHERE ${cbTrendWhere.join(" AND ")}
       GROUP BY date_trunc('day', COALESCE(cb.transaction_timestamp, cb.reported_timestamp))
       ORDER BY date_trunc('day', COALESCE(cb.transaction_timestamp, cb.reported_timestamp))`,
      cbTrendParams.values,
    ),
    query<{ reason_code: string; n: string }>(
      `SELECT COALESCE(cb.reason_code, 'Other') AS reason_code, COUNT(*)::text AS n
       ${cbJoins()}
       WHERE ${reasonWhere.join(" AND ")}
       GROUP BY 1 ORDER BY COUNT(*) DESC`,
      reasonParams.values,
    ),
    query<{ severity: string; n: string }>(
      `SELECT COALESCE(cb.severity, 'Low') AS severity, COUNT(*)::text AS n
       ${cbJoins()}
       WHERE ${sevWhere.join(" AND ")}
       GROUP BY 1
       ORDER BY CASE COALESCE(cb.severity,'Low') WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`,
      sevParams.values,
    ),
    query<{ category: string; txns: string; cbs: string }>(
      `SELECT COALESCE(merchant_category, 'Others') AS category,
              COALESCE(SUM(transaction_count),0)::text AS txns,
              COALESCE(SUM(chargeback_count),0)::text AS cbs
       FROM datathon.merchant_risk_scores
       GROUP BY 1
       HAVING COALESCE(SUM(transaction_count),0) > 0
       ORDER BY (COALESCE(SUM(chargeback_count),0)::numeric / NULLIF(SUM(transaction_count),0)) DESC
       LIMIT 8`,
    ),
    query<{ kyc_status: string; n: string }>(
      `SELECT COALESCE(kyc_status, 'Unknown') AS kyc_status, COUNT(*)::text AS n
       FROM datathon.dim_customer
       GROUP BY 1
       ORDER BY COUNT(*) DESC`,
    ),
  ]);

  const dailyTrend = dailyRows.map((r) => ({
    date: r.d,
    volume: num(r.volume),
    amount: num(r.amount, 2),
    failed: num(r.failed),
    success: num(r.success),
    avgValue: num(r.avg_value, 0),
  }));
  const hourFailed = hourRows.map((r) => ({
    hour: `${r.hour}h`,
    failed: num(r.failed),
    volume: num(r.volume),
  }));
  const chargebackTrend = cbTrendRows.map((r) => ({
    date: r.d,
    chargebacks: num(r.chargebacks),
    disputed: num(r.disputed, 2),
  }));
  const statusDistribution = [
    { name: "Success", value: cur.success, color: STATUS_COLORS.Success },
    { name: "Processing", value: cur.processing, color: STATUS_COLORS.Processing },
    { name: "Failed", value: cur.failed, color: STATUS_COLORS.Failed },
    { name: "Pending", value: cur.pending, color: STATUS_COLORS.Pending },
  ];
  const reasonDistribution = reasonRows.map((r, i) => ({
    name: r.reason_code,
    value: num(r.n),
    color: REASON_COLORS[i % REASON_COLORS.length],
  }));
  const severityDistribution = sevRows.map((r) => ({
    name: r.severity,
    value: num(r.n),
    color: SEVERITY_COLORS[r.severity] ?? "#94A3B8",
  }));
  const disputeByCategory = catRows.map((r) => ({
    name: r.category,
    value: num((num(r.cbs) / Math.max(1, num(r.txns))) * 100, 2),
  }));
  const kycDistribution = kycRows.map((r) => ({
    name: r.kyc_status,
    value: num(r.n),
    color: KYC_COLORS[r.kyc_status] ?? "#94A3B8",
  }));

  const peakVol = peakBy(dailyTrend, "volume");
  const peakFailHour = peakBy(hourFailed, "failed");
  const worstCat = disputeByCategory[0];
  const topReason = reasonDistribution[0];
  const insights = [
    peakVol
      ? `Daily volume peaked on ${peakVol.date} at ${formatNumber(peakVol.volume)} transactions (${formatCrore(peakVol.amount)}). Watch that window for onboarding spikes or coordinated activity.`
      : "Daily volume is stable across the selected window.",
    worstCat
      ? `${worstCat.name} has the highest chargeback-to-transaction ratio at ${formatPct(worstCat.value, 2)} — well above the portfolio ${formatPct(cbRatio, 2)}. Category-level underwriting should tighten first.`
      : "Chargeback concentration by category is even in this window.",
    `KYC completion is ${formatPct(kyc.completion)} with a ${formatPct(kyc.rejection)} rejection rate. Unverified or rejected users typically show higher dispute intensity than approved customers.`,
    `Average dispute reporting delay is ${avgDelay.toFixed(1)} days (${formatNumber(delayedCount)} filed after 7 days). Late reporting is a classic account-takeover / delayed-fraud-detection signature.`,
    peakFailHour
      ? `Failed transactions concentrate around ${peakFailHour.hour} (${formatNumber(peakFailHour.failed)} failures). Hourly ops coverage and issuer timeout monitoring should follow that peak.`
      : "Failure volume is evenly spread through the day.",
    topReason
      ? `${topReason.name} is the leading chargeback reason (${formatNumber(topReason.value)} cases). Pair this with high-risk merchant watchlists before expanding that MCC.`
      : "Chargeback reasons are diversified.",
    `${formatNumber(highRiskMerchants)} merchants and ${formatNumber(highRiskUsers)} users sit in High/Critical risk. Repeat disputers in those cohorts should be reviewed before the next settlement cycle.`,
  ].slice(0, 6);

  return {
    kpis,
    insights,
    dailyTrend,
    hourFailed,
    chargebackTrend,
    statusDistribution,
    reasonDistribution,
    severityDistribution,
    disputeByCategory,
    kycDistribution,
    totals: { totalTxns: cur.total, cbCount: cb.count, kycTotal: kyc.total },
  };
}

export async function getMerchantLive(filters: MerchantFilters, date: DateRange) {
  const p = new Params();
  const where = [dateBounds(p, date, "t.timestamp"), ...applyCommonFilters(p, filters)];
  if (filters.riskLevel && filters.riskLevel !== "All") {
    where.push(`rs.risk_level = ${p.add(filters.riskLevel)}`);
  }

  const [k] = await query<{ merchants: string; amount: string; high_risk: string }>(
    `SELECT
       COUNT(DISTINCT t.merchant_id)::text AS merchants,
       COALESCE(SUM(t.amount),0)::text AS amount,
       COUNT(DISTINCT t.merchant_id) FILTER (WHERE rs.risk_level IN ('High','Critical'))::text AS high_risk
     ${txnJoins()}
     LEFT JOIN datathon.merchant_risk_scores rs ON rs.merchant_id = t.merchant_id
     WHERE ${where.join(" AND ")}`,
    p.values,
  );

  const cbParams = new Params();
  const cbWhere = [
    dateBounds(cbParams, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"),
    ...applyCommonFilters(cbParams, filters),
  ];
  if (filters.riskLevel && filters.riskLevel !== "All") {
    cbWhere.push(`rs.risk_level = ${cbParams.add(filters.riskLevel)}`);
  }
  const [cb] = await query<{ chargebacks: string }>(
    `SELECT COUNT(*)::text AS chargebacks
     ${cbJoins()}
     LEFT JOIN datathon.merchant_risk_scores rs ON rs.merchant_id = cb.merchant_id
     WHERE ${cbWhere.join(" AND ")}`,
    cbParams.values,
  );

  const kpis: KpiItem[] = [
    { label: "Total Merchants", value: formatNumber(num(k?.merchants)), tone: "blue" },
    { label: "High-Risk Merchants", value: formatNumber(num(k?.high_risk)), tone: "red" },
    { label: "Total Merchant Txn Amount", value: formatCrore(num(k?.amount) / 1e7), tone: "blue" },
    { label: "Total Merchant Chargebacks", value: formatNumber(num(cb?.chargebacks)), tone: "orange" },
  ];

  const catParams = new Params();
  let catWhere = "WHERE 1=1";
  if (filters.merchantCategory !== "All") catWhere += ` AND merchant_category = ${catParams.add(filters.merchantCategory)}`;
  if (filters.businessType !== "All") catWhere += ` AND business_type = ${catParams.add(filters.businessType)}`;
  if (filters.merchantStatus !== "All") catWhere += ` AND merchant_status = ${catParams.add(filters.merchantStatus)}`;
  if (filters.merchantState !== "All") catWhere += ` AND state = ${catParams.add(filters.merchantState)}`;
  if (filters.riskLevel && filters.riskLevel !== "All") catWhere += ` AND risk_level = ${catParams.add(filters.riskLevel)}`;

  const catRows = await query<{ category: string; amount: string }>(
    `SELECT COALESCE(NULLIF(TRIM(merchant_category), ''), 'Unmatched') AS category,
            COALESCE(SUM(transaction_amount),0)::text AS amount
     FROM datathon.merchant_risk_scores
     ${catWhere}
     AND COALESCE(NULLIF(TRIM(merchant_category), ''), '') <> ''
     GROUP BY 1
     ORDER BY SUM(transaction_amount) DESC
     LIMIT 10`,
    catParams.values,
  );
  const catTotal = catRows.reduce((s, r) => s + num(r.amount), 0) || 1;
  const amountByCategory = catRows.map((r) => ({
    name: r.category,
    value: num((num(r.amount) / catTotal) * 100, 1),
  }));

  const ratioParams = new Params();
  let ratioWhere = "WHERE COALESCE(transaction_count,0) > 0";
  if (filters.merchantCategory !== "All") ratioWhere += ` AND merchant_category = ${ratioParams.add(filters.merchantCategory)}`;
  if (filters.businessType !== "All") ratioWhere += ` AND business_type = ${ratioParams.add(filters.businessType)}`;
  if (filters.merchantStatus !== "All") ratioWhere += ` AND merchant_status = ${ratioParams.add(filters.merchantStatus)}`;
  if (filters.merchantState !== "All") ratioWhere += ` AND state = ${ratioParams.add(filters.merchantState)}`;
  if (filters.riskLevel && filters.riskLevel !== "All") ratioWhere += ` AND risk_level = ${ratioParams.add(filters.riskLevel)}`;

  const ratioByCategory = (
    await query<{ category: string; txns: string; cbs: string }>(
      `SELECT COALESCE(NULLIF(TRIM(merchant_category), ''), 'Unmatched') AS category,
              COALESCE(SUM(transaction_count),0)::text AS txns,
              COALESCE(SUM(chargeback_count),0)::text AS cbs
       FROM datathon.merchant_risk_scores
       ${ratioWhere}
         AND COALESCE(NULLIF(TRIM(merchant_category), ''), '') <> ''
       GROUP BY 1
       ORDER BY (COALESCE(SUM(chargeback_count),0)::numeric / NULLIF(SUM(transaction_count),0)) DESC
       LIMIT 8`,
      ratioParams.values,
    )
  ).map((r) => ({
    name: r.category,
    value: num((num(r.cbs) / Math.max(1, num(r.txns))) * 100, 2),
  }));

  const topParams = new Params();
  let topWhere = "WHERE 1=1";
  if (filters.merchantCategory !== "All") topWhere += ` AND merchant_category = ${topParams.add(filters.merchantCategory)}`;
  if (filters.businessType !== "All") topWhere += ` AND business_type = ${topParams.add(filters.businessType)}`;
  if (filters.merchantStatus !== "All") topWhere += ` AND merchant_status = ${topParams.add(filters.merchantStatus)}`;
  if (filters.merchantState !== "All") topWhere += ` AND state = ${topParams.add(filters.merchantState)}`;
  if (filters.riskLevel !== "All") topWhere += ` AND risk_level = ${topParams.add(filters.riskLevel)}`;

  const topByChargeback: MerchantRow[] = (
    await query<{
      merchant_id: string;
      merchant_name: string;
      merchant_category: string;
      business_type: string;
      state: string;
      merchant_status: string;
      transaction_count: string;
      chargeback_count: string;
      chargeback_rate: string;
      risk_score: string;
      risk_level: string;
    }>(
      `SELECT merchant_id, merchant_name, merchant_category, business_type, state, merchant_status,
              COALESCE(transaction_count,0)::text AS transaction_count,
              COALESCE(chargeback_count,0)::text AS chargeback_count,
              COALESCE(chargeback_rate,0)::text AS chargeback_rate,
              COALESCE(risk_score,0)::text AS risk_score,
              COALESCE(risk_level,'Low') AS risk_level
       FROM datathon.merchant_risk_scores
       ${topWhere}
       ORDER BY chargeback_count DESC NULLS LAST
       LIMIT 5`,
      topParams.values,
    )
  ).map((r) => ({
    merchantId: r.merchant_id,
    merchantName: r.merchant_name,
    category: r.merchant_category,
    businessType: r.business_type,
    state: r.state,
    status: r.merchant_status,
    txnCount: num(r.transaction_count),
    chargebackCount: num(r.chargeback_count),
    chargebackRatio: num(r.chargeback_rate, 2),
    riskScore: num(r.risk_score, 0),
    riskLevel: (r.risk_level as MerchantRow["riskLevel"]) ?? "Low",
  }));

  const hrParams = new Params();
  let hrWhere = `WHERE risk_level IN ('High','Critical')`;
  if (filters.merchantCategory !== "All") hrWhere += ` AND merchant_category = ${hrParams.add(filters.merchantCategory)}`;
  if (filters.businessType !== "All") hrWhere += ` AND business_type = ${hrParams.add(filters.businessType)}`;
  if (filters.merchantStatus !== "All") hrWhere += ` AND merchant_status = ${hrParams.add(filters.merchantStatus)}`;
  if (filters.merchantState !== "All") hrWhere += ` AND state = ${hrParams.add(filters.merchantState)}`;
  if (filters.riskLevel !== "All") hrWhere += ` AND risk_level = ${hrParams.add(filters.riskLevel)}`;

  const highRiskMerchants = (
    await query<{
      merchant_name: string;
      merchant_category: string;
      risk_score: string;
      chargeback_count: string;
      transaction_count: string;
    }>(
      `SELECT merchant_name, merchant_category,
              COALESCE(risk_score,0)::text AS risk_score,
              COALESCE(chargeback_count,0)::text AS chargeback_count,
              COALESCE(transaction_count,0)::text AS transaction_count
       FROM datathon.merchant_risk_scores
       ${hrWhere}
       ORDER BY risk_score DESC NULLS LAST
       LIMIT 8`,
      hrParams.values,
    )
  ).map((r) => ({
    merchantName: r.merchant_name,
    category: r.merchant_category,
    riskScore: num(r.risk_score, 0),
    chargebackCount: num(r.chargeback_count),
    txnCount: num(r.transaction_count),
  }));

  const disputedParams = new Params();
  let disputedWhere = "WHERE 1=1";
  if (filters.merchantCategory !== "All") disputedWhere += ` AND merchant_category = ${disputedParams.add(filters.merchantCategory)}`;
  if (filters.businessType !== "All") disputedWhere += ` AND business_type = ${disputedParams.add(filters.businessType)}`;
  if (filters.merchantStatus !== "All") disputedWhere += ` AND merchant_status = ${disputedParams.add(filters.merchantStatus)}`;
  if (filters.merchantState !== "All") disputedWhere += ` AND state = ${disputedParams.add(filters.merchantState)}`;
  if (filters.riskLevel !== "All") disputedWhere += ` AND risk_level = ${disputedParams.add(filters.riskLevel)}`;

  const perfParams = new Params();
  let perfWhere = "WHERE 1=1";
  if (filters.merchantCategory !== "All") perfWhere += ` AND merchant_category = ${perfParams.add(filters.merchantCategory)}`;
  if (filters.businessType !== "All") perfWhere += ` AND business_type = ${perfParams.add(filters.businessType)}`;
  if (filters.merchantStatus !== "All") perfWhere += ` AND merchant_status = ${perfParams.add(filters.merchantStatus)}`;
  if (filters.merchantState !== "All") perfWhere += ` AND state = ${perfParams.add(filters.merchantState)}`;
  if (filters.riskLevel !== "All") perfWhere += ` AND risk_level = ${perfParams.add(filters.riskLevel)}`;

  const spikeParams = new Params();
  const spikeDateWhere = [dateBounds(spikeParams, date, "t.timestamp")];
  if (filters.merchantCategory !== "All") spikeDateWhere.push(`m.merchant_category = ${spikeParams.add(filters.merchantCategory)}`);
  if (filters.merchantState !== "All") spikeDateWhere.push(`m.state = ${spikeParams.add(filters.merchantState)}`);

  const [topByDisputed, categoryPerformance, spikeRoseRows] = await Promise.all([
    query<{
      merchant_id: string;
      merchant_name: string;
      merchant_category: string;
      disputed_amount: string;
      chargeback_count: string;
      transaction_count: string;
    }>(
      `SELECT merchant_id, merchant_name, merchant_category,
              COALESCE(disputed_amount,0)::text AS disputed_amount,
              COALESCE(chargeback_count,0)::text AS chargeback_count,
              COALESCE(transaction_count,0)::text AS transaction_count
       FROM datathon.merchant_risk_scores
       ${disputedWhere}
       ORDER BY disputed_amount DESC NULLS LAST
       LIMIT 6`,
      disputedParams.values,
    ).then((rows) =>
      rows.map((r) => ({
        merchantId: r.merchant_id,
        merchantName: r.merchant_name,
        category: r.merchant_category,
        disputedAmount: num(r.disputed_amount),
        chargebackCount: num(r.chargeback_count),
        txnCount: num(r.transaction_count),
      })),
    ),
    query<{ category: string; txns: string; amount: string; cbs: string; disputed: string }>(
      `SELECT COALESCE(merchant_category, 'Others') AS category,
              COALESCE(SUM(transaction_count),0)::text AS txns,
              COALESCE(SUM(transaction_amount),0)::text AS amount,
              COALESCE(SUM(chargeback_count),0)::text AS cbs,
              COALESCE(SUM(disputed_amount),0)::text AS disputed
       FROM datathon.merchant_risk_scores
       ${perfWhere}
       GROUP BY 1
       ORDER BY SUM(transaction_amount) DESC NULLS LAST
       LIMIT 8`,
      perfParams.values,
    ).then((rows) =>
      rows.map((r) => ({
        category: r.category,
        txns: num(r.txns),
        amount: num(r.amount),
        chargebacks: num(r.cbs),
        disputed: num(r.disputed),
        ratio: num(r.txns) ? num(r.cbs) / num(r.txns) : 0,
      })),
    ),
    query<{ category: string; spikes: string; avg_factor: string; cbs: string }>(
      `WITH daily AS (
         SELECT t.merchant_id, DATE(t.timestamp) AS d, COUNT(*)::int AS n
         ${txnJoins()}
         WHERE ${spikeDateWhere.join(" AND ")}
         GROUP BY 1, 2
       ),
       stats AS (
         SELECT merchant_id, AVG(n)::numeric AS avg_n, MAX(n)::numeric AS peak_n
         FROM daily
         GROUP BY 1
         HAVING COUNT(*) >= 2 AND MAX(n) >= 2 AND MAX(n) >= 1.5 * AVG(n)
       )
       SELECT COALESCE(m.merchant_category, 'Others') AS category,
              COUNT(*)::text AS spikes,
              ROUND(AVG(s.peak_n / NULLIF(s.avg_n, 0)), 2)::text AS avg_factor,
              SUM(COALESCE(rs.chargeback_count, 0))::text AS cbs
       FROM stats s
       LEFT JOIN datathon.dim_merchant m ON m.merchant_id = s.merchant_id
       LEFT JOIN datathon.merchant_risk_scores rs ON rs.merchant_id = s.merchant_id
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      spikeParams.values,
    ),
  ]);

  const totalAmt = categoryPerformance.reduce((sum, row) => sum + row.amount, 0) || 1;
  const totalCbs = categoryPerformance.reduce((sum, row) => sum + row.chargebacks, 0) || 1;
  const categoryLeak = categoryPerformance
    .map((row) => {
      const gmvShare = (row.amount / totalAmt) * 100;
      const cbShare = (row.chargebacks / totalCbs) * 100;
      return {
        category: row.category,
        gmvShare: num(gmvShare, 1),
        cbShare: num(cbShare, 1),
        leakIndex: num(gmvShare ? cbShare / gmvShare : 0, 2),
      };
    })
    .sort((a, b) => b.leakIndex - a.leakIndex);

  const spikeRose: SpikeRoseSlice[] = spikeRoseRows.map((r) => ({
    name: r.category,
    spikes: num(r.spikes),
    avgFactor: num(r.avg_factor, 2),
    chargebacks: num(r.cbs),
  }));

  const worstRatio = [...ratioByCategory].sort((a, b) => b.value - a.value)[0];
  const topCb = topByChargeback[0];
  const topDisputed = topByDisputed[0];
  const leakiest = categoryLeak.find((row) => row.leakIndex >= 1) ?? categoryLeak[0];
  const insights = [
    worstRatio
      ? `${worstRatio.name} shows the highest chargeback-to-transaction ratio at ${formatPct(worstRatio.value, 2)}. That MCC is contributing disproportionate dispute loss versus its volume share.`
      : "Chargeback ratios are balanced across categories.",
    topCb
      ? `${topCb.merchantName} leads chargeback count with ${formatNumber(topCb.chargebackCount)} disputes on ${formatNumber(topCb.txnCount)} scored transactions — a repeat-dispute merchant, not a one-off event.`
      : "No merchant dominates chargeback count in this cut.",
    topDisputed
      ? `${topDisputed.merchantName} concentrates the most disputed amount (${formatINR(topDisputed.disputedAmount)}). High-value chargebacks here should be queued for evidence review first.`
      : "Disputed amount is spread across merchants.",
    leakiest
      ? `${leakiest.category} takes ${formatPct(leakiest.cbShare)} of chargebacks on ${formatPct(leakiest.gmvShare)} of GMV (${leakiest.leakIndex.toFixed(1)}× leak index) — investigate that MCC before volume-led categories.`
      : "GMV and chargeback shares are aligned across categories.",
  ];

  return {
    kpis,
    insights,
    amountByCategory,
    ratioByCategory,
    topByChargeback,
    topByDisputed,
    highRiskMerchants,
    categoryPerformance,
    categoryLeak,
    spikeRose,
  };
}

export async function getTransactionsLive(
  filters: TransactionFilters,
  date: DateRange,
  page = 1,
  pageSize = 10,
) {
  const p = new Params();
  const where = [dateBounds(p, date, "t.timestamp"), ...applyCommonFilters(p, filters)];
  if (filters.amountMin) where.push(`t.amount >= ${p.add(Number(filters.amountMin))}`);
  if (filters.amountMax) where.push(`t.amount <= ${p.add(Number(filters.amountMax))}`);
  if (filters.search) {
    const q = p.add(`%${filters.search}%`);
    where.push(`(t.txn_id ILIKE ${q} OR t.user_id ILIKE ${q} OR t.merchant_id ILIKE ${q} OR COALESCE(t.utr,'') ILIKE ${q} OR COALESCE(m.merchant_name,'') ILIKE ${q})`);
  }

  const countValues = [...p.values];
  const [countRow] = await query<{
    total: string;
    success: string;
    failed: string;
    pending: string;
    processing: string;
    invalid_utr: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE t.status = 'Success')::text AS success,
       COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed,
       COUNT(*) FILTER (WHERE t.status = 'Pending')::text AS pending,
       COUNT(*) FILTER (WHERE t.status = 'Processing')::text AS processing,
       COUNT(*) FILTER (WHERE t.utr IS NULL OR t.utr !~ '^UTR[0-9]{10}$')::text AS invalid_utr
     ${txnJoins()}
     WHERE ${where.join(" AND ")}`,
    countValues,
  );

  const occ = p.add(BUSINESS_OCCUPATIONS);
  const offset = p.add((page - 1) * pageSize);
  const limit = p.add(pageSize);

  const rows = (
    await query<{
      txn_id: string;
      ts: string;
      user_id: string;
      merchant_id: string;
      merchant_name: string;
      merchant_category: string;
      amount: string;
      status: string;
      utr: string;
      user_type: string;
    }>(
      `SELECT t.txn_id,
              to_char(t.timestamp, 'YYYY-MM-DD HH24:MI:SS') AS ts,
              t.user_id,
              t.merchant_id,
              COALESCE(m.merchant_name, t.merchant_id) AS merchant_name,
              COALESCE(m.merchant_category, 'Others') AS merchant_category,
              t.amount::text,
              t.status,
              COALESCE(t.utr, 'MISSING') AS utr,
              CASE WHEN c.occupation = ANY(${occ}::text[]) THEN 'Business' ELSE 'Personal' END AS user_type
       ${txnJoins()}
       WHERE ${where.join(" AND ")}
       ORDER BY t.timestamp DESC
       OFFSET ${offset} LIMIT ${limit}`,
      p.values,
    )
  ).map((r) => ({
    txnId: r.txn_id,
    timestamp: r.ts,
    userId: r.user_id,
    merchantId: r.merchant_id,
    merchantName: r.merchant_name,
    merchantCategory: r.merchant_category,
    amount: num(r.amount),
    status: r.status as TransactionRow["status"],
    utr: r.utr,
    userType: r.user_type as TransactionRow["userType"],
  }));

  const kpis: KpiItem[] = [
    { label: "Total Transactions", value: formatNumber(num(countRow?.total)), tone: "blue" },
    { label: "Successful", value: formatNumber(num(countRow?.success)), tone: "green" },
    { label: "Failed", value: formatNumber(num(countRow?.failed)), tone: "red" },
    { label: "Pending", value: formatNumber(num(countRow?.pending)), tone: "orange" },
    { label: "Invalid / Missing UTR", value: formatNumber(num(countRow?.invalid_utr)), tone: "red" },
    { label: "Processing", value: formatNumber(num(countRow?.processing)), tone: "purple" },
  ];

  const trendParams = new Params();
  const trendWhere = [dateBounds(trendParams, date, "t.timestamp"), ...applyCommonFilters(trendParams, filters)];
  if (filters.amountMin) trendWhere.push(`t.amount >= ${trendParams.add(Number(filters.amountMin))}`);
  if (filters.amountMax) trendWhere.push(`t.amount <= ${trendParams.add(Number(filters.amountMax))}`);
  if (filters.search) {
    const q = trendParams.add(`%${filters.search}%`);
    trendWhere.push(`(t.txn_id ILIKE ${q} OR t.user_id ILIKE ${q} OR t.merchant_id ILIKE ${q} OR COALESCE(t.utr,'') ILIKE ${q} OR COALESCE(m.merchant_name,'') ILIKE ${q})`);
  }

  const trend = (
    await query<{ d: string; count: string; failed: string }>(
      `SELECT to_char(date_trunc('day', t.timestamp), 'MM-DD') AS d,
              COUNT(*)::text AS count,
              COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed
       ${txnJoins()}
       WHERE ${trendWhere.join(" AND ")}
       GROUP BY date_trunc('day', t.timestamp)
       ORDER BY date_trunc('day', t.timestamp)`,
      trendParams.values,
    )
  ).map((r) => ({ date: r.d, count: num(r.count), failed: num(r.failed) }));

  const amountParams = new Params();
  const amountWhere = [dateBounds(amountParams, date, "t.timestamp"), ...applyCommonFilters(amountParams, filters)];
  if (filters.amountMin) amountWhere.push(`t.amount >= ${amountParams.add(Number(filters.amountMin))}`);
  if (filters.amountMax) amountWhere.push(`t.amount <= ${amountParams.add(Number(filters.amountMax))}`);
  if (filters.search) {
    const q = amountParams.add(`%${filters.search}%`);
    amountWhere.push(`(t.txn_id ILIKE ${q} OR t.user_id ILIKE ${q} OR t.merchant_id ILIKE ${q} OR COALESCE(t.utr,'') ILIKE ${q} OR COALESCE(m.merchant_name,'') ILIKE ${q})`);
  }
  const [bucket] = await query<{ a: string; b: string; c: string; d: string; e: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE t.amount < 500)::text AS a,
       COUNT(*) FILTER (WHERE t.amount >= 500 AND t.amount < 2000)::text AS b,
       COUNT(*) FILTER (WHERE t.amount >= 2000 AND t.amount < 5000)::text AS c,
       COUNT(*) FILTER (WHERE t.amount >= 5000 AND t.amount < 10000)::text AS d,
       COUNT(*) FILTER (WHERE t.amount >= 10000)::text AS e
     ${txnJoins()}
     WHERE ${amountWhere.join(" AND ")}`,
    amountParams.values,
  );
  const amounts = [
    { name: "0-500", value: num(bucket?.a) },
    { name: "500-2k", value: num(bucket?.b) },
    { name: "2k-5k", value: num(bucket?.c) },
    { name: "5k-10k", value: num(bucket?.d) },
    { name: "10k+", value: num(bucket?.e) },
  ];

  const hourParams = new Params();
  const hourWhere = [dateBounds(hourParams, date, "t.timestamp"), ...applyCommonFilters(hourParams, filters)];
  if (filters.amountMin) hourWhere.push(`t.amount >= ${hourParams.add(Number(filters.amountMin))}`);
  if (filters.amountMax) hourWhere.push(`t.amount <= ${hourParams.add(Number(filters.amountMax))}`);

  const delayParams = new Params();
  const delayWhere = [
    dateBounds(delayParams, date, "COALESCE(cb.transaction_timestamp, cb.reported_timestamp)"),
    "cb.transaction_timestamp IS NOT NULL",
    "cb.reported_timestamp IS NOT NULL",
    "cb.reported_timestamp >= cb.transaction_timestamp",
  ];

  const utrParams = new Params();
  const utrWhere = [dateBounds(utrParams, date, "t.timestamp"), ...applyCommonFilters(utrParams, filters)];

  const dupParams = new Params();
  const dupWhere = [dateBounds(dupParams, date, "t.timestamp")];

  const [hourRows, delayBuckets, delaySummary, kycRows, highValueUsers, utrCorr, dupRow] = await Promise.all([
    query<{ hour: string; failed: string; volume: string }>(
      `SELECT to_char(t.timestamp, 'HH24') AS hour,
              COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed,
              COUNT(*)::text AS volume
       ${txnJoins()}
       WHERE ${hourWhere.join(" AND ")}
       GROUP BY 1 ORDER BY 1`,
      hourParams.values,
    ),
    query<{ bucket: string; n: string }>(
      `SELECT bucket, COUNT(*)::text AS n FROM (
          SELECT CASE
            WHEN cb.reported_timestamp - cb.transaction_timestamp <= INTERVAL '1 day' THEN '0-1d'
            WHEN cb.reported_timestamp - cb.transaction_timestamp <= INTERVAL '3 days' THEN '1-3d'
            WHEN cb.reported_timestamp - cb.transaction_timestamp <= INTERVAL '7 days' THEN '3-7d'
            WHEN cb.reported_timestamp - cb.transaction_timestamp <= INTERVAL '30 days' THEN '7-30d'
            ELSE '30d+'
          END AS bucket
          ${cbJoins()}
          WHERE ${delayWhere.join(" AND ")}
       ) s
       GROUP BY 1
       ORDER BY CASE bucket WHEN '0-1d' THEN 1 WHEN '1-3d' THEN 2 WHEN '3-7d' THEN 3 WHEN '7-30d' THEN 4 ELSE 5 END`,
      delayParams.values,
    ),
    query<{ avg_days: string; delayed: string; delayed_amt: string }>(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (cb.reported_timestamp - cb.transaction_timestamp)) / 86400.0), 0)::text AS avg_days,
              COUNT(*) FILTER (WHERE cb.reported_timestamp - cb.transaction_timestamp > INTERVAL '7 days')::text AS delayed,
              COALESCE(SUM(cb.disputed_amount) FILTER (WHERE cb.reported_timestamp - cb.transaction_timestamp > INTERVAL '7 days'), 0)::text AS delayed_amt
       ${cbJoins()}
       WHERE ${delayWhere.join(" AND ")}`,
      delayParams.values,
    ),
    query<{ kyc_status: string; n: string; amount: string }>(
      `SELECT COALESCE(c.kyc_status, 'Unknown') AS kyc_status,
              COUNT(*)::text AS n,
              COALESCE(SUM(t.amount),0)::text AS amount
       ${txnJoins()}
       WHERE ${utrWhere.join(" AND ")}
       GROUP BY 1
       ORDER BY SUM(t.amount) DESC`,
      utrParams.values,
    ),
    query<{ user_id: string; full_name: string; disputed_amount: string; dispute_count: string; kyc_status: string }>(
      `SELECT user_id, COALESCE(full_name, user_id) AS full_name,
              COALESCE(disputed_amount,0)::text AS disputed_amount,
              COALESCE(dispute_count,0)::text AS dispute_count,
              COALESCE(kyc_status, 'Unknown') AS kyc_status
       FROM datathon.customer_risk_scores
       WHERE COALESCE(disputed_amount,0) > 0
       ORDER BY disputed_amount DESC NULLS LAST
       LIMIT 6`,
    ),
    query<{ invalid: string; invalid_failed: string; invalid_cb: string; failed: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE t.utr IS NULL OR t.utr !~ '^UTR[0-9]{10}$')::text AS invalid,
         COUNT(*) FILTER (WHERE (t.utr IS NULL OR t.utr !~ '^UTR[0-9]{10}$') AND t.status = 'Failed')::text AS invalid_failed,
         COUNT(*) FILTER (
           WHERE (t.utr IS NULL OR t.utr !~ '^UTR[0-9]{10}$')
             AND EXISTS (SELECT 1 FROM datathon.fact_chargebacks cb WHERE cb.txn_id = t.txn_id)
         )::text AS invalid_cb,
         COUNT(*) FILTER (WHERE t.status = 'Failed')::text AS failed
       ${txnJoins()}
       WHERE ${utrWhere.join(" AND ")}`,
      utrParams.values,
    ),
    query<{ groups: string; extra: string }>(
      `SELECT COUNT(*)::text AS groups, COALESCE(SUM(cnt - 1), 0)::text AS extra
       FROM (
         SELECT COUNT(*) AS cnt
         FROM datathon.fact_transactions t
         WHERE ${dupWhere.join(" AND ")}
         GROUP BY t.user_id, t.merchant_id, t.amount, date_trunc('minute', t.timestamp)
         HAVING COUNT(*) > 1
       ) s`,
      dupParams.values,
    ),
  ]);

  const hourFailed = hourRows.map((r) => ({ hour: `${r.hour}h`, failed: num(r.failed), volume: num(r.volume) }));
  const delayDistribution = delayBuckets.map((r) => ({ name: r.bucket, value: num(r.n) }));
  const avgDelay = num(delaySummary[0]?.avg_days, 1);
  const delayedCount = num(delaySummary[0]?.delayed);
  const delayedAmount = num(delaySummary[0]?.delayed_amt);
  const kycMix = kycRows.map((r) => ({
    name: r.kyc_status,
    value: num(r.n),
    amount: num(r.amount),
    color: KYC_COLORS[r.kyc_status] ?? "#94A3B8",
  }));
  const highValueChargebacks = highValueUsers.map((r) => ({
    userId: r.user_id,
    name: r.full_name,
    disputedAmount: num(r.disputed_amount),
    disputeCount: num(r.dispute_count),
    kycStatus: r.kyc_status,
  }));
  const invalidUtr = num(utrCorr[0]?.invalid);
  const invalidFailed = num(utrCorr[0]?.invalid_failed);
  const invalidCb = num(utrCorr[0]?.invalid_cb);
  const duplicateGroups = num(dupRow[0]?.groups);
  const duplicateExtra = num(dupRow[0]?.extra);

  kpis[5] = {
    label: "Disputes After 7 Days",
    value: formatNumber(delayedCount),
    tone: "orange",
  };

  const peakFail = peakBy(hourFailed, "failed");
  const rejectedSlice = kycMix.find((k) => k.name === "Rejected");
  const insights = [
    peakFail
      ? `Failures peak at ${peakFail.hour} (${formatNumber(peakFail.failed)}). Day-part the fail trend — overnight issuer timeouts look different from midday user-error clusters.`
      : "Failed transactions are spread evenly by hour.",
    invalidUtr
      ? `${formatNumber(invalidUtr)} transactions have a missing or invalid UTR; ${formatNumber(invalidFailed)} of those also failed and ${formatNumber(invalidCb)} already have a chargeback. UTR hygiene is a leading fraud / ops-break indicator.`
      : "UTR coverage is clean in this window.",
    delayedCount
      ? `${formatNumber(delayedCount)} disputes were reported after 7 days (avg delay ${avgDelay.toFixed(1)} days, ${formatCrore(delayedAmount / 1e7)} disputed). Late filing often means account takeover or delayed fraud detection.`
      : "Most disputes are reported within a week of the original transaction.",
    rejectedSlice
      ? `Rejected KYC users still transact ${formatCrore(rejectedSlice.amount / 1e7)} in this window. Unverified cohorts usually carry a higher dispute rate than approved customers.`
      : "Rejected KYC volume is not material in this cut.",
    duplicateGroups
      ? `${formatNumber(duplicateGroups)} duplicate groups (same user, merchant, amount, minute) add ${formatNumber(duplicateExtra)} extra rows that can inflate revenue and dispute metrics if not de-duplicated.`
      : "No same-minute duplicate transaction groups were found.",
    highValueChargebacks[0]
      ? `${highValueChargebacks[0].name} (${highValueChargebacks[0].userId}) leads high-value chargebacks at ${formatINR(highValueChargebacks[0].disputedAmount)} across ${formatNumber(highValueChargebacks[0].disputeCount)} disputes.`
      : "High-value chargeback customers are not concentrated.",
  ].slice(0, 5);

  const total = num(countRow?.total);
  return {
    kpis,
    insights,
    rows,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    page,
    pageSize,
    trend,
    amounts,
    hourFailed,
    delayDistribution,
    kycMix,
    highValueChargebacks,
    quality: { invalidUtr, invalidFailed, invalidCb, duplicateGroups, duplicateExtra, avgDelay, delayedCount },
  };
}

function layoutNodes(
  raw: { id: string; type: NetworkNode["type"]; label: string; clusterId: string; riskScore: number }[],
  edges: NetworkEdge[],
): NetworkNode[] {
  const cx = 360;
  const cy = 230;
  const merchants = raw.filter((n) => n.id.startsWith("MCH") || n.type === "merchant");
  const users = raw.filter((n) => !merchants.includes(n));
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  const place = (list: typeof raw, radius: number, start: number, kind: "user" | "merchant") =>
    list.map((node, i) => {
      const angle = start + (i / Math.max(1, list.length)) * Math.PI * 2;
      const hub = (degree.get(node.id) ?? 0) >= 3;
      return {
        ...node,
        type: kind,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        r: hub ? 14 : kind === "merchant" ? 12 : 10,
      };
    });

  return [...place(merchants, 112, -Math.PI / 2, "merchant"), ...place(users, 198, -Math.PI / 1.55, "user")];
}

export async function getFraudLive(filters: FraudFilters) {
  const p2 = new Params();
  const w2 = ["fc.risk_level IN ('High','Critical')"];
  if (filters.riskLevel !== "All") w2[0] = `fc.risk_level = ${p2.add(filters.riskLevel)}`;
  if (filters.minTransactions !== "All") w2.push(`COALESCE(fc.transaction_count,0) >= ${p2.add(Number(filters.minTransactions))}`);
  const [live] = await query<{ clusters: string; users: string; merchants: string; txns: string }>(
    `SELECT COUNT(*)::text AS clusters,
            COALESCE(SUM(fc.user_count),0)::text AS users,
            COALESCE(SUM(fc.merchant_count),0)::text AS merchants,
            COALESCE(SUM(fc.transaction_count),0)::text AS txns
     FROM datathon.fraud_clusters fc
     WHERE ${w2.join(" AND ")}`,
    p2.values,
  );

  const kpis: KpiItem[] = [
    { label: "Suspicious Clusters", value: formatNumber(num(live?.clusters)), tone: "red" },
    { label: "Suspicious Users", value: formatNumber(num(live?.users)), tone: "orange" },
    { label: "High-Risk Merchants", value: formatNumber(num(live?.merchants)), tone: "red" },
    { label: "Suspicious Transactions", value: formatNumber(num(live?.txns)), tone: "blue" },
  ];

  const listParams = new Params();
  const listWhere = ["fc.cluster_id <> 2"];
  if (filters.riskLevel !== "All") listWhere.push(`fc.risk_level = ${listParams.add(filters.riskLevel)}`);
  else listWhere.push(`fc.risk_level IN ('High','Critical')`);
  if (filters.minTransactions !== "All") {
    listWhere.push(`COALESCE(fc.transaction_count,0) >= ${listParams.add(Number(filters.minTransactions))}`);
  }

  const clusters: ClusterRow[] = (
    await query<{
      cluster_id: string;
      user_count: string;
      merchant_count: string;
      transaction_count: string;
      chargeback_count: string;
      transaction_amount: string;
      risk_score: string;
      risk_level: string;
    }>(
      `SELECT cluster_id::text, user_count::text, merchant_count::text, transaction_count::text,
              chargeback_count::text, transaction_amount::text, risk_score::text, risk_level
       FROM datathon.fraud_clusters fc
       WHERE ${listWhere.join(" AND ")}
       ORDER BY risk_score DESC, chargeback_count DESC
       LIMIT 8`,
      listParams.values,
    )
  ).map((r) => ({
    clusterId: `CL-${r.cluster_id}`,
    name: `Cluster ${r.cluster_id}`,
    users: num(r.user_count),
    merchants: num(r.merchant_count),
    transactions: num(r.transaction_count),
    chargebacks: num(r.chargeback_count),
    amountLakh: num(num(r.transaction_amount) / 1e5, 1),
    riskScore: num(r.risk_score, 0),
    riskLevel: (r.risk_level as ClusterRow["riskLevel"]) ?? "Low",
  }));

  const selected = clusters[0];
  const selectedNumeric = selected ? selected.clusterId.replace("CL-", "") : "829";

  const members = await query<{ node_type: string; entity_id: string }>(
    `SELECT node_type, entity_id FROM datathon.fraud_cluster_members WHERE cluster_id = $1 LIMIT 18`,
    [Number(selectedNumeric)],
  );

  const rawNodes = members.map((m) => {
    const isMerchant = (m.node_type || "").toLowerCase().includes("merchant") || m.entity_id.startsWith("MCH");
    const risk = selected?.riskScore ?? 70;
    return {
      id: m.entity_id,
      type: (isMerchant ? "merchant" : "user") as NetworkNode["type"],
      label: m.entity_id,
      clusterId: selected?.clusterId ?? "CL-0",
      riskScore: risk,
    };
  });

  const ids = rawNodes.map((n) => n.id);
  let edges: NetworkEdge[] = [];
  if (ids.length) {
    const edgeRows = await query<{ user_id: string; merchant_id: string; risk_level: string }>(
      `SELECT user_id, merchant_id, COALESCE(risk_level,'Low') AS risk_level
       FROM datathon.fraud_network_edges
       WHERE user_id = ANY($1) AND merchant_id = ANY($1)
       LIMIT 40`,
      [ids],
    );
    edges = edgeRows.map((e) => ({
      source: e.user_id,
      target: e.merchant_id,
      risk: e.risk_level === "High" || e.risk_level === "Critical" ? "high" : e.risk_level === "Medium" ? "medium" : "low",
    }));
  }

  if (!edges.length && rawNodes.length > 1) {
    edges = rawNodes.slice(1).map((n, i) => ({
      source: rawNodes[0].id,
      target: n.id,
      risk: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
    }));
  }

  const [repeatUsers, repeatMerchants] = await Promise.all([
    query<{ user_id: string; full_name: string; dispute_count: string; disputed_amount: string; risk_score: string; kyc_status: string }>(
      `SELECT user_id, COALESCE(full_name, user_id) AS full_name,
              COALESCE(dispute_count,0)::text AS dispute_count,
              COALESCE(disputed_amount,0)::text AS disputed_amount,
              COALESCE(risk_score,0)::text AS risk_score,
              COALESCE(kyc_status, 'Unknown') AS kyc_status
       FROM datathon.customer_risk_scores
       WHERE COALESCE(dispute_count,0) >= 2
       ORDER BY dispute_count DESC, disputed_amount DESC
       LIMIT 6`,
    ),
    query<{ merchant_name: string; merchant_category: string; chargeback_count: string; transaction_count: string; risk_score: string }>(
      `SELECT COALESCE(merchant_name, merchant_id) AS merchant_name,
              COALESCE(merchant_category, 'Others') AS merchant_category,
              COALESCE(chargeback_count,0)::text AS chargeback_count,
              COALESCE(transaction_count,0)::text AS transaction_count,
              COALESCE(risk_score,0)::text AS risk_score
       FROM datathon.merchant_risk_scores
       WHERE COALESCE(chargeback_count,0) >= 2 AND risk_level IN ('High','Critical')
       ORDER BY chargeback_count DESC, risk_score DESC
       LIMIT 6`,
    ),
  ]);

  const highRiskUsers = repeatUsers.map((r) => ({
    userId: r.user_id,
    name: r.full_name,
    disputeCount: num(r.dispute_count),
    disputedAmount: num(r.disputed_amount),
    riskScore: num(r.risk_score, 0),
    kycStatus: r.kyc_status,
  }));
  const highRiskRepeatMerchants = repeatMerchants.map((r) => ({
    merchantName: r.merchant_name,
    category: r.merchant_category,
    chargebackCount: num(r.chargeback_count),
    txnCount: num(r.transaction_count),
    riskScore: num(r.risk_score, 0),
  }));

  const topUser = highRiskUsers[0];
  const topMerchant = highRiskRepeatMerchants[0];
  const hotCluster = clusters[0];
  const runnerUp = clusters[1];
  const insights = [
    hotCluster
      ? `${hotCluster.clusterId} is the hottest ring: ${formatNumber(hotCluster.users)} users, ${formatNumber(hotCluster.merchants)} merchants, ${formatNumber(hotCluster.chargebacks)} chargebacks at risk score ${hotCluster.riskScore}.`
      : "No high-risk cluster passed the current filters.",
    topUser
      ? `${topUser.name} appears in ${formatNumber(topUser.disputeCount)} disputes (${formatINR(topUser.disputedAmount)}, KYC ${topUser.kycStatus}). Repeat disputers are the first queue for account freeze review.`
      : "No user has two or more disputes in the risk scores.",
    topMerchant
      ? `${topMerchant.merchantName} is a high-risk merchant with ${formatNumber(topMerchant.chargebackCount)} repeated chargebacks on ${formatNumber(topMerchant.txnCount)} scored transactions.`
      : "High-risk merchants are not showing repeated disputes in this cut.",
    runnerUp && hotCluster
      ? `${runnerUp.clusterId} is the next ring to watch (${formatNumber(runnerUp.chargebacks)} chargebacks, risk ${runnerUp.riskScore}) after ${hotCluster.clusterId}.`
      : "Only one high-risk cluster passed the current filters.",
  ];

  return {
    kpis,
    insights,
    clusters,
    selected: selected ?? clusters[0],
    nodes: layoutNodes(rawNodes, edges),
    edges,
    highRiskUsers,
    highRiskRepeatMerchants,
  };
}

