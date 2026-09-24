// PartDefinition tables — real pinouts + bbox geometry in mm (PLAN §5 PartVisual prep).
// M1 lifts this module into packages/parts. Pin ids for the original M0 fixture
// types (arduino-uno, led, resistor, pushbutton, sg90-servo) are frozen by tests.

import { buildFamilyDefs } from "./partFamilies";

export type PartCategory =
  | "board"
  | "led-display"
  | "passive"
  | "semiconductor"
  | "ic"
  | "sensor"
  | "input"
  | "output"
  | "module"
  | "connector"
  | "display"
  | "motor"
  | "power";

export interface PartPin {
  id: string;
  name: string;
  /** mm within the part bbox (origin top-left, y down). */
  x: number;
  y: number;
}

export interface PartDefinition {
  type: string;
  label: string;
  category: PartCategory;
  size_mm: { w: number; h: number };
  pins: PartPin[];
  defaultProps: Record<string, unknown>;
  /** Groups of pin ids internally commoned by the part (breadboard strips:
   *  column tie-points and power-rail halves). Net builders union these so a
   *  wire landing on any hole of a strip reaches every hole of that strip. */
  bridges?: string[][];
}

type PinSpec = string | [string, string];

const px = (id: string, name: string, x: number, y: number): PartPin => ({ id, name, x, y });

const row = (items: PinSpec[], y: number, x0: number, x1: number): PartPin[] =>
  items.map((item, i) => {
    const [id, name] = typeof item === "string" ? [item, item] : item;
    const x = items.length === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (items.length - 1);
    return px(id, name, x, y);
  });

const col = (items: PinSpec[], x: number, y0: number, y1: number): PartPin[] =>
  items.map((item, i) => {
    const [id, name] = typeof item === "string" ? [item, item] : item;
    const y = items.length === 1 ? (y0 + y1) / 2 : y0 + ((y1 - y0) * i) / (items.length - 1);
    return px(id, name, x, y);
  });

/** DIP package: 1..n/2 down the left edge, n..n/2+1 down the right (CCW). */
const dipPins = (n: number, w: number, h: number, names: Record<string, string> = {}): PartPin[] => {
  const half = n / 2;
  const left = Array.from({ length: half }, (_, i) => String(i + 1));
  const right = Array.from({ length: half }, (_, i) => String(n - i));
  return [
    ...col(left.map((id) => [id, names[id] ?? id] as PinSpec), 0, 2.6, h - 2.6),
    ...col(right.map((id) => [id, names[id] ?? id] as PinSpec), w, 2.6, h - 2.6),
  ];
};

