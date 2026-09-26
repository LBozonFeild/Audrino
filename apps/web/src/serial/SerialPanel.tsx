import { useSimStore } from "../sim/SimProvider";
import { useEditorStore } from "../state/store";

/** M1: real firmware serial output (RX from the simulated UART0). */
export function SerialPanel() {
  const lines = useSimStore((s) => s.lines);
  const status = useSimStore((s) => s.status);
  const error = useSimStore((s) => s.error);

  return (
    <div className="tab-body">
      <div className="dim">
        {status === "idle" && "Serial monitor is quiet — press ▶ Simulate to compile the code and run firmware."}
        {(status === "compiling" || status === "running") && "Receiving from simulated UART0 (9600 8N1)…"}
        {status === "done" && lines.length === 0 && "Run finished with no serial output."}
        {status === "done" && lines.length > 0 && `Run finished — ${lines.length} line(s).`}
        {status === "error" && `Simulation error: ${error ?? "unknown"}`}
        {status === "error" && (
          <button
            title="Send this error to the AI repair panel"
            onClick={() => useEditorStore.getState().setTab("ai")}
          >
            ✨ Fix with AI
          </button>
        )}
      </div>
      <div className="serial-log">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="dim">[{l.ms.toFixed(1)} ms] </span>
            {l.line}
          </div>
        ))}
      </div>
      <div className="row">
        <input style={{ flex: 1 }} placeholder="Serial input (TX to the board) arrives in M2" disabled />
        <button disabled>Send</button>
      </div>
    </div>
  );
}
