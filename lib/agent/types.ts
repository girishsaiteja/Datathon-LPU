export type ChartType = "bar" | "line" | "scatter" | "pie";

export type ChartSpec = {
  type: ChartType;
  title: string;
  xKey: string;
  series: { key: string; label: string }[];
  data: Record<string, string | number>[];
};

export type TableSpec = {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
};

export type AgentStep = {
  id: string;
  label: string;
  detail: string;
  status: "done" | "active" | "pending";
};

export type AgentResponse = {
  answer: string;
  insights: string[];
  followups: string[];
  chart: ChartSpec | null;
  table: TableSpec | null;
  steps: AgentStep[];
  tool: string | null;
  needsApiKey: boolean;
};

export type ToolResult = {
  title: string;
  chartType: ChartType;
  xKey: string;
  series: { key: string; label: string }[];
  data: Record<string, string | number>[];
  table?: TableSpec;
  facts: string[];
};

export const EXAMPLE_AGENT_QUERIES = [
  "Which merchant is the biggest risk, and why?",
  "Show daily transaction volume trend.",
  "Show total transaction amount by merchant category.",
  "Compare successful vs failed transactions by day.",
  "Which merchant-user cluster is the highest risk, and why?",
  "Which merchant has the highest chargeback count?",
  "Which merchant category has the highest disputed amount?",
  "Show chargeback reason distribution.",
  "Show top 10 users by disputed amount.",
  "Show average transaction value trend over time.",
  "Which KYC status has the highest transaction amount?",
  "Compare chargebacks by severity level.",
  "Show disputes reported after 7 days.",
  "Which merchant has the highest chargeback-to-transaction ratio?",
];
