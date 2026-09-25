import { describe, expect, it } from "vitest";
import { partDef } from "../src/parts";

describe("arduino-uno R3 pinout", () => {
  const uno = partDef("arduino-uno")!;

  it("has the true R3 header set at 2.54 mm pitch (incl. SCL/SDA)", () => {
    expect(uno.pins.length).toBe(31); // 18 digital incl. SCL/SDA/AREF/GND + 7 power + 6 analog
    const ids = uno.pins.map((p) => p.id);
    for (const id of ["SCL", "SDA", "AREF", "IOREF", "GND1", "GND2", "D13", "D0", "A5", "VIN"]) {
      expect(ids, id).toContain(id);
    }
    const top = uno.pins.filter((p) => p.y < 10).sort((a, b) => a.x - b.x);
    for (let i = 1; i < top.length; i++) {
      expect(top[i]!.x - top[i - 1]!.x).toBeCloseTo(2.54, 1);
    }
  });

  it("mirrors the actual board order and header placement", () => {
    const top = uno.pins.filter((p) => p.y < 10).sort((a, b) => a.x - b.x);
    expect(top.map((p) => p.id)).toEqual([
      "SCL", "SDA", "AREF", "GND1",
      "D13", "D12", "D11", "D10", "D9", "D8",
      "D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0",
    ]);
    expect(top.find((p) => p.id === "D0")!.name).toBe("0"); // silk "0" (RX←0)
    const power = uno.pins.filter((p) => p.y > 40 && !p.id.startsWith("A")).sort((a, b) => a.x - b.x);
    expect(power.map((p) => p.id)).toEqual(["IOREF", "RST", "3V3", "5V", "GND", "GND2", "VIN"]);
    // shield-standard placement: POWER starts at 27.94, ANALOG at 50.8
    expect(power[0]!.x).toBeCloseTo(27.94, 1);
    const analog = uno.pins.filter((p) => /^A[0-5]$/.test(p.id)).sort((a, b) => a.x - b.x);
    expect(analog.map((p) => p.id)).toEqual(["A0", "A1", "A2", "A3", "A4", "A5"]);
    expect(analog[0]!.x).toBeCloseTo(50.8, 1);
  });
});
