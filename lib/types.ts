export type NavKey =
  | "home"
  | "dashboard"
  | "merchants"
  | "transactions"
  | "fraud-network"
  | "ask-ai"
  | "about";

export type DateRange = {
  from: string;
  to: string;
};

export type DashboardFilters = {
  merchantCategory: string;
  merchantStatus: string;
  riskSegment: string;
  userType: string;
};

export type MerchantFilters = {
  merchantState: string;
  merchantCategory: string;
  businessType: string;
  merchantStatus: string;
  riskLevel: string;
};

export type TransactionFilters = {
  status: string;
  merchantCategory: string;
  amountMin: string;
  amountMax: string;
  userType: string;
  merchantId: string;
  userId: string;
  search: string;
};

export type FraudFilters = {
  riskLevel: string;
  minTransactions: string;
  merchantCategory: string;
};

export type KpiTone = "default" | "blue" | "green" | "red" | "orange" | "purple";

export type KpiChange = {
  value: string;
  direction: "up" | "down" | "neutral";
  good?: boolean;
};

export type KpiItem = {
  label: string;
  value: string;
  change?: KpiChange;
  tone?: KpiTone;
};

export type TransactionRow = {
  txnId: string;
  timestamp: string;
  userId: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  amount: number;
  status: "Success" | "Failed" | "Pending" | "Processing";
  utr: string;
  userType: "Personal" | "Business";
};

export type MerchantRow = {
  merchantId: string;
  merchantName: string;
  category: string;
  businessType: string;
  state: string;
  status: string;
  txnCount: number;
  chargebackCount: number;
  chargebackRatio: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
};

export type ClusterRow = {
  clusterId: string;
  name: string;
  users: number;
  merchants: number;
  transactions: number;
  chargebacks: number;
  amountLakh: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
};

export type NetworkNode = {
  id: string;
  type: "user" | "merchant" | "suspicious" | "high-risk";
  label: string;
  x: number;
  y: number;
  r: number;
  clusterId: string;
  riskScore: number;
};

export type NetworkEdge = {
  source: string;
  target: string;
  risk: "low" | "medium" | "high";
};

export type SpikeRidge = {
  merchantId: string;
  merchantName: string;
  category: string;
  peakDay: string;
  spikeFactor: number;
  chargebacks: number;
  series: { date: string; count: number }[];
};

export type SpikeRoseSlice = {
  name: string;
  spikes: number;
  avgFactor: number;
  chargebacks: number;
};

export type MerchantLeakPoint = {
  merchantName: string;
  category: string;
  amountCr: number;
  ratio: number;
  ratioPct: number;
  txns: number;
  chargebacks: number;
  disputed: number;
  riskScore: number;
};
