import { describe, expect, it } from "vitest";
import { partDef } from "../src/parts";

describe("arduino-uno R3 pinout", () => {
  const uno = partDef("arduino-uno")!;

  it("has the full R3 header set at 2.54 mm pitch", () => {
    expect(uno.pins.length).toBe(29); // 16 digital incl. AREF/GND + 7 power + 6 analog
    const ids = uno.pins.map((p) => p.id);
    for (const id of ["AREF", "IOREF", "GND1", "GND2", "D13", "D0", "A5", "VIN"]) {
      expect(ids, id).toContain(id);
    }
    const top = uno.pins.filter((p) => p.y < 10).sort((a, b) => a.x - b.x);
    for (let i = 1; i < top.length; i++) {
      expect(top[i]!.x - top[i - 1]!.x).toBeCloseTo(2.54, 1);
    }
  });

  it("mirrors real silkscreen order: AREF GND 13…TX→1 RX←0 · IOREF…Vin · A0–A5", () => {
    const top = uno.pins.filter((p) => p.y < 10).sort((a, b) => a.x - b.x);
    expect(top.map((p) => p.id)).toEqual([
      "AREF",
      "GND1",
      "D13",
      "D12",
      "D11",
      "D10",
      "D9",
      "D8",
      "D7",
      "D6",
      "D5",
      "D4",
      "D3",
      "D2",
      "D1",
      "D0",
    ]);
    expect(top[0]!.name).toBe("AREF");
    expect(top[top.length - 1]!.name).toBe("0"); // silk "0" (RX←0)
    const power = uno.pins.filter((p) => p.y > 40 && !p.id.startsWith("A")).sort((a, b) => a.x - b.x);
    expect(power.map((p) => p.id)).toEqual(["IOREF", "RST", "3V3", "5V", "GND", "GND2", "VIN"]);
    const analog = uno.pins.filter((p) => p.id.startsWith("A") && p.id !== "AREF").sort((a, b) => a.x - b.x);
    expect(analog.map((p) => p.id)).toEqual(["A0", "A1", "A2", "A3", "A4", "A5"]);
  });
});
