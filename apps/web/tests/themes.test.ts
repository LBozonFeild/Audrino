/**
 * Theme quality bar — every theme is complete, parseable, and keeps text
 * readable (WCAG contrast floors).
 */
import { describe, it, expect } from "vitest";
import { THEMES } from "../src/theme";

const HEX = /^#[0-9a-fA-F]{6}$/;

const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(n >> 16) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const COLOR_KEYS = ["bg", "canvas", "gridDot", "panel", "panel2", "border", "fg", "dim", "accent", "accent2", "accentInk", "ok", "danger", "input", "hover", "wire"] as const;

describe("themes", () => {
  it("has 40+ unique themes", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(THEMES.length);
  });

  it("every theme defines every var as a 6-digit hex color", () => {
    for (const theme of THEMES) {
      for (const key of COLOR_KEYS) {
        const v = theme.vars[key];
        expect(typeof v, `${theme.id}.${key}`).toBe("string");
        expect(HEX.test(v), `${theme.id}.${key} = ${v}`).toBe(true);
      }
      expect(theme.vars.shadow.length, `${theme.id}.shadow`).toBeGreaterThan(0);
    }
  });

  it("keeps primary text readable (WCAG AA 4.5:1)", () => {
    for (const theme of THEMES) {
      expect(contrast(theme.vars.fg, theme.vars.bg), `${theme.id} fg/bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.vars.fg, theme.vars.panel), `${theme.id} fg/panel`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.vars.accentInk, theme.vars.accent), `${theme.id} ink/accent`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps secondary text and wires perceivable (3:1)", () => {
    for (const theme of THEMES) {
      expect(contrast(theme.vars.dim, theme.vars.panel), `${theme.id} dim/panel`).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.vars.wire, theme.vars.canvas), `${theme.id} wire/canvas`).toBeGreaterThanOrEqual(3);
    }
  });
});
