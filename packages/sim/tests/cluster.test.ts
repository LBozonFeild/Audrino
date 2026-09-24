import { describe, expect, it } from "vitest";
import { MnaSolver, type Element } from "../src/mna";
import { ClusteredSolver } from "../src/cluster";

const twoDividers = (): Element[] => [
  { kind: "vsrc", a: 1, b: 0, volts: 5 },
  { kind: "res", a: 1, b: 2, ohms: 1000 },
  { kind: "res", a: 2, b: 0, ohms: 1000 },
  { kind: "vsrc", a: 3, b: 0, volts: 5 },
  { kind: "res", a: 3, b: 4, ohms: 2000 },
  { kind: "res", a: 4, b: 0, ohms: 2000 },
];

describe("ClusteredSolver", () => {
  it("splits independent subcircuits and matches the monolithic solve", () => {
    const els = twoDividers();
    const mono = new MnaSolver(els.map((e) => ({ ...e })), 5).solveDC();
    const cs = new ClusteredSolver(twoDividers(), 5);
    expect(cs.clusterCount).toBe(2);
    const v = cs.solveDC();
    expect(v[2]).toBeCloseTo(mono[2], 12);
    expect(v[4]).toBeCloseTo(mono[4], 12);
    expect(v[2]).toBeCloseTo(2.5, 6);
    expect(v[4]).toBeCloseTo(2.5, 6);
  });

  it("solveDirty re-solves only marked clusters", () => {
    const els = twoDividers();
    const cs = new ClusteredSolver(els, 5);
    cs.solveDC();
    /* change cluster 2's ratio: 2k/2k -> 2k/1k (edit the resistor) */
    (els[5] as Extract<Element, { kind: "res" }>).ohms = 1000;
    /* without markDirty, the old voltage persists */
    cs.solveDC();
    expect(cs.v[4]).toBeCloseTo(2.5, 6);
    cs.markDirty(els[5]);
    cs.solveDC();
    expect(cs.v[4]).toBeCloseTo(5 * (1 / 3), 4); /* 2k over 1k from 5 V */
    expect(cs.v[2]).toBeCloseTo(2.5, 6); /* untouched cluster kept */
  });

  it("grounds-only elements stay inert and isolated", () => {
    const els: Element[] = [
      { kind: "res", a: 0, b: 0, ohms: 100 },
      { kind: "vsrc", a: 1, b: 0, volts: 5 },
      { kind: "res", a: 1, b: 2, ohms: 1000 },
    ];
    const cs = new ClusteredSolver(els, 3);
    expect(cs.clusterCount).toBe(2);
    const v = cs.solveDC();
    expect(v[2]).toBeCloseTo(5, 4); /* open end follows the source */
  });
});
