/**
 * Scope-grade trace goldens: fixed-stride probe sampling streamed over the
 * co-sim run (analog rail accuracy + digital toggling + timing integrity).
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../src/runner";
import type { ProbeSample } from "../src/types";
import { compileSketch } from "../src/toolchain";

const BLINK_NETLIST = {
  components: [
    { ref: "board1", type: "arduino-uno" },
    { ref: "r1", type: "resistor", props: { resistance_ohms: 220 } },
    { ref: "led1", type: "led", props: { color: "red" } },
  ],
  nets: [
    { pins: ["board1:D13", "r1:1"] },
    { pins: ["r1:2", "led1:A"] },
    { pins: ["board1:GND", "led1:K"] },
  ],
};

const BLINK_SKETCH = `void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`;

describe("trace sampling (scope/logic-analyzer data)", () => {
  it("streams fixed-stride samples: monotonic time, rail accuracy, digital toggle", () => {
    const { hex } = compileSketch({ main: "sketch.ino", files: { "sketch.ino": BLINK_SKETCH } });
    const samples: ProbeSample[] = [];
    runSimulation(
      {
        ...BLINK_NETLIST,
        hex,
        untilMs: 3000,
        trace: { pins: ["board1:D13", "board1:5V"], strideMs: 0.5 },
      },
      {
        onTrace: (s) => samples.push(s),
      },
    );

    const d13 = samples.filter((s) => s.probe === "board1:D13");
    const rail = samples.filter((s) => s.probe === "board1:5V");
    expect(d13.length).toBe(6001); // t = 0 … 3000 ms at 0.5 ms stride
    expect(rail.length).toBe(6001);

    for (const arr of [d13, rail]) {
      for (let i = 1; i < arr.length; i++) expect(arr[i].atMs).toBeGreaterThanOrEqual(arr[i - 1].atMs);
    }

    // 5V rail is 5 V, always
    for (const s of rail) expect(s.v).toBeCloseTo(5, 1);

    // D13 drives both levels across a 2 s blink period
    expect(d13.some((s) => s.v > 4.5)).toBe(true);
    expect(d13.some((s) => s.v < 0.5)).toBe(true);
    // …and the first second is HIGH (setup drives it high immediately)
    expect(d13.filter((s) => s.atMs < 900 && s.v > 4.5).length).toBeGreaterThan(1000);
  });

  it("unknown probe keys stream NaN instead of silently vanishing", () => {
    const { hex } = compileSketch({ main: "sketch.ino", files: { "sketch.ino": BLINK_SKETCH } });
    const samples: ProbeSample[] = [];
    runSimulation(
      { ...BLINK_NETLIST, hex, untilMs: 2, trace: { pins: ["ghost:1"], strideMs: 1 } },
      { onTrace: (s) => samples.push(s) },
    );
    expect(samples.length).toBe(3); // t = 0, 1, 2
    for (const s of samples) expect(Number.isNaN(s.v)).toBe(true);
  });
});
