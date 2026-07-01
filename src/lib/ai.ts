/**
 * Unified AI client — provider waterfall (first available wins):
 *
 *   1. LLaMA  — any OpenAI-compatible endpoint (Ollama, Groq, Together.ai, etc.)
 *      Env vars: LLAMA_BASE_URL, LLAMA_MODEL, LLAMA_API_KEY (optional)
 *      • Ollama local:  LLAMA_BASE_URL=http://localhost:11434/v1  (no key needed)
 *      • Groq cloud:    LLAMA_BASE_URL=https://api.groq.com/openai/v1  LLAMA_API_KEY=gsk_...
 *      • Together.ai:   LLAMA_BASE_URL=https://api.together.xyz/v1  LLAMA_API_KEY=...
 *
 *   2. Hugging Face Inference API (free tier)
 *      Env vars: HF_TOKEN, HF_MODEL (optional, default: mistralai/Mistral-7B-Instruct-v0.3)
 *
 *   3. OpenAI (gpt-4o-mini)
 *      Env vars: OPENAI_API_KEY
 */

type Message = { role: "system" | "user" | "assistant"; content: string };

const HF_MODEL = process.env.HF_MODEL ?? "mistralai/Mistral-7B-Instruct-v0.3";
const HF_ENDPOINT = `https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`;

const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL?.replace(/\/$/, "") ?? "";
const LLAMA_MODEL = process.env.LLAMA_MODEL ?? "llama3.2";
const LLAMA_API_KEY = process.env.LLAMA_API_KEY ?? "";

export async function chatCompletion(
  messages: Message[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 700, temperature = 0.6 } = options;

  // ── Priority 1: LLaMA (OpenAI-compatible endpoint) ──
  if (LLAMA_BASE_URL) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (LLAMA_API_KEY) headers["Authorization"] = `Bearer ${LLAMA_API_KEY}`;

    try {
      const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: LLAMA_MODEL,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`[ai] LLaMA request failed (${res.status}): ${errText.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn("[ai] LLaMA unreachable:", err instanceof Error ? err.message : err);
    }
  }

  const hfToken = process.env.HF_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;

  // ── Priority 2: Hugging Face Inference API (free) ──
  if (hfToken) {
    const res = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    }

    const errText = await res.text().catch(() => "");
    console.warn(`[ai] HF request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  // ── Priority 3: OpenAI ──
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }
  }

  return "";
}

/** Returns true if at least one AI provider is configured */
export function hasAI(): boolean {
  return !!(LLAMA_BASE_URL || process.env.HF_TOKEN || process.env.OPENAI_API_KEY);
}

// ── Streaming support ──────────────────────────────────────────────────────

/** Parse an OpenAI-compatible SSE stream and emit raw text chunks */
function sseToTextStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch { /* ignore parse errors */ }
          }
        }
        controller.close();
      } catch (err) { controller.error(err); }
    },
  });
}

/**
 * Like chatCompletion but returns a ReadableStream of raw text chunks.
 * LLaMA/OpenAI use real SSE streaming. HF uses non-stream then wraps.
 * Falls back to an empty stream if no provider is available.
 */
export async function chatCompletionStream(
  messages: Message[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<ReadableStream<Uint8Array>> {
  const { maxTokens = 700, temperature = 0.6 } = options;
  const encoder = new TextEncoder();

  function textStream(text: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        if (text) controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  // Priority 1: LLaMA — real streaming via Ollama/Groq/Together.ai
  if (LLAMA_BASE_URL) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (LLAMA_API_KEY) headers["Authorization"] = `Bearer ${LLAMA_API_KEY}`;
    try {
      const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: LLAMA_MODEL, messages, max_tokens: maxTokens, temperature, stream: true }),
      });
      if (res.ok && res.body) return sseToTextStream(res.body);
      const err = await res.text().catch(() => "");
      console.warn(`[ai] LLaMA stream failed (${res.status}): ${err.slice(0, 200)}`);
    } catch (err) {
      console.warn("[ai] LLaMA unreachable:", err instanceof Error ? err.message : err);
    }
  }

  // Priority 2: HF — no native SSE, fetch full then wrap in stream
  const hfToken = process.env.HF_TOKEN;
  if (hfToken) {
    const res = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${hfToken}` },
      body: JSON.stringify({ model: HF_MODEL, messages, max_tokens: maxTokens, temperature, stream: false }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return textStream(text);
    }
    const errText = await res.text().catch(() => "");
    console.warn(`[ai] HF request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  // Priority 3: OpenAI — real streaming
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: maxTokens, temperature, stream: true }),
    });
    if (res.ok && res.body) return sseToTextStream(res.body);
  }

  return textStream("");
}
