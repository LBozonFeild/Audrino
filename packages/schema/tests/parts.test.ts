import { describe, expect, it } from "vitest";
import { M0_PIN_CATALOG, PART_DEFINITIONS, partDef } from "../src/parts";
import type { PartCategory } from "../src/parts";
import type { Project } from "../src/types";
import { validateProject } from "../src/validator";

function scaffoldWith(type: string): Project {
  const def = partDef(type)!;
  return {
    meta: { name: "t", dslVersion: 2, boardId: "" },
    boards: [],
    components: [{ id: "x", type, props: structuredClone(def.defaultProps), transform: { x: 0, y: 0 } }],
    nets: [],
    wires: [],
    code: { main: "sketch.ino", files: { "sketch.ino": "" } },
    build: { fqbn: "arduino:avr:uno", core: "arduino:avr@1.8.6", libraries: [] },
    sim: { render_fps: 60 },
  };
}

describe("part definitions", () => {
  it("are well-formed (unique types/pins, pins inside bbox)", () => {
    const types = new Set<string>();
    for (const d of PART_DEFINITIONS) {
      expect(types.has(d.type), `duplicate type ${d.type}`).toBe(false);
      types.add(d.type);
      const pinIds = new Set<string>();
      for (const p of d.pins) {
        expect(pinIds.has(p.id), `${d.type}: duplicate pin ${p.id}`).toBe(false);
        pinIds.add(p.id);
        expect(p.x, `${d.type}:${p.id} x`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${d.type}:${p.id} x`).toBeLessThanOrEqual(d.size_mm.w);
        expect(p.y, `${d.type}:${p.id} y`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${d.type}:${p.id} y`).toBeLessThanOrEqual(d.size_mm.h);
      }
      expect(d.pins.length, `${d.type} needs pins`).toBeGreaterThanOrEqual(2);
      expect(d.size_mm.w).toBeGreaterThan(0);
      expect(d.size_mm.h).toBeGreaterThan(0);
    }
  });

  it("every type validates standalone (catalog covers all defaults)", () => {
    for (const d of PART_DEFINITIONS) {
      const res = validateProject(scaffoldWith(d.type));
      expect(res.errors, `${d.type}: ${res.errors.map((e) => e.message).join("; ")}`).toEqual([]);
    }
  });

  it("keeps the frozen fixture pin ids for original M0 types", () => {
    expect(M0_PIN_CATALOG["arduino-uno"]).toEqual(expect.arrayContaining(["D0", "D13", "A0", "A5", "GND", "5V", "3V3", "VIN", "RST"]));
    expect(M0_PIN_CATALOG["led"]).toEqual(["A", "K"]);
    expect(M0_PIN_CATALOG["resistor"]).toEqual(["1", "2"]);
    expect(M0_PIN_CATALOG["pushbutton"]).toEqual(["1", "2"]);
    expect([...M0_PIN_CATALOG["sg90-servo"]].sort()).toEqual(["GND", "PWM", "VCC"]); // order truth lives in golden-pinouts
  });

  it("offers a broad component set across 10 categories", () => {
    expect(PART_DEFINITIONS.length).toBeGreaterThanOrEqual(1000);
    const cats = new Set<PartCategory>();
    for (const d of PART_DEFINITIONS) cats.add(d.category);
    for (const want of ["board", "led-display", "passive", "semiconductor", "ic", "sensor", "input", "output", "module", "power"] as PartCategory[]) {
      expect(cats.has(want), `missing category ${want}`).toBe(true);
    }
  });
});
