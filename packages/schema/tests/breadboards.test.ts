import { describe, expect, it } from "vitest";
import { bridgeMatesOf, partDef } from "../src/parts";

describe("breadboards", () => {
  it("sizes carry real tie-point counts (170 / 400 / 830)", () => {
    const bb170 = partDef("breadboard-170")!;
    const bb400 = partDef("breadboard-400")!;
    const bb830 = partDef("breadboard-830")!;
    expect(bb170.pins.length).toBe(170); // 17 × 10, no rails
    expect(bb400.pins.length).toBe(400); // 30 × 10 + 4 × 25 rail holes
    expect(bb830.pins.length).toBe(830); // 63 × 10 + 4 × 50 rail holes
    expect(bb830.size_mm.w).toBeGreaterThan(150);
    expect(bb400.size_mm.w).toBeGreaterThan(70);
    expect(bb170.size_mm.w).toBeLessThan(55);
    expect(bb400.size_mm.h).toBe(55);
  });

  it("expresses column strips and split rails as bridges", () => {
    const bb170 = partDef("breadboard-170")!;
    const bb400 = partDef("breadboard-400")!;
    const bb830 = partDef("breadboard-830")!;
    expect(bb170.bridges!.length).toBe(17); // columns only
    expect(bb400.bridges!.length).toBe(34); // 30 columns + 4 whole rail strips
    expect(bb830.bridges!.length).toBe(71); // 63 columns + 8 rail halves
    for (const g of bb170.bridges!) expect(g.length).toBe(10);
    for (const g of bb400.bridges!.slice(30)) expect(g.length).toBe(25);
    for (const g of bb830.bridges!.slice(63)) expect(g.length).toBe(25);
  });

  it("bridgeMatesOf returns the whole strip — but never across split rails", () => {
    const col = bridgeMatesOf("breadboard-830", "c3");
    expect(col.length).toBe(10);
    expect(col).toContain("a3");
    expect(col).toContain("j3");
    const railHalf = bridgeMatesOf("breadboard-830", "nt7");
    expect(railHalf.length).toBe(25);
    expect(railHalf).toContain("nt1");
    expect(railHalf).not.toContain("nt26"); // split rails are separate conductors
    expect(bridgeMatesOf("breadboard-400", "pt3")).toContain("pt25");
    expect(bridgeMatesOf("breadboard-400", "pt3")).not.toContain("pb3");
    expect(bridgeMatesOf("resistor", "1")).toEqual([]);
  });
});
