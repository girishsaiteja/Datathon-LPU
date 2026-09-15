import { NextRequest } from "next/server";
import { runAgentGraph } from "@/lib/agent/graph";
import type { AgentStep } from "@/lib/agent/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { question?: string };
  const question = (body.question || "").trim();
  if (!question) {
    return Response.json({ error: "Question is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      send({ type: "hello" });
      try {
        const result = await runAgentGraph(question, (steps: AgentStep[]) => {
          send({ type: "step", steps });
        });
        send({ type: "done", ...result });
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Agent failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
