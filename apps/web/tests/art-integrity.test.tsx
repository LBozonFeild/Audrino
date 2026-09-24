/**
 * Art coverage + integrity: every catalog type paints real art, art factories
 * never throw, never emit NaN/Infinity, and no two art files silently override
 * each other's keys (docs/QA.md).
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PART_DEFINITIONS } from "@audrino/schema";
import { PartGlyph, LEGACY_ART, hasArt, partSize } from "../src/canvas/PartGlyph";
import { EXTRA_ART } from "../src/canvas/partsArtExtra";
import { BATCH2_ART } from "../src/canvas/partsArtBatch2";
import { BATCH3_ART } from "../src/canvas/partsArtBatch3";
import { BATCH4_ART } from "../src/canvas/partsArtBatch4";

const MAPS: [string, Record<string, unknown>][] = [
  ["LEGACY_ART", LEGACY_ART],
  ["EXTRA_ART", EXTRA_ART],
  ["BATCH2_ART", BATCH2_ART],
  ["BATCH3_ART", BATCH3_ART],
  ["BATCH4_ART", BATCH4_ART],
];

describe("art coverage", () => {
  it("paints every one of the 1000+ catalog types", () => {
    const missing = PART_DEFINITIONS.filter((d) => !hasArt(d.type)).map((d) => d.type);
    expect(missing).toEqual([]);
    expect(PART_DEFINITIONS.length).toBeGreaterThanOrEqual(1000);
  });

  it("resolves a sane size for every type", () => {
    for (const d of PART_DEFINITIONS) {
      const s = partSize(d.type);
      expect(s.w, d.type).toBeGreaterThan(0);
      expect(s.h, d.type).toBeGreaterThan(0);
    }
  });

  it("has no silent key collisions between art files (merge order must stay honest)", () => {
    for (let i = 0; i < MAPS.length; i++) {
      for (let j = i + 1; j < MAPS.length; j++) {
        const keysA = new Set(Object.keys(MAPS[i][1]));
        const shared = Object.keys(MAPS[j][1]).filter((k) => keysA.has(k));
        expect(shared, `${MAPS[i][0]} ∩ ${MAPS[j][0]}`).toEqual([]);
      }
    }
  });
});

describe("art render smoke", () => {
  it("renders every type cleanly (no throws, no NaN/Infinity in markup)", () => {
    for (const d of PART_DEFINITIONS) {
      const html = renderToStaticMarkup(
        <PartGlyph type={d.type} transform={{ x: 0, y: 0 }} values={d.defaultProps} board={d.category === "board"} />,
      );
      expect(html.length, d.type).toBeGreaterThan(80);
      expect(/NaN|Infinity|undefined/.test(html), `${d.type} produced bad markup`).toBe(false);
      const sel = renderToStaticMarkup(
        <PartGlyph type={d.type} transform={{ x: 2, y: 3, rotation_deg: 90 }} values={d.defaultProps} selected />,
      );
      expect(/NaN|Infinity|undefined/.test(sel), `${d.type} selected-state bad markup`).toBe(false);
    }
  });
});
