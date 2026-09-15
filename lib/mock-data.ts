import {
  DEFAULT_DATE_FROM,
  DEFAULT_DATE_TO,
  MERCHANT_CATEGORIES,
} from "@/lib/constants";
import { formatNumber, hashString, seededUnit } from "@/lib/format";
import type {
  ClusterRow,
  DashboardFilters,
  DateRange,
  FraudFilters,
  MerchantFilters,
  MerchantRow,
  NetworkEdge,
  NetworkNode,
  TransactionFilters,
  TransactionRow,
} from "@/lib/types";

const BASE_TXNS = 1_245_320;
const BASE_AMOUNT_CR = 3482.6;
const BASE_ATV = 2800;
const BASE_FAIL_RATE = 2.8;
const BASE_PENDING_RATE = 1.2;
const BASE_CB = 4820;
const BASE_CB_CR = 12.4;
const BASE_CB_RATIO = 0.39;
const BASE_KYC = 78.5;
const BASE_KYC_PENDING = 9.2;
const BASE_MERCHANTS = 12480;
const BASE_HIGH_RISK = 342;

const CATEGORY_SHARE: Record<string, number> = {
  All: 1,
  "Food & Beverage": 0.284,
  Travel: 0.187,
  Electronics: 0.162,
  Entertainment: 0.101,
  Grocery: 0.073,
  Retail: 0.068,
  Utilities: 0.061,
  Healthcare: 0.049,
  "E-commerce": 0.042,
  Finance: 0.028,
};

function factorFrom(filters: Record<string, string>, date?: DateRange) {
  let factor = 1;
  if (filters.merchantCategory && filters.merchantCategory !== "All") {
    factor *= CATEGORY_SHARE[filters.merchantCategory] ?? 0.08;
  }
  if (filters.merchantStatus && filters.merchantStatus !== "All") {
    factor *= filters.merchantStatus === "Active" ? 0.82 : 0.18;
  }
  if (filters.riskSegment && filters.riskSegment !== "All") {
    factor *= filters.riskSegment === "High" ? 0.16 : filters.riskSegment === "Medium" ? 0.34 : 0.5;
  }
  if (filters.userType && filters.userType !== "All") {
    factor *= filters.userType === "Business" ? 0.38 : 0.62;
  }
  if (filters.businessType && filters.businessType !== "All") {
    factor *= 0.28;
  }
  if (filters.merchantState && filters.merchantState !== "All") {
    factor *= 0.12;
  }
  if (filters.riskLevel && filters.riskLevel !== "All") {
    factor *= filters.riskLevel === "Critical" ? 0.08 : filters.riskLevel === "High" ? 0.14 : 0.4;
  }
  if (filters.status && filters.status !== "All") {
    factor *=
      filters.status === "Success"
        ? 0.962
        : filters.status === "Failed"
          ? 0.027
          : filters.status === "Pending"
            ? 0.01
            : 0.007;
  }
  if (date) {
    const from = new Date(date.from).getTime();
    const to = new Date(date.to).getTime();
    const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
    factor *= days / 30;
  }
  return Math.max(0.02, factor);
}

function isDefaultDate(date: DateRange) {
  return date.from === DEFAULT_DATE_FROM && date.to === DEFAULT_DATE_TO;
}

function isDefaultDash(filters: DashboardFilters, date: DateRange) {
  return (
    isDefaultDate(date) &&
    filters.merchantCategory === "All" &&
    filters.merchantStatus === "All" &&
    filters.riskSegment === "All" &&
    filters.userType === "All"
  );
}

