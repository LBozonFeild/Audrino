/** Browser-side simulation execution (real @audrino/sim engine). */
import { runSimulation, type CircuitSpec, type SerialLine, type SimLiveState, type SimResult } from "@audrino/sim";

interface RunMsg {
  circuit: CircuitSpec;
  hex: string;
}

self.onmessage = (e: MessageEvent<RunMsg>) => {
  const { circuit, hex } = e.data;
  try {
    const result: SimResult = runSimulation(
      { ...circuit, hex, untilMs: 3000 },
      {
        onSerial: (line: SerialLine) => (self as unknown as Worker).postMessage({ type: "line", line }),
        onState: (state: SimLiveState) => (self as unknown as Worker).postMessage({ type: "state", state }),
      },
    );
    (self as unknown as Worker).postMessage({ type: "done", result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
