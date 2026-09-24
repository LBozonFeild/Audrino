/**
 * Client half of the AI round: repair prompts built from live sim context,
 * robust fix-reply parsing, and transport that keeps cloud BYOK keys on the
 * app-server path (`/api/ai/*`) while Ollama stays local-first (browser-direct
 * by default, or proxied when it runs next to the app server).
 */
import type { Project } from "@audrino/schema";
import type { AiMessage, AiProvider } from "../server/ai-proxy";

export interface FixProposal {
  diagnosis: string;
  sketch: string;
  notes: string[];
}

export type ParseFixResult = { ok: true; fix: FixProposal } | { ok: false; error: string };

export interface RepairContext {
  boardName: string;
  fqbn: string;
  fileName: string;
  sketch: string;
  problem: string;
  errorKind: "compile" | "runtime" | "behavior" | null;
  errorMessage: string;
  serialTail: string[];
  simSummary: string;
  netlistSummary: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function looksLikeSketch(s: string): boolean {
  return /void\s+setup\s*\(/.test(s) && /void\s+loop\s*\(/.test(s);
}

function finish(diagnosis: unknown, sketch: string, notes: unknown): ParseFixResult {
  const s = sketch.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
  if (!s.trim()) return { ok: false, error: "model returned an empty sketch" };
  return {
    ok: true,
    fix: { diagnosis: String(diagnosis ?? "").trim(), sketch: s, notes: asStringArray(notes) },
  };
}

function fromObject(o: Record<string, unknown>): ParseFixResult | null {
  const sketch = o.sketch ?? o.code ?? o.fixedSketch ?? o.fixed_code ?? o.fixed_sketch;
  if (typeof sketch !== "string") return null;
  return finish(o.diagnosis ?? o.explanation ?? o.summary, sketch, o.notes ?? o.steps ?? o.comments);
}

/**
 * Accepts (in order): a bare JSON object, a fenced ```json block, any fenced
 * code block that is/contains a sketch, a bare sketch, or a prose+brace blob.
 */
export function parseFix(text: string): ParseFixResult {
  const t = text.trim();
  if (!t) return { ok: false, error: "model returned an empty reply" };

  try {
    const o = JSON.parse(t);
    if (isRecord(o)) {
      const r = fromObject(o);
      if (r) return r;
    }
  } catch {
    /* not bare JSON */
  }

  const fences = [...t.matchAll(/```([a-zA-Z+#]*)[ \t]*\n([\s\S]*?)```/g)];
  let fallbackSketch: string | null = null;
  for (const f of fences) {
    const lang = f[1].toLowerCase();
    const body = f[2];
    if (lang === "json") {
      try {
        const o = JSON.parse(body.trim());
        if (isRecord(o)) {
          const r = fromObject(o);
          if (r) return r;
        }
      } catch {
        /* not JSON after all */
      }
      continue;
    }
    if (looksLikeSketch(body)) fallbackSketch = body;
    else if (fallbackSketch === null && lang && ["ino", "arduino", "cpp", "c", "c++"].includes(lang)) fallbackSketch = body;
  }
  if (fallbackSketch !== null) return finish(t.split("\n")[0], fallbackSketch, []);

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(t.slice(start, end + 1));
      if (isRecord(o)) {
        const r = fromObject(o);
        if (r) return r;
      }
    } catch {
      /* brace blob is not JSON */
    }
  }

  if (looksLikeSketch(t)) return finish("", t, []);
  return { ok: false, error: "could not find a fixed sketch in the model reply" };
}

const SYSTEM_PROMPT = `You repair Arduino sketches inside a circuit simulator. Reply with ONLY one JSON object and no markdown fences:
{"diagnosis": "one short paragraph with the root cause",
 "sketch": "the COMPLETE fixed sketch text",
 "notes": ["optional short follow-up tips"]}
The sketch must compile for the stated board, define setup() and loop(), and be complete — never an excerpt.`;

export function buildRepairMessages(ctx: RepairContext): AiMessage[] {
  const parts: string[] = [];
  parts.push(`Board: ${ctx.boardName} (fqbn ${ctx.fqbn})`);
  if (ctx.netlistSummary) parts.push(`Circuit:\n${ctx.netlistSummary}`);
  parts.push(`Current file ${ctx.fileName}:\n\`\`\`cpp\n${ctx.sketch}\n\`\`\``);

  const problem: string[] = [];
  if (ctx.errorMessage.trim()) problem.push(`${ctx.errorKind ?? "sim"} error:\n${ctx.errorMessage.trim()}`);
  if (ctx.problem.trim()) problem.push(`Reported behavior: ${ctx.problem.trim()}`);
  if (ctx.serialTail.length > 0) problem.push(`Serial output (tail):\n${ctx.serialTail.join("\n")}`);
  if (ctx.simSummary.trim()) problem.push(`Live pin/LED state:\n${ctx.simSummary.trim()}`);
  parts.push(`Problem:\n${problem.join("\n\n") || "(inspect the sketch for latent bugs)"}`);

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: parts.join("\n\n") },
  ];
}

