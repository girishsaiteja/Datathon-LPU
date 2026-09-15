import { planQuestion } from "@/lib/agent/planner";
import { matchToolByKeywords, runTool, TOOL_SPECS, isCompoundQuestion, isDailyVolumeOnly } from "@/lib/agent/tools";
import { classifyIntent, DESTRUCTIVE_MESSAGE, INVALID_MESSAGE, refusalMessage } from "@/lib/agent/intent";
import { retrieveKnowledge } from "@/lib/agent/knowledge";
import type { AgentResponse, AgentStep, ChartSpec, ChartType, ToolResult } from "@/lib/agent/types";

const VALID_TOOLS = new Set(TOOL_SPECS.map((tool) => tool.name));
const CHART_TYPES = new Set<ChartType>(["bar", "line", "scatter", "pie"]);
const GEMINI_PLAN_TIMEOUT_MS = 20_000;
const GEMINI_TIMEOUT_MS = 16_000;
const GEMINI_INSIGHT_TIMEOUT_MS = 22_000;

const TOOL_CATALOG = TOOL_SPECS.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n");

export type AgentProgress = (steps: AgentStep[]) => void;

function stepList(active: number, details: string[]): AgentStep[] {
  const labels = [
    { id: "interpret", label: "Interpret" },
    { id: "plan", label: "Plan" },
    { id: "execute", label: "Execute" },
    { id: "visualize", label: "Visualize" },
    { id: "answer", label: "Answer" },
  ];
  return labels.map((item, i) => ({
    ...item,
    detail: details[i] ?? "",
    status: i < active ? "done" : i === active ? "active" : "pending",
  }));
}

function fallbackInsights(result: ToolResult) {
  const fromFacts = result.facts.filter(Boolean).slice(0, 4);
  if (fromFacts.length) return fromFacts;
  const row = result.data[0];
  if (!row) return ["No rows came back for this question."];
  const keys = Object.keys(row).slice(0, 3);
  return [`Leading row: ${keys.map((key) => `${key} ${row[key]}`).join(", ")}.`];
}

function defaultFollowups(tool: string) {
  const map: Record<string, string[]> = {
    daily_transaction_volume: [
      "Compare successful vs failed transactions by day.",
      "Show average transaction value trend over time.",
    ],
    amount_by_merchant_category: [
      "Which merchant category has the highest disputed amount?",
      "Show total transaction amount by state.",
    ],
    highest_risk_cluster: [
      "Show the members of the highest-risk cluster.",
      "Which merchant has the highest chargeback-to-transaction ratio?",
    ],
    daily_chargeback_trend: [
      "Which merchant has the highest chargeback-to-transaction ratio?",
      "Compare chargebacks by severity level.",
    ],
    risk_leaderboard: [
      "Which merchant-user cluster is the highest risk, and why?",
      "Which user is the highest risk?",
      "Which merchant category has the highest average risk?",
    ],
    unusual_low_volume_users: [
      "Which merchant has the highest chargeback-to-transaction ratio?",
      "Which user is the highest risk?",
    ],
    chargeback_count_vs_rate: [
      "Which merchant has the highest chargeback-to-transaction ratio?",
      "Which merchant has the highest chargeback count?",
    ],
  };
  return (
    map[tool] ?? [
      "Show daily transaction volume trend.",
      "Which merchant has the highest chargeback count?",
      "Compare chargebacks by severity level.",
    ]
  );
}

function finish(
  result: ToolResult,
  tool: string,
  answer: string,
  followups: string[],
  details: string[],
  insights: string[],
  chart: ChartSpec,
  needsApiKey = false,
): AgentResponse {
  return {
    answer,
    insights: insights.length ? insights : fallbackInsights(result),
    followups,
    chart,
    table: result.table ?? null,
    steps: stepList(5, details).map((s) => ({ ...s, status: "done" })),
    tool,
    needsApiKey,
  };
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string; status?: string };
};

function geminiModels() {
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash";
  return [...new Set([primary, fallback])];
}

async function callGeminiOnce(model: string, body: Record<string, unknown>, timeoutMs: number): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing.");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok || json.error) {
    const err = new Error(
      `Gemini error: ${res.status} ${json.error?.message || json.error?.status || "request failed"}`.slice(0, 280),
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json;
}

