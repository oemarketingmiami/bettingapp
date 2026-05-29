import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chatPrompt";
import { buildSlateContext } from "@/lib/slateContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImgPart = { media_type: string; data: string };
type InMsg = { role: "user" | "assistant"; content: string; images?: ImgPart[] };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response("ANTHROPIC_API_KEY not set", { status: 500 });

  const { messages } = (await req.json()) as { messages: InMsg[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  const slate = await buildSlateContext();

  // Map our messages -> Anthropic content blocks (images become vision blocks).
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => {
    if (m.role === "user" && m.images?.length) {
      const blocks: Anthropic.ContentBlockParam[] = m.images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.media_type as "image/png", data: img.data },
      }));
      blocks.push({ type: "text", text: m.content || "Analyze this screenshot." });
      return { role: "user", content: blocks };
    }
    return { role: m.role, content: m.content };
  });

  const client = new Anthropic({ apiKey });
  let stream;
  try {
    stream = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      // System split so the large, static prompt is cached; slate context refreshes per call.
      system: [
        { type: "text", text: CHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: slate },
      ],
      messages: anthropicMessages,
      stream: true,
    });
  } catch (e) {
    const detail = e instanceof Anthropic.APIError ? JSON.stringify(e.error) : String(e);
    return new Response(`Model request failed: ${detail}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[error: ${String(e)}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
