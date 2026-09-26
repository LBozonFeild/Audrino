// @vitest-environment jsdom
/**
 * Interaction goldens — the user-visible flows must survive refactors
 * (docs/QA.md). Playwright browser E2E layers on top later; these run the real
 * React tree headlessly.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, screen, cleanup, act } from "@testing-library/react";
import { App } from "../src/App";
import { useEditorStore } from "../src/state/store";
import { createEmptyProject } from "../src/dsl/load";
import { __setSimRunner, type SimRunner } from "../src/sim/simRunner";
import { useSimStore } from "../src/sim/SimProvider";
import { useViewStore, DEFAULT_K } from "../src/canvas/viewStore";

beforeEach(() => {
  cleanup();
  __setSimRunner(null);
  useSimStore.setState({ status: "idle", lines: [], result: null, error: null });
  // Parts here are placed at fixed world coords — pin the viewport so culling
  // doesn't depend on the (centred) default view.
  useViewStore.setState({ view: { x: 0, y: 0, k: DEFAULT_K } });
  useEditorStore.setState({
    doc: createEmptyProject(),
    selection: [],
    history: { past: [], future: [] },
    clipboard: null,
    copySeq: 0,
    ui: { activeTab: "ai" },
    tool: "select",
    pendingTool: null,
  } as never);
});

describe("placement flow", () => {
  it("search + Enter arms the ghost, background click places the part", () => {
    const { container } = render(<App />);
    const input = screen.getByPlaceholderText(/search \d+ parts/);
    fireEvent.change(input, { target: { value: "resistor" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(container.querySelector(".ghost-rect")).not.toBeNull();

    fireEvent.click(container.querySelector("svg > rect")!);
    expect(useEditorStore.getState().doc.components).toHaveLength(1);
    expect(useEditorStore.getState().doc.components[0].type).toBe("resistor");
  });

  it("Escape in the search field clears the query", () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/search \d+ parts/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "74hc00" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });
});

describe("history", () => {
  it("Ctrl+Z undoes placement and Ctrl+Y redoes it", () => {
    render(<App />);
    act(() => {
      useEditorStore.getState().place("component", "resistor", 20, 20);
    });
    expect(useEditorStore.getState().doc.components).toHaveLength(1);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(useEditorStore.getState().doc.components).toHaveLength(0);

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(useEditorStore.getState().doc.components).toHaveLength(1);
  });

  it("Ctrl+Z while typing in a field does not rewind the project", () => {
    render(<App />);
    act(() => {
      useEditorStore.getState().place("component", "led", 30, 30);
    });
    const input = screen.getByPlaceholderText(/search \d+ parts/);
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(useEditorStore.getState().doc.components).toHaveLength(1);
    expect(useEditorStore.getState().history.past.length).toBe(1);
  });
});

describe("deletion guardrails", () => {
  it("Delete inside a text field never deletes parts", () => {
    render(<App />);
    act(() => {
      useEditorStore.getState().place("component", "resistor", 20, 20);
      useEditorStore.getState().select([useEditorStore.getState().doc.components[0].id]);
    });

    const input = screen.getByPlaceholderText(/search \d+ parts/);
    fireEvent.keyDown(input, { key: "Delete" });
    expect(useEditorStore.getState().doc.components).toHaveLength(1);

    fireEvent.keyDown(window, { key: "Delete" });
    expect(useEditorStore.getState().doc.components).toHaveLength(0);
  });
});

describe("canvas affordances", () => {
  it("pins carry tooltips with id and name", () => {
    const { container } = render(<App />);
    act(() => {
      useEditorStore.getState().place("component", "resistor", 20, 20);
    });
    // tooltip rides the pin's hit box (.pin-hit) — the visible socket is inert
    const titles = [...container.querySelectorAll(".canvas-svg .pin-hit title")].map((t) => t.textContent);
    expect(titles).toContain("1");
    expect(titles).toContain("2");
  });

  it("double-clicking a part opens the Inspect tab", () => {
    const { container } = render(<App />);
    act(() => {
      useEditorStore.getState().place("component", "arduino-uno", 10, 10);
    });
    fireEvent.doubleClick(container.querySelector(".canvas-svg .part")!);
    expect(useEditorStore.getState().ui.activeTab).toBe("inspect");
    expect(screen.getByText("Net connections")).toBeTruthy();
  });
});

describe("clipboard with boards", () => {
  it("copies and pastes a board with its connected nets (regression)", () => {
    render(<App />);
    act(() => {
      useEditorStore.getState().place("board", "arduino-uno", 10, 10);
    });
    act(() => {
      useEditorStore.getState().place("component", "resistor", 80, 10);
    });
    const board = useEditorStore.getState().doc.boards[0];
    const res = useEditorStore.getState().doc.components[0];
    act(() => {
      useEditorStore.getState().connect(`${board.id}:D13`, `${res.id}:1`, [[30, 30], [60, 30]]);
    });
    act(() => {
      useEditorStore.getState().select([board.id, res.id]);
      useEditorStore.getState().copy();
    });
    let msg: string | null = null;
    act(() => {
      msg = useEditorStore.getState().paste();
    });
    expect(msg).toContain("pasted");
    const doc = useEditorStore.getState().doc;
    expect(doc.boards).toHaveLength(2);
    expect(doc.components).toHaveLength(2);
  });
});

describe("run flow (M1)", () => {
  it("Simulate streams firmware serial into the Serial panel and Stop works", () => {
    let hooks: Parameters<SimRunner["run"]>[2] | null = null;
    __setSimRunner({
      run(_circuit, _sketch, h) {
        hooks = h;
        return { stop() {} };
      },
    });
    const { container } = render(<App />);
    fireEvent.click(screen.getByText(/Simulate/));
    act(() => {
      hooks!.onLine({ ms: 7.3, line: "tick-H" });
      hooks!.onLine({ ms: 514.6, line: "tick-L" });
    });
    fireEvent.click(screen.getByText("Serial"));
    const log = container.querySelector(".serial-log")!.textContent ?? "";
    expect(log).toContain("tick-H");
    expect(log).toContain("tick-L");
    expect(log).toContain("7.3 ms");
    fireEvent.click(screen.getByText(/■ Stop/));
    expect(useSimStore.getState().status).toBe("done");
    fireEvent.click(screen.getByText(/⟳ Reset/));
    expect(useSimStore.getState().status).toBe("idle");
    expect(useSimStore.getState().lines).toHaveLength(0);
  });

  it("a failing compile surfaces as a sim error badge", () => {
    __setSimRunner({
      run(_c, _s, h) {
        h.onError("no AVR toolchain found (tried AUDRINO_ZIG, zig, python3 -m ziglang, avr-gcc, arduino-cli)");
        return { stop() {} };
      },
    });
    const { container } = render(<App />);
    fireEvent.click(screen.getByText(/Simulate/));
    fireEvent.click(screen.getByText("Serial"));
    expect(container.querySelector(".serial-log")!.parentElement!.textContent).toContain("no AVR toolchain found");
  });
});

describe("canvas sim state (M1 acceptance: LED/pin state on canvas)", () => {
  it("onState streams pin modes onto pin-dots and lights the LED glow", () => {
    let hooks: Parameters<SimRunner["run"]>[2] | null = null;
    __setSimRunner({
      run(_c, _s, h) {
        hooks = h;
        return { stop() {} };
      },
    });
    useEditorStore.getState().place("board", "arduino-uno", 20, 20); /* null = success */
    const boardId = useEditorStore.getState().selection[0];
    useEditorStore.getState().place("component", "led", 90, 70);
    const ledId = useEditorStore.getState().selection[0];
    expect(boardId).toBeTruthy();
    expect(ledId).toBeTruthy();
    const { container } = render(<App />);
    fireEvent.click(screen.getByText(/Simulate/));
    act(() => {
      hooks!.onState({
        leds: [{ ref: ledId!, lit: true, iA: 0.012 }],
        pins: { [`${boardId}:D13`]: "high", [`${boardId}:D2`]: "low" },
      });
    });
    const hi = container.querySelector(".pin-dot.st-high");
    const lo = container.querySelector(".pin-dot.st-low");
    expect(hi).not.toBeNull();
    expect(lo).not.toBeNull();
    expect(container.querySelector(".led-glow")).not.toBeNull();
    fireEvent.click(screen.getByText(/⟳ Reset/));
    expect(container.querySelector(".led-glow")).toBeNull();
    expect(container.querySelector(".pin-dot.st-high")).toBeNull();
  });
});
