// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AiPanel } from "../src/ai/AiPanel";
import { parseFix, buildRepairMessages, netlistSummary, aiChat, aiDoctor } from "../src/ai/aiClient";
import { unifiedDiff, diffLines } from "../src/ai/diff";
import { useAiStore, DEFAULT_MODELS } from "../src/ai/aiStore";
import { handleAiChat, handleAiDoctor } from "../src/server/ai-proxy";
import { useEditorStore } from "../src/state/store";
import { createEmptyProject } from "../src/dsl/load";
import { useSimStore } from "../src/sim/SimProvider";
import type { Project } from "@audrino/schema";

const FIX_SKETCH = "void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n}\n";

function jsonResponse(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
}

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

afterEach(cleanup);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAiStore.getState().captureError(null, "runtime");
  useAiStore.getState().reject();
  useSimStore.getState().reset();
  useEditorStore.setState({ doc: createEmptyProject(), history: { past: [], future: [] }, selection: [] });
});

describe("parseFix", () => {
  it("parses a bare JSON reply", () => {
    const r = parseFix(
      JSON.stringify({ diagnosis: "pin mode missing", sketch: FIX_SKETCH, notes: ["use OUTPUT"] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fix.diagnosis).toBe("pin mode missing");
      expect(r.fix.sketch).toContain("pinMode(13, OUTPUT)");
      expect(r.fix.notes).toEqual(["use OUTPUT"]);
    }
  });

  it("parses a fenced json reply and fenced sketch reply", () => {
    const a = parseFix('Here you go:\n```json\n{"diagnosis":"d","sketch":"void setup() {}\\nvoid loop() {}\\n"}\n```');
    expect(a.ok).toBe(true);
    const b = parseFix("Fixed it.\n```arduino\nvoid setup() {\n}\n\nvoid loop() {\n}\n```\n");
    expect(b.ok).toBe(true);
    if (b.ok) expect(b.fix.sketch).toContain("void loop()");
  });

  it("parses a bare sketch and rejects prose-only replies", () => {
    const a = parseFix("void setup() {\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n}\n");
    expect(a.ok).toBe(true);
    const b = parseFix("I think the LED is wired backwards.");
    expect(b.ok).toBe(false);
  });
});

describe("diff + prompts", () => {
  it("unifiedDiff keeps changed lines with context only", () => {
    const before = "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\nl\n";
    const after = "a\nb\nc\nd\ne\nX\nf\ng\nh\ni\nj\nk\nl\n";
    const d = unifiedDiff(before, after, 1);
    expect(d.some((l) => l.type === "add" && l.text === "X")).toBe(true); // insert before f
    expect(d.some((l) => l.type === "same" && l.text === "f")).toBe(true); // context after
    expect(d.some((l) => l.type === "same" && l.text === "e")).toBe(true); // context before
    expect(d.some((l) => l.text === "a")).toBe(false); // far context dropped
    expect(diffLines("x", "x y").map((l) => l.type)).toEqual(["del", "add"]);
  });

  it("repair messages carry error, sketch, and circuit summary", () => {
    const msgs = buildRepairMessages({
      boardName: "Arduino Uno",
      fqbn: "arduino:avr:uno",
      fileName: "sketch.ino",
      sketch: FIX_SKETCH,
      problem: "LED stays dark",
      errorKind: "compile",
      errorMessage: "exit status 1\nfoo.cpp:3: error",
      serialTail: ["[100.0 ms] hi"],
      simSummary: "D13={\"mode\":\"output\"}",
      netlistSummary: "part LED1 (led)",
    });
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].content).toContain("Arduino Uno");
    expect(msgs[1].content).toContain("foo.cpp:3: error");
    expect(msgs[1].content).toContain("LED stays dark");
    expect(msgs[1].content).toContain("part LED1 (led)");
    expect(msgs[1].content).toContain("pinMode(13, OUTPUT)");
  });
});

