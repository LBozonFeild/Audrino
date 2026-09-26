/**
 * SIM_GOLDENS acceptance (docs/M1 contract): blink-uno serial deadlines +
 * rc-divider 2.5 V analog references.
 */
import { describe, expect, it } from "vitest";
import { SIM_GOLDENS } from "../../schema/tests/golden/simFixtures";
import { compileSketch } from "../src/toolchain";
import { runSimulation } from "../src/runner";
import type { SketchSource } from "../src/types";

describe("SIM_GOLDENS", () => {
  for (const golden of SIM_GOLDENS) {
    it(`${golden.id}: firmware compiles and meets the golden contract`, () => {
      const hex = compileSketch(golden.sketch as SketchSource).hex;
      const wantAnalog = golden.expect.analog ?? [];
      const wantSerial = golden.expect.serial ?? [];
      const res = runSimulation({
        ...golden.circuit,
        hex,
        serialBy: wantSerial.map((s) => ({ ms: s.ms, line: s.line })),
        probes: wantAnalog.map((a) => ({ probe: a.probe, atMs: a.at_ms })),
      });

      /* serial: lines arrive in order, by their deadlines */
      expect(res.serial.length).toBeGreaterThanOrEqual(wantSerial.length);
      for (let i = 0; i < wantSerial.length; i++) {
        expect(res.serial[i].line).toBe(wantSerial[i].line);
        expect(res.serial[i].ms).toBeLessThanOrEqual(wantSerial[i].ms);
        expect(res.serial[i].ms).toBeGreaterThanOrEqual(0);
        if (i > 0) expect(res.serial[i].ms).toBeGreaterThan(res.serial[i - 1].ms);
      }

      /* analog: component:pin node voltages */
      for (let i = 0; i < wantAnalog.length; i++) {
        const want = wantAnalog[i];
        const got = res.probes[i];
        expect(got.probe).toBe(want.probe);
        expect(Math.abs(got.v - want.v)).toBeLessThanOrEqual(want.tol_v);
      }
    });
  }
});