export function getExecutiveData(filters: DashboardFilters, date: DateRange) {
  const def = isDefaultDash(filters, date);
  const f = factorFrom(filters, date);
  const riskBump =
    filters.riskSegment === "High" ? 1.8 : filters.riskSegment === "Medium" ? 1.25 : 1;

  const totalTxns = def ? BASE_TXNS : Math.round(BASE_TXNS * f);
  const amountCr = def ? BASE_AMOUNT_CR : +(BASE_AMOUNT_CR * f).toFixed(1);
  const atv = def ? BASE_ATV : Math.round(BASE_ATV * (0.92 + (1 - f) * 0.2));
  const failRate = def ? BASE_FAIL_RATE : +(BASE_FAIL_RATE * riskBump * (0.85 + (1 - f) * 0.4)).toFixed(1);
  const pendingRate = def ? BASE_PENDING_RATE : +(BASE_PENDING_RATE * (0.9 + (1 - f) * 0.3)).toFixed(1);
  const cbCount = def ? BASE_CB : Math.round(BASE_CB * f * riskBump);
  const cbCr = def ? BASE_CB_CR : +(BASE_CB_CR * f * riskBump).toFixed(1);
  const cbRatio = def ? BASE_CB_RATIO : +((cbCount / totalTxns) * 100).toFixed(2);
  const kyc = def ? BASE_KYC : +(Math.min(96, BASE_KYC + (1 - f) * 4)).toFixed(1);
  const kycPending = def ? BASE_KYC_PENDING : +(Math.max(2, BASE_KYC_PENDING * (0.7 + f * 0.3))).toFixed(1);

  const success = Math.round(totalTxns * (1 - failRate / 100 - pendingRate / 100 - 0.0068));
  const failed = Math.round(totalTxns * (failRate / 100));
  const pending = Math.round(totalTxns * (pendingRate / 100));
  const processing = Math.max(0, totalTxns - success - failed - pending);

  return {
    kpis: [
      { label: "Total Transactions", value: formatNumber(totalTxns), change: { value: "12.4%", direction: "up" as const } },
      { label: "Total Transaction Amount", value: `₹ ${formatNumber(amountCr, 1)} Cr`, change: { value: "8.2%", direction: "up" as const } },
      { label: "Average Transaction Value", value: `₹ ${formatNumber(atv)}`, change: { value: "5.1%", direction: "up" as const } },
      { label: "Failed Transaction Rate", value: `${failRate.toFixed(1)}%`, change: { value: "0.4%", direction: "down" as const, good: true } },
      { label: "Pending Transaction Rate", value: `${pendingRate.toFixed(1)}%`, change: { value: "0.1%", direction: "up" as const, good: false } },
      { label: "Chargeback Count", value: formatNumber(cbCount), change: { value: "15.2%", direction: "up" as const, good: false }, tone: "red" as const },
      { label: "Chargeback Amount", value: `₹ ${formatNumber(cbCr, 1)} Cr`, change: { value: "18.3%", direction: "up" as const, good: false }, tone: "red" as const },
      { label: "Chargeback-to-Transaction Ratio", value: `${cbRatio.toFixed(2)}%`, change: { value: "0.05%", direction: "up" as const, good: false }, tone: "orange" as const },
      { label: "KYC Completion Rate", value: `${kyc.toFixed(1)}%`, tone: "green" as const },
      { label: "KYC Pending Rate", value: `${kycPending.toFixed(1)}%`, tone: "orange" as const },
    ],
    dailyTrend: buildDailyTrend(date, f),
    chargebackTrend: buildChargebackTrend(date, f * riskBump),
    statusDistribution: [
      { name: "Success", value: success, color: "#22C55E" },
      { name: "Processing", value: processing, color: "#3B82F6" },
      { name: "Failed", value: failed, color: "#EF4444" },
      { name: "Pending", value: pending, color: "#F59E0B" },
    ],
    reasonDistribution: [
      { name: "Fraud", value: Math.round(cbCount * 0.32), color: "#EF4444" },
      { name: "Unauthorized", value: Math.round(cbCount * 0.24), color: "#F97316" },
      { name: "Not Received", value: Math.round(cbCount * 0.18), color: "#3B82F6" },
      { name: "Duplicate", value: Math.round(cbCount * 0.14), color: "#8B5CF6" },
      { name: "Other", value: Math.round(cbCount * 0.12), color: "#94A3B8" },
    ],
    severityDistribution: [
      { name: "Critical", value: 18, color: "#DC2626" },
      { name: "High", value: 32, color: "#F97316" },
      { name: "Medium", value: 28, color: "#F59E0B" },
      { name: "Low", value: 22, color: "#22C55E" },
    ],
    totals: { totalTxns, cbCount },
  };
}

