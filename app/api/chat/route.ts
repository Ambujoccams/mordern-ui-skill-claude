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
