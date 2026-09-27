/**
 * AI circuit generation section (PLAN §9.4 build card). The model designs a
 * semantic circuit; dsl/spawn turns it into a valid Project with auto-layout.
 * One automatic self-repair retry feeds builder errors back to the model.
 */
import { useState } from "react";
import type { Project } from "@audrino/schema";
import { useEditorStore } from "../state/store";
import { useViewStore } from "../canvas/viewStore";
import { docBBox } from "../state/ops";
import { aiChat } from "./aiClient";
import { DEFAULT_MODELS, useAiStore } from "./aiStore";
import { buildSpawnMessages, buildSpawnProject, parseSpawn, type SpawnSpec } from "../dsl/spawn";

const EXAMPLES = [
  "blink an LED on D13",
  "traffic light on D10, D9, D8",
  "a potentiometer on A0 controls servo speed",
  "light alarm: LDR on A0 sounds a buzzer on D8",
];

interface BuildCard {
  spec: SpawnSpec;
  doc: Project;
  warnings: string[];
}

export function SpawnSection(props: { notify: (msg: string) => void }) {
  const a = useAiStore();
  const [prompt, setPrompt] = useState("");
  const [card, setCard] = useState<BuildCard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const runGenerate = async () => {
    const st = useAiStore.getState();
    const promptText = prompt.trim();
    if (!promptText) {
      setErr("Describe the circuit you want — e.g. “blink an LED on D13”.");
      return;
    }
    setErr(null);
    setCard(null);
    st.beginRequest();
    const errors: string[] = [];
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const { text, ms } = await aiChat({
          provider: st.provider,
          model: st.models[st.provider] || DEFAULT_MODELS[st.provider],
          messages: buildSpawnMessages(promptText, errors),
          baseUrl: st.baseUrl || undefined,
          ollamaUrl: st.ollamaUrl || undefined,
          ollamaViaServer: st.ollamaViaServer,
          apiKey: st.keys[st.provider] || undefined,
        });
        const parsed = parseSpawn(text);
        if (!parsed.ok) {
          errors.push(parsed.error);
          continue;
        }
        const built = buildSpawnProject(parsed.spec);
        if (!built.doc) {
          errors.push(built.error ?? "circuit spec rejected");
          continue;
        }
        setCard({ spec: parsed.spec, doc: built.doc, warnings: built.warnings });
        props.notify(`Circuit designed in ${(ms / 1000).toFixed(1)}s — review the build card`);
        return;
      }
      setErr(errors[errors.length - 1] ?? "generation failed — try rephrasing the request");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      useAiStore.getState().finishRequest();
    }
  };

  const open = () => {
    if (!card) return;
    const feedback = useEditorStore.getState().loadProject(structuredClone(card.doc));
    if (feedback !== null) {
      setErr(feedback);
      return;
    }
    // Frame the freshly spawned build so it lands in view, not off-screen.
    useViewStore.getState().fitContent(docBBox(useEditorStore.getState().doc));
    props.notify(`"${card.doc.meta.name}" spawned — one undo (Ctrl+Z) reverts it all`);
    setCard(null);
  };

  return (
    <div className="ai-sec" style={{ borderTop: "none", paddingTop: 0 }}>
      <div className="dim">Describe a circuit — the model designs parts, wiring, and firmware.</div>
      <div className="row">
        <input
          style={{ flex: 1 }}
          value={prompt}
          placeholder="e.g. a light alarm with an LDR and buzzer"
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runGenerate();
          }}
        />
        <button className="primary" onClick={() => void runGenerate()} disabled={a.busy}>
          {a.busy ? `Designing… ${(a.elapsedMs / 1000).toFixed(1)}s` : "✨ Generate"}
        </button>
      </div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {EXAMPLES.map((x) => (
          <button key={x} title="Use this example" onClick={() => setPrompt(x)}>
            {x}
          </button>
        ))}
      </div>
      {err && (
        <div className="badge warn" style={{ whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      {card && (
        <div className="card">
          <h4>{card.spec.name ?? card.doc.meta.name}</h4>
          <div className="row">
            <span className="badge">{card.doc.boards[0]?.type ?? "board"}</span>
            <span className="badge">{card.doc.components.length} part(s)</span>
            <span className="badge">{card.doc.nets.length} net(s)</span>
          </div>
          {(card.spec.bom?.length ?? 0) > 0 && (
            <div>
              <h3 style={{ margin: 0 }}>Parts</h3>
              <ul>
                {card.spec.bom?.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {(card.spec.wiringSteps?.length ?? 0) > 0 && (
            <div>
              <h3 style={{ margin: 0 }}>Wiring</h3>
              <ul>
                {card.spec.wiringSteps?.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {card.spec.explanation && <div className="why">{card.spec.explanation}</div>}
          {card.warnings.length > 0 && (
            <div className="badge warn">
              {card.warnings.length} warning(s): {card.warnings[0]}
            </div>
          )}
          <div className="row">
            <button className="primary" onClick={open}>
              Open in editor
            </button>
            <button
              onClick={() => {
                setCard(null);
                props.notify("Design discarded");
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