function buildDailyTrend(date: DateRange, factor: number) {
  const from = new Date(`${date.from}T00:00:00`);
  const to = new Date(`${date.to}T00:00:00`);
  const days: { date: string; volume: number; amount: number }[] = [];
  const cursor = new Date(from);
  let i = 0;
  while (cursor <= to) {
    const wave = 0.78 + Math.sin(i / 2.4) * 0.16 + Math.cos(i / 5.1) * 0.08;
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6 ? 0.82 : 1;
    days.push({
      date: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume: Math.round(41500 * wave * weekend * Math.max(0.35, factor * 1.15)),
      amount: Math.round(118 * wave * weekend * Math.max(0.35, factor * 1.15)),
    });
    cursor.setDate(cursor.getDate() + 1);
    i += 1;
  }
  return days;
}

function buildChargebackTrend(date: DateRange, factor: number) {
  const from = new Date(`${date.from}T00:00:00`);
  const to = new Date(`${date.to}T00:00:00`);
  const days: { date: string; chargebacks: number; disputed: number }[] = [];
  const cursor = new Date(from);
  let i = 0;
  while (cursor <= to) {
    const wave = 0.7 + Math.sin(i / 3.1 + 0.6) * 0.22 + (i % 7 === 4 ? 0.18 : 0);
    days.push({
      date: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      chargebacks: Math.round(148 * wave * Math.max(0.35, factor * 1.1)),
      disputed: Math.round(38 * wave * Math.max(0.35, factor * 1.1)),
    });
    cursor.setDate(cursor.getDate() + 1);
    i += 1;
  }
  return days;
}

export function getMerchantData(filters: MerchantFilters, date: DateRange) {
  const f = factorFrom(filters, date);
  const def =
    isDefaultDate(date) &&
    Object.values(filters).every((v) => v === "All");

  const totalMerchants = def ? BASE_MERCHANTS : Math.round(BASE_MERCHANTS * f);
  const highRisk = def ? BASE_HIGH_RISK : Math.round(BASE_HIGH_RISK * Math.max(0.12, f * (filters.riskLevel === "High" || filters.riskLevel === "Critical" ? 2.4 : 1)));
  const amountCr = def ? BASE_AMOUNT_CR : +(BASE_AMOUNT_CR * f).toFixed(1);
  const chargebacks = def ? BASE_CB : Math.round(BASE_CB * f);

  const amountByCategory = [
    { name: "Food & Beverage", value: 28.4, amount: 989.1 },
    { name: "Travel", value: 18.7, amount: 651.2 },
    { name: "Electronics", value: 16.2, amount: 564.2 },
    { name: "Entertainment", value: 10.1, amount: 351.7 },
    { name: "Grocery", value: 7.3, amount: 254.2 },
    { name: "Utilities", value: 6.1, amount: 212.4 },
    { name: "Healthcare", value: 4.9, amount: 170.6 },
    { name: "Others", value: 8.3, amount: 289.1 },
  ].filter((row) => filters.merchantCategory === "All" || row.name === filters.merchantCategory || (filters.merchantCategory !== "All" && row.name === "Others" && !["Food & Beverage", "Travel", "Electronics", "Entertainment", "Grocery", "Utilities", "Healthcare"].includes(filters.merchantCategory)));

  const ratioByCategory = [
    { name: "Travel", value: 1.24 },
    { name: "Entertainment", value: 0.91 },
    { name: "Electronics", value: 0.82 },
    { name: "Food & Beverage", value: 0.53 },
    { name: "Grocery", value: 0.38 },
    { name: "Healthcare", value: 0.25 },
    { name: "Others", value: 0.19 },
  ].filter((row) => filters.merchantCategory === "All" || row.name === filters.merchantCategory);

  return {
    kpis: [
      { label: "Total Merchants", value: formatNumber(totalMerchants), tone: "blue" as const },
      { label: "High-Risk Merchants", value: formatNumber(highRisk), tone: "red" as const },
      { label: "Total Merchant Txn Amount", value: `₹ ${formatNumber(amountCr, 1)} Cr`, tone: "blue" as const },
      { label: "Total Merchant Chargebacks", value: formatNumber(chargebacks), tone: "orange" as const },
    ],
    amountByCategory,
    ratioByCategory,
    topByChargeback: [
      MERCHANT_POOL[0],
      MERCHANT_POOL[1],
      MERCHANT_POOL[2],
      MERCHANT_POOL[3],
      MERCHANT_POOL[4],
    ].filter((m) => {
      if (filters.merchantCategory !== "All" && m.category !== filters.merchantCategory) return false;
      if (filters.businessType !== "All" && m.businessType !== filters.businessType) return false;
      if (filters.merchantStatus !== "All" && m.status !== filters.merchantStatus) return false;
      if (filters.merchantState !== "All" && m.state !== filters.merchantState) return false;
      if (filters.riskLevel !== "All" && m.riskLevel !== filters.riskLevel) return false;
      return true;
    }),
    highRiskMerchants: getHighRiskMerchants(filters),
  };
}

