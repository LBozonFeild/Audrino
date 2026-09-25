import { describe, expect, it } from "vitest";
import { partNameLabel, PIN_HIT_S, PIN_PAD_S, pinLabel } from "../src/canvas/pinLabel";

describe("pinLabel", () => {
  it("prefers the short silk name, falls back to the id", () => {
    expect(pinLabel("D0", "0")).toBe("0"); // uno digital silk
    expect(pinLabel("VIN", "Vin")).toBe("Vin");
    expect(pinLabel("GND", "GND")).toBe("GND");
    expect(pinLabel("RST", "Reset")).toBe("Reset");
    expect(pinLabel("A3", "A3")).toBe("A3");
    expect(pinLabel("A", "Anode")).toBe("Anode"); // ≤5 chars keeps the name
    expect(pinLabel("sig", "Signal Output")).toBe("sig"); // overlong name → id
  });
});

describe("pad geometry + part labels", () => {
  it("hit boxes never overlap at the 2.54 mm minimum pitch", () => {
    expect(PIN_PAD_S).toBeLessThan(PIN_HIT_S);
    expect(PIN_HIT_S).toBeLessThan(2.54);
    expect(PIN_PAD_S).toBeGreaterThan(1);
  });

  it("part labels read like Tinkercad name plates", () => {
    expect(partNameLabel("R1", { resistance_ohms: 220 })).toBe("R1 · 220Ω");
    expect(partNameLabel("R2", { resistance_ohms: 4700 })).toBe("R2 · 4.7kΩ");
    expect(partNameLabel("R3", { resistance_ohms: 1000000 })).toBe("R3 · 1MΩ");
    expect(partNameLabel("C1", { capacitance_f: 1e-7 })).toBe("C1 · 100nF");
    expect(partNameLabel("LED1", { color: "red" })).toBe("LED1 · red");
    expect(partNameLabel("U1", {})).toBe("U1");
  });
});
