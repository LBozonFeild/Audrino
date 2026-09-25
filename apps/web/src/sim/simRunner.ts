/**
 * Sim runner service (DI seam): default = Web Worker executing the real engine
 * in @audrino/sim; tests inject a fake with __setSimRunner.
 */
import type { CircuitSpec, ProbeSample, SerialLine, SimLiveState, SimResult, SketchSource } from "@audrino/sim";

export interface SimRunJob {
  stop(): void;
}

export interface SimRunner {
  run(
    circuit: CircuitSpec,
    sketch: SketchSource,
    hooks: {
      onLine: (line: SerialLine) => void;
      onState: (state: SimLiveState) => void;
      onDone: (result: SimResult) => void;
      onError: (message: string) => void;
      onTrace?: (sample: ProbeSample) => void;
    },
    opts?: { tracePins?: string[] },
  ): SimRunJob;
}

export interface CompiledFirmware {
  hex: string;
  kind: string;
  ms: number;
  cached: boolean;
}

export async function compileSketchHttp(sketch: SketchSource): Promise<CompiledFirmware> {
  const res = await fetch("/api/sim/compile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sketch }),
  });
  const body = (await res.json()) as CompiledFirmware & { error?: string };
  if (!res.ok || body.error) throw new Error(body.error ?? `compile failed (${res.status})`);
  return body;
}

export const workerSimRunner: SimRunner = {
  run(circuit, sketch, hooks, opts) {
    // Environments without Web Workers (jsdom tests) must fail cleanly — an
    // uncaught constructor throw surfaces as a phantom test error.
    let worker: Worker;
    try {
      if (typeof Worker === "undefined") throw new Error("no Worker in this environment");
      worker = new Worker(new URL("./simWorker.ts", import.meta.url), { type: "module" });
    } catch (e) {
      hooks.onError(e instanceof Error ? e.message : String(e));
      return { stop() {} };
    }
    let done = false;
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: "line"; line: SerialLine }
        | { type: "state"; state: SimLiveState }
        | { type: "trace"; sample: ProbeSample }
        | { type: "done"; result: SimResult }
        | { type: "error"; message: string };
      if (msg.type === "line") hooks.onLine(msg.line);
      else if (msg.type === "trace") hooks.onTrace?.(msg.sample);
      else if (msg.type === "state") hooks.onState(msg.state);
      else if (msg.type === "done") {
        done = true;
        hooks.onDone(msg.result);
        worker.terminate();
      } else {
        done = true;
        hooks.onError(msg.message);
        worker.terminate();
      }
    };
    worker.onerror = (e) => {
      done = true;
      hooks.onError(String(e.message ?? "sim worker error"));
      worker.terminate();
    };
    compileSketchHttp(sketch)
      .then((fw) =>
        worker.postMessage({
          circuit,
          hex: fw.hex,
          trace: opts?.tracePins?.length ? { pins: opts.tracePins, strideMs: 0.5 } : undefined,
        }),
      )
      .catch((e: unknown) => {
        done = true;
        hooks.onError(e instanceof Error ? e.message : String(e));
        worker.terminate();
      });
    return {
      stop() {
        if (!done) worker.terminate();
      },
    };
  },
};

let impl: SimRunner = workerSimRunner;

export function getSimRunner(): SimRunner {
  return impl;
}

/** Test-only injection seam (app tests run without a Worker). */
export function __setSimRunner(runner: SimRunner | null): void {
  impl = runner ?? workerSimRunner;
}