const BASE_DEFS: PartDefinition[] = [
  // ------------------------------------------------------------------ boards
  {
    type: "arduino-uno",
    label: "UNO",
    category: "board",
    size_mm: { w: 69, h: 54 },
    pins: [
      ...row(["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13"], 2.2, 15, 65),
      ...row([["VIN", "Vin"], ["GND", "GND"], ["5V", "5V"], ["3V3", "3V3"], ["RST", "Reset"]], 51.8, 13, 31),
      ...row(["A0", "A1", "A2", "A3", "A4", "A5"], 51.8, 36, 62),
    ],
    defaultProps: {},
  },
  {
    type: "arduino-nano",
    label: "NANO",
    category: "board",
    size_mm: { w: 45, h: 19 },
    pins: [
      ...col(["D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13"], 2.2, 2, 17),
      ...col(["GND", "RST", "5V", "3V3", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"], 42.8, 2, 17),
    ],
    defaultProps: {},
  },
  {
    type: "esp32-devkit",
    label: "ESP32",
    category: "board",
    size_mm: { w: 52, h: 30 },
    pins: [
      ...col(["3V3", "EN", "VP", "VN", "34", "35", "32", "33", "25", "26", "27", "14"], 2.2, 3, 27),
      ...col(["12", "13", "GND", "23", "22", "TXD", "RXD", "21", "19", "18", "5", "17"], 49.8, 3, 27),
    ],
    defaultProps: {},
  },
  {
    type: "esp8266-nodemcu",
    label: "NODE",
    category: "board",
    size_mm: { w: 49, h: 26 },
    pins: [
      ...col(["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7"], 2.2, 3, 23),
      ...col(["A0", "EN", "RST", "3V3", "GND", "VIN", "TX", "RX"], 46.8, 3, 23),
    ],
    defaultProps: {},
  },
  {
    type: "rp-pico",
    label: "PICO",
    category: "board",
    size_mm: { w: 51, h: 21 },
    pins: [
      ...col(["GP0", "GP1", "GP2", "GP3", "GP4", "GP5", "GP6", "GP7", "GP8", "GP9"], 2.2, 2, 19),
      ...col(["GP10", "GP11", "GP12", "GP13", "GND", "RUN", "3V3", "3V3_EN", "VSYS", "VBUS"], 48.8, 2, 19),
    ],
    defaultProps: {},
  },
  // ---------------------------------------------------------- leds/displays
  {
    type: "led",
    label: "LED",
    category: "led-display",
    size_mm: { w: 12, h: 16 },
    pins: [px("A", "Anode", 3, 16), px("K", "Cathode", 9, 16)],
    defaultProps: { color: "red" },
  },
  {
    type: "rgb-led",
    label: "RGB",
    category: "led-display",
    size_mm: { w: 14, h: 18 },
    pins: row(["R", "G", "B", ["K", "Common cathode"]], 18, 2, 12),
    defaultProps: {},
  },
  {
    type: "ws2812",
    label: "5050",
    category: "led-display",
    size_mm: { w: 12, h: 12 },
    pins: [px("VCC", "5V", 2, 0), px("GND", "GND", 2, 12), px("DIN", "Data in", 10, 0), px("DOUT", "Data out", 10, 12)],
    defaultProps: {},
  },
  {
    type: "oled-ssd1306",
    label: "OLED",
    category: "led-display",
    size_mm: { w: 30, h: 28 },
    pins: row(["GND", "VCC", "SCL", "SDA"], 28, 6, 24),
    defaultProps: {},
  },
  {
    type: "lcd1602-i2c",
    label: "LCD16x2",
    category: "led-display",
    size_mm: { w: 60, h: 32 },
    pins: row(["VCC", "GND", "SDA", "SCL"], 32, 6, 24),
    defaultProps: {},
  },
  {
    type: "max7219-matrix",
    label: "MATRIX",
    category: "led-display",
    size_mm: { w: 32, h: 32 },
    pins: row(["VCC", "GND", "DIN", "CS", "CLK"], 32, 6, 26),
    defaultProps: {},
  },
  {
    type: "tm1637",
    label: "TM1637",
    category: "led-display",
    size_mm: { w: 24, h: 14 },
    pins: row(["VCC", "GND", "CLK", "DIO"], 14, 4.5, 19.5),
    defaultProps: {},
  },
  {
    type: "neopixel-ring8",
    label: "RING8",
    category: "led-display",
    size_mm: { w: 24, h: 24 },
    pins: row(["VCC", "GND", "DIN", "DOUT"], 24, 6, 18),
    defaultProps: {},
  },
  {
    type: "seven-segment",
    label: "7SEG",
    category: "led-display",
    size_mm: { w: 18, h: 26 },
    pins: [...row(["10", "9", "8", "7", "6"], 0, 3, 15), ...row(["1", "2", "3", "4", "5"], 26, 3, 15)],
    defaultProps: {},
  },
  // ---------------------------------------------------------------- passives
  {
    type: "resistor",
    label: "R",
    category: "passive",
    size_mm: { w: 22, h: 8 },
    pins: [px("1", "1", 0, 4), px("2", "2", 22, 4)],
    defaultProps: { resistance_ohms: 220 },
  },
  {
    type: "capacitor",
    label: "C",
    category: "passive",
    size_mm: { w: 12, h: 10 },
    pins: [px("1", "1", 4, 10), px("2", "2", 8, 10)],
    defaultProps: { capacitance_uF: 0.1 },
  },
  {
    type: "electrolytic-capacitor",
    label: "ELKO",
    category: "passive",
    size_mm: { w: 12, h: 16 },
    pins: [px("+", "Positive", 4, 16), px("-", "Negative", 8, 16)],
    defaultProps: { capacitance_uF: 100, nominal_voltage_V: 16 },
  },
  {
    type: "inductor",
    label: "L",
    category: "passive",
    size_mm: { w: 16, h: 10 },
    pins: [px("1", "1", 0, 5), px("2", "2", 16, 5)],
    defaultProps: {},
  },
  {
    type: "diode",
    label: "D",
    category: "passive",
    size_mm: { w: 16, h: 6 },
    pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)],
    defaultProps: {},
  },
  {
    type: "ldr",
    label: "LDR",
    category: "passive",
    size_mm: { w: 12, h: 14 },
    pins: [px("1", "1", 4, 14), px("2", "2", 8, 14)],
    defaultProps: {},
  },
  {
    type: "thermistor",
    label: "NTC",
    category: "passive",
    size_mm: { w: 10, h: 12 },
    pins: [px("1", "1", 3, 12), px("2", "2", 7, 12)],
    defaultProps: { resistance_ohms: 10000 },
  },
  {
    type: "potentiometer",
    label: "POT",
    category: "passive",
    size_mm: { w: 12, h: 14 },
    pins: [px("1", "CCW", 2, 14), px("2", "Wiper", 6, 14), px("3", "CW", 10, 14)],
    defaultProps: {},
  },
  {
    type: "panel-pot",
    label: "KNOB",
    category: "passive",
    size_mm: { w: 16, h: 16 },
    pins: [px("1", "CCW", 4, 16), px("2", "Wiper", 8, 16), px("3", "CW", 12, 16)],
    defaultProps: {},
  },
  {
    type: "crystal-16mhz",
    label: "XTAL",
    category: "passive",
    size_mm: { w: 14, h: 8 },
    pins: [px("1", "1", 0, 5), px("2", "2", 14, 5)],
    defaultProps: {},
  },
  {
    type: "breadboard-mini",
    label: "BB",
    category: "passive",
    size_mm: { w: 30, h: 24 },
    pins: [...row(["a1", "a2", "a3", "a4", "a5"], 9, 5, 25), ...row(["b1", "b2", "b3", "b4", "b5"], 15, 5, 25)],
    defaultProps: {},
  },
  // ----------------------------------------------------------- semiconductors
  {
    type: "transistor-npn",
    label: "NPN",
    category: "semiconductor",
    size_mm: { w: 12, h: 12 },
    pins: [px("E", "Emitter", 3, 12), px("B", "Base", 6, 12), px("C", "Collector", 9, 12)],
    defaultProps: {},
  },
  {
    type: "transistor-pnp",
    label: "PNP",
    category: "semiconductor",
    size_mm: { w: 12, h: 12 },
    pins: [px("E", "Emitter", 3, 12), px("B", "Base", 6, 12), px("C", "Collector", 9, 12)],
    defaultProps: {},
  },
  {
    type: "mosfet-n",
    label: "MOSFET",
    category: "semiconductor",
    size_mm: { w: 12, h: 16 },
    pins: [px("G", "Gate", 3, 16), px("D", "Drain", 6, 16), px("S", "Source", 9, 16)],
    defaultProps: {},
  },
  {
    type: "regulator-7805",
    label: "7805",
    category: "semiconductor",
    size_mm: { w: 12, h: 16 },
    pins: [px("IN", "Input", 3, 16), px("GND", "GND", 6, 16), px("OUT", "Output", 9, 16)],
    defaultProps: {},
  },
  // ---------------------------------------------------------------------- ic
  {
    type: "ne555",
    label: "555",
    category: "ic",
    size_mm: { w: 14, h: 12 },
    pins: dipPins(8, 14, 12, { "1": "GND", "2": "TRIG", "3": "OUT", "4": "RST", "5": "CV", "6": "THR", "7": "DIS", "8": "VCC" }),
    defaultProps: {},
  },
  {
    type: "74hc595",
    label: "595",
    category: "ic",
    size_mm: { w: 16, h: 16 },
    pins: dipPins(16, 16, 16, { "1": "Q1", "2": "Q2", "3": "Q3", "4": "Q4", "5": "Q5", "6": "Q6", "7": "Q7", "8": "GND", "9": "Q7S", "10": "RCLK", "11": "SRCLK", "12": "SRCLR", "13": "OE", "14": "SER", "15": "Q0", "16": "VCC" }),
    defaultProps: {},
  },
  {
    type: "uln2003",
    label: "ULN",
    category: "ic",
    size_mm: { w: 16, h: 16 },
    pins: dipPins(16, 16, 16, { "8": "GND", "9": "COM", "10": "7C", "11": "6C", "12": "5C", "13": "4C", "14": "3C", "15": "2C", "16": "1C" }),
    defaultProps: {},
  },
  {
    type: "opto-4n35",
    label: "4N35",
    category: "ic",
    size_mm: { w: 12, h: 12 },
    pins: dipPins(6, 12, 12, { "1": "Anode", "2": "Cathode", "3": "NC", "4": "Emitter", "5": "Collector", "6": "Base" }),
    defaultProps: {},
  },
  {
    type: "atmega328p-dip",
    label: "328P",
    category: "ic",
    size_mm: { w: 20, h: 20 },
    pins: dipPins(28, 20, 20, { "1": "RST", "2": "RXD", "3": "TXD", "7": "VCC", "8": "GND", "9": "XTAL1", "10": "XTAL2", "20": "AVCC", "21": "AREF", "22": "GND", "27": "SDA", "28": "SCL" }),
    defaultProps: {},
  },
  // ------------------------------------------------------------------ sensor
  {
    type: "hc-sr04",
    label: "SR04",
    category: "sensor",
    size_mm: { w: 42, h: 22 },
    pins: row(["VCC", "GND", "TRIG", "ECHO"], 22, 9, 33),
    defaultProps: {},
  },
  {
    type: "dht11",
    label: "DHT11",
    category: "sensor",
    size_mm: { w: 14, h: 20 },
    pins: row(["VCC", "DATA", "GND"], 20, 3.5, 10.5),
    defaultProps: { nominal_voltage_V: 5 },
  },
  {
    type: "dht22",
    label: "DHT22",
    category: "sensor",
    size_mm: { w: 16, h: 22 },
    pins: row(["VCC", "DATA", "GND"], 22, 4, 12),
    defaultProps: { nominal_voltage_V: 5 },
  },
  {
    type: "bmp280",
    label: "BMP280",
    category: "sensor",
    size_mm: { w: 18, h: 16 },
    pins: row(["VCC", "GND", "SCL", "SDA"], 16, 3.5, 14.5),
    defaultProps: {},
  },
  {
    type: "lm35",
    label: "LM35",
    category: "sensor",
    size_mm: { w: 10, h: 12 },
    pins: row(["VCC", "OUT", "GND"], 12, 3, 7),
    defaultProps: {},
  },
  {
    type: "ds18b20",
    label: "DS18B20",
    category: "sensor",
    size_mm: { w: 10, h: 12 },
    pins: row(["GND", "DQ", "VCC"], 12, 3, 7),
    defaultProps: {},
  },
  {
    type: "mq-2",
    label: "MQ-2",
    category: "sensor",
    size_mm: { w: 20, h: 22 },
    pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16),
    defaultProps: { nominal_voltage_V: 5 },
  },
  {
    type: "mq-135",
    label: "MQ-135",
    category: "sensor",
    size_mm: { w: 20, h: 22 },
    pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16),
    defaultProps: { nominal_voltage_V: 5 },
  },
  {
    type: "vl53l0x",
    label: "VL53",
    category: "sensor",
    size_mm: { w: 14, h: 12 },
    pins: row(["VIN", "GND", "SDA", "SCL"], 12, 2.5, 11.5),
    defaultProps: {},
  },
  {
    type: "sound-sensor",
    label: "MIC",
    category: "sensor",
    size_mm: { w: 20, h: 14 },
    pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 14, 4, 16),
    defaultProps: {},
  },
  {
    type: "water-level",
    label: "LEVEL",
    category: "sensor",
    size_mm: { w: 30, h: 20 },
    pins: row(["VCC", "GND", "AO"], 20, 9, 21),
    defaultProps: {},
  },
  {
    type: "soil-moisture",
    label: "SOIL",
    category: "sensor",
    size_mm: { w: 30, h: 24 },
    pins: row(["VCC", "GND", "AO", "DO"], 0, 6, 24),
    defaultProps: {},
  },
  {
    type: "rain-sensor",
    label: "RAIN",
    category: "sensor",
    size_mm: { w: 32, h: 18 },
    pins: row(["VCC", "GND", "AO", "DO"], 18, 8, 24),
    defaultProps: {},
  },
  {
    type: "flame-sensor",
    label: "FLAME",
    category: "sensor",
    size_mm: { w: 18, h: 12 },
    pins: row(["VCC", "GND", "AO", "DO"], 12, 3.5, 14.5),
    defaultProps: {},
  },
  {
    type: "hall-a3144",
    label: "A3144",
    category: "sensor",
    size_mm: { w: 10, h: 12 },
    pins: row(["VCC", "GND", "OUT"], 12, 3, 7),
    defaultProps: {},
  },
  {
    type: "acs712",
    label: "ACS712",
    category: "sensor",
    size_mm: { w: 22, h: 16 },
    pins: [px("IP+", "Current in +", 0, 5), px("IP-", "Current in −", 0, 11), ...row(["VCC", "GND", "OUT"], 16, 5, 17)],
    defaultProps: {},
  },
  {
    type: "mlx90614",
    label: "IR-THERM",
    category: "sensor",
    size_mm: { w: 14, h: 16 },
    pins: row(["VCC", "GND", "SCL", "SDA"], 16, 2.5, 11.5),
    defaultProps: {},
  },
  {
    type: "pulse-sensor",
    label: "PULSE",
    category: "sensor",
    size_mm: { w: 16, h: 16 },
    pins: row(["VCC", "GND", "S"], 16, 4.5, 11.5),
    defaultProps: {},
  },
  {
    type: "pir",
    label: "PIR",
    category: "sensor",
    size_mm: { w: 28, h: 28 },
    pins: row(["VCC", "GND", "OUT"], 28, 8, 20),
    defaultProps: {},
  },
  {
    type: "ir-receiver",
    label: "IR",
    category: "sensor",
    size_mm: { w: 10, h: 12 },
    pins: row(["VCC", "GND", "DATA"], 12, 2.5, 7.5),
    defaultProps: {},
  },
  {
    type: "mpu6050",
    label: "GY-521",
    category: "sensor",
    size_mm: { w: 18, h: 16 },
    pins: row(["VCC", "GND", "SCL", "SDA"], 16, 3.5, 14.5),
    defaultProps: {},
  },
  // ------------------------------------------------------------------- input
  {
    type: "pushbutton",
    label: "BTN",
    category: "input",
    size_mm: { w: 14, h: 14 },
    pins: [px("1", "1", 0, 7), px("2", "2", 14, 7)],
    defaultProps: {},
  },
  {
    type: "toggle-switch",
    label: "SW",
    category: "input",
    size_mm: { w: 14, h: 12 },
    pins: [px("1", "1", 4, 12), px("2", "2", 10, 12)],
    defaultProps: {},
  },
  {
    type: "rotary-encoder",
    label: "ENC",
    category: "input",
    size_mm: { w: 16, h: 16 },
    pins: row(["CLK", "DT", "SW", "+", "GND"], 16, 2, 14),
    defaultProps: {},
  },
  {
    type: "joystick",
    label: "JOY",
    category: "input",
    size_mm: { w: 22, h: 22 },
    pins: row(["VCC", "GND", "VRx", "VRy", "SW"], 22, 2.5, 19.5),
    defaultProps: {},
  },
  {
    type: "keypad-4x4",
    label: "KEYPAD",
    category: "input",
    size_mm: { w: 40, h: 40 },
    pins: row(["R1", "R2", "R3", "R4", "C1", "C2", "C3", "C4"], 40, 5, 35),
    defaultProps: {},
  },
  {
    type: "touch-ttp223",
    label: "TOUCH",
    category: "input",
    size_mm: { w: 14, h: 10 },
    pins: row(["VCC", "GND", "IO"], 10, 3.5, 10.5),
    defaultProps: {},
  },
  {
    type: "limit-switch",
    label: "ENDSTOP",
    category: "input",
    size_mm: { w: 16, h: 16 },
    pins: row(["COM", "NO", "NC"], 16, 4, 12),
    defaultProps: {},
  },
  {
    type: "reed-switch",
    label: "REED",
    category: "input",
    size_mm: { w: 14, h: 6 },
    pins: [px("1", "1", 0, 3), px("2", "2", 14, 3)],
    defaultProps: {},
  },
  {
    type: "dip-switch-4",
    label: "DIP-4",
    category: "input",
    size_mm: { w: 16, h: 8 },
    pins: [...row(["8", "7", "6", "5"], 0, 3, 13), ...row(["1", "2", "3", "4"], 8, 3, 13)],
    defaultProps: {},
  },
  {
    type: "ir-remote",
    label: "REMOTE",
    category: "input",
    size_mm: { w: 14, h: 30 },
    pins: [px("VCC", "Battery +", 5, 30), px("GND", "Battery −", 9, 30)],
    defaultProps: {},
  },
  // ------------------------------------------------------------------ output
  {
    type: "sg90-servo",
    label: "SG90",
    category: "output",
    size_mm: { w: 34, h: 24 },
    pins: [px("GND", "GND", 34, 5), px("VCC", "+5V", 34, 12), px("PWM", "Signal", 34, 19)],
    defaultProps: { angle_deg: 90 },
  },
  {
    type: "mg996r-servo",
    label: "MG996",
    category: "output",
    size_mm: { w: 40, h: 28 },
    pins: [px("GND", "GND", 40, 6), px("VCC", "+5V", 40, 14), px("PWM", "Signal", 40, 22)],
    defaultProps: { angle_deg: 90 },
  },
  {
    type: "dc-motor",
    label: "MOTOR",
    category: "output",
    size_mm: { w: 24, h: 18 },
    pins: [px("1", "+", 8, 18), px("2", "-", 16, 18)],
    defaultProps: {},
  },
  {
    type: "stepper-28byj",
    label: "28BYJ",
    category: "output",
    size_mm: { w: 30, h: 24 },
    pins: col(["IN1", "IN2", "IN3", "IN4", "VCC", "GND"], 30, 3, 21),
    defaultProps: {},
  },
  {
    type: "buzzer",
    label: "BZ",
    category: "output",
    size_mm: { w: 12, h: 12 },
    pins: [px("+", "Positive", 4, 12), px("-", "Negative", 8, 12)],
    defaultProps: {},
  },
  {
    type: "speaker",
    label: "SPK",
    category: "output",
    size_mm: { w: 18, h: 18 },
    pins: [px("1", "+", 7, 18), px("2", "-", 11, 18)],
    defaultProps: {},
  },
  {
    type: "vibration-motor",
    label: "VIBRA",
    category: "output",
    size_mm: { w: 14, h: 12 },
    pins: [px("1", "+", 5, 12), px("2", "-", 9, 12)],
    defaultProps: {},
  },
  {
    type: "relay-module",
    label: "RELAY",
    category: "output",
    size_mm: { w: 36, h: 28 },
    pins: [...row(["VCC", "GND", "IN"], 28, 5, 15), px("COM", "Common", 36, 6.5), px("NO", "Normally open", 36, 14), px("NC", "Normally closed", 36, 21.5)],
    defaultProps: {},
  },
  {
    type: "l298n",
    label: "L298N",
    category: "output",
    size_mm: { w: 40, h: 32 },
    pins: [
      ...row(["OUT1", "OUT2", "OUT3", "OUT4"], 0, 5, 32),
      ...col([["IN+", "+12V"], "GND", ["IN-", "+5V"]], 0, 8, 24),
      ...row(["ENA", "IN1", "IN2", "IN3", "IN4", "ENB"], 32, 4, 36),
    ],
    defaultProps: {},
  },
  // ------------------------------------------------------------------ module
  {
    type: "lm2596-buck",
    label: "BUCK",
    category: "module",
    size_mm: { w: 30, h: 20 },
    pins: [px("IN+", "IN +", 0, 6), px("IN-", "IN −", 0, 14), px("OUT+", "OUT +", 30, 6), px("OUT-", "OUT −", 30, 14)],
    defaultProps: {},
  },
  {
    type: "tp4056",
    label: "TP4056",
    category: "module",
    size_mm: { w: 18, h: 12 },
    pins: [px("IN+", "USB +", 0, 3), px("IN-", "USB −", 0, 9), px("B+", "Batt +", 18, 3), px("B-", "Batt −", 18, 9)],
    defaultProps: {},
  },
  {
    type: "nrf24l01",
    label: "NRF24",
    category: "module",
    size_mm: { w: 16, h: 24 },
    pins: row(["GND", "VCC", "CE", "CSN", "SCK", "MOSI", "MISO", "IRQ"], 24, 2, 14),
    defaultProps: {},
  },
  {
    type: "hc-05",
    label: "HC-05",
    category: "module",
    size_mm: { w: 35, h: 16 },
    pins: row(["VCC", "GND", "TXD", "RXD"], 16, 10, 28),
    defaultProps: {},
  },
  {
    type: "sd-module",
    label: "MICROSD",
    category: "module",
    size_mm: { w: 24, h: 22 },
    pins: row(["VCC", "GND", "MOSI", "MISO", "SCK", "CS"], 22, 3, 21),
    defaultProps: {},
  },
  {
    type: "ds3231-rtc",
    label: "DS3231",
    category: "module",
    size_mm: { w: 22, h: 28 },
    pins: row(["32K", "SQW", "SCL", "SDA", "VCC", "GND"], 28, 2.5, 19.5),
    defaultProps: {},
  },
  // -------------------------------------------------------------------- power
  {
    type: "battery-9v",
    label: "9V",
    category: "power",
    size_mm: { w: 18, h: 28 },
    pins: [px("+", "Positive", 7, 0), px("-", "Negative", 12, 0)],
    defaultProps: { nominal_voltage_V: 9 },
  },
  {
    type: "cr2032",
    label: "2032",
    category: "power",
    size_mm: { w: 22, h: 22 },
    pins: [px("+", "Positive", 8, 22), px("-", "Negative", 14, 22)],
    defaultProps: { nominal_voltage_V: 3 },
  },
  {
    type: "battery-2xaa",
    label: "2xAA",
    category: "power",
    size_mm: { w: 24, h: 16 },
    pins: [px("+", "Positive", 9, 16), px("-", "Negative", 15, 16)],
    defaultProps: { nominal_voltage_V: 3 },
  },
  {
    type: "battery-18650",
    label: "18650",
    category: "power",
    size_mm: { w: 40, h: 16 },
    pins: [px("-", "Negative", 8, 16), px("+", "Positive", 32, 16)],
    defaultProps: { nominal_voltage_V: 3.7 },
  },
  {
    type: "solar-panel",
    label: "SOLAR",
    category: "power",
    size_mm: { w: 30, h: 22 },
    pins: [px("+", "Positive", 12, 22), px("-", "Negative", 18, 22)],
    defaultProps: { nominal_voltage_V: 6 },
  },
  // ------------------------------------------------------ batch 2: analog ICs
  { type: "ua741", label: "741", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "2": "IN-", "3": "IN+", "4": "V-", "6": "OUT", "7": "V+" }), defaultProps: {} },
  { type: "lm358", label: "358", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "GND", "5": "IN2+", "6": "IN2-", "7": "OUT2", "8": "VCC" }), defaultProps: {} },
  { type: "lm393", label: "393", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "GND", "5": "IN2+", "6": "IN2-", "7": "OUT2", "8": "VCC" }), defaultProps: {} },
  { type: "lm339", label: "339", category: "ic", size_mm: { w: 16, h: 14 }, pins: dipPins(14, 16, 14, { "1": "OUT2", "2": "OUT1", "3": "VCC", "4": "IN1-", "5": "IN1+", "6": "IN2-", "7": "IN2+", "8": "IN3-", "9": "IN3+", "10": "IN4-", "11": "IN4+", "12": "GND", "13": "OUT4", "14": "OUT3" }), defaultProps: {} },
  { type: "lm324", label: "324", category: "ic", size_mm: { w: 16, h: 14 }, pins: dipPins(14, 16, 14, { "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "VCC", "5": "IN2+", "6": "IN2-", "7": "OUT2", "8": "OUT3", "9": "IN3-", "10": "IN3+", "11": "GND", "12": "IN4+", "13": "IN4-", "14": "OUT4" }), defaultProps: {} },
  { type: "tl072", label: "072", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "V-", "5": "IN2+", "6": "IN2-", "7": "OUT2", "8": "V+" }), defaultProps: {} },
  { type: "tl084", label: "084", category: "ic", size_mm: { w: 16, h: 14 }, pins: dipPins(14, 16, 14), defaultProps: {} },
  { type: "ca3140", label: "3140", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "2": "IN-", "3": "IN+", "4": "V-", "6": "OUT", "7": "V+" }), defaultProps: {} },
  { type: "op07", label: "OP07", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12), defaultProps: {} },
  { type: "ne556", label: "556", category: "ic", size_mm: { w: 16, h: 14 }, pins: dipPins(14, 16, 14), defaultProps: {} },
  { type: "icm7555", label: "7555", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "GND", "2": "TRIG", "3": "OUT", "4": "RST", "5": "CV", "6": "THR", "7": "DIS", "8": "VCC" }), defaultProps: {} },
  { type: "max232", label: "232", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "max485", label: "485", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "RO", "2": "/RE", "3": "DE", "4": "DI", "5": "GND", "6": "A", "7": "B", "8": "VCC" }), defaultProps: {} },
  { type: "sp3485", label: "3485", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "RO", "2": "RE", "3": "DE", "4": "DI", "6": "A", "7": "B" }), defaultProps: {} },
  { type: "tja1050", label: "1050", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "TXD", "4": "RXD", "6": "CANL", "7": "CANH" }), defaultProps: {} },
  { type: "mcp3008", label: "3008", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16, { "1": "CH0", "2": "CH1", "3": "CH2", "4": "CH3", "5": "CH4", "6": "CH5", "7": "CH6", "8": "CH7", "9": "DGND", "10": "CS", "11": "DIN", "12": "DOUT", "13": "CLK", "14": "AGND", "15": "VREF", "16": "VDD" }), defaultProps: {} },
  { type: "mcp4922", label: "4922", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12), defaultProps: {} },
  { type: "dac0808", label: "0808", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "lm386", label: "386", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "GAIN", "2": "IN-", "3": "IN+", "4": "GND", "5": "VOUT", "6": "VS", "7": "BYP", "8": "GAIN2" }), defaultProps: {} },
  { type: "tda2030", label: "2030", category: "ic", size_mm: { w: 12, h: 16 }, pins: row([["IN+", "Non-inv"], ["IN-", "Inv"], ["V-", "V-"], ["OUT", "Out"], ["V+", "V+"]], 16, 1.5, 10.5), defaultProps: {} },
  { type: "pt2399", label: "2399", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "xr2206", label: "2206", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "icl7107", label: "7107", category: "ic", size_mm: { w: 26, h: 24 }, pins: dipPins(40, 26, 24), defaultProps: {} },
  { type: "tl494", label: "494", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "sg3525", label: "3525", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "uc3842", label: "3842", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "COMP", "2": "FB", "3": "CS", "4": "RTCT", "5": "GND", "6": "OUT", "7": "VCC", "8": "VREF" }), defaultProps: {} },
  { type: "max6675", label: "6675", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "GND", "2": "T-", "3": "T+", "4": "VCC", "5": "SCK", "6": "CS", "7": "SO", "8": "NC" }), defaultProps: {} },
  // ------------------------------------------------------ batch 2: system ICs
  { type: "pcf8574", label: "8574", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16, { "4": "SDA", "5": "SCL", "15": "INT" }), defaultProps: {} },
  { type: "mcp23017", label: "23017", category: "ic", size_mm: { w: 20, h: 20 }, pins: dipPins(28, 20, 20, { "1": "GPB0", "2": "GPB1", "3": "GPB2", "4": "GPB3", "5": "GPB4", "6": "GPB5", "7": "GPB6", "8": "GPB7", "9": "VDD", "10": "VSS", "11": "NC", "12": "SCL", "13": "SDA", "14": "NC", "15": "A0", "16": "A1", "17": "A2", "18": "/RESET", "19": "INTB", "20": "INTA", "21": "GPA0", "22": "GPA1", "23": "GPA2", "24": "GPA3", "25": "GPA4", "26": "GPA5", "27": "GPA6", "28": "GPA7" }), defaultProps: {} },
  { type: "ds1307", label: "1307", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "5": "SDA", "6": "SCL", "8": "VCC", "4": "GND", "3": "VBAT" }), defaultProps: {} },
  { type: "at89c51", label: "89C51", category: "ic", size_mm: { w: 26, h: 24 }, pins: dipPins(40, 26, 24), defaultProps: {} },
  { type: "attiny85", label: "T85", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "RST", "2": "PB3", "3": "PB4", "5": "PB0", "6": "PB1", "7": "PB2", "8": "VCC", "4": "GND" }), defaultProps: {} },
  { type: "attiny13", label: "T13", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12), defaultProps: {} },
  { type: "pic16f877a", label: "877A", category: "ic", size_mm: { w: 26, h: 24 }, pins: dipPins(40, 26, 24), defaultProps: {} },
  { type: "24c02", label: "24C02", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "A0", "2": "A1", "3": "A2", "4": "GND", "5": "SDA", "6": "SCL", "7": "WP", "8": "VCC" }), defaultProps: {} },
  { type: "24c256", label: "24C256", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "5": "SDA", "6": "SCL", "8": "VCC", "7": "WP" }), defaultProps: {} },
  { type: "w25q16", label: "W25Q", category: "ic", size_mm: { w: 14, h: 12 }, pins: dipPins(8, 14, 12, { "1": "CS", "2": "DO", "5": "DI", "6": "CLK" }), defaultProps: {} },
  { type: "62256", label: "62256", category: "ic", size_mm: { w: 20, h: 20 }, pins: dipPins(28, 20, 20), defaultProps: {} },
  { type: "uln2803", label: "2803", category: "ic", size_mm: { w: 20, h: 18 }, pins: dipPins(18, 20, 18), defaultProps: {} },
  { type: "l293d", label: "293D", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16, { "1": "1,2EN", "2": "1A", "3": "1Y", "6": "2Y", "7": "2A", "8": "VCC2", "9": "3,4EN", "10": "3A", "11": "3Y", "14": "4Y", "15": "4A", "16": "VCC1" }), defaultProps: {} },
  // ------------------------------------------------------ batch 2: CMOS logic
  { type: "cd4017", label: "4017", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "cd4026", label: "4026", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "cd4040", label: "4040", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "cd4051", label: "4051", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "cd4066", label: "4066", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "cd4094", label: "4094", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "cd4511", label: "4511", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  // ------------------------------------------------------ batch 2: 74HC logic
  { type: "74hc151", label: "151", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "74hc157", label: "157", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "74hc164", label: "164", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "74hc165", label: "165", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "74hc193", label: "193", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "74hc273", label: "273", category: "ic", size_mm: { w: 20, h: 18 }, pins: dipPins(20, 20, 18), defaultProps: {} },
  { type: "74hc373", label: "373", category: "ic", size_mm: { w: 20, h: 18 }, pins: dipPins(20, 20, 18), defaultProps: {} },
  { type: "74hc374", label: "374", category: "ic", size_mm: { w: 20, h: 18 }, pins: dipPins(20, 20, 18), defaultProps: {} },
  { type: "74hc393", label: "393", category: "ic", size_mm: { w: 16, h: 14 }, pins: dipPins(14, 16, 14), defaultProps: {} },
  { type: "74hc4020", label: "4020", category: "ic", size_mm: { w: 16, h: 16 }, pins: dipPins(16, 16, 16), defaultProps: {} },
  { type: "74hc573", label: "573", category: "ic", size_mm: { w: 20, h: 18 }, pins: dipPins(20, 20, 18), defaultProps: {} },
  // ------------------------------------------------------ batch 2: discretes
  { type: "2n2222", label: "2N2222", category: "semiconductor", size_mm: { w: 12, h: 12 }, pins: [px("E", "Emitter", 3, 12), px("B", "Base", 6, 12), px("C", "Collector", 9, 12)], defaultProps: {} },
  { type: "2n3904", label: "2N3904", category: "semiconductor", size_mm: { w: 12, h: 12 }, pins: [px("E", "Emitter", 3, 12), px("B", "Base", 6, 12), px("C", "Collector", 9, 12)], defaultProps: {} },
  { type: "2n3906", label: "2N3906", category: "semiconductor", size_mm: { w: 12, h: 12 }, pins: [px("E", "Emitter", 3, 12), px("B", "Base", 6, 12), px("C", "Collector", 9, 12)], defaultProps: {} },
  { type: "bc547", label: "BC547", category: "semiconductor", size_mm: { w: 12, h: 12 }, pins: [px("C", "Collector", 3, 12), px("B", "Base", 6, 12), px("E", "Emitter", 9, 12)], defaultProps: {} },
  { type: "bc557", label: "BC557", category: "semiconductor", size_mm: { w: 12, h: 12 }, pins: [px("C", "Collector", 3, 12), px("B", "Base", 6, 12), px("E", "Emitter", 9, 12)], defaultProps: {} },
  { type: "bc337", label: "BC337", category: "semiconductor", size_mm: { w: 12, h: 12 }, pins: [px("C", "Collector", 3, 12), px("B", "Base", 6, 12), px("E", "Emitter", 9, 12)], defaultProps: {} },
  { type: "bd139", label: "BD139", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("E", "Emitter", 3, 16), px("C", "Collector", 6, 16), px("B", "Base", 9, 16)], defaultProps: {} },
  { type: "tip31c", label: "TIP31C", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("B", "Base", 3, 16), px("C", "Collector", 6, 16), px("E", "Emitter", 9, 16)], defaultProps: {} },
  { type: "tip41c", label: "TIP41C", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("B", "Base", 3, 16), px("C", "Collector", 6, 16), px("E", "Emitter", 9, 16)], defaultProps: {} },
  { type: "irf540n", label: "540N", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("G", "Gate", 3, 16), px("D", "Drain", 6, 16), px("S", "Source", 9, 16)], defaultProps: {} },
  { type: "irfz44n", label: "Z44N", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("G", "Gate", 3, 16), px("D", "Drain", 6, 16), px("S", "Source", 9, 16)], defaultProps: {} },
  { type: "irf3205", label: "3205", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("G", "Gate", 3, 16), px("D", "Drain", 6, 16), px("S", "Source", 9, 16)], defaultProps: {} },
  { type: "irf9540n", label: "9540N", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("G", "Gate", 3, 16), px("D", "Drain", 6, 16), px("S", "Source", 9, 16)], defaultProps: {} },
  { type: "bta16", label: "BTA16", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("A1", "A1", 3, 16), px("G", "Gate", 6, 16), px("A2", "A2", 9, 16)], defaultProps: {} },
  { type: "tyn612", label: "TYN612", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("K", "Cathode", 3, 16), px("A", "Anode", 6, 16), px("G", "Gate", 9, 16)], defaultProps: {} },
  { type: "lm317", label: "LM317", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("ADJ", "Adjust", 3, 16), px("OUT", "Output", 6, 16), px("IN", "Input", 9, 16)], defaultProps: {} },
  { type: "lm338", label: "LM338", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("ADJ", "Adjust", 3, 16), px("OUT", "Output", 6, 16), px("IN", "Input", 9, 16)], defaultProps: {} },
  { type: "l78l05", label: "78L05", category: "semiconductor", size_mm: { w: 10, h: 12 }, pins: [px("OUT", "Output", 3, 12), px("GND", "GND", 5, 12), px("IN", "Input", 7, 12)], defaultProps: {} },
  { type: "tl431", label: "TL431", category: "semiconductor", size_mm: { w: 10, h: 12 }, pins: [px("REF", "Ref", 3, 12), px("A", "Anode", 5, 12), px("K", "Cathode", 7, 12)], defaultProps: {} },
  { type: "7809", label: "7809", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("IN", "Input", 3, 16), px("GND", "GND", 6, 16), px("OUT", "Output", 9, 16)], defaultProps: {} },
  { type: "7812", label: "7812", category: "semiconductor", size_mm: { w: 12, h: 16 }, pins: [px("IN", "Input", 3, 16), px("GND", "GND", 6, 16), px("OUT", "Output", 9, 16)], defaultProps: {} },
  // ------------------------------------------------------ batch 2: diodes
  { type: "1n4007", label: "1N4007", category: "semiconductor", size_mm: { w: 16, h: 6 }, pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)], defaultProps: {} },
  { type: "1n4148", label: "1N4148", category: "semiconductor", size_mm: { w: 16, h: 6 }, pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)], defaultProps: {} },
  { type: "1n5819", label: "1N5819", category: "semiconductor", size_mm: { w: 16, h: 6 }, pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)], defaultProps: {} },
  { type: "bat85", label: "BAT85", category: "semiconductor", size_mm: { w: 16, h: 6 }, pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)], defaultProps: {} },
  { type: "zener-5v1", label: "5V1", category: "semiconductor", size_mm: { w: 16, h: 6 }, pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)], defaultProps: {} },
  { type: "sb560", label: "SB560", category: "semiconductor", size_mm: { w: 16, h: 6 }, pins: [px("A", "Anode", 0, 3), px("K", "Cathode", 16, 3)], defaultProps: {} },
  { type: "bridge-kbu608", label: "KBU", category: "semiconductor", size_mm: { w: 20, h: 16 }, pins: row(["+", "-", "AC1", "AC2"], 16, 3, 17), defaultProps: {} },
  { type: "bridge-w10", label: "W10", category: "semiconductor", size_mm: { w: 20, h: 16 }, pins: row(["+", "-", "AC1", "AC2"], 16, 3, 17), defaultProps: {} },
  { type: "varistor", label: "MOV", category: "passive", size_mm: { w: 10, h: 12 }, pins: [px("1", "1", 3, 12), px("2", "2", 7, 12)], defaultProps: {} },
  { type: "ptc-resettable", label: "PPTC", category: "passive", size_mm: { w: 14, h: 12 }, pins: [px("1", "1", 4, 12), px("2", "2", 10, 12)], defaultProps: {} },
  { type: "fuse-glass", label: "FUSE", category: "passive", size_mm: { w: 16, h: 6 }, pins: [px("1", "1", 0, 3), px("2", "2", 16, 3)], defaultProps: {} },
  { type: "fuse-holder", label: "HOLD", category: "passive", size_mm: { w: 14, h: 10 }, pins: [px("1", "1", 4, 10), px("2", "2", 10, 10)], defaultProps: {} },
  { type: "shunt-resistor", label: "SHUNT", category: "passive", size_mm: { w: 18, h: 8 }, pins: [px("1", "1", 3, 8), px("2", "2", 15, 8)], defaultProps: {} },
  { type: "cap-film-box", label: "FILM", category: "passive", size_mm: { w: 10, h: 12 }, pins: [px("1", "1", 3, 12), px("2", "2", 7, 12)], defaultProps: { capacitance_uF: 1 } },
  { type: "supercap-5v5", label: "0.5F", category: "passive", size_mm: { w: 10, h: 14 }, pins: [px("+", "Positive", 3, 14), px("-", "Negative", 7, 14)], defaultProps: { nominal_voltage_V: 5.5 } },
  { type: "toroid-inductor", label: "TOROID", category: "passive", size_mm: { w: 14, h: 14 }, pins: [px("1", "1", 3, 14), px("2", "2", 11, 14)], defaultProps: {} },
  { type: "common-mode-choke", label: "CMC", category: "passive", size_mm: { w: 16, h: 12 }, pins: row(["1", "2", "3", "4"], 12, 2, 14), defaultProps: {} },
  { type: "transformer-ei", label: "EI", category: "passive", size_mm: { w: 24, h: 22 }, pins: row(["1", "2", "3", "4"], 22, 4, 20), defaultProps: {} },
  { type: "ntc-probe", label: "NTC", category: "sensor", size_mm: { w: 12, h: 16 }, pins: [px("1", "1", 3.5, 16), px("2", "2", 8.5, 16)], defaultProps: { resistance_ohms: 10000 } },
  { type: "pt100", label: "PT100", category: "sensor", size_mm: { w: 12, h: 16 }, pins: [px("1", "1", 3.5, 16), px("2", "2", 8.5, 16)], defaultProps: { resistance_ohms: 100 } },
  { type: "thermocouple-k", label: "K-TYPE", category: "sensor", size_mm: { w: 14, h: 14 }, pins: [px("+", "+", 4, 14), px("-", "-", 10, 14)], defaultProps: {} },
  { type: "resistor-sip", label: "SIP-R", category: "passive", size_mm: { w: 6, h: 14 }, pins: row(["1", "2", "3", "4", "5", "6", "7", "8", "9"], 14, 0.5, 5.5), defaultProps: {} },
  { type: "slide-pot", label: "FADER", category: "input", size_mm: { w: 22, h: 12 }, pins: [px("1", "CCW", 4, 12), px("2", "Wiper", 11, 12), px("3", "CW", 18, 12)], defaultProps: {} },
  { type: "crystal-32k", label: "32K", category: "passive", size_mm: { w: 8, h: 8 }, pins: [px("1", "1", 3, 8), px("2", "2", 5, 8)], defaultProps: {} },
  { type: "resonator-16mhz", label: "RES", category: "passive", size_mm: { w: 8, h: 8 }, pins: row(["1", "2", "3"], 8, 1.5, 6.5), defaultProps: {} },
  { type: "flex-sensor", label: "FLEX", category: "sensor", size_mm: { w: 6, h: 24 }, pins: [px("1", "1", 2, 24), px("2", "2", 4, 24)], defaultProps: {} },
  { type: "fsr-force", label: "FSR", category: "sensor", size_mm: { w: 16, h: 16 }, pins: [px("1", "1", 5, 16), px("2", "2", 11, 16)], defaultProps: {} },
  // ------------------------------------------------------ batch 2: connectors
  { type: "usb-a-plug", label: "USB-A", category: "connector", size_mm: { w: 14, h: 14 }, pins: row(["VCC", ["D-", "D-"], ["D+", "D+"], "GND"], 14, 3, 11), defaultProps: {} },
  { type: "usb-a-socket", label: "USB-A", category: "connector", size_mm: { w: 16, h: 14 }, pins: row(["VCC", ["D-", "D-"], ["D+", "D+"], "GND"], 14, 3.5, 12.5), defaultProps: {} },
  { type: "usb-c-socket", label: "USB-C", category: "connector", size_mm: { w: 12, h: 10 }, pins: row(["VBUS", ["D-", "D-"], ["D+", "D+"], "GND"], 10, 2, 10), defaultProps: {} },
  { type: "barrel-jack", label: "DC-JACK", category: "connector", size_mm: { w: 14, h: 12 }, pins: row(["TIP", "SLEEVE", "SW"], 12, 3, 11), defaultProps: {} },
  { type: "audio-jack", label: "3.5mm", category: "connector", size_mm: { w: 12, h: 12 }, pins: row(["TIP", "RING", "SLEEVE"], 12, 2.5, 9.5), defaultProps: {} },
  { type: "terminal-2", label: "TERM-2", category: "connector", size_mm: { w: 12, h: 10 }, pins: row(["1", "2"], 10, 3, 9), defaultProps: {} },
  { type: "terminal-3", label: "TERM-3", category: "connector", size_mm: { w: 18, h: 10 }, pins: row(["1", "2", "3"], 10, 3, 15), defaultProps: {} },
  { type: "header-1x4", label: "1x4", category: "connector", size_mm: { w: 12, h: 6 }, pins: row(["1", "2", "3", "4"], 4, 1.5, 10.5), defaultProps: {} },
  { type: "header-1x8", label: "1x8", category: "connector", size_mm: { w: 22, h: 6 }, pins: row(["1", "2", "3", "4", "5", "6", "7", "8"], 4, 1.5, 20.5), defaultProps: {} },
  { type: "jst-2", label: "JST", category: "connector", size_mm: { w: 8, h: 8 }, pins: row(["1", "2"], 8, 2.5, 5.5), defaultProps: {} },
  { type: "servo-conn", label: "SRV", category: "connector", size_mm: { w: 12, h: 7 }, pins: row([["GND", "GND"], ["VCC", "+5V"], ["S", "Signal"]], 7, 2.5, 9.5), defaultProps: {} },
  // ------------------------------------------------------ batch 2: switches
  { type: "slide-switch", label: "SLIDE", category: "input", size_mm: { w: 12, h: 8 }, pins: row(["1", "2", "3"], 8, 3, 9), defaultProps: {} },
  { type: "arcade-button", label: "ARCADE", category: "input", size_mm: { w: 24, h: 22 }, pins: row(["1", "2"], 22, 8, 16), defaultProps: {} },
  { type: "estop-button", label: "E-STOP", category: "input", size_mm: { w: 24, h: 24 }, pins: row(["1", "2", "3", "4"], 24, 5, 19), defaultProps: {} },
  { type: "key-switch", label: "KEYLOCK", category: "input", size_mm: { w: 16, h: 18 }, pins: row(["1", "2"], 18, 5, 11), defaultProps: {} },
  { type: "push-12mm", label: "12mm", category: "input", size_mm: { w: 16, h: 14 }, pins: [px("1", "1", 0, 7), px("2", "2", 16, 7)], defaultProps: {} },
  { type: "dip-8", label: "DIP-16", category: "input", size_mm: { w: 28, h: 10 }, pins: [...row(["16", "15", "14", "13", "12", "11", "10", "9"], 0, 2, 26), ...row(["1", "2", "3", "4", "5", "6", "7", "8"], 10, 2, 26)], defaultProps: {} },
  { type: "keypad-3x4", label: "3x4", category: "input", size_mm: { w: 30, h: 38 }, pins: row(["R1", "R2", "R3", "R4", "C1", "C2", "C3"], 38, 3, 27), defaultProps: {} },
  { type: "rotary-12pos", label: "1P6T", category: "input", size_mm: { w: 20, h: 20 }, pins: row(["C", "1", "2", "3", "4", "5", "6"], 20, 2, 18), defaultProps: {} },

  // ------------------------------------------------- batch 3: gas (MQ family)
  { type: "mq-3", label: "MQ-3", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-4", label: "MQ-4", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-5", label: "MQ-5", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-6", label: "MQ-6", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-7", label: "MQ-7", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-8", label: "MQ-8", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-9", label: "MQ-9", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  { type: "mq-131", label: "MQ-131", category: "sensor", size_mm: { w: 20, h: 22 }, pins: row(["VCC", "GND", "DO", ["A0", "Analog out"]], 22, 4, 16), defaultProps: { nominal_voltage_V: 5 } },
  // ------------------------------------------------- batch 3: environmental
  { type: "sht31", label: "SHT31", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13), defaultProps: {} },
  { type: "bme280", label: "BME280", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13), defaultProps: {} },
  { type: "bme680", label: "BME680", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13), defaultProps: {} },
  { type: "bmp180", label: "BMP180", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13), defaultProps: {} },
  { type: "si7021", label: "Si7021", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VCC", "GND", "SDA", "SCL"], 11, 2.5, 11.5), defaultProps: {} },
  { type: "aht20", label: "AHT20", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VCC", "GND", "SDA", "SCL"], 11, 2.5, 11.5), defaultProps: {} },
  // ------------------------------------------------- batch 3: light / color / uv
  { type: "bh1750", label: "BH1750", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13), defaultProps: {} },
  { type: "tsl2561", label: "TSL2561", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VCC", "GND", "SDA", "SCL"], 11, 2.5, 11.5), defaultProps: {} },
  { type: "apds-9960", label: "APDS", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL", "INT"], 12, 2.5, 13.5), defaultProps: {} },
  { type: "tcs34725", label: "TCS34725", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13), defaultProps: {} },
  { type: "guva-s12sd", label: "UV", category: "sensor", size_mm: { w: 14, h: 10 }, pins: row(["VCC", "GND", "AO"], 10, 3.5, 10.5), defaultProps: {} },
  // ------------------------------------------------- batch 3: sound
  { type: "max9814", label: "MAX9814", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "AO"], 12, 4, 12), defaultProps: {} },
  { type: "max4466", label: "MAX4466", category: "sensor", size_mm: { w: 14, h: 10 }, pins: row(["VCC", "GND", "AO"], 10, 3.5, 10.5), defaultProps: {} },
  { type: "inmp441", label: "INMP441", category: "sensor", size_mm: { w: 14, h: 10 }, pins: row(["VCC", "GND", "SCK", "WS", "SD"], 10, 2, 12), defaultProps: {} },
  // ------------------------------------------------- batch 3: motion / magnetic
  { type: "mpu9250", label: "MPU9250", category: "sensor", size_mm: { w: 18, h: 14 }, pins: row(["VCC", "GND", "SCL", "SDA", "INT"], 14, 2, 16), defaultProps: {} },
  { type: "adxl345", label: "ADXL345", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SCL", "SDA"], 12, 3, 13), defaultProps: {} },
  { type: "hmc5883l", label: "HMC5883", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VCC", "GND", "SCL", "SDA"], 11, 2.5, 11.5), defaultProps: {} },
  { type: "qmc5883", label: "QMC5883", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VCC", "GND", "SCL", "SDA"], 11, 2.5, 11.5), defaultProps: {} },
  { type: "bno055", label: "BNO055", category: "sensor", size_mm: { w: 18, h: 14 }, pins: row(["VCC", "GND", "SCL", "SDA", "INT", "RST"], 14, 2, 16), defaultProps: {} },
  // ------------------------------------------------- batch 3: air quality
  { type: "ccs811", label: "CCS811", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VCC", "GND", "SCL", "SDA", "INT"], 12, 2.5, 13.5), defaultProps: {} },
  // ------------------------------------------------- batch 3: distance
  { type: "gp2y1010", label: "DUST", category: "sensor", size_mm: { w: 16, h: 16 }, pins: row(["VCC", "GND", "VO", "LED"], 16, 3, 13), defaultProps: {} },
  { type: "pms5003", label: "PMS5003", category: "sensor", size_mm: { w: 32, h: 18 }, pins: row(["VCC", "GND", "RX", "TX", "SET", "RST"], 18, 3, 29), defaultProps: {} },
  { type: "mh-z19", label: "MH-Z19", category: "sensor", size_mm: { w: 24, h: 16 }, pins: row(["VCC", "GND", "PWM", "RX", "TX"], 16, 2.5, 21.5), defaultProps: {} },
  { type: "vl53l1x", label: "VL53L1X", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VIN", "GND", "SDA", "SCL"], 11, 2.5, 11.5), defaultProps: {} },
  // ------------------------------------------------- batch 3: niche sensors
  { type: "jsn-sr04t", label: "JSN-SR04T", category: "sensor", size_mm: { w: 26, h: 22 }, pins: row(["VCC", "GND", "TRIG", "ECHO"], 22, 6, 20), defaultProps: {} },
  { type: "gp2y0a21", label: "IR-DIST", category: "sensor", size_mm: { w: 16, h: 16 }, pins: row(["VCC", "GND", "VO"], 16, 4, 12), defaultProps: {} },
  { type: "tf-luna", label: "TF-LUNA", category: "sensor", size_mm: { w: 22, h: 16 }, pins: row(["VCC", "GND", "RX", "TX"], 16, 4, 18), defaultProps: {} },
  { type: "geiger", label: "GEIGER", category: "sensor", size_mm: { w: 14, h: 32 }, pins: [px("A", "Anode", 5, 32), px("K", "Cathode", 9, 32)], defaultProps: {} },
  { type: "ph-sensor", label: "pH", category: "sensor", size_mm: { w: 26, h: 20 }, pins: row(["VCC", "GND", "AO"], 20, 7, 19), defaultProps: {} },
  { type: "tds-sensor", label: "TDS", category: "sensor", size_mm: { w: 28, h: 22 }, pins: row(["VCC", "GND", "AO"], 22, 8, 20), defaultProps: {} },
  { type: "yf-s201", label: "FLOW", category: "sensor", size_mm: { w: 28, h: 20 }, pins: row(["VCC", "GND", "S"], 20, 8, 20), defaultProps: {} },
  { type: "load-cell", label: "LOAD", category: "sensor", size_mm: { w: 40, h: 16 }, pins: col([["E+", "Excite +"], ["E-", "Excite −"], ["S+", "Signal +"], ["S-", "Signal −"]], 40, 3, 13), defaultProps: {} },
  { type: "hx711", label: "HX711", category: "sensor", size_mm: { w: 24, h: 14 }, pins: [...col(["E+", "E-", "A-", "A+"], 0, 3, 11), ...row(["VCC", "GND", "DT", "SCK"], 14, 5, 19)], defaultProps: {} },
  { type: "as5600", label: "AS5600", category: "sensor", size_mm: { w: 14, h: 11 }, pins: row(["VCC", "GND", "SCL", "SDA", "DIR"], 11, 2, 12), defaultProps: {} },
  { type: "mpr121", label: "MPR121", category: "sensor", size_mm: { w: 18, h: 12 }, pins: row(["VCC", "GND", "SCL", "SDA", "IRQ"], 12, 2.5, 15.5), defaultProps: {} },
  { type: "sct-013", label: "SCT-013", category: "sensor", size_mm: { w: 24, h: 24 }, pins: row(["1", "2"], 24, 8, 16), defaultProps: {} },
  { type: "zmpt101b", label: "ZMPT", category: "sensor", size_mm: { w: 18, h: 18 }, pins: row(["P1", "P2", "S1", "S2"], 18, 3, 15), defaultProps: {} },
  { type: "voltage-sensor", label: "V-SENS", category: "sensor", size_mm: { w: 22, h: 14 }, pins: row(["IN+", "IN-", "AO"], 14, 5, 17), defaultProps: {} },
  { type: "max30102", label: "MAX30102", category: "sensor", size_mm: { w: 16, h: 12 }, pins: row(["VIN", "GND", "SCL", "SDA", "INT"], 12, 2, 14), defaultProps: {} },
  { type: "amg8833", label: "AMG8833", category: "sensor", size_mm: { w: 14, h: 12 }, pins: row(["VCC", "GND", "SCL", "SDA"], 12, 2.5, 11.5), defaultProps: {} },
  { type: "mlx90640", label: "MLX90640", category: "sensor", size_mm: { w: 18, h: 16 }, pins: row(["VCC", "GND", "SCL", "SDA"], 16, 3, 15), defaultProps: {} },
  { type: "ld2410", label: "LD2410", category: "sensor", size_mm: { w: 22, h: 18 }, pins: row(["VCC", "GND", "OUT", "RX", "TX"], 18, 2.5, 19.5), defaultProps: {} },
  { type: "myoware", label: "EMG", category: "sensor", size_mm: { w: 18, h: 18 }, pins: row(["VCC", "GND", "OUT"], 18, 5, 13), defaultProps: {} },
  { type: "sw-420", label: "SW-420", category: "sensor", size_mm: { w: 14, h: 12 }, pins: row(["VCC", "GND", "DO"], 12, 3.5, 10.5), defaultProps: {} },
  { type: "am312", label: "AM312", category: "sensor", size_mm: { w: 12, h: 10 }, pins: row(["VCC", "GND", "OUT"], 10, 3, 9), defaultProps: {} },
  { type: "ball-tilt", label: "TILT", category: "sensor", size_mm: { w: 8, h: 8 }, pins: [px("1", "1", 3, 8), px("2", "2", 5, 8)], defaultProps: {} },
  { type: "cap-soil", label: "CAP-SOIL", category: "sensor", size_mm: { w: 30, h: 20 }, pins: row(["VCC", "GND", "AO"], 20, 8, 22), defaultProps: {} },

  // ------------------------------------------------- batch 4: radio / mcu modules
  { type: "rc522", label: "RC522", category: "module", size_mm: { w: 20, h: 22 }, pins: row(["3V3", "GND", "MOSI", "MISO", "SCK", "SDA", "RST", "IRQ"], 22, 2.5, 17.5), defaultProps: {} },
  { type: "pn532", label: "PN532", category: "module", size_mm: { w: 32, h: 24 }, pins: row(["VCC", "GND", "SCL", "SDA"], 24, 8, 24), defaultProps: {} },
  { type: "rdm6300", label: "RDM6300", category: "module", size_mm: { w: 22, h: 20 }, pins: row(["VCC", "GND", "RX", "TX"], 20, 5, 17), defaultProps: {} },
  { type: "esp-01s", label: "ESP-01S", category: "module", size_mm: { w: 16, h: 18 }, pins: [...row(["GND", "IO2", "IO0", "RX"], 2, 2, 14), ...row(["TX", "CH", "RST", "VCC"], 6, 2, 14)], defaultProps: {} },
  { type: "esp-12f", label: "ESP-12F", category: "module", size_mm: { w: 18, h: 24 }, pins: row(["GND", "IO2", "IO0", "RX", "TX", "CH", "RST", "VCC"], 24, 2, 16), defaultProps: {} },
  { type: "wemos-d1-mini", label: "D1 MINI", category: "module", size_mm: { w: 25.5, h: 34.5 }, pins: [...col(["RST", "A0", "D0", "D5", "D6", "D7", "D8", "3V3"], 0, 4, 30.5), ...col(["TX", "RX", "D1", "D2", "D3", "D4", "G", "5V"], 25.5, 4, 30.5)], defaultProps: {} },
  { type: "hc-06", label: "HC-06", category: "module", size_mm: { w: 27, h: 13 }, pins: row(["VCC", "GND", "TX", "RX"], 13, 4, 23), defaultProps: {} },
  { type: "hm-10", label: "HM-10", category: "module", size_mm: { w: 27, h: 13 }, pins: row(["VCC", "GND", "TX", "RX"], 13, 4, 23), defaultProps: {} },
  { type: "hc-12", label: "HC-12", category: "module", size_mm: { w: 34, h: 15 }, pins: row(["SET", "TX", "RX", "GND", "VCC"], 15, 5, 29), defaultProps: {} },
  { type: "sx1278-lora", label: "LoRa", category: "module", size_mm: { w: 36, h: 21 }, pins: row(["MISO", "MOSI", "SCK", "NSS", "RST", "DIO0", "VCC", "GND"], 21, 4, 32), defaultProps: {} },
  { type: "sim800l", label: "SIM800L", category: "module", size_mm: { w: 23, h: 20 }, pins: row(["VCC", "GND", "TX", "RX"], 20, 5, 18), defaultProps: {} },
  { type: "neo-6m", label: "NEO-6M", category: "module", size_mm: { w: 36, h: 24 }, pins: row(["VCC", "GND", "TX", "RX"], 24, 7, 29), defaultProps: {} },
  // ------------------------------------------------- batch 4: wire / power modules
  { type: "mcp2515-can", label: "CAN", category: "module", size_mm: { w: 32, h: 16 }, pins: row(["MOSI", "MISO", "SCK", "CS", "INT", "VCC", "GND"], 16, 4, 28), defaultProps: {} },
  { type: "rs485-module", label: "RS485", category: "module", size_mm: { w: 28, h: 15 }, pins: [...row(["VCC", "GND", "DI", "DE", "RE", "RO"], 15, 3, 20), ...col(["A", "B"], 28, 4, 8)], defaultProps: {} },
  { type: "cp2102", label: "CP2102", category: "module", size_mm: { w: 20, h: 12 }, pins: row(["3V3", "TX", "RX", "GND"], 12, 4, 16), defaultProps: {} },
  { type: "ch340g", label: "CH340", category: "module", size_mm: { w: 20, h: 12 }, pins: row(["3V3", "TX", "RX", "GND"], 12, 4, 16), defaultProps: {} },
  { type: "level-shifter", label: "LVL 4ch", category: "module", size_mm: { w: 16, h: 14 }, pins: [...col(["LV1", "LV2", "LV3", "LV4"], 0, 3, 10), ...col(["HV1", "HV2", "HV3", "HV4"], 16, 3, 10), ...row(["LV", "HV", "GND"], 14, 3, 13)], defaultProps: {} },
  { type: "mt3608", label: "MT3608", category: "module", size_mm: { w: 22, h: 12 }, pins: row(["IN+", "IN-", "OUT+", "OUT-"], 12, 4, 18), defaultProps: {} },
  { type: "servo-tester", label: "SVO-TEST", category: "module", size_mm: { w: 32, h: 16 }, pins: row(["S1", "S2", "S3", "VCC", "GND"], 16, 5, 27), defaultProps: {} },
  // ------------------------------------------------- batch 4: audio
  { type: "dfplayer-mini", label: "DFPlayer", category: "module", size_mm: { w: 21, h: 18 }, pins: row(["VCC", "GND", "RX", "TX", "SPK1", "SPK2"], 18, 3, 18), defaultProps: {} },
  { type: "pam8403", label: "PAM8403", category: "module", size_mm: { w: 17, h: 12 }, pins: row(["VIN-", "VIN+", "LO+", "LO-", "RO-", "RO+"], 12, 2.5, 14.5), defaultProps: {} },
  { type: "max98357", label: "MAX98357", category: "module", size_mm: { w: 15, h: 13 }, pins: row(["VIN", "GND", "GAIN", "BCLK", "LRC", "DIN", "SD"], 13, 1.5, 13.5), defaultProps: {} },
  { type: "tea5767", label: "TEA5767", category: "module", size_mm: { w: 16, h: 11 }, pins: row(["VCC", "GND", "SCL", "SDA"], 11, 3, 13), defaultProps: {} },
  // ------------------------------------------------- batch 4: drivers / relays
  { type: "a4988", label: "A4988", category: "module", size_mm: { w: 16, h: 20 }, pins: [...col(["DIR", "STEP", "SLP", "RST", "MS3", "MS2", "MS1", "EN"], 0, 2, 18), ...col(["VMOT", "GND", "2B", "2A", "1A", "1B", "VDD", "GND2"], 16, 2, 18)], defaultProps: {} },
  { type: "drv8825", label: "DRV8825", category: "module", size_mm: { w: 16, h: 20 }, pins: [...col(["DIR", "STEP", "SLP", "RST", "MS3", "MS2", "MS1", "EN"], 0, 2, 18), ...col(["VMOT", "GND", "2B", "2A", "1A", "1B", "VDD", "GND2"], 16, 2, 18)], defaultProps: {} },
  { type: "tb6612", label: "TB6612", category: "module", size_mm: { w: 20, h: 16 }, pins: [...col(["AO1", "AO2", "BO2", "BO1", "VM", "VCC", "GND"], 0, 2, 14), ...col(["PWMA", "AIN2", "AIN1", "STBY", "BIN1", "BIN2", "PWMB"], 20, 2, 14)], defaultProps: {} },
  { type: "mx1508", label: "MX1508", category: "module", size_mm: { w: 22, h: 14 }, pins: row(["VCC", "GND", "A1", "A2", "B2", "B1"], 14, 3, 19), defaultProps: {} },
  { type: "relay-2ch", label: "RLY 2CH", category: "module", size_mm: { w: 33, h: 22 }, pins: [...row(["IN1", "IN2", "GND", "VCC"], 22, 5, 23), ...row(["NO1", "COM1", "NC1", "NO2", "COM2", "NC2"], 0, 4, 29)], defaultProps: {} },
  // ------------------------------------------------- batch 4: displays
  { type: "st7735-tft", label: "TFT 1.8", category: "display", size_mm: { w: 34, h: 34 }, pins: row(["VCC", "GND", "SCL", "SDA", "RST", "DC", "CS", "BLK"], 34, 4, 30), defaultProps: {} },
  { type: "ili9341-tft", label: "ILI9341", category: "display", size_mm: { w: 44, h: 50 }, pins: row(["VCC", "GND", "CS", "RST", "DC", "MOSI", "MISO", "SCK", "LED"], 50, 5, 39), defaultProps: {} },
  { type: "eink-29", label: "E-INK 2.9", category: "display", size_mm: { w: 40, h: 30 }, pins: row(["VCC", "GND", "DIN", "CLK", "CS", "DC", "RST", "BUSY"], 30, 5, 35), defaultProps: {} },
  { type: "nixie-in14", label: "IN-14", category: "display", size_mm: { w: 16, h: 34 }, pins: row(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "AN"], 34, 1.5, 14.5), defaultProps: {} },
  { type: "neopixel-stick8", label: "NPX x8", category: "display", size_mm: { w: 44, h: 10 }, pins: row(["DIN", "5V", "GND"], 10, 2, 8), defaultProps: {} },
  { type: "ws2812-matrix8", label: "MATRIX 8x8", category: "display", size_mm: { w: 32, h: 32 }, pins: row(["5V", "GND", "DIN", "DOUT"], 32, 6, 26), defaultProps: {} },
  { type: "led-bar-10", label: "BAR 10", category: "display", size_mm: { w: 30, h: 12 }, pins: [...row(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"], 12, 2, 28), ...row(["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "K9", "K10"], 0, 2, 28)], defaultProps: {} },
  { type: "7seg-4digit", label: "4DIGIT", category: "display", size_mm: { w: 30, h: 20 }, pins: [...row(["E", "D", "DP", "C", "G", "B"], 20, 3, 27), ...row(["A", "F", "D1", "D2", "D3", "D4"], 0, 3, 27)], defaultProps: {} },
  { type: "dot-matrix-8x8", label: "8x8 RAW", category: "display", size_mm: { w: 32, h: 32 }, pins: [...row(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"], 32, 3, 29), ...row(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"], 0, 3, 29)], defaultProps: {} },
  { type: "nokia-5110", label: "5110", category: "display", size_mm: { w: 38, h: 34 }, pins: row(["VCC", "GND", "CLK", "DIN", "DC", "CS", "RST", "BLK"], 34, 5, 33), defaultProps: {} },
  { type: "lcd-2004", label: "LCD 20x4", category: "display", size_mm: { w: 60, h: 40 }, pins: row(["VSS", "VDD", "VO", "RS", "RW", "E", "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "A", "K"], 40, 4, 56), defaultProps: {} },
  { type: "neopixel-ring16", label: "RING 16", category: "display", size_mm: { w: 44, h: 44 }, pins: [px("5V", "Power", 18, 2), px("GND", "Ground", 22, 2), px("DIN", "Data in", 26, 2), px("DOUT", "Data out", 30, 2)], defaultProps: {} },
  // ------------------------------------------------- batch 4: motors / mechanics
  { type: "tt-gearmotor", label: "TT", category: "motor", size_mm: { w: 37, h: 22 }, pins: [px("M-", "Motor −", 12, 22), px("M+", "Motor +", 25, 22)], defaultProps: { nominal_voltage_V: 6, no_load_rpm: 200 } },
  { type: "n20-gearmotor", label: "N20", category: "motor", size_mm: { w: 12, h: 15 }, pins: [px("M-", "Motor −", 4, 15), px("M+", "Motor +", 8, 15)], defaultProps: { nominal_voltage_V: 6 } },
  { type: "bldc", label: "BLDC", category: "motor", size_mm: { w: 30, h: 30 }, pins: row(["U", "V", "W"], 30, 10, 20), defaultProps: {} },
  { type: "nema17", label: "NEMA 17", category: "motor", size_mm: { w: 42, h: 42 }, pins: row(["A1", "A2", "B1", "B2"], 42, 14, 28), defaultProps: { step_angle_deg: 1.8 } },
  { type: "nema23", label: "NEMA 23", category: "motor", size_mm: { w: 57, h: 57 }, pins: row(["A1", "A2", "B1", "B2"], 57, 20, 37), defaultProps: { step_angle_deg: 1.8 } },
  { type: "mg90s", label: "MG90S", category: "motor", size_mm: { w: 23, h: 20 }, pins: row(["GND", "VIN", "PWM"], 20, 6, 17), defaultProps: {} },
  { type: "ds3218", label: "DS3218", category: "motor", size_mm: { w: 40, h: 20 }, pins: row(["GND", "VIN", "PWM"], 20, 12, 28), defaultProps: {} },
  { type: "linear-actuator", label: "ACTUATOR", category: "motor", size_mm: { w: 48, h: 12 }, pins: [px("M+", "Motor +", 18, 12), px("M-", "Motor −", 30, 12)], defaultProps: {} },
  { type: "solenoid-valve", label: "VALVE", category: "motor", size_mm: { w: 30, h: 18 }, pins: [px("M+", "Coil +", 10, 18), px("M-", "Coil −", 20, 18)], defaultProps: {} },
  { type: "solenoid-lock", label: "LOCK", category: "motor", size_mm: { w: 28, h: 16 }, pins: [px("M+", "Coil +", 9, 16), px("M-", "Coil −", 19, 16)], defaultProps: {} },
  { type: "peltier", label: "TEC1", category: "output", size_mm: { w: 22, h: 22 }, pins: [px("+", "+", 8, 22), px("-", "−", 14, 22)], defaultProps: {} },
  { type: "fan-5v", label: "FAN", category: "motor", size_mm: { w: 28, h: 28 }, pins: row(["GND", "VIN", "PWM"], 28, 10, 18), defaultProps: {} },
  { type: "water-pump", label: "PUMP", category: "motor", size_mm: { w: 26, h: 18 }, pins: [px("M+", "Motor +", 9, 18), px("M-", "Motor −", 17, 18)], defaultProps: {} },
  { type: "electromagnet", label: "MAGNET", category: "output", size_mm: { w: 18, h: 18 }, pins: [px("+", "+", 6, 18), px("-", "−", 12, 18)], defaultProps: {} },
  // ------------------------------------------------- batch 4: power
  { type: "lipo-2s", label: "LiPo 2S", category: "power", size_mm: { w: 25, h: 16 }, pins: [px("+", "+", 9, 16), px("-", "−", 16, 16)], defaultProps: { nominal_voltage_V: 7.4, capacity_mAh: 1000 } },
  { type: "usb-5v", label: "USB 5V", category: "power", size_mm: { w: 20, h: 14 }, pins: [px("5V", "+5V", 8, 14), px("GND", "Ground", 12, 14)], defaultProps: { nominal_voltage_V: 5 } },

];

// --------------------------------------------------------------- breadboards
/** Real solderless breadboards: 2.54 mm pitch, ten-row field (a–e over f–j)
 *  split by a center channel; optional power rails along the top and bottom
 *  edges (25-hole strips on the 400, 50-hole rows split into 2×25 on the 830).
 *  Every column is a tie-point strip — expressed as `bridges`. */
const PITCH = 2.54;
const ROWS = "abcdefghij";

function breadboardDef(
  type: string,
  label: string,
  cols: number,
  railHoles: 0 | 25 | 50,
  splits: boolean,
): PartDefinition {
  const marginX = 1.5;
  const fieldW = cols * PITCH;
  const w = fieldW + marginX * 2;
  const channel = railHoles === 0 ? 1 : 2.2;
  const fieldH = 10 * PITCH + channel;
  const h = railHoles === 0 ? fieldH + 3.6 : 55;
  const yTop = (h - fieldH) / 2;
  const hx = (c: number) => marginX + PITCH / 2 + PITCH * c;
  const hy = (r: number) => yTop + PITCH / 2 + PITCH * r + (r >= 5 ? channel : 0);
  const pins: PartPin[] = [];
  const bridges: string[][] = [];
  for (let c = 0; c < cols; c++) {
    const colIds: string[] = [];
    for (let r = 0; r < 10; r++) {
      const id = `${ROWS[r]}${c + 1}`;
      pins.push(px(id, id, hx(c), hy(r)));
      colIds.push(id);
    }
    bridges.push(colIds);
  }
  if (railHoles > 0) {
    const span = (railHoles - 1) * PITCH;
    const rx = (i: number) => marginX + (fieldW - span) / 2 + PITCH * i;
    // top edge: − then + (mirrors MB-102 silkscreen); bottom edge: + then −
    const rows: { ids: string[]; name: string; y: number }[] = [
      { ids: [], name: "−", y: 3.2 },
      { ids: [], name: "+", y: 3.2 + PITCH },
      { ids: [], name: "+", y: h - 3.2 - PITCH },
      { ids: [], name: "−", y: h - 3.2 },
    ];
    const rowId = (row: number, i: number) => ["nt", "pt", "pb", "nb"][row] + String(i + 1);
    for (let i = 0; i < railHoles; i++) {
      for (let row = 0; row < 4; row++) {
        const id = rowId(row, i);
        rows[row].ids.push(id);
        pins.push(px(id, rows[row].name, rx(i), rows[row].y));
      }
    }
    for (const row of rows) {
      if (splits) {
        bridges.push(row.ids.slice(0, railHoles / 2));
        bridges.push(row.ids.slice(railHoles / 2));
      } else {
        bridges.push(row.ids);
      }
    }
  }
  return { type, label, category: "passive", size_mm: { w, h }, pins, defaultProps: {}, bridges };
}

const BREADBOARD_DEFS: PartDefinition[] = [
  breadboardDef("breadboard-170", "BB170", 17, 0, false),
  breadboardDef("breadboard-400", "BB400", 30, 25, false),
  breadboardDef("breadboard-830", "BB830", 63, 50, true),
];

/** Pin ids commoned internally with `pinId` on `type` (empty when none). */
export function bridgeMatesOf(type: string, pinId: string): string[] {
  const def = partDef(type);
  for (const group of def?.bridges ?? []) {
    if (group.includes(pinId)) return group;
  }
  return [];
}

export const PART_DEFINITIONS: PartDefinition[] = [
  ...BASE_DEFS,
  ...BREADBOARD_DEFS,
  ...buildFamilyDefs([...BASE_DEFS, ...BREADBOARD_DEFS]),
];

/** Validator pin catalog derived from the definitions (id lists only). */
export const M0_PIN_CATALOG: Record<string, string[]> = Object.fromEntries(
  PART_DEFINITIONS.map((d) => [d.type, d.pins.map((p) => p.id)]),
);

const BY_TYPE = new Map(PART_DEFINITIONS.map((d) => [d.type, d]));

export function partDef(type: string): PartDefinition | null {
  return BY_TYPE.get(type) ?? null;
}
