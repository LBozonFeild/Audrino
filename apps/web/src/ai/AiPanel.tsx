import { useEffect, useMemo, useRef, useState } from "react";
import { useSimStore } from "../sim/SimProvider";
import { useEditorStore } from "../state/store";
import {
  aiChat,
  aiDoctor,
  buildRepairMessages,
  netlistSummary,
  parseFix,
  type RepairContext,
} from "./aiClient";
import { useAiStore, CLOUD_PROVIDERS, DEFAULT_MODELS } from "./aiStore";
import { unifiedDiff } from "./diff";
import { SpawnSection } from "./SpawnSection";
import type { AiProvider } from "../server/ai-proxy";

const PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: "ollama", label: "Ollama (local)" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openai-compatible", label: "OpenAI-compatible" },
];

const SLOW_MS = 2000;

function summarizeLive(): string {
  const { pins, leds } = useSimStore.getState();
  const pinBits = Object.entries(pins)
    .slice(0, 24)
    .map(([k, p]) => `${k}=${JSON.stringify(p)}`);
  const ledBits = leds.slice(0, 16).map((l) => JSON.stringify(l));
  return [...pinBits, ...ledBits].join("; ");
}

/** PLAN §9.4 assistant: local-first (Ollama) + BYOK cloud, sim-aware repair. */
export function AiPanel(props: { notify: (msg: string) => void }) {
  const a = useAiStore();
  const doc = useEditorStore((s) => s.doc);
  const simStatus = useSimStore((s) => s.status);
  const simError = useSimStore((s) => s.error);
  const simLines = useSimStore((s) => s.lines);

  const [reqError, setReqError] = useState<string | null>(null);
  const [doctorBusy, setDoctorBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const isCloud = CLOUD_PROVIDERS.includes(a.provider);
  const fileName = doc.code.main;
  const currentSketch = doc.code.files[fileName] ?? "";
  const diff = useMemo(
    () => (a.proposed !== null ? unifiedDiff(currentSketch, a.proposed) : []),
    [currentSketch, a.proposed],
  );

  // Keep the attached error in sync with the simulator (repair consumes it).
  useEffect(() => {
    if (simStatus === "error" && simError) {
      if (a.lastError !== simError) a.captureError(simError, "runtime");
    } else if (simStatus !== "error" && a.lastError && a.errorKind === "runtime") {
      a.captureError(null, "runtime");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simStatus, simError]);

  // Elapsed-time ticker while a request is in flight.
  useEffect(() => {
    if (!a.busy) return;
    timer.current = window.setInterval(() => useAiStore.getState().tick(250), 250);
    return () => window.clearInterval(timer.current);
  }, [a.busy]);

  const runDoctor = async () => {
    setDoctorBusy(true);
    a.setDoctor(null);
    try {
      const d = await aiDoctor({
        provider: a.provider,
        baseUrl: a.baseUrl || undefined,
        ollamaUrl: a.ollamaUrl || undefined,
        ollamaViaServer: a.ollamaViaServer,
        apiKey: a.keys[a.provider] || undefined,
      });
      a.setDoctor(d);
      if (d.ok) {
        const first = d.models.find((m) => m.includes(a.models[a.provider])) ?? d.models[0];
        if (first && !a.models[a.provider]) a.setModel(a.provider, first);
      }
    } catch (e) {
      a.setDoctor({ ok: false, provider: a.provider, models: [], latencyMs: 0, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setDoctorBusy(false);
    }
  };

  const runFix = async () => {
    setReqError(null);
    const st = useAiStore.getState();
    const project = useEditorStore.getState().doc;
    const name = project.code.main;
    const sketch = project.code.files[name] ?? "";
    const sim = useSimStore.getState();
    const ctx: RepairContext = {
      boardName: project.boards.find((b) => b.id === project.meta.boardId)?.type ?? project.boards[0]?.type ?? "no board",
      fqbn: project.build.fqbn,
      fileName: name,
      sketch,
      problem: st.symptom,
      errorKind: st.lastError ? st.errorKind : st.symptom.trim() ? "behavior" : null,
      errorMessage: st.lastError ?? "",
      serialTail: st.attachSnapshot ? sim.lines.slice(-12).map((l) => `[${l.ms.toFixed(1)} ms] ${l.line}`) : [],
      simSummary: st.attachSnapshot ? summarizeLive() : "",
      netlistSummary: netlistSummary(project),
    };
    if (!ctx.errorMessage && !ctx.problem.trim()) {
      setReqError("Describe the problem (or run the sim and attach its error) before asking for a fix.");
      return;
    }
    st.beginRequest();
    try {
      const { text, ms } = await aiChat({
        provider: st.provider,
        model: st.models[st.provider] || DEFAULT_MODELS[st.provider],
        messages: buildRepairMessages(ctx),
        baseUrl: st.baseUrl || undefined,
        ollamaUrl: st.ollamaUrl || undefined,
        ollamaViaServer: st.ollamaViaServer,
        apiKey: st.keys[st.provider] || undefined,
      });
      const parsed = parseFix(text);
      if (!parsed.ok) throw new Error(parsed.error);
      useAiStore.getState().propose(parsed.fix);
      props.notify(`Fix ready in ${(ms / 1000).toFixed(1)}s — review the diff`);
    } catch (e) {
      setReqError(e instanceof Error ? e.message : String(e));
    } finally {
      useAiStore.getState().finishRequest();
    }
  };

  const applyFix = () => {
    const proposed = useAiStore.getState().proposed;
    if (proposed === null) return;
    const feedback = useEditorStore.getState().setCode(fileName, proposed);
    if (feedback !== null) {
      setReqError(feedback);
      return;
    }
    useAiStore.getState().markApplied();
    props.notify("Fix applied — Ctrl+Z reverts the edit");
    if (useAiStore.getState().autoRun) {
      useSimStore.getState().start(useEditorStore.getState().doc);
      props.notify("Fix applied — re-running the simulation…");
    }
  };

  return (
    <div className="tab-body">
      <style>{`
        .ai-diff { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px;
          background: rgba(0,0,0,.25); border-radius: 6px; padding: 6px 8px; max-height: 260px;
          overflow: auto; white-space: pre-wrap; word-break: break-word; }
        .ai-diff .dl-add { color: #3fb950; }
        .ai-diff .dl-del { color: #f85149; }
        .ai-diff .dl-same { opacity: .75; }
        .ai-card { border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 10px;
          display: flex; flex-direction: column; gap: 8px; }
        .ai-help { font-size: 11px; opacity: .65; line-height: 1.5; }
        .ai-sec { display: flex; flex-direction: column; gap: 6px; padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,.08); }
      `}</style>

      <SpawnSection notify={props.notify} />

      <div className="ai-sec">
        <h3 style={{ margin: 0 }}>Model</h3>
        <div className="row">
          <select
            value={a.provider}
            onChange={(e) => a.setProvider(e.target.value as AiProvider)}
            style={{ flex: 1 }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            style={{ flex: 1 }}
            list="ai-model-list"
            placeholder="model"
            value={a.models[a.provider]}
            onChange={(e) => a.setModel(a.provider, e.target.value)}
          />
          <datalist id="ai-model-list">
            {(a.doctor?.models ?? []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        {a.provider === "ollama" && (
          <div className="row">
            <input
              style={{ flex: 1 }}
              placeholder="Ollama URL (http://127.0.0.1:11434)"
              value={a.ollamaUrl}
              onChange={(e) => a.setOllamaUrl(e.target.value)}
            />
            <label title="Route through the app server when Ollama runs next to it">
              <input
                type="checkbox"
                checked={a.ollamaViaServer}
                onChange={(e) => a.setOllamaViaServer(e.target.checked)}
              />{" "}
              via app server
            </label>
          </div>
        )}
        {a.provider === "openai-compatible" && (
          <input
            placeholder="Base URL (e.g. https://api.groq.com/openai/v1)"
            value={a.baseUrl}
            onChange={(e) => a.setBaseUrl(e.target.value)}
          />
        )}
        {isCloud && (
          <input
            type="password"
            placeholder={`${a.provider} API key — stored only in this browser`}
            value={a.keys[a.provider] ?? ""}
            onChange={(e) => a.setKey(a.provider, e.target.value)}
            autoComplete="off"
          />
        )}
        <div className="row">
          <button onClick={runDoctor} disabled={doctorBusy}>
            {doctorBusy ? "Testing…" : "Test connection"}
          </button>
          {isCloud && (a.keys[a.provider] ?? "") !== "" && (
            <button
              onClick={() => {
                a.forgetKeys();
                props.notify("Stored API keys cleared");
              }}
            >
              Forget keys
            </button>
          )}
          {a.attempt > 0 && <span className="badge">fix #{a.attempt}</span>}
        </div>
        {a.doctor && (
          <div className={a.doctor.ok ? "dim" : "badge warn"} style={{ whiteSpace: "pre-wrap" }}>
            {a.doctor.ok
              ? `✓ ${a.doctor.models.length} model(s) · ${a.doctor.latencyMs} ms${a.doctor.latencyMs > SLOW_MS ? " · ⚠ slow — this device/model will feel sluggish; try a smaller model (qwen2.5-coder:3b)" : ""}`
              : `✗ ${a.doctor.error ?? "connection failed"}${a.doctor.hint ? `\n${a.doctor.hint}` : ""}`}
          </div>
        )}
      </div>

      <div className="ai-sec">
        <h3 style={{ margin: 0 }}>Repair</h3>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {a.lastError && <span className="badge warn">sim error attached</span>}
          {a.attempt > 0 && <span className="badge">attempt {a.attempt}</span>}
          <label>
            <input type="checkbox" checked={a.attachSnapshot} onChange={(e) => a.setAttachSnapshot(e.target.checked)} />{" "}
            attach serial + pin state
          </label>
          <label>
            <input type="checkbox" checked={a.autoRun} onChange={(e) => a.setAutoRun(e.target.checked)} />{" "}
            re-run after apply
          </label>
        </div>
        <textarea
          rows={3}
          placeholder="What goes wrong? e.g. “LED on D13 never blinks” — the sim error is attached automatically"
          value={a.symptom}
          onChange={(e) => a.setSymptom(e.target.value)}
        />
        <div className="row">
          <button className="primary" onClick={runFix} disabled={a.busy}>
            {a.busy ? `Asking ${a.models[a.provider] || a.provider}… ${(a.elapsedMs / 1000).toFixed(1)}s` : "✨ Fix with AI"}
          </button>
          {simStatus === "done" && simLines.length === 0 && (
            <span className="dim">hint: last run printed no serial</span>
          )}
        </div>
        {reqError && <div className="badge warn" style={{ whiteSpace: "pre-wrap" }}>{reqError}</div>}

        {a.proposed !== null && (
          <div className="ai-card">
            {a.diagnosis && <div>{a.diagnosis}</div>}
            {a.notes.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {a.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
            <div className="ai-diff">
              {diff.map((d, i) => (
                <div key={i} className={d.type === "add" ? "dl-add" : d.type === "del" ? "dl-del" : "dl-same"}>
                  {d.type === "add" ? "+" : d.type === "del" ? "-" : " "}
                  {d.text}
                </div>
              ))}
            </div>
            <div className="row">
              <button className="primary" onClick={applyFix}>
                Apply fix
              </button>
              <button
                onClick={() => {
                  useAiStore.getState().reject();
                  props.notify("Fix rejected");
                }}
              >
                Reject
              </button>
              <span className="dim">{fileName}</span>
            </div>
          </div>
        )}
      </div>

      <div className="ai-help">
        Keys stay in this browser and are sent only to this app's <span className="mono">/api/ai</span> proxy, which
        forwards them to the provider — never to us. Ollama is local-first: install from ollama.com,{" "}
        <span className="mono">ollama pull {a.provider === "ollama" ? a.models.ollama || DEFAULT_MODELS.ollama : "qwen2.5-coder:7b"}</span>
        , and allow this site with <span className="mono">OLLAMA_ORIGINS=*</span> if the browser blocks localhost.
      </div>
    </div>
  );
}
