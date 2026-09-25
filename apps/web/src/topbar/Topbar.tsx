import { AccountPopover } from "../account/AccountPopover";
import { useEditorStore } from "../state/store";
import { SharePopover } from "./SharePopover";
import { useSimStore } from "../sim/SimProvider";
import { ThemePicker } from "./ThemePicker";
import { useViewStore } from "../canvas/viewStore";
import { docBBox } from "../state/ops";

export function Topbar(props: { notify: (msg: string) => void }) {
  const doc = useEditorStore((s) => s.doc);
  const status = useSimStore((s) => s.status);
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);
  const resetSim = useSimStore((s) => s.reset);

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
      <span className="brand">◎ Audrino</span>
      <span className="proj-name mono">{doc.meta.name}</span>
      <span className="badge">{board ? board.type : "no board"}</span>
      {running && <span className="badge warn">simulating…</span>}
      {status === "error" && <span className="badge warn">sim error</span>}
      {status === "done" && <span className="badge">sim done</span>}
      <span className="spacer" />
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
      <button className="run-btn" onClick={run} title={running ? "Stop simulation" : "Compile code and run"}>
        {running ? "■ Stop" : "▶ Simulate"}
      </button>
    </header>
  );
}
