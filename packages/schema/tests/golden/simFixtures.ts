/**
 * Sim golden fixtures (M1 runs these against the emulator; see docs/QA.md).
 * Kept as typed TS so `tsc --noEmit` validates them in CI without node types.
 */

export interface SimGolden {
  id: string;
  title: string;
  board: string;
  circuit: {
    components: { ref: string; type: string; props?: Record<string, unknown> }[];
    wires: [string, string, string, string][];
  };
  sketch: { main: string; files: Record<string, string> };
  expect: {
    serial?: { ms: number; line: string }[];
    analog?: { probe: string; at_ms: number; v: number; tol_v: number }[];
  };
}

export const SIM_GOLDENS: SimGolden[] = [
  {
    id: "blink-uno",
    title: "Blink + serial tick on UNO",
    board: "arduino-uno",
    circuit: {
      components: [
        { ref: "uno", type: "arduino-uno" },
        { ref: "r1", type: "resistor", props: { resistance_ohms: 220 } },
        { ref: "led1", type: "led", props: { color: "red" } },
      ],
      wires: [
        ["uno", "D13", "r1", "1"],
        ["r1", "2", "led1", "A"],
        ["led1", "K", "uno", "GND"],
      ],
    },
    sketch: {
      main: "blink.ino",
      files: {
        "blink.ino":
          'void setup(){ pinMode(13, OUTPUT); Serial.begin(9600); }\nvoid loop(){ digitalWrite(13, HIGH); Serial.println("tick-H"); delay(500); digitalWrite(13, LOW); Serial.println("tick-L"); delay(500); }',
      },
    },
    expect: {
      serial: [
        { ms: 500, line: "tick-H" },
        { ms: 1000, line: "tick-L" },
        { ms: 1500, line: "tick-H" },
      ],
    },
  },
  {
    id: "rc-divider",
    title: "Resistive divider DC operating point (analog solver)",
    board: "arduino-uno",
    circuit: {
      components: [
        { ref: "uno", type: "arduino-uno" },
        { ref: "r1", type: "resistor", props: { resistance_ohms: 1000 } },
        { ref: "r2", type: "resistor", props: { resistance_ohms: 1000 } },
      ],
      wires: [
        ["uno", "5V", "r1", "1"],
        ["r1", "2", "r2", "1"],
        ["r2", "2", "uno", "GND"],
      ],
    },
    sketch: {
      main: "idle.ino",
      files: {
        "idle.ino": "void setup(){}\nvoid loop(){}",
      },
    },
    expect: {
      analog: [
        { probe: "r1:2", at_ms: 0, v: 2.5, tol_v: 0.05 },
        { probe: "r2:1", at_ms: 0, v: 2.5, tol_v: 0.05 },
      ],
    },
  },
];
