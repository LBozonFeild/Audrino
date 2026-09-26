// @vitest-environment jsdom
/**
 * Home page + hash routing goldens: the landing screen offers New / Continue /
 * sign-in, and hands an explicitly chosen doc to the editor without letting
 * the autosave restore clobber it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "../src/Root";
import { routeFromHash } from "../src/nav";
import { clearAutosave } from "../src/dsl/autosave";
import { createEmptyProject } from "../src/dsl/load";
import * as ops from "../src/state/ops";
import { useEditorStore } from "../src/state/store";

const AUTOSAVE_KEY = "audrino-autosave-v1";

const seedAutosave = () => {
  const r = ops.place(createEmptyProject(), "component", "resistor", 100, 200);
  if (!r.doc) throw new Error(r.error ?? "place failed");
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(r.doc));
  return r.doc;
};

/** Flush async effects, then push the hashchange the hash setter queued. */
const flushRoute = async () => {
  await act(async () => {
    window.dispatchEvent(new Event("hashchange"));
    await new Promise((r) => setTimeout(r, 0));
  });
};

beforeEach(() => {
  cleanup();
  clearAutosave();
  window.location.hash = "";
  useEditorStore.setState({ doc: createEmptyProject(), history: { past: [], future: [] }, selection: [] });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ error: "not signed in" }), { status: 401 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("routeFromHash", () => {
  it("sends empty/plain hashes home and p-links/editor to the editor", () => {
    expect(routeFromHash("")).toBe("home");
    expect(routeFromHash("#")).toBe("home");
    expect(routeFromHash("#/")).toBe("home");
    expect(routeFromHash("#home-auth")).toBe("home");
    expect(routeFromHash("#/editor")).toBe("editor");
    expect(routeFromHash("#p=v1z.abc")).toBe("editor");
  });
});

describe("Home", () => {
  it("lands on the home page, not the editor", async () => {
    render(<Root />);
    await flushRoute();
    expect(screen.getByText("New project")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
    expect(document.querySelector(".palette")).toBeNull();
    expect(document.querySelector(".topbar")).toBeNull();
  });

  it("New project opens an empty editor even when an autosave exists", async () => {
    seedAutosave();
    render(<Root />);
    await flushRoute();
    fireEvent.click(screen.getByText(/Create project/));
    await flushRoute();

    expect(document.querySelector(".topbar")).not.toBeNull();
    expect(document.querySelector(".palette")).not.toBeNull();
    // pending hand-off wins over the stored autosave
    expect(useEditorStore.getState().doc.components).toHaveLength(0);
  });

  it("Continue resumes the autosaved project", async () => {
    const seeded = seedAutosave();
    render(<Root />);
    await flushRoute();
    fireEvent.click(screen.getByText(/Resume where you left off/));
    await flushRoute();

    expect(document.querySelector(".topbar")).not.toBeNull();
    expect(useEditorStore.getState().doc.components).toHaveLength(1);
    expect(useEditorStore.getState().doc.components[0].type).toBe(seeded.components[0].type);
  });

  it("shows the sign-in form when logged out", async () => {
    render(<Root />);
    await flushRoute();
    expect(screen.getByPlaceholderText("email")).toBeTruthy();
    expect(screen.getByPlaceholderText("password (10+ characters)")).toBeTruthy();
    expect(screen.getByText("Sign up")).toBeTruthy();
    expect(screen.getAllByText("Log in").length).toBeGreaterThanOrEqual(1);
  });

  it("share links (#p=…) route straight to the editor", async () => {
    window.location.hash = "#p=v1p.bm90aGluZw";
    render(<Root />);
    await flushRoute();
    expect(document.querySelector(".topbar")).not.toBeNull();
    expect(document.querySelector(".palette")).not.toBeNull();
  });
});
