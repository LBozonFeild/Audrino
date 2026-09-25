import { describe, expect, it } from "vitest";
import { pinLabel } from "../src/canvas/pinLabel";

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
