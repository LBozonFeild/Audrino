/** Digital loopback / co-sim checks: MCU pin state reaches the analog world and back. */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../src/runner";
import type { CircuitSpec, SketchSource } from "../src/types";
import { compileSketch } from "../src/toolchain";

const LOOP: SketchSource = {
  main: "loop.ino",
  files: {
    "loop.ino": `void setup() {
  pinMode(2, INPUT);
  pinMode(3, OUTPUT);
  digitalWrite(3, HIGH);
  Serial.begin(9600);
}
void loop() {
  Serial.println(digitalRead(2) == HIGH ? "hi" : "lo");
  delay(100);
}
`,
  },
};

const circuit: CircuitSpec = {
  components: [{ ref: "board", type: "arduino-uno" }],
  wires: [["board", "D3", "board", "D2"]],
};

describe("runner co-sim", () => {
  it("digital HIGH from an output reads back on a wired input pin", () => {
    const hex = compileSketch(LOOP).hex;
    const res = runSimulation({
      ...circuit,
      hex,
      serialBy: [
        { ms: 40, line: "hi" },
        { ms: 80, line: "hi" },
      ],
    });
    expect(res.serial.length).toBeGreaterThanOrEqual(2);
    expect(res.serial[0].line).toBe("hi");
    expect(res.serial[1].line).toBe("hi");
    expect(res.pins["board:D3"]).toBe("high");
  });
});
