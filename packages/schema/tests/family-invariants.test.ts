/**
 * Family invariants — cheap properties that catch generator drift across the
 * 1000+ generated SKUs (see docs/QA.md).
 */
import { describe, it, expect } from "vitest";
import { PART_DEFINITIONS, partDef } from "../src/parts";

describe("catalog invariants", () => {
  it("every part has a label, ≥2 pins, and finite numeric props", () => {
    for (const d of PART_DEFINITIONS) {
      expect(d.type, "type ids are lowercase").toBe(d.type.toLowerCase());
      expect(d.label.trim().length, d.type).toBeGreaterThan(0);
      expect(d.pins.length, d.type).toBeGreaterThanOrEqual(2);
      for (const p of d.pins) {
        expect(p.id.trim().length, `${d.type} pin id`).toBeGreaterThan(0);
        expect(p.name.trim().length, `${d.type} pin ${p.id} name`).toBeGreaterThan(0);
      }
      for (const [k, v] of Object.entries(d.defaultProps)) {
        if (typeof v === "number") expect(Number.isFinite(v), `${d.type}.${k}`).toBe(true);
        if (typeof v === "string") expect(v.length, `${d.type}.${k}`).toBeGreaterThan(0);
      }
    }
  });

  it("DIP-style ICs share identical pin geometry per (size, pin count)", () => {
    const groups = new Map<string, string[]>();
    for (const d of PART_DEFINITIONS.filter((x) => x.category === "ic")) {
      const sig = `${d.size_mm.w}x${d.size_mm.h}:${d.pins.length}`;
      // Position multiset only: 78xx vs 79xx legitimately swap id→position.
      const coords = JSON.stringify(
        d.pins.map((p) => [p.x, p.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
      );
      const key = `${sig}#${coords}`;
      groups.set(key, [...(groups.get(key) ?? []), d.type]);
    }
    // Group purely by (size,count): all members must have identical coords.
    const bySize = new Map<string, Set<string>>();
    for (const key of groups.keys()) {
      const size = key.split("#")[0];
      bySize.set(size, (bySize.get(size) ?? new Set()).add(key.split("#")[1]));
    }
    for (const [size, coordSet] of bySize) {
      expect(coordSet.size, `ic geometry split for ${size}`).toBe(1);
    }
  });

  it("logic families are geometry-identical across prefixes (74hc ≡ 74hct ≡ 74ls …)", () => {
    const groups = new Map<string, string[]>();
    for (const d of PART_DEFINITIONS) {
      const m = /^74[a-z]*(\d[\w-]*)$/.exec(d.type);
      if (m) groups.set(`74x${m[1]}`, [...(groups.get(`74x${m[1]}`) ?? []), d.type]);
    }
    let checked = 0;
    for (const [key, members] of groups) {
      if (members.length < 2) continue;
      const sigs = new Set(members.map((t) => JSON.stringify(partDef(t)!.pins.map((p) => [p.id, p.x, p.y]))));
      expect(sigs.size, `${key} clone mismatch: ${members.join(", ")}`).toBe(1);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("4000-series CMOS clones are geometry-identical (cd ≡ hef ≡ mc ≡ tc)", () => {
    const groups = new Map<string, string[]>();
    for (const d of PART_DEFINITIONS) {
      const m = /^(?:cd|hef|tc|mc(?:14)?)(4[05]\d\d)$/.exec(d.type);
      if (m) groups.set(m[1], [...(groups.get(m[1]) ?? []), d.type]);
    }
    let checked = 0;
    for (const [key, members] of groups) {
      if (members.length < 2) continue;
      const sigs = new Set(members.map((t) => JSON.stringify(partDef(t)!.pins.map((p) => [p.id, p.x, p.y]))));
      expect(sigs.size, `${key} clone mismatch: ${members.join(", ")}`).toBe(1);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it("every type maps to a category in the 13-value union", () => {
    const cats = new Set(PART_DEFINITIONS.map((d) => d.category));
    expect([...cats].sort()).toEqual(
      [
        "board", "connector", "display", "ic", "input", "led-display", "module",
        "motor", "output", "passive", "power", "semiconductor", "sensor",
      ].sort(),
    );
  });
});
