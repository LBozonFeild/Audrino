import { useEffect, useState } from "react";
import { AccountPopover } from "../account/AccountPopover";
import { useEditorStore } from "../state/store";
import { SharePopover } from "./SharePopover";
import { useSimStore } from "../sim/SimProvider";
import { ThemePicker } from "./ThemePicker";
import { useViewStore } from "../canvas/viewStore";
import { docBBox } from "../state/ops";
import { goHome } from "../nav";

export function Topbar(props: { notify: (msg: string) => void }) {
  const doc = useEditorStore((s) => s.doc);
  const status = useSimStore((s) => s.status);
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);
  const resetSim = useSimStore((s) => s.reset);
  // Autosave heartbeat: bump the key on every persisted snapshot so the chip
  // re-mounts and replays its pop animation.
  const [savedTick, setSavedTick] = useState(0);
  useEffect(() => {
    const onSaved = () => setSavedTick((t) => t + 1);
    window.addEventListener("audrino-saved", onSaved);
    return () => window.removeEventListener("audrino-saved", onSaved);
  }, []);

  const histLen = useEditorStore((s) => s.history.past.length);
  const futLen = useEditorStore((s) => s.history.future.length);
  const board = doc.boards.find((b) => b.id === doc.meta.boardId) ?? doc.boards[0];
  const running = status === "running" || status === "compiling";

  const run = () => {
    if (running) {
      stop();
      props.notify("Simulation stopped");
      return;
    }
    useSimStore.getState().reset();
    start(useEditorStore.getState().doc);
    props.notify("Compiling firmware + simulating…");
  };

  return (
    <header className="topbar">
      <button className="home-btn" title="Back to home — your projects" onClick={goHome}>
        ⌂ Home
      </button>
      <span className="brand">◎ Audrino</span>
      <span className="proj-name mono">{doc.meta.name}</span>
      <span className="badge">{board ? board.type : "no board"}</span>
      {savedTick > 0 && (
        <span className="save-chip" key={savedTick}>
          ✓ saved
        </span>
      )}
      {running && <span className="badge warn live">simulating…</span>}
      {status === "error" && <span className="badge warn">sim error</span>}
      {status === "done" && <span className="badge">sim done</span>}
      <span className="spacer" />
      <span className="btn-seg">
        <button
          title="Undo (Ctrl+Z)"
          disabled={histLen === 0}
          onClick={() => {
            useEditorStore.getState().undo();
            props.notify("Undone");
          }}
        >
          ↶
        </button>
        <button
          title="Redo (Ctrl+Y)"
          disabled={futLen === 0}
          onClick={() => {
            useEditorStore.getState().redo();
            props.notify("Redone");
          }}
        >
          ↷
        </button>
        <button
          title="Rotate selection (R)"
          onClick={() => {
            const s = useEditorStore.getState();
            const msg = s.rotate(s.selection);
            if (msg) props.notify(msg);
          }}
        >
          ↻
        </button>
        <button
          title="Fit view to circuit"
          onClick={() => useViewStore.getState().fitContent(docBBox(useEditorStore.getState().doc))}
        >
          ⊡ Fit
        </button>
      </span>
      <ThemePicker />
      <SharePopover notify={props.notify} />
      <AccountPopover notify={props.notify} />
      {status !== "idle" && (
        <button
          onClick={() => {
            resetSim();
            props.notify("Simulation reset");
          }}
          title="Stop and clear the run"
        >
          ⟳ Reset
        </button>
      )}
      <button
        className={running ? "run-btn stop" : "run-btn"}
        onClick={run}
        title={running ? "Stop simulation" : "Compile code and run"}
      >
        {running ? "■ Stop" : "▶ Simulate"}
      </button>
    </header>
  );
}