const MERCHANT_POOL: MerchantRow[] = [
  { merchantId: "M045", merchantName: "ABC Travels", category: "Travel", businessType: "Private Limited", state: "Maharashtra", status: "Active", txnCount: 53240, chargebackCount: 430, chargebackRatio: 0.8, riskScore: 86, riskLevel: "High" },
  { merchantId: "M048", merchantName: "QuickMart", category: "Retail", businessType: "Partnership", state: "Karnataka", status: "Active", txnCount: 48120, chargebackCount: 380, chargebackRatio: 0.79, riskScore: 74, riskLevel: "High" },
  { merchantId: "M012", merchantName: "TechZone", category: "Electronics", businessType: "Private Limited", state: "Delhi", status: "Active", txnCount: 28890, chargebackCount: 310, chargebackRatio: 1.07, riskScore: 81, riskLevel: "High" },
  { merchantId: "M067", merchantName: "ShopEasy", category: "E-commerce", businessType: "Private Limited", state: "Telangana", status: "Active", txnCount: 24450, chargebackCount: 290, chargebackRatio: 1.19, riskScore: 88, riskLevel: "High" },
  { merchantId: "M023", merchantName: "FoodKing", category: "Food & Beverage", businessType: "Sole Proprietor", state: "Tamil Nadu", status: "Active", txnCount: 22110, chargebackCount: 260, chargebackRatio: 1.18, riskScore: 79, riskLevel: "High" },
  { merchantId: "M071", merchantName: "FastPay", category: "Finance", businessType: "Private Limited", state: "Maharashtra", status: "On Hold", txnCount: 8640, chargebackCount: 412, chargebackRatio: 4.77, riskScore: 92, riskLevel: "Critical" },
  { merchantId: "M088", merchantName: "MegaMart", category: "Retail", businessType: "Private Limited", state: "Delhi", status: "Active", txnCount: 39210, chargebackCount: 268, chargebackRatio: 0.68, riskScore: 87, riskLevel: "High" },
  { merchantId: "M054", merchantName: "TravelHunt", category: "Travel", businessType: "Partnership", state: "Karnataka", status: "Active", txnCount: 15880, chargebackCount: 241, chargebackRatio: 1.52, riskScore: 81, riskLevel: "High" },
  { merchantId: "M033", merchantName: "GameZone", category: "Entertainment", businessType: "Sole Proprietor", state: "Punjab", status: "Suspended", txnCount: 11240, chargebackCount: 198, chargebackRatio: 1.76, riskScore: 78, riskLevel: "High" },
  { merchantId: "M019", merchantName: "DigiKart", category: "Electronics", businessType: "Private Limited", state: "Karnataka", status: "Active", txnCount: 24320, chargebackCount: 1420, chargebackRatio: 5.8, riskScore: 91, riskLevel: "Critical" },
  { merchantId: "M027", merchantName: "TechWorld", category: "Electronics", businessType: "Partnership", state: "Maharashtra", status: "Active", txnCount: 18540, chargebackCount: 980, chargebackRatio: 5.3, riskScore: 84, riskLevel: "High" },
  { merchantId: "M041", merchantName: "ElectroHub", category: "Electronics", businessType: "Private Limited", state: "Delhi", status: "Active", txnCount: 15760, chargebackCount: 720, chargebackRatio: 4.6, riskScore: 77, riskLevel: "High" },
  { merchantId: "M062", merchantName: "MobileZone", category: "Electronics", businessType: "Sole Proprietor", state: "Telangana", status: "Active", txnCount: 12430, chargebackCount: 510, chargebackRatio: 4.1, riskScore: 72, riskLevel: "High" },
  { merchantId: "M077", merchantName: "GadgetStore", category: "Electronics", businessType: "Partnership", state: "Tamil Nadu", status: "Active", txnCount: 10980, chargebackCount: 430, chargebackRatio: 3.9, riskScore: 69, riskLevel: "Medium" },
];

