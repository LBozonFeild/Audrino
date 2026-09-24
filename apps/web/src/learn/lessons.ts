/**
 * Guided lessons (PLAN: teaching with sim-backed checkpoints). Each step has a
 * declarative CheckSpec evaluated live against sim + trace state — a step is
 * done exactly when the circuit really did the thing.
 */
import type { FixtureId } from "../dsl/load";

export type CheckSpec =
  | { kind: "simRan" }
  | { kind: "serialIncludes"; text: string }
  | { kind: "probeAdded"; pin: string }
  | { kind: "pinToggled"; pin: string }
  | { kind: "pinLevel"; pin: string; level: "high" | "low" }
  | { kind: "ledLit"; ref: string };

export interface CheckEnv {
  simStatus: "idle" | "compiling" | "running" | "done" | "error";
  serialLines: string[];
  channels: string[];
  samples: Record<string, { t: number; v: number }[]>;
  livePins: Record<string, string>;
  leds: { ref: string; lit: boolean }[];
}

export interface LessonStep {
  text: string;
  hint: string;
  check: CheckSpec;
}

export interface Lesson {
  id: string;
  title: string;
  blurb: string;
  fixture: FixtureId;
  /** Optional code replacement applied after the fixture loads. */
  sketch?: string;
  steps: LessonStep[];
}

export function evaluateCheckpoint(spec: CheckSpec, env: CheckEnv): boolean {
  switch (spec.kind) {
    case "simRan":
      return env.simStatus === "running" || env.simStatus === "done";
    case "serialIncludes":
      return env.serialLines.some((l) => l.includes(spec.text));
    case "probeAdded":
      return env.channels.includes(spec.pin);
    case "pinToggled": {
      const s = env.samples[spec.pin] ?? [];
      return s.some((x) => x.v > 2.5) && s.some((x) => x.v <= 2.5);
    }
    case "pinLevel":
      return env.livePins[spec.pin] === spec.level;
    case "ledLit":
      return env.leds.some((l) => l.ref === spec.ref && l.lit);
  }
}

const TWO_ALT_SKETCH = `const int A = 10, B = 9;

void setup() {
  pinMode(A, OUTPUT);
  pinMode(B, OUTPUT);
}

void loop() {
  digitalWrite(A, HIGH);
  digitalWrite(B, LOW);
  delay(500);
  digitalWrite(A, LOW);
  digitalWrite(B, HIGH);
  delay(500);
}
`;

export const LESSONS: Lesson[] = [
  {
    id: "blink",
    title: "💡 Make an LED blink",
    blurb: "Your first firmware: compile, run, and watch D13 toggle on the Scope.",
    fixture: "blink",
    steps: [
      {
        text: "Press ▶ Simulate (top right) to compile the sketch and run the firmware.",
        hint: "Real machine code runs on the virtual ATmega328P — the compile takes a moment the first time.",
        check: { kind: "simRan" },
      },
      {
        text: "Watch LED1 on the canvas glow on… and off.",
        hint: "The sketch drives D13 high for 1s, low for 1s. The canvas shows live pin state.",
        check: { kind: "ledLit", ref: "led1" },
      },
      {
        text: "Open the Scope tab and add a probe on board1 · D13 (digital).",
        hint: "Scope → Add probe → pick board1 · D13 → Add. Probes are saved for next time.",
        check: { kind: "probeAdded", pin: "board1:D13" },
      },
      {
        text: "Press ▶ Simulate again and watch the D13 lane blink on the Scope.",
        hint: "A square wave: high 1s, low 1s. Hover the trace to read voltages at any time.",
        check: { kind: "pinToggled", pin: "board1:D13" },
      },
    ],
  },
  {
    id: "traffic",
    title: "🚦 Sequence a traffic light",
    blurb: "Three LEDs on D10/D9/D8 — observe the green phase like a real intersection.",
    fixture: "traffic-light",
    steps: [
      {
        text: "Press ▶ Simulate to run the traffic-light sketch.",
        hint: "The loop lights green, then yellow, then red, 4s each.",
        check: { kind: "simRan" },
      },
      {
        text: "See the GREEN LED (ledG) light on the canvas.",
        hint: "Green is first — on pin D8 through resistor rG.",
        check: { kind: "ledLit", ref: "ledG" },
      },
      {
        text: "Add a Scope probe on board1 · D8 (the green pin).",
        hint: "Scope → Add probe → board1 · D8.",
        check: { kind: "probeAdded", pin: "board1:D8" },
      },
      {
        text: "Confirm the D8 lane sits HIGH while green is on.",
        hint: "A steady-high lane ≈ 5 V. Traffic lights hold each phase for seconds — patience is a virtue.",
        check: { kind: "pinLevel", pin: "board1:D8", level: "high" },
      },
    ],
  },
  {
    id: "logic-analyzer",
    title: "🔬 Two-channel logic analysis",
    blurb: "Rewire the code (same circuit!) to alternate two LEDs and read both channels like a logic analyzer.",
    fixture: "traffic-light",
    sketch: TWO_ALT_SKETCH,
    steps: [
      {
        text: "Press ▶ Simulate — the red and yellow LEDs now take turns every 500 ms.",
        hint: "Same circuit as the traffic light, new firmware. That is the whole point of virtual hardware.",
        check: { kind: "simRan" },
      },
      { text: "Add a Scope probe on board1 · D10 (red).", hint: "D10 drives rR/ledR.", check: { kind: "probeAdded", pin: "board1:D10" } },
      { text: "Add a Scope probe on board1 · D9 (yellow).", hint: "D9 drives rY/ledY.", check: { kind: "probeAdded", pin: "board1:D9" } },
      {
        text: "Run again and watch D10 toggle.",
        hint: "One square wave — 500 ms high, 500 ms low.",
        check: { kind: "pinToggled", pin: "board1:D10" },
      },
      {
        text: "See D9 toggle too — a perfect complementary pair.",
        hint: "When one lane is high the other is low: that is a two-phase clock.",
        check: { kind: "pinToggled", pin: "board1:D9" },
      },
    ],
  },
];
