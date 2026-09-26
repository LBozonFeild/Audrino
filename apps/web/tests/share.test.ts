import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { encodeShare, decodeShare, tokenFromHash, MAX_TOKEN } from "../src/dsl/share";
import { createEmptyProject } from "../src/dsl/load";

describe("share snapshot links", () => {
  it("round-trips a project through the URL token (compressed when available)", async () => {
    const doc = createEmptyProject();
    doc.meta.name = "Shared blink";
    const token = await encodeShare(doc);
    expect(token).toBeTruthy();
    expect(token!.length).toBeLessThan(MAX_TOKEN);
    expect(token!.startsWith("v1z.")).toBe(true); // CompressionStream exists in this runtime
    const back = await decodeShare(token!);
    expect(back?.meta.name).toBe("Shared blink");
  });

  it("falls back to plain tokens without CompressionStream and still round-trips", async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const c = g.CompressionStream;
    const d = g.DecompressionStream;
    delete g.CompressionStream;
    delete g.DecompressionStream;
    try {
      const doc = createEmptyProject();
      doc.meta.name = "Plain path";
      const token = await encodeShare(doc);
      expect(token!.startsWith("v1p.")).toBe(true);
      const back = await decodeShare(token!);
      expect(back?.meta.name).toBe("Plain path");
    } finally {
      g.CompressionStream = c;
      g.DecompressionStream = d;
    }
  });

  it("refuses oversized projects and damaged tokens", async () => {
    const doc = createEmptyProject();
    // true high-entropy payload — repeats and LCG noise deflate far too well
    doc.code.files["sketch.ino"] = crypto.randomBytes(80_000).toString("base64");
    expect(await encodeShare(doc)).toBeNull();
    expect(await decodeShare("v1z.AAAA")).toBeNull();
    expect(await decodeShare("garbage")).toBeNull();
    expect(tokenFromHash("#p=v1z.abc-def_GHI")).toBe("v1z.abc-def_GHI");
    expect(tokenFromHash("#other")).toBeNull();
    expect(tokenFromHash("#p=toolong")).toBeNull();
  });
});
