// @vitest-environment jsdom
/**
 * UI flow goldens: account popover signup + share popover wokwi import.
 * Server calls are stubbed at fetch — this exercises the real panels.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AccountPopover } from "../src/account/AccountPopover";
import { SharePopover } from "../src/topbar/SharePopover";
import { useEditorStore } from "../src/state/store";
import { createEmptyProject } from "../src/dsl/load";
import { scheduleAutosave, loadAutosave, clearAutosave, docLooksTrivial } from "../src/dsl/autosave";

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
function jsonResponse(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
}

afterEach(cleanup);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearAutosave();
  useEditorStore.setState({ doc: createEmptyProject(), history: { past: [], future: [] }, selection: [] });
});

describe("AccountPopover", () => {
  it("signs up and switches to the signed-in state", async () => {
    // fresh Response per call — a reused body can only be consumed once.
    // Start signed out; signup flips the session (mirrors the real cookie flow).
    const me = { id: "u1", handle: "alice", email: "a@b.co", verified: true };
    let signedIn = false;
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("signup")) {
        signedIn = true;
        return jsonResponse({ me }, 201);
      }
      if (u.includes("/api/me")) return signedIn ? jsonResponse({ me }) : jsonResponse({ error: "not signed in" }, 401);
      return jsonResponse({ projects: [] });
    });
    const { container, findByText, findByPlaceholderText } = render(<AccountPopover notify={vi.fn()} />);
    fireEvent.click(container.querySelector("button")!); // open popover
    fireEvent.click(await findByText("Sign up")); // switch from the default Log-in tab
    fireEvent.change(await findByPlaceholderText("email"), { target: { value: "a@b.co" } });
    fireEvent.change(await findByPlaceholderText(/handle/), { target: { value: "alice" } });
    fireEvent.change(await findByPlaceholderText(/password/), { target: { value: "long enough pw" } });
    fireEvent.click(await findByText("Create account"));
    await waitFor(() => expect(container.textContent).toContain("@alice"));
    const signupCall = fetchMock.mock.calls.find(([url]) => String(url).includes("signup"));
    expect(String(signupCall?.[0])).toBe("/api/auth/signup");
    expect(String(signupCall?.[1]?.body)).toContain('"handle":"alice"');
  });

  it("shows server errors inline", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ error: "handle is taken" }, 409));
    const { container, findByText, findByPlaceholderText } = render(<AccountPopover notify={vi.fn()} />);
    fireEvent.click(container.querySelector("button")!);
    fireEvent.click(await findByText("Sign up"));
    fireEvent.change(await findByPlaceholderText("email"), { target: { value: "a@b.co" } });
    fireEvent.change(await findByPlaceholderText(/handle/), { target: { value: "alice" } });
    fireEvent.change(await findByPlaceholderText(/password/), { target: { value: "long enough pw" } });
    fireEvent.click(await findByText("Create account"));
    await waitFor(() => expect(container.textContent).toContain("handle is taken"));
  });
});

describe("autosave", () => {
  it("persists and restores meaningful docs, ignores trivial ones", async () => {
    const doc = createEmptyProject();
    expect(docLooksTrivial(doc)).toBe(true);
    doc.boards.push({ id: "b1", type: "arduino-uno", transform: { x: 10, y: 10 } });
    expect(docLooksTrivial(doc)).toBe(false);
    scheduleAutosave(() => doc, 0);
    await waitFor(() => expect(loadAutosave()).not.toBeNull());
    expect(loadAutosave()?.boards[0]?.id).toBe("b1");
  });
});

describe("SharePopover", () => {
  it("imports a pasted wokwi diagram through the real panel", async () => {
    const notify = vi.fn();
    const { container, findByText, findByPlaceholderText } = render(<SharePopover notify={notify} />);
    fireEvent.click(container.querySelector("button")!); // open
    fireEvent.click(await findByText("⤒ Import wokwi diagram.json"));
    const diagram = {
      version: 1,
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0, attrs: {} },
        { type: "wokwi-led", id: "led1", top: -20, left: 80, attrs: {} },
      ],
      connections: [["uno:13", "led1:A", "green", []]],
    };
    fireEvent.change(await findByPlaceholderText(/paste diagram/), {
      target: { value: JSON.stringify(diagram) },
    });
    fireEvent.click(await findByText("Import"));
    await waitFor(() => expect(useEditorStore.getState().doc.boards.length).toBe(1));
    expect(useEditorStore.getState().doc.components.map((c) => c.type)).toEqual(["led"]);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("imported"));
  });
});
