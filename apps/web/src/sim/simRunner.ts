/**
 * Sim runner service (DI seam): default = Web Worker executing the real engine
 * in @audrino/sim; tests inject a fake with __setSimRunner.
 */
import type { CircuitSpec, SerialLine, SimLiveState, SimResult, SketchSource } from "@audrino/sim";

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
    },
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
  run(circuit, sketch, hooks) {
    const worker = new Worker(new URL("./simWorker.ts", import.meta.url), { type: "module" });
    let done = false;
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: "line"; line: SerialLine }
        | { type: "state"; state: SimLiveState }
        | { type: "done"; result: SimResult }
        | { type: "error"; message: string };
      if (msg.type === "line") hooks.onLine(msg.line);
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
      .then((fw) => worker.postMessage({ circuit, hex: fw.hex }))
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