function getHighRiskMerchants(filters: MerchantFilters) {
  return [
    { merchantName: "FastPay", category: "Finance", riskScore: 92 },
    { merchantName: "MegaMart", category: "Retail", riskScore: 87 },
    { merchantName: "TravelHunt", category: "Travel", riskScore: 81 },
    { merchantName: "GameZone", category: "Entertainment", riskScore: 78 },
  ].filter((m) => filters.merchantCategory === "All" || m.category === filters.merchantCategory);
}

const USER_IDS = ["U001", "U002", "U003", "U004", "U005", "U018", "U044", "U102", "U210", "U333"];

function pad(n: number, w = 6) {
  return String(n).padStart(w, "0");
}

export function getTransactions(filters: TransactionFilters, date: DateRange): TransactionRow[] {
  const seed = hashString(JSON.stringify({ ...filters, ...date }));
  const rows: TransactionRow[] = [];
  const start = new Date(`${date.from}T00:00:00`).getTime();
  const end = new Date(`${date.to}T23:59:59`).getTime();
  const count = 1080;

  for (let i = 0; i < count; i += 1) {
    const merchant = MERCHANT_POOL[i % MERCHANT_POOL.length];
    const r = seededUnit(seed + i * 17);
    const status: TransactionRow["status"] =
      r > 0.962 ? "Processing" : r > 0.952 ? "Pending" : r > 0.925 ? "Failed" : "Success";
    const ts = new Date(start + ((end - start) * ((i * 97) % 1000)) / 1000);
    const amount = Math.round((250 + seededUnit(seed + i * 31) * 9800) / 10) * 10;
    const userType: TransactionRow["userType"] = seededUnit(seed + i * 11) > 0.38 ? "Personal" : "Business";
    const utrValid = seededUnit(seed + i * 53) > 0.0034;
    rows.push({
      txnId: `TXN${pad(i + 1)}`,
      timestamp: ts.toISOString(),
      userId: USER_IDS[i % USER_IDS.length],
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      merchantCategory: merchant.category,
      amount,
      status,
      utr: utrValid ? `UTR${String(1000000000 + ((i * 7919) % 8999999999))}` : "INVALID",
      userType,
    });
  }

  // Pin first rows to the mockup when filters are default
  if (
    filters.status === "All" &&
    filters.merchantCategory === "All" &&
    !filters.amountMin &&
    !filters.amountMax &&
    filters.userType === "All" &&
    filters.merchantId === "All" &&
    filters.userId === "All" &&
    !filters.search
  ) {
    const pinned: TransactionRow[] = [
      { txnId: "TXN000001", timestamp: "2024-09-01T10:23:15", userId: "U001", merchantId: "M045", merchantName: "ABC Travels", merchantCategory: "Travel", amount: 1250, status: "Success", utr: "UTR1234567890", userType: "Personal" },
      { txnId: "TXN000002", timestamp: "2024-09-01T10:23:12", userId: "U002", merchantId: "M048", merchantName: "QuickMart", merchantCategory: "Retail", amount: 890, status: "Failed", utr: "UTR9876543210", userType: "Personal" },
      { txnId: "TXN000003", timestamp: "2024-09-01T10:22:58", userId: "U003", merchantId: "M012", merchantName: "TechZone", merchantCategory: "Electronics", amount: 3400, status: "Success", utr: "UTR1122334455", userType: "Business" },
      { txnId: "TXN000004", timestamp: "2024-09-01T10:22:41", userId: "U004", merchantId: "M067", merchantName: "ShopEasy", merchantCategory: "E-commerce", amount: 560, status: "Failed", utr: "UTR5566778899", userType: "Personal" },
      { txnId: "TXN000005", timestamp: "2024-09-01T10:22:05", userId: "U005", merchantId: "M023", merchantName: "FoodKing", merchantCategory: "Food & Beverage", amount: 2100, status: "Success", utr: "UTR9988776655", userType: "Business" },
    ];
    rows.splice(0, 5, ...pinned);
  }

  return rows.filter((row) => {
    if (filters.status !== "All" && row.status !== filters.status) return false;
    if (filters.merchantCategory !== "All" && row.merchantCategory !== filters.merchantCategory) return false;
    if (filters.userType !== "All" && row.userType !== filters.userType) return false;
    if (filters.merchantId !== "All" && row.merchantId !== filters.merchantId) return false;
    if (filters.userId !== "All" && row.userId !== filters.userId) return false;
    if (filters.amountMin && row.amount < Number(filters.amountMin)) return false;
    if (filters.amountMax && row.amount > Number(filters.amountMax)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const blob = `${row.txnId} ${row.userId} ${row.merchantId} ${row.utr} ${row.merchantName}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    const t = new Date(row.timestamp).getTime();
    if (t < new Date(`${date.from}T00:00:00`).getTime() || t > new Date(`${date.to}T23:59:59`).getTime()) {
      return false;
    }
    return true;
  });
}

export function getTransactionKpis(rows: TransactionRow[]) {
  const total = rows.length ? Math.round((rows.length / 1080) * BASE_TXNS) : 0;
  const successShare = rows.filter((r) => r.status === "Success").length / Math.max(1, rows.length);
  const failedShare = rows.filter((r) => r.status === "Failed").length / Math.max(1, rows.length);
  const pendingShare = rows.filter((r) => r.status === "Pending").length / Math.max(1, rows.length);
  const processingShare = rows.filter((r) => r.status === "Processing").length / Math.max(1, rows.length);
  const invalidShare = rows.filter((r) => r.utr === "INVALID").length / Math.max(1, rows.length);

  const useExact = rows.length === 1080 && rows[0]?.txnId === "TXN000001";

  return [
    { label: "Total Transactions", value: formatNumber(useExact ? BASE_TXNS : total), tone: "blue" as const },
    { label: "Successful", value: formatNumber(useExact ? 1_198_420 : Math.round(total * successShare)), tone: "green" as const },
    { label: "Failed", value: formatNumber(useExact ? 34_020 : Math.round(total * failedShare)), tone: "red" as const },
    { label: "Pending", value: formatNumber(useExact ? 12_880 : Math.round(total * pendingShare)), tone: "orange" as const },
    { label: "Processing", value: formatNumber(useExact ? 8_420 : Math.round(total * processingShare)), tone: "purple" as const },
    { label: "Invalid UTR", value: formatNumber(useExact ? 4_180 : Math.round(total * invalidShare)), tone: "red" as const },
  ];
}

export const CLUSTER_ROWS: ClusterRow[] = [
  { clusterId: "CL-001", name: "Open Market Ring", users: 18, merchants: 6, transactions: 42, chargebacks: 8, amountLakh: 9.8, riskScore: 92, riskLevel: "Critical" },
  { clusterId: "CL-002", name: "Merchant Fraud Ring", users: 12, merchants: 4, transactions: 35, chargebacks: 6, amountLakh: 7.2, riskScore: 88, riskLevel: "High" },
  { clusterId: "CL-003", name: "Multi-layer Network", users: 21, merchants: 8, transactions: 48, chargebacks: 11, amountLakh: 15.6, riskScore: 94, riskLevel: "Critical" },
  { clusterId: "CL-004", name: "Rapid Transfer Cluster", users: 9, merchants: 3, transactions: 22, chargebacks: 4, amountLakh: 4.1, riskScore: 76, riskLevel: "High" },
  { clusterId: "CL-005", name: "Linked Merchant Group", users: 14, merchants: 5, transactions: 31, chargebacks: 7, amountLakh: 6.8, riskScore: 81, riskLevel: "High" },
];

export function getFraudData(filters: FraudFilters, date: DateRange) {
  const f = factorFrom({ merchantCategory: filters.merchantCategory, riskLevel: filters.riskLevel }, date);
  const def = isDefaultDate(date) && filters.riskLevel === "All" && filters.minTransactions === "All" && filters.merchantCategory === "All";
  const minTxn = filters.minTransactions === "All" ? 0 : Number(filters.minTransactions);

  const clusters = CLUSTER_ROWS.filter((c) => {
    if (filters.riskLevel !== "All" && c.riskLevel !== filters.riskLevel) return false;
    if (c.transactions < minTxn) return false;
    return true;
  });

  return {
    kpis: [
      { label: "Suspicious Clusters", value: formatNumber(def ? 28 : Math.max(clusters.length, Math.round(28 * f))), tone: "red" as const },
      { label: "Suspicious Users", value: formatNumber(def ? 412 : Math.round(412 * f)), tone: "orange" as const },
      { label: "High-Risk Merchants", value: formatNumber(def ? 128 : Math.round(128 * f)), tone: "red" as const },
      { label: "Suspicious Transactions", value: formatNumber(def ? 8420 : Math.round(8420 * f)), tone: "blue" as const },
    ],
    clusters,
    selected: clusters[0] ?? CLUSTER_ROWS[0],
    nodes: NETWORK_NODES,
    edges: NETWORK_EDGES,
  };
}

export const NETWORK_NODES: NetworkNode[] = [
  { id: "c1", type: "high-risk", label: "CL-001", x: 220, y: 150, r: 22, clusterId: "CL-001", riskScore: 92 },
  { id: "u1", type: "user", label: "U018", x: 110, y: 70, r: 12, clusterId: "CL-001", riskScore: 41 },
  { id: "u2", type: "user", label: "U044", x: 70, y: 160, r: 11, clusterId: "CL-001", riskScore: 38 },
  { id: "u3", type: "suspicious", label: "U102", x: 130, y: 240, r: 13, clusterId: "CL-001", riskScore: 77 },
  { id: "u4", type: "user", label: "U210", x: 250, y: 40, r: 10, clusterId: "CL-001", riskScore: 29 },
  { id: "m1", type: "merchant", label: "M045", x: 340, y: 90, r: 14, clusterId: "CL-001", riskScore: 86 },
  { id: "m2", type: "merchant", label: "M071", x: 380, y: 180, r: 15, clusterId: "CL-001", riskScore: 92 },
  { id: "m3", type: "high-risk", label: "M019", x: 300, y: 250, r: 16, clusterId: "CL-001", riskScore: 91 },
  { id: "u5", type: "suspicious", label: "U333", x: 200, y: 280, r: 12, clusterId: "CL-002", riskScore: 81 },
  { id: "m4", type: "merchant", label: "M012", x: 80, y: 300, r: 13, clusterId: "CL-002", riskScore: 81 },
  { id: "u6", type: "user", label: "U001", x: 400, y: 70, r: 10, clusterId: "CL-002", riskScore: 22 },
  { id: "m5", type: "suspicious", label: "M033", x: 420, y: 260, r: 13, clusterId: "CL-003", riskScore: 78 },
  { id: "u7", type: "user", label: "U005", x: 160, y: 40, r: 9, clusterId: "CL-003", riskScore: 18 },
  { id: "m6", type: "merchant", label: "M048", x: 40, y: 220, r: 12, clusterId: "CL-001", riskScore: 74 },
];

export const NETWORK_EDGES: NetworkEdge[] = [
  { source: "u1", target: "c1", risk: "medium" },
  { source: "u2", target: "c1", risk: "low" },
  { source: "u3", target: "c1", risk: "high" },
  { source: "u4", target: "m1", risk: "low" },
  { source: "m1", target: "c1", risk: "high" },
  { source: "m2", target: "c1", risk: "high" },
  { source: "m3", target: "c1", risk: "high" },
  { source: "u5", target: "m3", risk: "high" },
  { source: "u5", target: "m5", risk: "medium" },
  { source: "m4", target: "u3", risk: "medium" },
  { source: "u6", target: "m1", risk: "low" },
  { source: "u7", target: "m1", risk: "low" },
  { source: "m6", target: "u2", risk: "medium" },
  { source: "m6", target: "c1", risk: "medium" },
  { source: "u1", target: "m1", risk: "low" },
];

export const ASK_AI_EXAMPLES = [
  "Which merchant category has the highest chargeback ratio?",
  "Show me the top 10 merchants by disputed amount.",
  "What is the transaction trend over the last 30 days?",
  "Show high-risk users with multiple disputes.",
  "Which merchants have sudden transaction spikes?",
  "Show transactions with invalid UTR.",
  "What is the KYC completion rate?",
  "Find suspicious transaction clusters.",
];

export const FOLLOWUPS = [
  "Show the top 10 merchants in Electronics by disputed amount.",
  "What is the trend for Electronics category over the last 6 months?",
  "Show high-risk merchants in Electronics.",
  "Compare chargeback ratios across all categories.",
  "Show transactions in Electronics with invalid UTR.",
];

export const CATEGORY_TABLE = [
  { category: "Electronics", txns: 152430, chargebacks: 7320, disputed: 24120000, ratio: 4.8 },
  { category: "Grocery", txns: 298120, chargebacks: 11620, disputed: 18433000, ratio: 3.9 },
  { category: "Travel", txns: 184320, chargebacks: 3870, disputed: 9210000, ratio: 2.1 },
  { category: "Food & Dining", txns: 276540, chargebacks: 4990, disputed: 11320000, ratio: 1.8 },
  { category: "Others", txns: 312890, chargebacks: 2810, disputed: 6180000, ratio: 0.9 },
];

export const ELECTRONICS_MERCHANTS = [
  { rank: 1, name: "DigiKart", txns: 24320, chargebacks: 1420, ratio: 5.8 },
  { rank: 2, name: "TechWorld", txns: 18540, chargebacks: 980, ratio: 5.3 },
  { rank: 3, name: "ElectroHub", txns: 15760, chargebacks: 720, ratio: 4.6 },
  { rank: 4, name: "MobileZone", txns: 12430, chargebacks: 510, ratio: 4.1 },
  { rank: 5, name: "GadgetStore", txns: 10980, chargebacks: 430, ratio: 3.9 },
];

export const VOLUME_SERIES = [
  { month: "Jul", txns: 22800, chargebacks: 420 },
  { month: "Aug", txns: 27400, chargebacks: 510 },
  { month: "Sep", txns: 31200, chargebacks: 390 },
];

export function merchantOptions() {
  return ["All", ...MERCHANT_POOL.map((m) => m.merchantId)];
}

export function userOptions() {
  return ["All", ...USER_IDS];
}

export function categoryOptions() {
  return [...MERCHANT_CATEGORIES];
}
