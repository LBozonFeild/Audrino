// @vitest-environment jsdom
/**
 * Spawn flow goldens: Generate → build card → Open in editor (undoable),
 * plus the failure path (model garbage twice → honest error).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { SpawnSection } from "../src/ai/SpawnSection";
import { useAiStore } from "../src/ai/aiStore";
import { useEditorStore } from "../src/state/store";
import { createEmptyProject } from "../src/dsl/load";

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
function jsonResponse(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
}
function ollamaReply(content: string): Response {
  return jsonResponse({ message: { content } });
}

const SPEC = {
  name: "Blinker",
  board: "arduino-uno",
  parts: [
    { ref: "R1", type: "resistor", value: "220" },
    { ref: "LED1", type: "led", value: "red" },
  ],
  connections: [
    ["board1.D13", "R1.1"],
    ["R1.2", "LED1.A"],
    ["LED1.K", "board1.GND"],
  ],
  sketch: "void setup() {}\nvoid loop() {}\n",
  bom: ["220Ω resistor", "red LED"],
  wiringSteps: ["D13 → R1.1"],
  explanation: "It blinks.",
};

afterEach(cleanup);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useEditorStore.setState({ doc: createEmptyProject(), history: { past: [], future: [] }, selection: [] });
  useAiStore.setState({ busy: false, elapsedMs: 0, attempt: 0 });
});

describe("SpawnSection", () => {
  it("generates a circuit, shows the build card, and Open in editor loads it (undoable)", async () => {
    fetchMock.mockImplementation(async () => ollamaReply(JSON.stringify(SPEC)));
    const notify = vi.fn();
    const { container, findByText, findByPlaceholderText } = render(<SpawnSection notify={notify} />);
    fireEvent.change(await findByPlaceholderText(/light alarm/), { target: { value: "blink an LED" } });
    fireEvent.click(await findByText("✨ Generate"));
    await waitFor(() => expect(container.textContent).toContain("It blinks."));
    expect(container.textContent).toContain("220Ω resistor");
    expect(container.textContent).toContain("D13 → R1.1");
    expect(container.textContent).toContain("arduino-uno");

    fireEvent.click(await findByText("Open in editor"));
    await waitFor(() => expect(useEditorStore.getState().doc.meta.name).toBe("Blinker"));
    expect(useEditorStore.getState().doc.components.length).toBe(2);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().doc.meta.name).toBe("Untitled");
  });

  it("self-repairs once and fails honestly on repeated garbage", async () => {
    fetchMock.mockResolvedValueOnce(ollamaReply("I refuse."));
    fetchMock.mockResolvedValueOnce(ollamaReply("Still not JSON."));
    const { container, findByText, findByPlaceholderText } = render(<SpawnSection notify={vi.fn()} />);
    fireEvent.change(await findByPlaceholderText(/light alarm/), { target: { value: "bogus" } });
    fireEvent.click(await findByText("✨ Generate"));
    await waitFor(() => expect(container.textContent).toContain("could not find a circuit spec"));
    expect(fetchMock.mock.calls.length).toBe(2); // one self-repair retry
    // second call carries the failure feedback
    const body = String(fetchMock.mock.calls[1][1]?.body ?? "");
    expect(body).toContain("rejected");
    expect(useAiStore.getState().busy).toBe(false);
    expect(container.textContent).toContain("✨ Generate"); // button back to idle
  });
});