describe("ai proxy", () => {
  it("forwards OpenAI BYOK keys and returns text (key never echoed)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ choices: [{ message: { content: '{"diagnosis":"d","sketch":"void setup() {}\\nvoid loop() {}\\n"}' } }] }),
    );
    const r = await handleAiChat(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "sk-secret-123",
        messages: [{ role: "user", content: "fix" }],
      },
      fetchMock,
    );
    expect(r.status).toBe(200);
    expect(String((r.json as { text: string }).text)).toContain("diagnosis");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("api.openai.com/v1/chat/completions");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer sk-secret-123");
    expect(JSON.stringify(r.json)).not.toContain("sk-secret-123");
  });

  it("maps Anthropic shape and missing-key errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ content: [{ type: "text", text: "ok" }] }));
    const ok = await handleAiChat(
      { provider: "anthropic", model: "claude-sonnet-4-5", apiKey: "k", messages: [{ role: "user", content: "hi" }] },
      fetchMock,
    );
    expect((ok.json as { text: string }).text).toBe("ok");
    const noKey = await handleAiChat(
      { provider: "anthropic", model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hi" }] },
      fetchMock,
    );
    expect(noKey.status).toBe(401);
  });

  it("doctor lists Ollama models and reports unreachable endpoints", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ models: [{ name: "qwen2.5-coder:7b" }, { name: "llama3.2:3b" }] }));
    const ok = await handleAiDoctor({ provider: "ollama" }, fetchMock);
    expect(ok.json).toMatchObject({ ok: true, models: ["qwen2.5-coder:7b", "llama3.2:3b"] });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const bad = await handleAiDoctor({ provider: "ollama" }, fetchMock);
    expect(bad.json).toMatchObject({ ok: false });
    expect(String((bad.json as { error: string }).error)).toContain("unreachable");
  });
});

describe("client transport", () => {
  it("talks to local Ollama directly and falls back with CORS guidance", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: { content: "hello" } }));
    const r = await aiChat({
      provider: "ollama",
      model: "m",
      ollamaUrl: "http://127.0.0.1:11434",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(r.text).toBe("hello");
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://127.0.0.1:11434/api/chat");

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(
      aiChat({ provider: "ollama", model: "m", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/OLLAMA_ORIGINS/);

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, models: [], latencyMs: 5 }));
    const d = await aiDoctor({ provider: "ollama", ollamaViaServer: true, ollamaUrl: "http://x" });
    expect(String(fetchMock.mock.calls[2][0])).toBe("/api/ai/doctor");
    expect(d.ok).toBe(true);
  });
});

describe("AiPanel repair loop", () => {
  function seedDoc(): Project {
    const { doc } = useEditorStore.getState();
    return doc;
  }

  it("shows the sim error chip, requests a fix, previews a diff, and Apply updates code (undoable)", async () => {
    const doc = seedDoc();
    useSimStore.setState({ status: "error", error: "exit status 1: expected ';' before '}'" });
    const notify = vi.fn();
    const { container, findByText } = render(<AiPanel notify={notify} />);

    await waitFor(() => expect(container.textContent).toContain("sim error attached"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        message: {
          content: JSON.stringify({
            diagnosis: "missing semicolon",
            sketch: FIX_SKETCH,
            notes: ["watch your braces"],
          }),
        },
      }),
    );

    fireEvent.click(await findByText("✨ Fix with AI"));
    await waitFor(() => expect(container.querySelector(".ai-diff")).not.toBeNull());
    const boxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    fireEvent.click(boxes[1]); // "re-run after apply" off — no sim worker in jsdom
    expect(container.textContent).toContain("missing semicolon");
    expect(container.textContent).toContain("watch your braces");
    expect(container.querySelector(".dl-add")?.textContent).toContain("+");

    fireEvent.click(await findByText("Apply fix"));
    const name = doc.code.main;
    await waitFor(() =>
      expect(useEditorStore.getState().doc.code.files[name]).toContain("pinMode(13, OUTPUT)"),
    );

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().doc.code.files[name]).not.toContain("pinMode(13, OUTPUT)");
    expect(useAiStore.getState().proposed).toBeNull();
  });

  it("rejects an empty problem and a garbage model reply", async () => {
    const notify = vi.fn();
    const { container, findByText } = render(<AiPanel notify={notify} />);
    fireEvent.click(await findByText("✨ Fix with AI"));
    await waitFor(() => expect(container.textContent).toContain("Describe the problem"));

    fireEvent.change(container.querySelector("textarea")!, { target: { value: "LED is dark" } });
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: { content: "I cannot help with that." } }));
    fireEvent.click(await findByText("✨ Fix with AI"));
    await waitFor(() => expect(container.textContent).toContain("could not find a fixed sketch"));
    expect(useAiStore.getState().busy).toBe(false);
  });

  it("doctor fills models via the provider path", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ models: [{ name: "qwen2.5-coder:7b" }, { name: "qwen2.5-coder:3b" }] }));
    const { container, findByText } = render(<AiPanel notify={vi.fn()} />);
    fireEvent.click(await findByText("Test connection"));
    await waitFor(() => expect(container.textContent).toContain("2 model(s)"));
    const opts = [...container.querySelectorAll("#ai-model-list option")].map((o) => o.getAttribute("value"));
    expect(opts).toContain("qwen2.5-coder:3b");
    expect(DEFAULT_MODELS.ollama).toBe("qwen2.5-coder:7b");
  });
});
