import { describe, expect, it } from "vitest";
import { MnaSolver, type Element } from "../src/mna";

describe("MnaSolver", () => {
  it("solves a 5V 1k/1k divider to exactly 2.5 V", () => {
    const els: Element[] = [
      { kind: "vsrc", a: 1, b: 0, volts: 5 },
      { kind: "res", a: 1, b: 2, ohms: 1000 },
      { kind: "res", a: 2, b: 0, ohms: 1000 },
    ];
    const s = new MnaSolver(els, 3);
    const v = s.solveDC();
    expect(v[1]).toBeCloseTo(5, 6); /* gmin-accurate */
    expect(v[2]).toBeCloseTo(2.5, 6);
    expect((v[1] - v[2]) / 1000).toBeCloseTo(5 / 2000, 9);
  });

  it("backward-Euler RC step tracks 5(1-e^-t/τ) (τ=1ms; dt=τ/10 ⇒ ≈3.1 V)", () => {
    const els: Element[] = [
      { kind: "vsrc", a: 1, b: 0, volts: 5 },
      { kind: "res", a: 1, b: 2, ohms: 1000 },
      { kind: "cap", a: 2, b: 0, farads: 1e-6 }, /* 1 µF × 1 kΩ = τ = 1 ms */
    ];
    const s = new MnaSolver(els, 3);
    let v = s.solveInitial();
    expect(v[2]).toBeCloseTo(0, 6);
    for (let k = 0; k < 10; k++) v = s.step(0.0001); /* 1τ at dt=τ/10 (exact: 3.16) */
    expect(v[2]).toBeGreaterThan(2.8);
    expect(v[2]).toBeLessThan(3.3);
    for (let k = 0; k < 100; k++) v = s.step(0.0002); /* +20 ms = 21τ */
    expect(v[2]).toBeCloseTo(5, 2);
  });

  it("PWLed diode solves: 5V–220Ω–(vf 2.0)LED–GND ⇒ ~12 mA", () => {
    const d: Extract<Element, { kind: "diode" }> = { kind: "diode", a: 2, b: 0, vf: 2, ron: 20 };
    const els: Element[] = [
      { kind: "vsrc", a: 1, b: 0, volts: 5 },
      { kind: "res", a: 1, b: 2, ohms: 220 },
      d,
    ];
    const s = new MnaSolver(els, 3);
    const v = s.solveDC();
    expect(v[2]).toBeGreaterThan(2.0);
    expect(v[2]).toBeLessThan(2.5);
    const i = s.diodeCurrent(d);
    expect(i * 1000).toBeGreaterThan(8);
    expect(i * 1000).toBeLessThan(18);
  });

  it("thevenin source toggle changes node voltage", () => {
    const t: Extract<Element, { kind: "thev" }> = { kind: "thev", a: 1, b: 0, volts: 5, rser: 25, active: false };
    const els: Element[] = [t, { kind: "res", a: 1, b: 2, ohms: 25 }, { kind: "res", a: 2, b: 0, ohms: 10000 }];
    const s = new MnaSolver(els, 3);
    let v = s.solveDC();
    expect(v[2]).toBeCloseTo(0, 4);
    t.active = true;
    v = s.solveDC();
    expect(v[2]).toBeGreaterThan(4.8);
  });

  it("res_sw conducts only when closed (pull-down switch)", () => {
    const sw: Extract<Element, { kind: "res_sw" }> = { kind: "res_sw", a: 1, b: 0, closed: false, ohmsClosed: 1000 };
    const els: Element[] = [{ kind: "vsrc", a: 2, b: 0, volts: 5 }, { kind: "res", a: 2, b: 1, ohms: 1000 }, sw];
    const s = new MnaSolver(els, 3);
    let v = s.solveDC();
    expect(v[1]).toBeCloseTo(5, 4); /* open: pulled up through 1k */
    sw.closed = true;
    v = s.solveDC();
    expect(v[1]).toBeCloseTo(2.5, 2); /* closed: 1k/1k divider */
  });
});
