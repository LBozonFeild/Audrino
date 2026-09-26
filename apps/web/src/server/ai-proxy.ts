/**
 * AI request proxy — runs in the vite dev backend (PLAN §9: provider traffic
 * with credentials leaves from here, never from the browser). A user-supplied
 * BYOK key may arrive in the request body: it is used for the outbound call
 * only — never logged, echoed, or persisted. Ollama needs no key.
 */
export type AiProvider = "ollama" | "openai" | "anthropic" | "openai-compatible";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatBody {
  provider: AiProvider;
  model: string;
  messages: AiMessage[];
  baseUrl?: string;
  ollamaUrl?: string;
  apiKey?: string;
}

export interface AiDoctorBody {
  provider: AiProvider;
  baseUrl?: string;
  ollamaUrl?: string;
  apiKey?: string;
}

export interface AiJsonReply {
  status: number;
  json: Record<string, unknown>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const CHAT_TIMEOUT_MS = 180_000; // local models on weak hardware can be slow
const DOCTOR_TIMEOUT_MS = 15_000;
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

const PROVIDERS: readonly AiProvider[] = ["ollama", "openai", "anthropic", "openai-compatible"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(status: number, error: string): AiJsonReply {
  return { status, json: { error } };
}

/** Trim noisy provider bodies before they reach the user. */
function snippet(text: string, max = 600): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function trimmed(url: string | undefined, fallback: string): string {
  const u = (url ?? "").trim().replace(/\/+$/, "");
  return u || fallback;
}

function endpointFor(body: { provider: AiProvider; baseUrl?: string; ollamaUrl?: string }): { url: string } | { error: string } {
  switch (body.provider) {
    case "ollama":
      return { url: trimmed(body.ollamaUrl, DEFAULT_OLLAMA_URL) };
    case "openai":
      return { url: trimmed(body.baseUrl, "https://api.openai.com/v1") };
    case "anthropic":
      return { url: trimmed(body.baseUrl, "https://api.anthropic.com") };
    case "openai-compatible": {
      const url = trimmed(body.baseUrl, "");
      if (!url) return { error: "openai-compatible needs a baseUrl (e.g. https://api.groq.com/openai/v1)" };
      return { url };
    }
  }
}

async function call(fetchImpl: FetchLike, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function chatWithOllama(url: string, body: AiChatBody, fetchImpl: FetchLike): Promise<AiJsonReply> {
  const r = await call(
    fetchImpl,
    `${url}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: body.model, messages: body.messages, stream: false }),
    },
    CHAT_TIMEOUT_MS,
  );
  const j = (await r.json().catch(() => null)) as { message?: { content?: unknown }; error?: unknown } | null;
  if (!r.ok) return fail(r.status, `ollama error ${r.status}: ${snippet(JSON.stringify(j ?? ""))}`);
  const text = j?.message?.content;
  if (typeof text !== "string") return fail(502, "ollama reply missing message.content");
  return { status: 200, json: { text, provider: "ollama", model: body.model } };
}

async function chatWithAnthropic(url: string, body: AiChatBody, fetchImpl: FetchLike): Promise<AiJsonReply> {
  if (!body.apiKey) return fail(401, "anthropic needs an API key");
  const system = body.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = body.messages.filter((m) => m.role !== "system");
  const payload: Record<string, unknown> = {
    model: body.model,
    max_tokens: 8192,
    messages: rest,
  };
  if (system) payload.system = system;
  const r = await call(
    fetchImpl,
    `${url}/v1/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": body.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    },
    CHAT_TIMEOUT_MS,
  );
  const j = (await r.json().catch(() => null)) as { content?: { text?: unknown }[]; error?: { message?: unknown } } | null;
  if (!r.ok) return fail(r.status, `anthropic error ${r.status}: ${snippet(String(j?.error?.message ?? JSON.stringify(j ?? "")))}`);
  const text = (j?.content ?? []).map((b) => (typeof b?.text === "string" ? b.text : "")).join("");
  if (!text) return fail(502, "anthropic reply missing content text");
  return { status: 200, json: { text, provider: "anthropic", model: body.model } };
}

async function chatWithOpenAi(url: string, body: AiChatBody, fetchImpl: FetchLike): Promise<AiJsonReply> {
  if (!body.apiKey) return fail(401, `${body.provider} needs an API key`);
  const r = await call(
    fetchImpl,
    `${url}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${body.apiKey}`,
      },
      body: JSON.stringify({ model: body.model, messages: body.messages, temperature: 0.2 }),
    },
    CHAT_TIMEOUT_MS,
  );
  const j = (await r.json().catch(() => null)) as { choices?: { message?: { content?: unknown } }[]; error?: { message?: unknown } } | null;
  if (!r.ok) return fail(r.status, `${body.provider} error ${r.status}: ${snippet(String(j?.error?.message ?? JSON.stringify(j ?? "")))}`);
  const text = j?.choices?.[0]?.message?.content;
  if (typeof text !== "string") return fail(502, `${body.provider} reply missing choices[0].message.content`);
  return { status: 200, json: { text, provider: body.provider, model: body.model } };
}

export async function handleAiChat(rawBody: unknown, fetchImpl: FetchLike = fetch): Promise<AiJsonReply> {
  if (!isRecord(rawBody)) return fail(400, "body must be a JSON object");
  const body = rawBody as unknown as AiChatBody;
  if (!PROVIDERS.includes(body.provider)) return fail(400, `unknown provider: ${String(body.provider)}`);
  const model = String(body.model ?? "").trim();
  if (!model) return fail(400, "model is required");
  if (!Array.isArray(body.messages) || body.messages.length === 0) return fail(400, "messages are required");

  const endpoint = endpointFor(body);
  if ("error" in endpoint) return fail(400, endpoint.error);

  if (body.provider === "ollama") return chatWithOllama(endpoint.url, body, fetchImpl);
  if (body.provider === "anthropic") return chatWithAnthropic(endpoint.url, body, fetchImpl);
  return chatWithOpenAi(endpoint.url, body, fetchImpl);
}

export async function handleAiDoctor(rawBody: unknown, fetchImpl: FetchLike = fetch): Promise<AiJsonReply> {
  if (!isRecord(rawBody)) return fail(400, "body must be a JSON object");
  const body = rawBody as unknown as AiDoctorBody;
  if (!PROVIDERS.includes(body.provider)) return fail(400, `unknown provider: ${String(body.provider)}`);
  const endpoint = endpointFor(body);
  if ("error" in endpoint) return fail(400, endpoint.error);

  const started = Date.now();
  const done = (json: Record<string, unknown>): AiJsonReply => ({
    status: 200,
    json: { provider: body.provider, latencyMs: Date.now() - started, ...json },
  });

  try {
    if (body.provider === "ollama") {
      const r = await call(fetchImpl, `${endpoint.url}/api/tags`, { method: "GET" }, DOCTOR_TIMEOUT_MS);
      const j = (await r.json().catch(() => null)) as { models?: { name?: unknown; model?: unknown }[] } | null;
      if (!r.ok) return done({ ok: false, error: `ollama /api/tags returned ${r.status}` });
      const models = (j?.models ?? []).map((m) => String(m.name ?? m.model ?? "")).filter(Boolean);
      return done({ ok: true, models: models.slice(0, 50) });
    }
    if (!body.apiKey) return done({ ok: false, error: "add an API key first — nothing to test yet" });

    if (body.provider === "anthropic") {
      const r = await call(
        fetchImpl,
        `${endpoint.url}/v1/models`,
        { method: "GET", headers: { "x-api-key": body.apiKey, "anthropic-version": "2023-06-01" } },
        DOCTOR_TIMEOUT_MS,
      );
      const j = (await r.json().catch(() => null)) as { data?: { id?: unknown }[] } | null;
      if (!r.ok) return done({ ok: false, error: `anthropic /v1/models returned ${r.status}` });
      return done({ ok: true, models: (j?.data ?? []).map((m) => String(m.id ?? "")).filter(Boolean).slice(0, 50) });
    }

    const r = await call(
      fetchImpl,
      `${endpoint.url}/models`,
      { method: "GET", headers: { authorization: `Bearer ${body.apiKey}` } },
      DOCTOR_TIMEOUT_MS,
    );
    const j = (await r.json().catch(() => null)) as { data?: { id?: unknown }[] } | null;
    if (!r.ok) return done({ ok: false, error: `${body.provider} /models returned ${r.status}` });
    return done({ ok: true, models: (j?.data ?? []).map((m) => String(m.id ?? "")).filter(Boolean).slice(0, 50) });
  } catch (e) {
    return done({ ok: false, error: `unreachable: ${e instanceof Error ? e.message : String(e)}` });
  }
}

/** Route dispatcher for the vite middleware (`/api/ai/chat` | `/api/ai/doctor`). */
export async function handleAiRequest(route: "chat" | "doctor", rawBody: unknown, fetchImpl: FetchLike = fetch): Promise<AiJsonReply> {
  return route === "chat" ? handleAiChat(rawBody, fetchImpl) : handleAiDoctor(rawBody, fetchImpl);
}
