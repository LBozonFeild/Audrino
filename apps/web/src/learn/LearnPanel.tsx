import { useEffect, useState } from "react";
import type { Lesson } from "./lessons";
import { LESSONS, evaluateCheckpoint } from "./lessons";
import { loadFixture } from "../dsl/load";
import { useEditorStore } from "../state/store";
import { useViewStore } from "../canvas/viewStore";
import { docBBox } from "../state/ops";
import { useSimStore } from "../sim/SimProvider";
import { useTraceStore } from "../sim/traceStore";

const PROGRESS_KEY = "audrino-learn-v1";

function loadProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

/** Guided lessons — every step auto-checks against the live sim + traces. */
export function LearnPanel(props: { notify: (msg: string) => void }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>(loadProgress);
  const [hintFor, setHintFor] = useState<number | null>(null);

  const simStatus = useSimStore((s) => s.status);
  const lines = useSimStore((s) => s.lines);
  const pins = useSimStore((s) => s.pins);
  const leds = useSimStore((s) => s.leds);
  const channels = useTraceStore((s) => s.channels);
  const samples = useTraceStore((s) => s.samples);

  const env = {
    simStatus,
    serialLines: lines.map((l) => l.line),
    channels: channels.map((c) => c.pin),
    samples,
    livePins: pins as Record<string, string>,
    leds: leds.map((l) => ({ ref: l.ref, lit: l.lit })),
  };

  const active: Lesson | undefined = LESSONS.find((l) => l.id === activeId);

  const start = (lesson: Lesson) => {
    const project = loadFixture(lesson.fixture);
    const feedback = useEditorStore.getState().loadProject(project);
    if (feedback !== null) {
      props.notify(`Could not load lesson project: ${feedback}`);
      return;
    }
    useViewStore.getState().fitContent(docBBox(useEditorStore.getState().doc));
    if (lesson.sketch) {
      const name = useEditorStore.getState().doc.code.main;
      const err = useEditorStore.getState().setCode(name, lesson.sketch);
      if (err !== null) props.notify(err);
    }
    useSimStore.getState().reset();
    useTraceStore.getState().clearSamples();
    setActiveId(lesson.id);
    setHintFor(null);
    props.notify(`Lesson started: ${lesson.title}`);
  };

  const done = active ? active.steps.map((s) => evaluateCheckpoint(s.check, env)) : [];
  const complete = active ? done.length > 0 && done.every(Boolean) : false;
  if (active && complete && progress[active.id] !== true) {
    const next = { ...progress, [active.id]: true };
    setProgress(next);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      /* best-effort */
    }
    props.notify(`Lesson complete: ${active.title} 🎉`);
  }

  return (
    <div className="tab-body">
      {!active && (
        <>
          <div className="dim">Guided lessons run on the real simulator — every step checks what the circuit actually does.</div>
          {LESSONS.map((l) => (
            <div key={l.id} className="card">
              <h4>
                {l.title} {progress[l.id] && <span className="badge">done ✓</span>}
              </h4>
              <div className="dim">{l.blurb}</div>
              <button className="primary" onClick={() => start(l)}>
                Start lesson
              </button>
            </div>
          ))}
        </>
      )}
      {active && (
        <>
          <div className="row">
            <button onClick={() => setActiveId(null)} title="Back to the lesson list">
              ← Lessons
            </button>
            <h3 style={{ margin: 0 }}>{active.title}</h3>
            {complete && <span className="badge">complete ✓</span>}
          </div>
          <div className="dim">{active.blurb}</div>
          {active.steps.map((s, i) => (
            <div
              key={i}
              className="card"
              style={{ borderColor: done[i] ? "rgba(80,200,120,.5)" : i === done.indexOf(false) ? "var(--accent, #4fc3f7)" : undefined }}
            >
              <div className="row" style={{ alignItems: "flex-start" }}>
                <span className="badge">{done[i] ? "✓" : i + 1}</span>
                <div style={{ flex: 1 }}>{s.text}</div>
                <button onClick={() => setHintFor(hintFor === i ? null : i)} title="Hint">
                  ?
                </button>
              </div>
              {hintFor === i && <div className="dim">{s.hint}</div>}
            </div>
          ))}
          <div className="dim">Stuck? Edit the sketch, re-run, or head back and pick another lesson.</div>
        </>
      )}
    </div>
  );
}
