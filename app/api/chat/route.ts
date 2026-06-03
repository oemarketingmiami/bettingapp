import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chatPrompt";
import { buildSlateContext } from "@/lib/slateContext";
import { buildPropData, type ExtractedProp } from "@/lib/props";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImgPart = { media_type: string; data: string };
type InMsg = { role: "user" | "assistant"; content: string; images?: ImgPart[] };

// Pass A: read the uploaded board and extract structured props (vision -> JSON).
async function extractProps(client: Anthropic, images: ImgPart[]): Promise<ExtractedProp[]> {
  const blocks: Anthropic.ContentBlockParam[] = images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.media_type as "image/png", data: img.data },
  }));
  blocks.push({
    type: "text",
    text: `Extract every PLAYER PROP from this board as JSON only: {"props":[{"player","stat","line","side"}]}. ` +
      `stat is like "Points","Rebounds","Assists","3-PT Made","Pts+Reb+Ast". line is the number. side is "More"/"Less"/"Over"/"Under" if the user picked one, else "". ` +
      `If it's a team game-winner / moneyline board (no player props), return {"props":[]}. JSON only, no prose.`,
  });
  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content: blocks }],
  });
  const text = (res.content ?? []).filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return Array.isArray(parsed.props) ? parsed.props.filter((p: ExtractedProp) => p.player && p.stat) : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response("ANTHROPIC_API_KEY not set", { status: 500 });

  const { messages } = (await req.json()) as { messages: InMsg[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const slate = await buildSlateContext();

  // If the latest message has image(s), pull player-prop data for the board.
  const last = messages[messages.length - 1];
  let propData = "";
  if (last?.role === "user" && last.images?.length) {
    try {
      const props = await extractProps(client, last.images);
      if (props.length) propData = await buildPropData(props);
    } catch {
      /* non-fatal: fall back to image-only grading */
    }
  }

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

  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: CHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: slate },
  ];
  if (propData) systemBlocks.push({ type: "text", text: propData });

  let stream;
  try {
    stream = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system: systemBlocks,
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