async function callGemini(body: Record<string, unknown>, timeoutMs = GEMINI_TIMEOUT_MS): Promise<GeminiResponse> {
  let lastError: Error | null = null;
  const config = (body.generationConfig ?? {}) as Record<string, unknown>;
  const variants: Record<string, unknown>[] = [
    body,
    {
      ...body,
      generationConfig: Object.fromEntries(Object.entries(config).filter(([key]) => key !== "thinkingConfig")),
    },
    {
      ...body,
      generationConfig: Object.fromEntries(
        Object.entries(config).filter(([key]) => key !== "thinkingConfig" && key !== "responseSchema"),
      ),
    },
  ];
  modelLoop: for (const model of geminiModels()) {
    for (const payload of variants) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await callGeminiOnce(model, payload, timeoutMs);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Gemini request failed.");
          const aborted = lastError.name === "TimeoutError" || lastError.name === "AbortError";
          const status = (error as Error & { status?: number }).status;
          if (status === 429 && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            continue;
          }
          if (aborted || status === 429) continue modelLoop;
          if (status === 400 || status === 503) break;
          throw lastError;
        }
      }
    }
  }
  throw lastError || new Error("Gemini request failed.");
}

function geminiText(payload: GeminiResponse) {
  return (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function chartFromResult(result: ToolResult): ChartSpec {
  return {
    type: result.chartType,
    title: result.title,
    xKey: result.xKey,
    series: result.series,
    data: result.data,
  };
}

function isNumericColumn(data: ToolResult["data"], key: string) {
  return data.every((row) => row[key] === "" || row[key] == null || !Number.isNaN(Number(row[key])));
}

function applyChartChoice(result: ToolResult, choice: Record<string, unknown>): ChartSpec {
  const base = chartFromResult(result);
  const keys = Object.keys(result.data[0] ?? {});
  if (!keys.length) return base;

  const type = CHART_TYPES.has(choice.type as ChartType) ? (choice.type as ChartType) : base.type;
  const xKey = typeof choice.xKey === "string" && keys.includes(choice.xKey) ? choice.xKey : base.xKey;
  const rawSeries = Array.isArray(choice.series) ? choice.series : [];
  const series = rawSeries
    .map((item) => {
      const row = item as { key?: unknown; label?: unknown };
      const key = String(row.key || "");
      if (!key || !keys.includes(key) || key === xKey) return null;
      return { key, label: String(row.label || key) };
    })
    .filter((item): item is { key: string; label: string } => Boolean(item))
    .slice(0, 3);

  const next: ChartSpec = {
    type,
    title: String(choice.title || base.title).slice(0, 120) || base.title,
    xKey,
    series: series.length ? series : base.series.filter((item) => keys.includes(item.key)),
    data: result.data,
  };
  if (/daily transaction volume/i.test(next.title) && !keys.includes("date") && !keys.some((key) => /date|day/i.test(key))) {
    next.title = base.title;
  }

  if (next.type === "scatter" && (!isNumericColumn(result.data, next.xKey) || !next.series[0] || !isNumericColumn(result.data, next.series[0].key))) {
    next.type = "bar";
  }
  if (next.type === "pie") {
    next.series = next.series.slice(0, 1);
    if (!next.series[0] || !isNumericColumn(result.data, next.series[0].key)) {
      next.type = "bar";
    }
  }
  if (!next.series.length) return base;
  return next;
}

type GeminiPlan = {
  tool: string;
  args: Record<string, unknown>;
  outOfScope: boolean;
  model: string;
};

async function planWithGemini(question: string): Promise<GeminiPlan> {
  const modelLabel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const knowledge = retrieveKnowledge(question);
  const payload = await callGemini(
    {
      systemInstruction: {
        parts: [
          {
            text: `You are UPI Guard's analytics planner. Write the query that answers THIS exact question.
Return JSON only:
{"intent":"analytics|invalid|destructive","outOfScope":false,"tool":"<name>","sql":"","title":"chart title","limit":12,"reason":"one sentence"}

Rules:
- intent=destructive for delete/drop/wipe/hack/update/insert.
- intent=invalid for anything not about this UPI fraud dataset, or any date outside 1 Jan 2026–3 Dec 2026 (example: 20 Dec 2026 has no rows).
- tool must be one of: ${TOOL_SPECS.map((tool) => tool.name).join(", ")}
- A named tool is allowed only if it fully answers the question. Otherwise tool=run_sql with a single read-only SELECT on datathon.* .
- NEVER use daily_transaction_volume unless the user asked for a daily/time-series volume trend and nothing else.
- "low transaction volume" or "repeated chargebacks" is unusual_low_volume_users or run_sql on customer_risk_scores. It is NOT daily volume.
- Use highest_risk_cluster only for cluster / fraud-ring questions.
- Use risk_leaderboard for biggest/highest risk when no cluster is named.
- Use daily_chargeback_trend for why fraud/chargeback rate rose or fell over time, or daily fraud rate.
- Use chargeback_count_vs_rate for "does the merchant with the most chargebacks also have the highest rate".
- sql is required for run_sql. Qualify every table as datathon.<table>. Single SELECT, no writes.
${knowledge}

Tools:
${TOOL_CATALOG}`,
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: question }] }],
      generationConfig: jsonConfig(900, 0.1),
    },
    GEMINI_PLAN_TIMEOUT_MS,
  );

  const parsed = parseJsonObject(geminiText(payload) || "{}");
  const intent = String(parsed.intent || "");
  if ((intent === "destructive" || intent === "invalid") && classifyIntent(question) !== "analytics") {
    return { tool: "", args: {}, outOfScope: true, model: modelLabel };
  }
  const outOfScope = Boolean(parsed.outOfScope);
  const toolName = String(parsed.tool || "");
  const args: Record<string, unknown> = { limit: Number(parsed.limit ?? 10) || 10 };
  if (parsed.sql) args.sql = String(parsed.sql);
  if (parsed.title) args.title = String(parsed.title);

  if (outOfScope) {
    if (classifyIntent(question) === "analytics") {
      throw new Error("Planner marked a valid analytics question as out of scope.");
    }
    return { tool: "", args, outOfScope: true, model: modelLabel };
  }
  if (!VALID_TOOLS.has(toolName as (typeof TOOL_SPECS)[number]["name"])) {
    throw new Error("Gemini returned an unknown tool.");
  }
  if (toolName === "run_sql" && !String(args.sql || "").trim()) {
    throw new Error("Gemini chose run_sql without SQL.");
  }
  return { tool: toolName, args, outOfScope: false, model: modelLabel };
}

function sqlLooksLikeDailyVolume(sql: string) {
  return /date_trunc\s*\(\s*'day'/i.test(sql) && /fact_transactions/i.test(sql) && !/chargeback|dispute|customer_risk/i.test(sql);
}

function sanitizePlan(question: string, planned: GeminiPlan): GeminiPlan {
  const local = localPlan(question);
  const mapped = matchToolByKeywords(question);

  if (planned.outOfScope && !local.outOfScope) return local;

  if (planned.tool === "daily_transaction_volume" && !isDailyVolumeOnly(question)) {
    if (mapped && mapped !== "daily_transaction_volume") {
      return { ...planned, tool: mapped, args: { limit: 12 }, outOfScope: false };
    }
    if (!local.outOfScope) return local;
  }

  if (
    planned.tool === "run_sql" &&
    sqlLooksLikeDailyVolume(String(planned.args.sql || "")) &&
    !isDailyVolumeOnly(question)
  ) {
    if (mapped && mapped !== "daily_transaction_volume") {
      return { ...planned, tool: mapped, args: { limit: 12 }, outOfScope: false };
    }
    if (!local.outOfScope) return local;
  }

  if (mapped === "unusual_low_volume_users" && planned.tool !== "unusual_low_volume_users" && planned.tool !== "run_sql") {
    return { ...planned, tool: mapped, args: { limit: 12 }, outOfScope: false };
  }

  if (mapped === "risk_leaderboard" && planned.tool === "daily_transaction_volume") {
    return { ...planned, tool: mapped, args: { limit: 12 }, outOfScope: false };
  }

  return planned;
}

function jsonConfig(maxOutputTokens: number, temperature: number, schema?: Record<string, unknown>) {
  return {
    responseMimeType: "application/json",
    temperature,
    maxOutputTokens,
    thinkingConfig: { thinkingLevel: "minimal" },
    ...(schema ? { responseSchema: schema } : {}),
  };
}

async function composeWithGemini(
  question: string,
  result: ToolResult,
  tool: string,
): Promise<{ chart: ChartSpec; answer: string; insights: string[]; followups: string[]; fromGemini: boolean }> {
  const fallback = {
    chart: chartFromResult(result),
    answer: result.facts.join(" ") || result.title,
    insights: fallbackInsights(result),
    followups: defaultFollowups(tool),
    fromGemini: false,
  };
  if (!result.data.length || !process.env.GEMINI_API_KEY) return fallback;

  const columns = Object.keys(result.data[0] ?? {});
  const sample = (result.table?.rows ?? result.data).slice(0, 12);
  try {
    const payload = await callGemini(
      {
        systemInstruction: {
          parts: [
            {
              text: `You are UPI Guard. Using only the live rows, design one chart and write insights for THIS question.
Do not invent numbers or column keys. If the rows do not answer the question, say so.
Never describe daily volume unless the rows are actually a time series of volume.
Match the chart to the question: risk -> bar of risk scores; volume -> line; mix/share -> pie; correlation -> scatter.
Return JSON only with:
type: bar | line | scatter | pie
title: specific to the question
xKey + series keys must exist in columns
answer: 2-4 sentences that directly answer the question with numbers from the rows
insights: 3-4 original insights, each citing a number
followups: 2 related questions that can be answered from this UPI dataset.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  question,
                  liveFacts: result.facts,
                  columns,
                  availableSeries: result.series,
                  defaultXKey: result.xKey,
                  rows: sample,
                }),
              },
            ],
          },
        ],
        generationConfig: jsonConfig(2048, 0.3, {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["bar", "line", "scatter", "pie"] },
            title: { type: "STRING" },
            xKey: { type: "STRING" },
            series: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  key: { type: "STRING" },
                  label: { type: "STRING" },
                },
                required: ["key", "label"],
              },
            },
            answer: { type: "STRING" },
            insights: { type: "ARRAY", items: { type: "STRING" } },
            followups: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["type", "title", "xKey", "series", "answer", "insights", "followups"],
        }),
      },
      GEMINI_INSIGHT_TIMEOUT_MS,
    );
    const parsed = parseJsonObject(geminiText(payload) || "{}");
    const answer = String(parsed.answer || "").trim();
    const insights = Array.isArray(parsed.insights)
      ? parsed.insights.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
      : [];
    const followups = Array.isArray(parsed.followups)
      ? parsed.followups.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
      : [];
    if (!answer || insights.length < 2) return { ...fallback, chart: applyChartChoice(result, parsed) };
    return {
      chart: applyChartChoice(result, parsed),
      answer,
      insights,
      followups: followups.length ? followups : fallback.followups,
      fromGemini: true,
    };
  } catch (error) {
    console.error("[ask-ai] Gemini compose failed:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

function localPlan(question: string): GeminiPlan {
  const mapped = matchToolByKeywords(question);
  if (mapped) {
    return { tool: mapped, args: { limit: 10 }, outOfScope: false, model: "local" };
  }
  const local = planQuestion(question);
  if (local.kind === "tool") {
    return { tool: local.tool, args: local.args, outOfScope: false, model: "local" };
  }
  if (local.kind === "sql") {
    return {
      tool: "run_sql",
      args: { sql: local.sql, title: local.title || "Live analysis" },
      outOfScope: false,
      model: "local",
    };
  }
  return { tool: "", args: {}, outOfScope: true, model: "local" };
}

function lastResortPlan(question: string): GeminiPlan {
  const mapped = matchToolByKeywords(question);
  if (mapped) return { tool: mapped, args: { limit: 12 }, outOfScope: false, model: "local" };
  if (/fraud rate|chargeback rate|dispute rate|why.{0,40}(fraud|chargeback|dispute).{0,40}(increase|decrease|spike|rise|drop)/i.test(question)) {
    return { tool: "daily_chargeback_trend", args: { limit: 12 }, outOfScope: false, model: "local" };
  }
  if (/chargeback rate|most chargebacks|chargeback ratio/i.test(question)) {
    return { tool: "chargeback_count_vs_rate", args: { limit: 12 }, outOfScope: false, model: "local" };
  }
  if (/chargeback|dispute/i.test(question)) {
    return { tool: "top_merchants_by_chargeback_count", args: { limit: 10 }, outOfScope: false, model: "local" };
  }
  if (/risk|cluster/i.test(question)) {
    return { tool: /cluster/i.test(question) ? "highest_risk_cluster" : "risk_leaderboard", args: { limit: 10 }, outOfScope: false, model: "local" };
  }
  if (/kyc/i.test(question)) {
    return { tool: "kyc_status_transaction_amount", args: { limit: 10 }, outOfScope: false, model: "local" };
  }
  if (/fail/i.test(question)) {
    return { tool: "success_vs_failed_by_day", args: { limit: 10 }, outOfScope: false, model: "local" };
  }
  if (/merchant|categor/i.test(question)) {
    return { tool: "amount_by_merchant_category", args: { limit: 10 }, outOfScope: false, model: "local" };
  }
  return { tool: "", args: {}, outOfScope: true, model: "local" };
}

function outOfScopeResponse(details: string[], answer = INVALID_MESSAGE, needsApiKey = false): AgentResponse {
  return {
    answer,
    insights: [
      "Ask about transactions, merchants, chargebacks, KYC, clusters, or risk in this UPI dataset.",
      "Stay inside 1 Jan 2026 to 3 Dec 2026 — for example: why did chargebacks rise in November 2026?",
      "Example: which merchant is the highest risk, or show chargebacks by severity.",
    ],
    followups: defaultFollowups(""),
    chart: null,
    table: null,
    steps: stepList(2, details).map((s, i) => ({ ...s, status: i < 2 ? "done" : "pending" })),
    tool: null,
    needsApiKey,
  };
}

function destructiveResponse(details: string[]): AgentResponse {
  return {
    answer: DESTRUCTIVE_MESSAGE,
    insights: ["This agent only runs read-only analytics queries. Destructive or write operations are blocked."],
    followups: defaultFollowups(""),
    chart: null,
    table: null,
    steps: stepList(2, details).map((s, i) => ({ ...s, status: i < 2 ? "done" : "pending" })),
    tool: null,
    needsApiKey: false,
  };
}

export async function runAgentGraph(question: string, onProgress?: AgentProgress): Promise<AgentResponse> {
  const q = question.trim();
  if (!q) throw new Error("Question is empty.");

  const details = ["Agent is interpreting the question.", "", "", "", ""];
  const emit = async (active: number) => {
    onProgress?.(stepList(active, details));
    await new Promise((resolve) => setTimeout(resolve, 80));
  };
  await emit(0);

  const intent = classifyIntent(q);
  if (intent === "destructive") {
    details[0] = "Agent interpreted the question.";
    details[1] = "That request is not allowed.";
    await emit(1);
    return destructiveResponse(details);
  }
  if (intent === "invalid" || intent === "out_of_range") {
    details[0] = "Agent interpreted the question.";
    details[1] = intent === "out_of_range" ? "That date is outside the dataset." : "That is not an analysis question.";
    await emit(1);
    return outOfScopeResponse(details, refusalMessage(q, intent));
  }

  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const local = localPlan(q);
  const useGeminiPlan = hasKey && (isCompoundQuestion(q) || local.outOfScope || local.tool === "run_sql");
  let planned: GeminiPlan = local;

  details[1] = hasKey ? "Agent is choosing the query." : "Agent is choosing the query from live tools.";
  await emit(1);

  if (useGeminiPlan) {
    try {
      planned = sanitizePlan(q, await planWithGemini(q));
      details[0] = "Agent interpreted the question.";
      details[1] = planned.outOfScope
        ? "Agent marked this as out of scope."
        : "Agent mapped this to a live query.";
    } catch {
      planned = local;
      details[0] = "Agent interpreted the question.";
      details[1] = planned.outOfScope ? "Could not map that to a live query." : "Agent mapped this to a live query.";
    }
  } else {
    details[0] = "Agent interpreted the question.";
    details[1] = planned.outOfScope ? "Could not map that to a live query." : "Agent mapped this to a live query.";
  }

  planned = sanitizePlan(q, planned);

  if (planned.outOfScope) {
    planned = lastResortPlan(q);
  }

  if (planned.outOfScope || !planned.tool) {
    details[1] = "That is not a question this dataset can answer.";
    await emit(1);
    return outOfScopeResponse(details);
  }

  if (planned.tool === "run_sql" && !String(planned.args.sql || "").trim()) {
    const fallback = localPlan(q);
    if (!fallback.outOfScope) planned = fallback;
  }

  await emit(1);
  details[2] = "Agent is querying live transaction data.";
  await emit(2);

  let result: ToolResult;
  try {
    result = await runTool(planned.tool, planned.args);
  } catch (error) {
    const fallback = localPlan(q);
    if (!fallback.outOfScope && (fallback.tool !== planned.tool || JSON.stringify(fallback.args) !== JSON.stringify(planned.args))) {
      planned = fallback;
      result = await runTool(planned.tool, planned.args);
    } else {
      throw error;
    }
  }
  details[2] = "Loaded results from live tables.";
  details[3] = "Agent is building the chart.";
  await emit(3);

  const composed = await composeWithGemini(q, result, planned.tool);
  details[3] = `Prepared a ${composed.chart.type} chart.`;
  details[4] = "Agent wrote the insights.";
  await emit(4);

  return finish(
    result,
    planned.tool,
    composed.answer,
    composed.followups,
    details,
    composed.insights,
    composed.chart,
    !hasKey,
  );
}
