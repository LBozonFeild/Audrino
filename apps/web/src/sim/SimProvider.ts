/**
 * SimProvider — simulation state + lifecycle for the UI (Run/Stop/reset,
 * live serial lines, incremental LED/pin state for the canvas).
 */
import { create } from "zustand";
import type { Project } from "@audrino/schema";
import type { LedState, PinModeState, SerialLine, SimLiveState, SimResult } from "@audrino/sim";
import { projectToCircuit } from "./projectCircuit";
import { getSimRunner, type SimRunJob } from "./simRunner";
import { useTraceStore } from "./traceStore";

export type SimStatus = "idle" | "compiling" | "running" | "done" | "error";

interface SimState {
  status: SimStatus;
  lines: SerialLine[];
  leds: LedState[];
  pins: Record<string, PinModeState>;
  result: SimResult | null;
  error: string | null;
  start(doc: Project): void;
  stop(): void;
  reset(): void;
}

let job: SimRunJob | null = null;

export const useSimStore = create<SimState>((set, get) => ({
  status: "idle",
  lines: [],
  leds: [],
  pins: {},
  result: null,
  error: null,
  start(doc: Project) {
    get().stop();
    set({ status: "compiling", lines: [], leds: [], pins: {}, result: null, error: null });
    job = getSimRunner().run(projectToCircuit(doc), doc.code, {
      onLine(line) {
        if (get().status !== "idle") set((s) => ({ status: "running", lines: [...s.lines, line] }));
      },
      onState(state: SimLiveState) {
        if (get().status !== "idle") set({ status: "running", leds: state.leds, pins: state.pins });
      },
      onDone(result) {
        job = null;
        set({ status: "done", result, leds: result.leds, pins: result.pins });
      },
      onError(message) {
        job = null;
        set({ status: "error", error: message });
      },
      onTrace(sample) {
        useTraceStore.getState().append(sample.probe, sample.atMs, sample.v);
      },
    }, {
      tracePins: useTraceStore.getState().channels.map((c) => c.pin),
    });
    if (get().status === "compiling") set({ status: "running" });
  },
  stop() {
    job?.stop();
    job = null;
    if (get().status === "running" || get().status === "compiling") set({ status: "done" });
  },
  reset() {
    get().stop();
    set({ status: "idle", lines: [], leds: [], pins: {}, result: null, error: null });
  },
}));
