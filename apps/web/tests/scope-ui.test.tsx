// @vitest-environment jsdom
/**
 * Scope panel + Learn panel UI goldens: lanes render from real trace data,
 * probe add/remove works, and lesson steps tick over from live sim state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ScopePanel, digitalPath, analogPoints } from "../src/scope/ScopePanel";
import { LearnPanel } from "../src/learn/LearnPanel";
import { nearestSample, useTraceStore, RING_CAP } from "../src/sim/traceStore";
import { useSimStore } from "../src/sim/SimProvider";
import { useEditorStore } from "../src/state/store";
import { createEmptyProject } from "../src/dsl/load";

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  useTraceStore.getState().reset();
  useSimStore.getState().reset();
  useEditorStore.setState({ doc: createEmptyProject(), history: { past: [], future: [] }, selection: [] });
});

describe("trace helpers", () => {
  it("digitalPath steps between levels; analogPoints maps 0–5V; nearestSample finds the closest point", () => {
    const xs = (t: number) => t * 10;
    const d = digitalPath([{ t: 0, v: 5 }, { t: 1, v: 5 }, { t: 2, v: 0 }], xs, 10, 40);
    expect(d.startsWith("M 0.0 10")).toBe(true);
    expect(d).toContain("L 20.0 10 L 20.0 40"); // falling edge at t=2
    const p = analogPoints([{ t: 0, v: 0 }, { t: 1, v: 5 }, { t: 2, v: 2.5 }], xs, 0, 50);
    expect(p).toBe("0.0,50.0 10.0,0.0 20.0,25.0");
    const s = [{ t: 0, v: 0 }, { t: 10, v: 5 }];
    expect(nearestSample(s, 4)?.t).toBe(0);
    expect(nearestSample(s, 7)?.t).toBe(10);
    expect(nearestSample([], 3)).toBeNull();
  });

  it("ring buffer caps per channel and ignores unprobed pins", () => {
    useTraceStore.getState().addChannel("a:1");
    const st = useTraceStore.getState();
    for (let i = 0; i < RING_CAP + 50; i++) st.append("a:1", i, 5);
    st.append("ghost:9", 0, 5);
    const samples = useTraceStore.getState().samples;
    expect(samples["a:1"].length).toBe(RING_CAP);
    expect(samples["a:1"][samples["a:1"].length - 1].t).toBe(RING_CAP + 49);
    expect(samples["ghost:9"]).toBeUndefined();
  });
});

describe("ScopePanel", () => {
  it("renders lanes from trace data and adds/removes probes", async () => {
    const doc = createEmptyProject();
    doc.boards.push({ id: "board1", type: "arduino-uno", transform: { x: 10, y: 10 } });
    useEditorStore.setState({ doc });

    useTraceStore.getState().addChannel("board1:D13", "digital");
    useTraceStore.getState().append("board1:D13", 0, 5);
    useTraceStore.getState().append("board1:D13", 1000, 0);

    const { container, findByText } = render(<ScopePanel notify={vi.fn()} />);
    expect(container.querySelector(".scope-svg")).not.toBeNull();
    expect(container.querySelector("path")?.getAttribute("d") ?? "").not.toBe("");
    expect(container.textContent).toContain("board1:D13 (D)");

    // add a second probe through the picker
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "board1:D12" } });
    fireEvent.click(await findByText("Add"));
    await waitFor(() => expect(useTraceStore.getState().channels.length).toBe(2));

    fireEvent.click(container.querySelector(".badge button")!); // remove first chip
    expect(useTraceStore.getState().channels.length).toBe(1);
  });
});

describe("LearnPanel", () => {
  it("starts a lesson, loads the fixture, and ticks steps from live state to completion", async () => {
    const notify = vi.fn();
    const { container, findByText, findAllByText } = render(<LearnPanel notify={notify} />);
    fireEvent.click((await findAllByText("Start lesson"))[0]); // first lesson = blink
    await waitFor(() => expect(useEditorStore.getState().doc.meta.name).toBe("Blink"));
    expect(container.textContent).toContain("Make an LED blink");

    useSimStore.setState({
      status: "done",
      leds: [{ ref: "led1", lit: true, iA: 0.01 }],
    });
    await waitFor(() => expect(container.textContent).toContain("✓"));

    useTraceStore.getState().addChannel("board1:D13");
    useTraceStore.getState().append("board1:D13", 0, 5);
    useTraceStore.getState().append("board1:D13", 1500, 0.1);
    await waitFor(() => expect(container.textContent).toContain("complete ✓"));
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("Lesson complete"));
    expect(JSON.parse(localStorage.getItem("audrino-learn-v1") ?? "{}").blink).toBe(true);
  });
});
