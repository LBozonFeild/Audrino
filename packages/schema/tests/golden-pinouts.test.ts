/**
 * Datasheet golden pinouts — the trust layer (docs/QA.md).
 *
 * Every entry below is checked against the manufacturer datasheet before it is
 * frozen here. If a definition drifts, these tests fail. If the datasheet is
 * uncertain, the part keeps numeric pins and does NOT appear here.
 *
 * Sources: TI/ON/NXP/Nexperia/Atmel-Microchip datasheets (standard pinouts).
 */
import { describe, it, expect } from "vitest";
import { partDef, PART_DEFINITIONS } from "../src/parts";

const pins = (type: string): Record<string, string> => {
  const d = partDef(type);
  if (!d) throw new Error(`missing def: ${type}`);
  return Object.fromEntries(d.pins.map((p) => [p.id, p.name]));
};

const expectMap = (type: string, expected: Record<string, string>) => {
  const got = pins(type);
  for (const [id, name] of Object.entries(expected)) {
    expect(got[id], `${type} pin ${id}`).toBe(name);
  }
};

describe("golden pinouts — timers & opamps", () => {
  it("555 family is the classic timer pinout", () => {
    const timer = { "1": "GND", "2": "TRIG", "3": "OUT", "4": "RST", "5": "CV", "6": "THR", "7": "DIS", "8": "VCC" };
    for (const type of ["ne555", "tlc555", "se555"]) {
      expect(pins(type), type).toEqual(timer);
    }
  });

  it("TL071 single opamp (DIP-8): null1/IN-/IN+/V-/null2/OUT/V+/NC", () => {
    expect(pins("tl071")).toEqual({ "1": "BAL", "2": "IN-", "3": "IN+", "4": "V-", "5": "BAL2", "6": "OUT", "7": "V+", "8": "NC" });
  });

  it("NE5534 matches TL071 but pin 8 is COMP", () => {
    expect(pins("ne5534")).toEqual({ "1": "BAL", "2": "IN-", "3": "IN+", "4": "V-", "5": "BAL2", "6": "OUT", "7": "V+", "8": "COMP" });
  });

  it("AD620/INA128 instrumentation amps share the IA pinout", () => {
    const ia = { "1": "RG", "2": "IN-", "3": "IN+", "4": "V-", "5": "REF", "6": "OUT", "7": "V+", "8": "RG2" };
    expect(pins("ad620")).toEqual(ia);
    expect(pins("ina128")).toEqual(ia);
  });

  it("LM358/LM393 duals (DIP-8): OUT1/IN1-/IN1+/GND/IN2+/IN2-/OUT2/VCC", () => {
    const dual = { "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "GND", "5": "IN2+", "6": "IN2-", "7": "OUT2", "8": "VCC" };
    expect(pins("lm358")).toEqual(dual);
    expect(pins("lm393")).toEqual(dual);
  });

  it("LM324 quad opamp (DIP-14)", () => {
    expect(pins("lm324")).toEqual({
      "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "VCC", "5": "IN2+", "6": "IN2-", "7": "OUT2",
      "8": "OUT3", "9": "IN3-", "10": "IN3+", "11": "GND", "12": "IN4+", "13": "IN4-", "14": "OUT4",
    });
  });

  it("LM339 quad comparator (DIP-14) — the odd output numbering is real", () => {
    expect(pins("lm339")).toEqual({
      "1": "OUT2", "2": "OUT1", "3": "VCC", "4": "IN1-", "5": "IN1+", "6": "IN2-", "7": "IN2+",
      "8": "IN3-", "9": "IN3+", "10": "IN4-", "11": "IN4+", "12": "GND", "13": "OUT4", "14": "OUT3",
    });
  });
});

describe("golden pinouts — boards & MCU", () => {
  it("ATmega328P DIP-28 power/clock/serial pins", () => {
    expectMap("atmega328p-dip", {
      "1": "RST", "2": "RXD", "3": "TXD", "7": "VCC", "8": "GND",
      "9": "XTAL1", "10": "XTAL2", "20": "AVCC", "21": "AREF", "22": "GND",
      "27": "SDA", "28": "SCL",
    });
  });

  it("UNO keeps its frozen M0 working-subset headers (see docs/QA.md)", () => {
    const got = pins("arduino-uno");
    expect(Object.keys(got).sort()).toEqual(
      [
        "A0", "A1", "A2", "A3", "A4", "A5",
        "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13",
        "GND", "RST", "3V3", "5V", "VIN",
      ].sort(),
    );
    expect(got.VIN).toBe("Vin");
    expect(got.RST).toBe("Reset");
  });
});

describe("golden pinouts — discretes (flat face, leads down, left to right)", () => {
  it("2N3904/2N3906/2N2222 TO-92 are E-B-C", () => {
    for (const type of ["2n3904", "2n3906", "2n2222"]) {
      expect(pins(type), type).toEqual({ E: "Emitter", B: "Base", C: "Collector" });
    }
  });

  it("BC546/547/548/549/557/BC337 TO-92 are C-B-E (Nexperia)", () => {
    for (const type of ["bc546", "bc547", "bc548", "bc549", "bc557", "bc337"]) {
      expect(Object.keys(pins(type)), type).toEqual(["C", "B", "E"]);
    }
  });

  it("2N7000 TO-92 is S-G-D", () => {
    expect(Object.keys(pins("2n7000"))).toEqual(["S", "G", "D"]);
  });

  it("TIP31C/TIP41C TO-220 are B-C-E", () => {
    expect(Object.keys(pins("tip31c"))).toEqual(["B", "C", "E"]);
    expect(Object.keys(pins("tip41c"))).toEqual(["B", "C", "E"]);
  });

  it("IRF MOSFETs TO-220 are G-D-S, and 2N3055 exposes its case collector", () => {
    for (const type of ["irf540n", "irfz44n", "irf3205", "irf9540n", "irf5210", "irlz44n"]) {
      expect(Object.keys(pins(type)), type).toEqual(["G", "D", "S"]);
    }
    expect(pins("2n3055")).toEqual({ B: "Base", E: "Emitter", C: "Case" });
  });

  it("LED is A/K and passives keep their frozen 1/2 ids", () => {
    expect(pins("led")).toEqual({ A: "Anode", K: "Cathode" });
    expect(pins("resistor")).toEqual({ "1": "1", "2": "2" });
    expect(pins("pushbutton")).toEqual({ "1": "1", "2": "2" });
    expect(pins("crystal-16mhz")).toEqual({ "1": "1", "2": "2" });
    expect(Object.keys(pins("sg90-servo")).sort()).toEqual(["GND", "PWM", "VCC"]);
  });
});

describe("golden pinouts — regulators & memories", () => {
  it("78xx TO-220 is IN/GND/OUT; 79xx is GND/IN/OUT (both real)", () => {
    expect(Object.keys(pins("l7805"))).toEqual(["IN", "GND", "OUT"]);
    expect(Object.keys(pins("l7905"))).toEqual(["GND", "IN", "OUT"]);
  });

  it("LM2576 TO-220-5 is Vin/Out/GND/FB/ON", () => {
    expect(Object.keys(pins("lm2576"))).toEqual(["IN", "OUT", "GND", "FB", "ON"]);
  });

  it("24Cxx I2C EEPROM is A0/A1/A2/GND/SDA/SCL/WP/VCC", () => {
    expect(pins("24c02")).toEqual({ "1": "A0", "2": "A1", "3": "A2", "4": "GND", "5": "SDA", "6": "SCL", "7": "WP", "8": "VCC" });
  });

  it("25AAxx SPI EEPROM is /CS/SO//WP/GND/SI/SCK//HOLD/VCC", () => {
    expect(pins("25aa010")).toEqual({ "1": "/CS", "2": "SO", "3": "/WP", "4": "GND", "5": "SI", "6": "SCK", "7": "/HOLD", "8": "VCC" });
  });

  it("static RAM/ROM supply rails", () => {
    expectMap("6116", { "12": "GND", "24": "VCC" });
    expectMap("6264", { "14": "GND", "28": "VCC" });
    expectMap("27c256", { "14": "GND", "28": "VCC" });
    expectMap("74hc00", { "7": "GND", "14": "VCC" });
    expectMap("mc34063", { "4": "4", "6": "6" }); // numeric-only by policy
  });
});

describe("golden pinouts — sensors & modules (set-level where headers are vendor-specific)", () => {
  it("DS18B20 TO-92 is GND/DQ/VDD and LM35 is Vs/Vout/GND", () => {
    expect(Object.keys(pins("ds18b20"))).toEqual(["GND", "DQ", "VCC"]);
    expect(Object.keys(pins("lm35"))).toEqual(["VCC", "OUT", "GND"]);
  });

  it("DHT11/DHT22 modules are VCC/DATA/GND", () => {
    for (const type of ["dht11", "dht22"]) {
      expect(Object.keys(pins(type)), type).toEqual(["VCC", "DATA", "GND"]);
    }
  });

  it("HC-SR04 is VCC/GND/TRIG/ECHO", () => {
    expect(Object.keys(pins("hc-sr04"))).toEqual(["VCC", "GND", "TRIG", "ECHO"]);
  });

  it("WS2812 5050 carries VCC/GND/DIN/DOUT", () => {
    expect(pins("ws2812")).toEqual({ VCC: "5V", GND: "GND", DIN: "Data in", DOUT: "Data out" });
  });

  it("I2C modules carry exactly the {VCC, GND, SCL, SDA} set", () => {
    for (const type of ["oled-ssd1306", "lcd1602-i2c", "bmp280", "mpu6050"]) {
      expect(Object.keys(pins(type)).sort(), type).toEqual(["GND", "SCL", "SDA", "VCC"]);
    }
  });

  it("SHT1x keeps numeric leads (order not certain in datasheet)", () => {
    expect(Object.keys(pins("sht11"))).toEqual(["1", "2", "3", "4"]);
  });
});

describe("golden values — family parametrics", () => {
  it("zener voltage codes parse numerically (10v → 10, 2v4 → 2.4)", () => {
    expect(partDef("zener-10v")!.defaultProps.zener_voltage_V).toBe(10);
    expect(partDef("zener-2v4")!.defaultProps.zener_voltage_V).toBe(2.4);
    expect(partDef("zener-3v3")!.defaultProps.zener_voltage_V).toBe(3.3);
    for (const d of PART_DEFINITIONS.filter((x) => typeof x.defaultProps.zener_voltage_V === "number")) {
      const v = d.defaultProps.zener_voltage_V as number;
      expect(v, d.type).toBeGreaterThan(0.5);
      expect(v, d.type).toBeLessThan(200);
    }
  });

  it("78xx/79xx output voltage equals the code (7805 → 5)", () => {
    expect(partDef("l7805")!.defaultProps.output_voltage_V).toBe(5);
    expect(partDef("l7824")!.defaultProps.output_voltage_V).toBe(24);
    expect(partDef("l7905")!.defaultProps.output_voltage_V).toBe(5);
    expect(partDef("l7905")!.defaultProps.rail).toBe("negative");
  });
});

describe("golden pinouts — bus logic (TI/CD4000 datasheets)", () => {
  it("74240/241/244 use the crossed octal layout (pin 3 = 2Y4, 18 = 1Y1)", () => {
    expect(pins("74244")).toEqual({
      "1": "/1OE", "2": "1A1", "3": "2Y4", "4": "1A2", "5": "2Y3", "6": "1A3", "7": "2Y2", "8": "1A4", "9": "2Y1", "10": "GND",
      "11": "2A1", "12": "1Y4", "13": "2A2", "14": "1Y3", "15": "2A3", "16": "1Y2", "17": "2A4", "18": "1Y1", "19": "/2OE", "20": "VCC",
    });
    expect(pins("74240")["3"]).toBe("2Y4");
    expect(pins("74241")["1"]).toBe("/1OE");
    expect(pins("74241")["19"]).toBe("2OE"); // 241's second OE is active-high
  });

  it("74245 is the straight transceiver (A1-8 / B8-1)", () => {
    expect(pins("74245")).toEqual({
      "1": "DIR", "2": "A1", "3": "A2", "4": "A3", "5": "A4", "6": "A5", "7": "A6", "8": "A7", "9": "A8", "10": "GND",
      "11": "B8", "12": "B7", "13": "B6", "14": "B5", "15": "B4", "16": "B3", "17": "B2", "18": "B1", "19": "/OE", "20": "VCC",
    });
  });

  it("7420/7421/7422 dual-4 TTL put outputs at 6/8 with NC on 3/11", () => {
    expect(pins("7420")).toEqual({
      "1": "1A", "2": "1B", "3": "NC", "4": "1C", "5": "1D", "6": "1Y", "7": "GND", "8": "2Y", "9": "2A", "10": "2B", "11": "NC", "12": "2C", "13": "2D", "14": "VCC",
    });
  });

  it("CD4002/4012/4082 dual-4 CMOS put outputs at 1/13 with NC on 6/8", () => {
    const dual4cd = { "1": "1Y", "2": "1A", "3": "1B", "4": "1C", "5": "1D", "6": "NC", "7": "VSS", "8": "NC", "9": "2D", "10": "2C", "11": "2B", "12": "2A", "13": "2Y", "14": "VDD" };
    for (const type of ["cd4002", "cd4012", "cd4082"]) {
      expect(pins(type), type).toEqual(dual4cd);
    }
  });

  it("7474 dual D-FF and 7410 triple-3 keep their classic layouts", () => {
    expect(pins("7474")).toEqual({
      "1": "/1R", "2": "1D", "3": "1CLK", "4": "/1S", "5": "1Q", "6": "/1Q", "7": "GND",
      "8": "/2Q", "9": "2Q", "10": "/2S", "11": "2CLK", "12": "2D", "13": "/2R", "14": "VCC",
    });
    expect(pins("7410")).toEqual({
      "1": "1A", "2": "1B", "3": "2A", "4": "2B", "5": "2C", "6": "2Y", "7": "GND",
      "8": "3Y", "9": "3A", "10": "3B", "11": "3C", "12": "1Y", "13": "1C", "14": "VCC",
    });
  });
});

describe("golden pinouts — analog & modules (datasheets)", () => {
  const defOf = (t: string) => {
    const d = PART_DEFINITIONS.find((x) => x.type === t);
    if (!d) throw new Error(`missing ${t}`);
    return d;
  };
  const xNames = (t: string) => defOf(t).pins.slice().sort((a, b) => a.x - b.x || a.y - b.y).map((p) => p.name);
  const yNames = (t: string) => defOf(t).pins.slice().sort((a, b) => a.y - b.y || a.x - b.x).map((p) => p.name);

  it("TO-92 thermal sensors read +Vs, Vout, GND (ADI TMP35/36/37, Microchip MCP9700)", () => {
    expect(xNames("tmp36")).toEqual(["VCC", "VOUT", "GND"]);
    expect(xNames("mcp9700")).toEqual(["VCC", "VOUT", "GND"]);
    expect(xNames("lm35")).toEqual(["VCC", "OUT", "GND"]);
  });

  it("servo leads run GND, VCC, Signal (brown/red/orange) on every servo", () => {
    expect(xNames("mg90s")).toEqual(["GND", "VIN", "PWM"]);
    expect(xNames("servo-mg996r")).toEqual(["GND", "VIN", "PWM"]);
    expect(yNames("sg90-servo")).toEqual(["GND", "+5V", "Signal"]);
    expect(pins("servo-conn")).toEqual({ GND: "GND", VCC: "+5V", S: "Signal" });
    expect(xNames("fan-5v")).toEqual(["GND", "VIN", "PWM"]);
  });

  it("discrete leads: BC547 CBE, 2N3904 EBC, 2N7000 SGD, BD13x ECB, TYN612 K-A-G", () => {
    expect(xNames("bc547")).toEqual(["Collector", "Base", "Emitter"]);
    expect(xNames("2n3904")).toEqual(["Emitter", "Base", "Collector"]);
    expect(xNames("2n7000")).toEqual(["S", "G", "D"]);
    expect(xNames("bd139")).toEqual(["Emitter", "Collector", "Base"]);
    expect(xNames("bd140").map((n) => n[0])).toEqual(xNames("bd139").map((n) => n[0]));
    expect(xNames("tyn612")).toEqual(["Cathode", "Anode", "Gate"]);
    expect(xNames("hall-a3144")).toEqual(["VCC", "GND", "OUT"]);
  });

  it("MAX6675 cold-junction converter (Maxim datasheet)", () => {
    expect(pins("max6675")).toEqual({
      "1": "GND", "2": "T-", "3": "T+", "4": "VCC", "5": "SCK", "6": "CS", "7": "SO", "8": "NC",
    });
  });

  it("IR2110 half-bridge driver: pin 5 is VS, never GND", () => {
    expect(pins("ir2110")).toEqual({
      "1": "LO", "2": "COM", "3": "VCC", "4": "NC", "5": "VS", "6": "VB", "7": "HO", "8": "NC",
      "9": "VDD", "10": "HIN", "11": "SD", "12": "LIN", "13": "VSS", "14": "NC",
    });
  });

  it("TLP250 gate-drive optocoupler (Toshiba datasheet)", () => {
    expect(pins("tlp250")).toEqual({
      "1": "NC", "2": "A", "3": "K", "4": "NC", "5": "GND", "6": "VO", "7": "VO", "8": "VCC",
    });
  });

  it("MCP23017 DIP-28 (Microchip datasheet): 9=VDD, 10=VSS, 12=SCL, 13=SDA", () => {
    expect(pins("mcp23017")["9"]).toBe("VDD");
    expect(pins("mcp23017")["10"]).toBe("VSS");
    expect(pins("mcp23017")["12"]).toBe("SCL");
    expect(pins("mcp23017")["13"]).toBe("SDA");
    expect(pins("mcp23017")["1"]).toBe("GPB0");
    expect(pins("mcp23017")["28"]).toBe("GPA7");
  });

  it("MAX485 / LM386 / UC3842 / MCP3008 power-and-signal pins", () => {
    expect(pins("max485")).toEqual({
      "1": "RO", "2": "/RE", "3": "DE", "4": "DI", "5": "GND", "6": "A", "7": "B", "8": "VCC",
    });
    expect(pins("lm386")["4"]).toBe("GND");
    expect(pins("lm386")["5"]).toBe("VOUT");
    expect(pins("uc3842")["5"]).toBe("GND");
    expect(pins("mcp3008")["9"]).toBe("DGND");
    expect(pins("mcp3008")["14"]).toBe("AGND");
    expect(pins("mcp3008")["16"]).toBe("VDD");
  });

  it("StepStick drivers carry their logic supply (VDD/VIO) and both grounds", () => {
    const a = defOf("a4988");
    expect(a.pins).toHaveLength(16);
    const ids = new Set(a.pins.map((p) => p.id));
    for (const id of ["VMOT", "VDD", "GND", "GND2", "1A", "1B", "2A", "2B", "DIR", "STEP", "EN"]) {
      expect(ids.has(id), `a4988 ${id}`).toBe(true);
    }
    expect(defOf("drv8825").pins).toHaveLength(16);
    expect(new Set(defOf("tmc2208").pins.map((p) => p.id)).has("VIO")).toBe(true);
  });
});
