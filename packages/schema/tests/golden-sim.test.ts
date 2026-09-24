/**
 * Sim golden contract (M1 activates these against the real emulator).
 *
 * Each fixture pins an expected simulation outcome: serial lines at millisecond
 * stamps and/or analog probe values. The sim runner refuses to ship if any
 * golden deviates. This test keeps the fixtures themselves well-formed and
 * catalog-legal in the meantime.
 */
import { describe, it, expect } from "vitest";
import { partDef } from "../src/parts";
import { parsePinRef } from "../src/pinref";
import { SIM_GOLDENS, type SimGolden } from "./golden/simFixtures";

describe("sim golden fixtures", () => {
  it("exist and cover digital + analog cases", () => {
    expect(SIM_GOLDENS.length).toBeGreaterThanOrEqual(2);
    expect(SIM_GOLDENS.some((g) => g.expect.serial?.length)).toBe(true);
    expect(SIM_GOLDENS.some((g) => g.expect.analog?.length)).toBe(true);
    expect(new Set(SIM_GOLDENS.map((g) => g.id)).size).toBe(SIM_GOLDENS.length);
  });

  for (const g of SIM_GOLDENS) {
    it(`${g.id} is a legal golden`, () => {
      expect(g.id, "id").toBeTruthy();
      expect(g.title, "title").toBeTruthy();
      expect(partDef(g.board), `board ${g.board}`).not.toBeNull();

      const refs = new Set<string>();
      for (const c of g.circuit.components) {
        expect(refs.has(c.ref), `duplicate ref ${c.ref}`).toBe(false);
        refs.add(c.ref);
        expect(partDef(c.type), `component type ${c.type}`).not.toBeNull();
      }

      for (const [a, pa, b, pb] of g.circuit.wires) {
        for (const [ref, pin] of [[a, pa], [b, pb]] as const) {
          expect(refs.has(ref), `wire ref ${ref}`).toBe(true);
          const type = g.circuit.components.find((c) => c.ref === ref)!.type;
          const ids = new Set(partDef(type)!.pins.map((p) => p.id));
          expect(ids.has(pin), `wire pin ${ref}:${pin}`).toBe(true);
        }
        expect(`${a}:${pa}`).not.toBe(`${b}:${pb}`);
        expect(parsePinRef(`${a}:${pa}`)).not.toBeNull();
      }

      expect(g.sketch.files[g.sketch.main], "main sketch file").toBeTruthy();
      for (const [name, src] of Object.entries(g.sketch.files)) {
        expect(src.length, `sketch ${name} empty`).toBeGreaterThan(0);
      }

      let lastMs = -1;
      for (const s of g.expect.serial ?? []) {
        expect(Number.isFinite(s.ms), "serial ms").toBe(true);
        expect(s.ms).toBeGreaterThanOrEqual(lastMs);
        lastMs = s.ms;
        expect(typeof s.line).toBe("string");
      }
      for (const a of g.expect.analog ?? []) {
        expect(a.probe.length, "probe name").toBeGreaterThan(0);
        expect(Number.isFinite(a.v), "probe v").toBe(true);
        expect(a.tol_v).toBeGreaterThanOrEqual(0);
      }
      // A golden must expect something.
      expect((g.expect.serial?.length ?? 0) + (g.expect.analog?.length ?? 0)).toBeGreaterThan(0);
    });
  }
});

// Re-export the fixture type so M1 runners get one import surface.
export type { SimGolden };
