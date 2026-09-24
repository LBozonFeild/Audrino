// @vitest-environment jsdom
/**
 * Perf-at-scale golden (docs/QA.md): a 1000-part + 300-wire project must render
 * only the visible viewport (culling) with pin LOD at low zoom — the DOM size,
 * not wall-time, is the deterministic 60 fps proxy; wall-time gets a generous
 * jsdom bound to catch accidental O(n²) reconciliation.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { App } from "../src/App";
import { useEditorStore } from "../src/state/store";
import { useViewStore } from "../src/canvas/viewStore";
import { createEmptyProject } from "../src/dsl/load";
import type { Project } from "@audrino/schema";

function bigProject(): Project {
  const doc = createEmptyProject();
  doc.boards = [{ id: "board", type: "arduino-uno", transform: { x: 40, y: 40, rotation_deg: 0 } }];
  doc.meta.boardId = "board";
  doc.components = Array.from({ length: 1000 }, (_, i) => ({
    id: `r${i}`,
    type: "resistor",
    props: { resistance_ohms: 1000 },
    transform: { x: (i % 40) * 100 + 10, y: Math.floor(i / 40) * 115 + 10, rotation_deg: 0 },
  }));
  doc.nets = Array.from({ length: 300 }, (_, i) => ({ id: `n${i}`, pins: [`r${i}:1`, `r${i + 50}:2`] }));
  doc.wires = Array.from({ length: 300 }, (_, i) => ({
    id: `w${i}`,
    net: `n${i}`,
    points: [
      [(i % 40) * 100 + 10, Math.floor(i / 40) * 115 + 10] as [number, number],
      [(i % 40) * 100 + 60, Math.floor(i / 40) * 115 + 40] as [number, number],
    ],
  }));
  return doc;
}

beforeEach(() => {
  cleanup();
  useViewStore.getState().setView({ x: 0, y: 0, k: 1 });
  useEditorStore.setState({
    doc: bigProject(),
    selection: [],
    history: { past: [], future: [] },
    clipboard: null,
    copySeq: 0,
    ui: { activeTab: "code" },
    tool: "select",
    pendingTool: null,
  } as never);
});

afterEach(() => cleanup());

describe("perf at scale", () => {
  it("1000 parts + 300 wires render culled (viewport only) and cheaply", () => {
    const t0 = performance.now();
    const { container } = render(<App />);
    const dt = performance.now() - t0;

    expect(useEditorStore.getState().doc.components).toHaveLength(1000);
    /* scope to the canvas svg — the palette renders its own PAGE×category previews */
    const svg = container.querySelector("svg.canvas-svg")!;
    const parts = svg.querySelectorAll("g.part").length;
    const wires = svg.querySelectorAll(".wire-group").length;
    const dots = svg.querySelectorAll(".pin-dot").length;

    /* viewport = 720×540 mm (+margin) over a 4096×3072 world — few parts visible */
    expect(parts).toBeGreaterThan(0);
    expect(parts).toBeLessThan(120);
    expect(wires).toBeLessThan(80);
    expect(dots).toBeGreaterThan(0);
    expect(dots).toBeLessThan(400);

    /* generous jsdom bound — catches accidental full-catalog/full-doc work */
    expect(dt).toBeLessThan(5000);
  });

  it("pin dots LOD out below 0.55× zoom; zoom keeps world origin anchored", () => {
    const { container } = render(<App />);
    const svg = container.querySelector("svg.canvas-svg")!;
    expect(svg.querySelectorAll(".pin-dot").length).toBeGreaterThan(0);
    act(() => useViewStore.getState().zoomAt(0, 0, 0.3));
    expect(useViewStore.getState().view.k).toBeCloseTo(0.3, 5);
    expect(svg.querySelectorAll(".pin-dot").length).toBe(0);
    /* zoomAt keeps the anchor point fixed */
    const v = useViewStore.getState().view;
    expect(v.x).toBeCloseTo(0, 5);
    act(() => useViewStore.getState().zoomAt(360, 270, 2));
    const v2 = useViewStore.getState().view;
    /* world point 360,270 must map to the same view-relative fraction */
    expect((360 - v2.x) * v2.k).toBeCloseTo(360 * 0.3, 3);
  });
});
