"use client";

import {
  Bot,
  LoaderCircle,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import {
  EXAMPLE_AGENT_QUERIES,
  type AgentResponse,
  type AgentStep,
} from "@/lib/agent/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  response?: AgentResponse;
  loading?: boolean;
  error?: string;
};

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Ask a question about live UPI transactions, merchants, chargebacks, KYC, or disputes. The agent will plan the query, pick the chart, and write the insights.",
  time: "Now",
};

const LOADING_STEPS: AgentStep[] = [
  {
    id: "interpret",
    label: "Interpret",
    detail: "Agent is interpreting the question.",
    status: "active",
  },
  {
    id: "plan",
    label: "Plan",
    detail: "Agent is choosing the query.",
    status: "pending",
  },
  {
    id: "execute",
    label: "Execute",
    detail: "Agent is querying live transaction data.",
    status: "pending",
  },
  {
    id: "visualize",
    label: "Visualize",
    detail: "Agent is building the chart.",
    status: "pending",
  },
  {
    id: "answer",
    label: "Answer",
    detail: "Agent is writing the insights.",
    status: "pending",
  },
];

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AskAiPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [busy, setBusy] = useState(false);
  const [graphSteps, setGraphSteps] = useState<AgentStep[]>(
    LOADING_STEPS.map((s) => ({ ...s, status: "pending", detail: "" })),
  );
  const endRef = useRef<HTMLDivElement>(null);

  const lastResponse = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.response)?.response;

  const displayedSteps = busy
    ? graphSteps
    : (lastResponse?.steps ?? graphSteps);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, graphSteps]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    const time = nowLabel();
    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;
    const startingSteps: AgentStep[] = LOADING_STEPS.map((s, i) => ({
      ...s,
      status: i === 0 ? "active" : "pending",
    }));

    setBusy(true);
    setInput("");
    setGraphSteps(startingSteps);
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text: q, time },
      {
        id: assistantId,
        role: "assistant",
        text: startingSteps[0]?.detail || "Working through the agent graph…",
        time,
        loading: true,
      },
    ]);

    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "The agent failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPayload: AgentResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5).trim()) as
            | { type: "hello" }
            | { type: "step"; steps: AgentStep[] }
            | (AgentResponse & { type: "done" })
            | { type: "error"; error?: string };

          if (event.type === "hello") continue;
          if (event.type === "step") {
            setGraphSteps(event.steps);
            const active = event.steps.find((s) => s.status === "active") ?? event.steps.find((s) => s.status === "done");
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, text: active?.detail || msg.text, loading: true }
                  : msg,
              ),
            );
          } else if (event.type === "done") {
            finalPayload = event;
          } else if (event.type === "error") {
            throw new Error(event.error || "The agent failed.");
          }
        }
      }

      if (!finalPayload) throw new Error("The agent did not return a result.");
      setGraphSteps(finalPayload.steps);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                text: finalPayload!.chart ? "" : finalPayload!.answer,
                loading: false,
                response: finalPayload!,
              }
            : msg,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                loading: false,
                error:
                  error instanceof Error ? error.message : "The agent failed.",
                text: "I could not complete that question against the live database.",
              }
            : msg,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell fill>
      <div className="flex h-full min-h-0 flex-col bg-[#eef3f9]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-slate-800">
                Ask AI (Agentic Chatbot)
              </h1>
              <p className="text-[12px] text-slate-500">
                The agent plans the query, chart, and insights from live UPI data
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setMessages([WELCOME]);
              setGraphSteps(LOADING_STEPS.map((s) => ({ ...s, status: "pending", detail: "" })));
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_280px] gap-4 px-5 py-4">
          <aside className="min-h-0 overflow-y-auto">
            <Panel className="!p-4">
              <h3 className="mb-3 text-[13px] font-bold text-slate-700">
                Example Questions
              </h3>
              <div className="flex flex-col gap-2">
                {EXAMPLE_AGENT_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[12px] leading-snug text-slate-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
                  >
                    {q} <span className="float-right text-slate-300">›</span>
                  </button>
                ))}
              </div>
            </Panel>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-kpi">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end gap-3">
                    <div className="max-w-[85%] rounded-2xl bg-brand-500 px-4 py-3 text-[13px] text-white">
                      {msg.text}
                      <div className="mt-1 text-[10px] text-white/70">
                        {msg.time}
                      </div>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                      <UserRound className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  <AssistantBubble key={msg.id} msg={msg} />
                ),
              )}
              <div ref={endRef} />
            </div>

            <form
              className="shrink-0 border-t border-slate-200 bg-white px-3 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#f7f9fc] px-3 py-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your UPI data..."
                  className="h-11 flex-1 bg-transparent px-2 text-[13px] outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </button>
              </div>
            </form>
          </section>

          <aside className="min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <Panel
                title="Agent Graph"
                extra={
                  <span className="text-[11px] font-semibold text-brand-600">
                    5 steps
                  </span>
                }
              >
                <ol className="space-y-2">
                  {displayedSteps.map((step) => (
                    <li key={step.id} className="flex gap-3">
                      <span
                        className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          step.status === "done"
                            ? "bg-emerald-500"
                            : step.status === "active"
                              ? "bg-brand-500 animate-pulse"
                              : "bg-slate-300"
                        }`}
                      />
                      <div>
                        <div
                          className={`text-[12px] font-bold ${
                            step.status === "done"
                              ? "text-emerald-700"
                              : step.status === "active"
                                ? "text-brand-600"
                                : "text-slate-500"
                          }`}
                        >
                          {step.label}
                          {step.status === "done" ? (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                              Done
                            </span>
                          ) : step.status === "active" ? (
                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                              Working
                            </span>
                          ) : null}
                        </div>
                        {step.detail ? (
                          <div className="text-[11px] text-slate-500">
                            {step.detail}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel title="Suggested Follow-up Questions">
                <div className="flex flex-col gap-2">
                  {(lastResponse?.followups?.length
                    ? lastResponse.followups
                    : EXAMPLE_AGENT_QUERIES.slice(0, 4)
                  ).map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      disabled={busy}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-left text-[12px] text-slate-600 hover:border-brand-300 disabled:opacity-50"
                    >
                      {q} <span className="float-right text-slate-300">›</span>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function AssistantBubble({ msg }: { msg: Message }) {
  const response = msg.response;
  const insights = (response?.insights ?? []).slice(0, 4);
  const isRefusal = Boolean(response && !response.chart && !msg.loading);
  const showStatus = Boolean(
    msg.loading || msg.error || (!response && msg.text) || isRefusal,
  );
  const result = (
    <>
      {response?.needsApiKey ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
          Add <code className="rounded bg-white px-1">GEMINI_API_KEY</code> to{" "}
          <code className="rounded bg-white px-1">.env</code> and restart the app to answer
          open-ended questions.
        </div>
      ) : null}
      {response?.chart ? (
        <Panel title={response.chart.title}>
          <DynamicChart spec={response.chart} />
        </Panel>
      ) : null}
      {insights.length ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <h4 className="mb-1 text-[13px] font-bold text-emerald-800">Key Insights</h4>
          <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-emerald-900">
            {insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-3">
      {showStatus ? (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
              {msg.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-[#f7f9fc] px-4 py-3 text-[13px] leading-relaxed text-slate-700">
              {msg.text}
              {msg.error ? <div className="mt-2 text-[12px] text-rose-500">{msg.error}</div> : null}
            </div>
          </div>
          {isRefusal && insights.length ? (
            <div className="ml-12 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
              <h4 className="mb-1 text-[13px] font-bold text-sky-800">Ask something like</h4>
              <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-sky-900">
                {insights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">{result}</div>
        </div>
      )}
    </div>
  );
}