/** Compact board/parts/nets line list so the model knows the wiring. */
export function netlistSummary(doc: Project): string {
  const lines: string[] = [];
  for (const b of doc.boards) lines.push(`board ${b.id} (${b.type})`);
  for (const c of doc.components) lines.push(`part ${c.id} (${c.type})`);
  for (const n of doc.nets) lines.push(`net ${n.id}: ${n.pins.join(", ")}`);
  return lines.slice(0, 80).join("\n");
}

export interface ChatRequest {
  provider: AiProvider;
  model: string;
  messages: AiMessage[];
  baseUrl?: string;
  ollamaUrl?: string;
  ollamaViaServer?: boolean;
  apiKey?: string;
}

const OLLAMA_HELP =
  "Ollama quick check: is `ollama serve` running? From a web app the browser must be allowed in OLLAMA_ORIGINS (e.g. `OLLAMA_ORIGINS=* ollama serve`). If Ollama runs next to the app server instead, enable “via app server”.";

export async function aiChat(req: ChatRequest): Promise<{ text: string; ms: number }> {
  const started = Date.now();
  if (req.provider === "ollama" && !req.ollamaViaServer) {
    const base = (req.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    try {
      const r = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: req.model, messages: req.messages, stream: false }),
      });
      const j = (await r.json().catch(() => null)) as { message?: { content?: unknown }; error?: unknown } | null;
      if (!r.ok) throw new Error(`ollama error ${r.status}: ${typeof j?.error === "string" ? j.error : ""}`);
      const text = j?.message?.content;
      if (typeof text !== "string") throw new Error("ollama reply missing message.content");
      return { text, ms: Date.now() - started };
    } catch (e) {
      throw new Error(`${e instanceof Error ? e.message : String(e)}\n\n${OLLAMA_HELP}`);
    }
  }
  const r = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: req.provider,
      model: req.model,
      messages: req.messages,
      baseUrl: req.baseUrl,
      ollamaUrl: req.ollamaUrl,
      apiKey: req.provider === "ollama" ? undefined : req.apiKey,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { text?: unknown; error?: unknown };
  if (!r.ok) throw new Error(String(j?.error ?? `AI server error ${r.status}`));
  return { text: String(j.text ?? ""), ms: Date.now() - started };
}

export interface DoctorResult {
  ok: boolean;
  provider: AiProvider;
  models: string[];
  latencyMs: number;
  error?: string;
  hint?: string;
}

export interface DoctorRequest {
  provider: AiProvider;
  baseUrl?: string;
  ollamaUrl?: string;
  ollamaViaServer?: boolean;
  apiKey?: string;
}

export async function aiDoctor(req: DoctorRequest): Promise<DoctorResult> {
  const started = Date.now();
  if (req.provider === "ollama" && !req.ollamaViaServer) {
    const base = (req.ollamaUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
    try {
      const r = await fetch(`${base}/api/tags`, { method: "GET" });
      const j = (await r.json().catch(() => null)) as { models?: { name?: unknown; model?: unknown }[] } | null;
      if (!r.ok) return { ok: false, provider: "ollama", models: [], latencyMs: Date.now() - started, error: `ollama /api/tags returned ${r.status}` };
      const models = (j?.models ?? []).map((m) => String(m.name ?? m.model ?? "")).filter(Boolean);
      return { ok: true, provider: "ollama", models: models.slice(0, 50), latencyMs: Date.now() - started };
    } catch (e) {
      return {
        ok: false,
        provider: "ollama",
        models: [],
        latencyMs: Date.now() - started,
        error: `unreachable: ${e instanceof Error ? e.message : String(e)}`,
        hint: OLLAMA_HELP,
      };
    }
  }
  const r = await fetch("/api/ai/doctor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: req.provider,
      baseUrl: req.baseUrl,
      ollamaUrl: req.ollamaUrl,
      apiKey: req.provider === "ollama" ? undefined : req.apiKey,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as Partial<DoctorResult> & { error?: unknown };
  return {
    ok: Boolean(j.ok),
    provider: req.provider,
    models: Array.isArray(j.models) ? j.models.map(String) : [],
    latencyMs: typeof j.latencyMs === "number" ? j.latencyMs : Date.now() - started,
    error: typeof j.error === "string" ? j.error : j.ok ? undefined : `AI server error ${r.status}`,
  };
}
