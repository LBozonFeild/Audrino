// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as ops from "../src/state/ops";
import { pinWorldPos as glyphPinWorldPos } from "../src/canvas/PartGlyph";
import { pinWorldPos as netsPinWorldPos } from "../src/dsl/netsFromConnections";
import { useViewStore, VIEW_W, VIEW_H, DEFAULT_K } from "../src/canvas/viewStore";
import { createEmptyProject } from "../src/dsl/load";

const placeResistor = (): { doc: ReturnType<typeof createEmptyProject>; id: string } => {
  const r = ops.place(createEmptyProject(), "component", "resistor", 100, 200);
  const id = r.error === undefined ? (r.createdIds ?? [])[0] : undefined;
  if (r.error !== undefined || !r.doc || !id) throw new Error(r.error ?? "place failed");
  return { doc: r.doc, id };
};

describe("rotate", () => {
  it("spins 90° per press and wraps at 360", () => {
    const { doc, id } = placeResistor();
    let d = doc;
    for (const step of [90, 180, 270, 0]) {
      const r = ops.rotate(d, [id]);
      expect(r.error).toBeUndefined();
      d = r.doc!;
      expect(d.components[0].transform.rotation_deg).toBe(step);
    }
    // transform origin (bbox top-left) is untouched — the spin is around center
    expect(d.components[0].transform.x).toBe(100);
    expect(d.components[0].transform.y).toBe(200);
  });

  it("re-lands wire endpoints onto the rotated pins", () => {
    const { doc, id } = placeResistor();
    const c = doc.components[0];
    const p1 = [c.transform.x + 0, c.transform.y + 4] as [number, number];
    const p2 = [c.transform.x + 22, c.transform.y + 4] as [number, number];
    const wired = ops.connect(doc, `${id}:1`, `${id}:2`, [p1, p2]);
    expect(wired.error).toBeUndefined();
    const r = ops.rotate(wired.doc!, [id]);
    expect(r.error).toBeUndefined();
    const moved = r.doc!;
    const e = moved.components[0];
    const a = glyphPinWorldPos({ type: e.type, transform: e.transform }, "1")!;
    const b = glyphPinWorldPos({ type: e.type, transform: e.transform }, "2")!;
    const ends = [moved.wires[0].points[0], moved.wires[0].points[moved.wires[0].points.length - 1]];
    for (const [ex, ey] of [a, b]) {
      expect(
        ends.some(([x, y]) => Math.abs(x - ex) < 0.01 && Math.abs(y - ey) < 0.01),
        `endpoint on (${ex},${ey})`,
      ).toBe(true);
    }
  });
});

describe("pin math matches the rendered rotation", () => {
  it("agrees with relayoutWires' pinWorldPos at every 90° step (non-square part)", () => {
    for (const rot of [0, 90, 180, 270]) {
      const transform = { x: 10, y: 20, rotation_deg: rot };
      const g = glyphPinWorldPos({ type: "resistor", transform }, "1")!;
      const n = netsPinWorldPos({ id: "x", type: "resistor", transform }, "1")!;
      expect(g[0], `x @${rot}`).toBeCloseTo(n[0], 6);
      expect(g[1], `y @${rot}`).toBeCloseTo(n[1], 6);
    }
  });
});

describe("fit-to-content", () => {
  it("frames the content bbox centered with a clamped zoom", () => {
    useViewStore.getState().fitContent({ minX: 0, minY: 0, maxX: 200, maxY: 100 });
    const v = useViewStore.getState().view;
    const k = Math.min(8, Math.max(0.15, Math.min(VIEW_W / 232, VIEW_H / 132)));
    expect(v.k).toBeCloseTo(k, 6);
    // view centers on the bbox center (100, 50)
    expect(v.x + VIEW_W / (2 * v.k)).toBeCloseTo(100, 4);
    expect(v.y + VIEW_H / (2 * v.k)).toBeCloseTo(50, 4);
  });

  it("falls back to the default view for empty content", () => {
    useViewStore.getState().fitContent(null);
    expect(useViewStore.getState().view.k).toBe(DEFAULT_K);
  });
});

describe("docBBox", () => {
  it("accounts for rotation-swapped bounds", () => {
    const { doc, id } = placeResistor();
    const r = ops.rotate(doc, [id]);
    const bb = ops.docBBox(r.doc!)!;
    // resistor 22x8 rotated 90° covers 8x22 at (100,200)
    expect(bb.maxX - bb.minX).toBeCloseTo(8, 6);
    expect(bb.maxY - bb.minY).toBeCloseTo(22, 6);
  });
});
