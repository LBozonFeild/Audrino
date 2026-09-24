import { describe, expect, it } from "vitest";
import { LESSONS, evaluateCheckpoint, type CheckEnv } from "../src/learn/lessons";

const baseEnv = (over: Partial<CheckEnv> = {}): CheckEnv => ({
  simStatus: "idle",
  serialLines: [],
  channels: [],
  samples: {},
  livePins: {},
  leds: [],
  ...over,
});

describe("evaluateCheckpoint", () => {
  it("simRan: running or done only", () => {
    expect(evaluateCheckpoint({ kind: "simRan" }, baseEnv({ simStatus: "running" }))).toBe(true);
    expect(evaluateCheckpoint({ kind: "simRan" }, baseEnv({ simStatus: "done" }))).toBe(true);
    expect(evaluateCheckpoint({ kind: "simRan" }, baseEnv({ simStatus: "error" }))).toBe(false);
    expect(evaluateCheckpoint({ kind: "simRan" }, baseEnv())).toBe(false);
  });

  it("serialIncludes / probeAdded / pinLevel / ledLit", () => {
    const env = baseEnv({
      serialLines: ["hello", "count 3"],
      channels: ["board1:D13"],
      livePins: { "board1:D13": "high" },
      leds: [{ ref: "led1", lit: true }],
    });
    expect(evaluateCheckpoint({ kind: "serialIncludes", text: "count" }, env)).toBe(true);
    expect(evaluateCheckpoint({ kind: "serialIncludes", text: "missing" }, env)).toBe(false);
    expect(evaluateCheckpoint({ kind: "probeAdded", pin: "board1:D13" }, env)).toBe(true);
    expect(evaluateCheckpoint({ kind: "probeAdded", pin: "board1:D12" }, env)).toBe(false);
    expect(evaluateCheckpoint({ kind: "pinLevel", pin: "board1:D13", level: "high" }, env)).toBe(true);
    expect(evaluateCheckpoint({ kind: "pinLevel", pin: "board1:D13", level: "low" }, env)).toBe(false);
    expect(evaluateCheckpoint({ kind: "ledLit", ref: "led1" }, env)).toBe(true);
    expect(evaluateCheckpoint({ kind: "ledLit", ref: "led2" }, env)).toBe(false);
  });

  it("pinToggled requires both levels in the trace", () => {
    const both = baseEnv({ samples: { p: [{ t: 0, v: 4.9 }, { t: 1, v: 0.1 }] } });
    const highOnly = baseEnv({ samples: { p: [{ t: 0, v: 5 }, { t: 1, v: 4.8 }] } });
    const lowOnly = baseEnv({ samples: { p: [{ t: 0, v: 0.2 }, { t: 1, v: 0.1 }] } });
    const nan = baseEnv({ samples: { p: [{ t: 0, v: Number.NaN }, { t: 1, v: 4.9 }] } });
    const spec = { kind: "pinToggled", pin: "p" } as const;
    expect(evaluateCheckpoint(spec, both)).toBe(true);
    expect(evaluateCheckpoint(spec, highOnly)).toBe(false);
    expect(evaluateCheckpoint(spec, lowOnly)).toBe(false);
    expect(evaluateCheckpoint(spec, nan)).toBe(false); // NaN counts as neither level
    expect(evaluateCheckpoint(spec, baseEnv())).toBe(false);
  });
});

describe("LESSONS", () => {
  it("every step carries a non-empty text/hint and a well-formed check", () => {
    for (const l of LESSONS) {
      expect(l.steps.length).toBeGreaterThanOrEqual(3);
      for (const s of l.steps) {
        expect(s.text.length).toBeGreaterThan(10);
        expect(s.hint.length).toBeGreaterThan(5);
        expect(typeof s.check.kind).toBe("string");
      }
    }
  });

  it("blink lesson completes against a faithful synthetic run", () => {
    const blink = LESSONS.find((l) => l.id === "blink")!;
    const env = baseEnv({
      simStatus: "done",
      channels: ["board1:D13"],
      samples: { "board1:D13": [{ t: 0, v: 5 }, { t: 1500, v: 0.1 }] },
      livePins: { "board1:D13": "high" },
      leds: [{ ref: "led1", lit: true }],
    });
    expect(blink.steps.map((s) => evaluateCheckpoint(s.check, env))).toEqual([true, true, true, true]);
  });

  it("logic-analyzer lesson needs BOTH channels to toggle", () => {
    const la = LESSONS.find((l) => l.id === "logic-analyzer")!;
    const half = baseEnv({
      simStatus: "done",
      channels: ["board1:D10", "board1:D9"],
      samples: { "board1:D10": [{ t: 0, v: 5 }, { t: 500, v: 0 }] },
    });
    const results = la.steps.map((s) => evaluateCheckpoint(s.check, half));
    expect(results[0]).toBe(true);
    expect(results[3]).toBe(true); // D10 toggled
    expect(results[4]).toBe(false); // D9 never toggled
  });
});
