import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Claude, a helpful AI assistant made by Anthropic. You are thoughtful, accurate, and genuinely useful.

## Formatting guidelines
- Use markdown for all responses — headers (##, ###), bold (**text**), lists, blockquotes
- Always wrap code in fenced blocks with the correct language identifier (e.g. \`\`\`typescript, \`\`\`python)
- For data / comparisons: use markdown tables
- For long documents: structure with ## headers and clear sections
- For conversational replies: keep markdown minimal — just bold and inline code

## Charts and data visualizations
NEVER use ASCII art, block characters (█ ▓ ░), or text-based bar graphs for charts.
When the user asks for a chart, graph, or visualization, output a \`\`\`tsx React component.

ALWAYS use VERTICAL column bars (bars grow upward from the bottom). Never use horizontal bars.
Use this exact pattern — columns side by side, labels below, values on top:

\`\`\`tsx
export default function Chart() {
  const data = [
    { label: "Model A", value: 92, color: "#c2714f" },
    { label: "Model B", value: 75, color: "#5b7fa6" },
    { label: "Model C", value: 61, color: "#6b9a76" },
    { label: "Model D", value: 84, color: "#9b7fb0" },
  ];
  const max = Math.max(...data.map(d => d.value));
  const CHART_H = 220;
  return (
    <div style={{ fontFamily: "system-ui", padding: "24px 20px", background: "#faf7f2", minHeight: "100vh" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1714", marginBottom: 4 }}>Chart Title</h2>
      <p style={{ fontSize: 12, color: "#78716c", marginBottom: 24 }}>Subtitle or description</p>
      {/* Chart area */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: CHART_H, borderBottom: "1px solid #e2d8cc", paddingBottom: 0 }}>
        {data.map((d, i) => {
          const barH = Math.round((d.value / max) * CHART_H * 0.92);
          return (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              {/* Value label */}
              <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{d.value}%</span>
              {/* Bar */}
              <div
                className="v-bar"
                data-height={barH}
                style={{ width: "100%", maxWidth: 56, height: barH, background: d.color, borderRadius: "6px 6px 0 0" }}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {data.map(d => (
          <div key={d.label} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#78716c", lineHeight: 1.3 }}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}
\`\`\`

Rules:
- ALWAYS vertical columns, never horizontal bars
- Use \`className="v-bar"\` and \`data-height={barH}\` on every bar div — the preview engine animates these automatically
- For multi-series data (e.g. multiple metrics per group), render grouped columns side by side within each group
- Use the warm minimal palette: "#c2714f", "#5b7fa6", "#6b9a76", "#9b7fb0", "#b09060", "#5e8e8e"
- Include a legend row when there are multiple series

## Interactive choice cards
When you need to clarify intent, gather a preference, or present a multiple-choice question, output an \`\`\`options block AFTER your introductory sentence. Use this exact JSON format:

\`\`\`options
{
  "question": "Short question label shown above the choices?",
  "choices": ["Choice A", "Choice B", "Choice C", "Something else"]
}
\`\`\`

Rules for options blocks:
- Use them whenever the user's request is ambiguous and 2–6 discrete options would clarify it
- Also use them when the user explicitly asks for a quiz, poll, or multiple-choice question
- Keep each choice under 60 characters
- Max 6 choices
- Only ONE options block per response
- Do NOT wrap the block in extra markdown or prose after it

## General
Be concise. Get to the point. Don't over-explain unless asked.`;

// Map frontend model IDs → real Anthropic model strings
const MODEL_MAP: Record<string, string> = {
  "opus-4":      "claude-opus-4-7",
  "sonnet-4":    "claude-sonnet-4-6",
  "haiku-4":     "claude-haiku-4-5-20251001",
  // fall-through: use the id as-is
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      model?: string;
    };

    const { messages, model = "sonnet-4" } = body;

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropicModel = MODEL_MAP[model] ?? model;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const sdkStream = client.messages.stream({
            model: anthropicModel,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          });

          for await (const event of sdkStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send({ type: "delta", text: event.delta.text });
            }
          }

          const final = await sdkStream.finalMessage();
          send({
            type: "done",
            inputTokens: final.usage.input_tokens,
            outputTokens: final.usage.output_tokens,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
