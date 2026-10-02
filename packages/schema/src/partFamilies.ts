// Real part families — shared pinout templates + cross-family SKUs (74LS00-style).
// Every type is a real orderable part; siblings reuse verified pinout templates.
import type { PartCategory, PartDefinition, PartPin } from "./parts";

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

/** DIP: numeric ids 1..n CCW (1..n/2 down the left, n..n/2+1 down the right). */
const dipPins = (n: number, w: number, h: number, names: Record<string, string>): PartPin[] => {
  const half = n / 2;
  const left = Array.from({ length: half }, (_, i) => String(i + 1));
  const right = Array.from({ length: half }, (_, i) => String(n - i));
  return [
    ...col(left.map((id) => [id, names[id] ?? id] as PinSpec), 0, 2.6, h - 2.6),
    ...col(right.map((id) => [id, names[id] ?? id] as PinSpec), w, 2.6, h - 2.6),
  ];
};

const def = (
  type: string,
  label: string,
  category: PartCategory,
  w: number,
  h: number,
  pins: PartPin[],
  defaultProps: Record<string, unknown> = {},
): PartDefinition => ({ type, label, category, size_mm: { w, h }, pins, defaultProps });

// ---------------------------------------------------------------- logic templates
const SUP14 = { "7": "GND", "14": "VCC" };
const SUP16 = { "8": "GND", "16": "VCC" };
const SUP20 = { "10": "GND", "20": "VCC" };

/** pin-number → signal name for the standard quad 2-in gate DIP-14. */
const QUAD2 = {
  "1": "1A", "2": "1B", "3": "1Y", "4": "2A", "5": "2B", "6": "2Y",
  "8": "3Y", "9": "3A", "10": "3B", "11": "4Y", "12": "4A", "13": "4B", ...SUP14,
};
/** quad 2-in gate CD4000 DIP-14 (different gate order). */
const QUAD2_CD = {
  "1": "1A", "2": "1B", "3": "1Y", "4": "2Y", "5": "2A", "6": "2B",
  "8": "3A", "9": "3B", "10": "3Y", "11": "4Y", "12": "4A", "13": "4B",
  "7": "VSS", "14": "VDD",
};
const HEX14 = {
  "1": "1A", "2": "1Y", "3": "2A", "4": "2Y", "5": "3A", "6": "3Y",
  "8": "4Y", "9": "4A", "10": "5Y", "11": "5A", "12": "6Y", "13": "6A", ...SUP14,
};
const TRIPLE3 = {
  "1": "1A", "2": "1B", "3": "2A", "4": "2B", "5": "2C", "6": "2Y",
  "8": "3Y", "9": "3A", "10": "3B", "11": "3C", "12": "1Y", "13": "1C", ...SUP14,
};
const DUAL4 = {
  "1": "1A", "2": "1B", "3": "NC", "4": "1C", "5": "1D", "6": "1Y",
  "8": "2Y", "9": "2A", "10": "2B", "11": "NC", "12": "2C", "13": "2D", ...SUP14,
}
const DUAL4_CD: Record<string, string> = {
  "1": "1Y", "2": "1A", "3": "1B", "4": "1C", "5": "1D", "6": "NC", "7": "VSS", "8": "NC",
  "9": "2D", "10": "2C", "11": "2B", "12": "2A", "13": "2Y", "14": "VDD",
};;
const D74 = {
  "1": "/1R", "2": "1D", "3": "1CLK", "4": "/1S", "5": "1Q", "6": "/1Q",
  "8": "/2Q", "9": "2Q", "10": "/2S", "11": "2CLK", "12": "2D", "13": "/2R", ...SUP14,
};
const DEC138 = {
  "1": "A", "2": "B", "3": "C", "4": "/E1", "5": "/E2", "6": "E3", "7": "Y7",
  "9": "Y6", "10": "Y5", "11": "Y4", "12": "Y3", "13": "Y2", "14": "Y1", "15": "Y0", ...SUP16,
};
const DEC139 = {
  "1": "/1E", "2": "1A", "3": "1B", "4": "/1Y0", "5": "/1Y1", "6": "/1Y2", "7": "/1Y3",
  "9": "/2Y3", "10": "/2Y2", "11": "/2Y1", "12": "/2Y0", "13": "2B", "14": "2A", "15": "/2E", ...SUP16,
};
const BUF240: Record<string, string> = {
  "1": "/1OE", "2": "1A1", "3": "2Y4", "4": "1A2", "5": "2Y3", "6": "1A3", "7": "2Y2", "8": "1A4", "9": "2Y1", "10": "GND",
  "11": "2A1", "12": "1Y4", "13": "2A2", "14": "1Y3", "15": "2A3", "16": "1Y2", "17": "2A4", "18": "1Y1", "19": "/2OE", "20": "VCC",
};
const BUF241: Record<string, string> = { ...BUF240, "19": "2OE" };;
const XCVR245 = {
  "1": "DIR", "2": "A1", "3": "A2", "4": "A3", "5": "A4", "6": "A5", "7": "A6", "8": "A7", "9": "A8",
  "11": "B8", "12": "B7", "13": "B6", "14": "B5", "15": "B4", "16": "B3", "17": "B2", "18": "B1",
  "19": "/OE", ...SUP20,
};

type LogicTpl = { tpl: Record<string, string>; n: number; w: number; h: number; fn: string };

const LOGIC_NUMBERS: { num: string; name: string }[] = [
  { num: "00", name: "NAND2" }, { num: "02", name: "NOR2" }, { num: "08", name: "AND2" },
  { num: "32", name: "OR2" }, { num: "86", name: "XOR2" },
  { num: "04", name: "INV" }, { num: "05", name: "INV-OC" }, { num: "06", name: "BUF-OC" },
  { num: "07", name: "BUF" }, { num: "14", name: "SCHMITT" },
  { num: "10", name: "NAND3" }, { num: "11", name: "AND3" }, { num: "12", name: "NAND3-OC" },
  { num: "27", name: "NOR3" },
  { num: "20", name: "NAND4" }, { num: "21", name: "AND4" }, { num: "22", name: "NOR4" },
  { num: "74", name: "D-FF" },
  { num: "160", name: "CNT-BCD" }, { num: "161", name: "CNT-BIN" },
  { num: "162", name: "CNT-BCD" }, { num: "163", name: "CNT-BIN" },
  { num: "138", name: "3-8DEC" }, { num: "139", name: "2-4DEC" }, { num: "238", name: "3-8DEC+" },
  { num: "240", name: "BUF-INV" }, { num: "241", name: "BUF" }, { num: "244", name: "BUF" },
  { num: "245", name: "XCVR" },
];

const CNT161: Record<string, string> = {
  "1": "/CLR", "2": "CLK", "3": "A", "4": "B", "5": "C", "6": "D", "7": "/ENP", "8": "GND",
  "9": "/LOAD", "10": "/ENT", "11": "QD", "12": "QC", "13": "QB", "14": "QA", "15": "RCO", "16": "VCC",
};

const logicTpl = (num: string): LogicTpl => {
  const s = Number(num);
  if ([0, 2, 8, 32, 86].includes(s)) return { tpl: QUAD2, n: 14, w: 19, h: 6.5, fn: "gate" };
  if ([4, 5, 6, 7, 14].includes(s)) return { tpl: HEX14, n: 14, w: 19, h: 6.5, fn: "buf" };
  if ([10, 11, 12, 27].includes(s)) return { tpl: TRIPLE3, n: 14, w: 19, h: 6.5, fn: "gate" };
  if ([20, 21, 22].includes(s)) return { tpl: DUAL4, n: 14, w: 19, h: 6.5, fn: "gate" };
  if (s === 74) return { tpl: D74, n: 14, w: 19, h: 6.5, fn: "ff" };
  if ([160, 161, 162, 163].includes(s)) return { tpl: CNT161, n: 16, w: 20, h: 6.5, fn: "cnt" };
  if (s === 138 || s === 238) return { tpl: DEC138, n: 16, w: 20, h: 6.5, fn: "dec" };
  if (s === 139) return { tpl: DEC139, n: 16, w: 20, h: 6.5, fn: "dec" };
  if (s === 245) return { tpl: XCVR245, n: 20, w: 26, h: 7.5, fn: "xcvr" };
  return { tpl: s === 241 ? BUF241 : BUF240, n: 20, w: 26, h: 7.5, fn: "buf" };
};

const LOGIC_FAMILIES = ["74", "74LS", "74HC", "74HCT", "74AC", "74ACT", "74AHC", "74AHCT", "74ALS", "74F"];
const LV_NUMS = new Set(["00", "02", "04", "08", "14", "32", "86", "138", "139", "238", "240", "241", "244", "245"]);

const logicDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  for (const { num, name } of LOGIC_NUMBERS) {
    const { tpl, n, w, h } = logicTpl(num);
    const fams = [...LOGIC_FAMILIES, ...(LV_NUMS.has(num) ? ["74LV"] : [])];
    for (const fam of fams) {
      out.push(def(`${fam.toLowerCase()}${num}`, `${fam}${num}`, "ic", w, h, dipPins(n, w, h, tpl), { logic_function: name }));
    }
  }
  return out;
};

// ---------------------------------------------------------------- CD4000 families
const CD_QUAD = { nums: ["01", "11", "70", "71", "77", "81"], tpl: QUAD2_CD, fn: ["NOR2", "NAND2", "XOR2", "OR2", "XNOR2", "AND2"] };
const CD_DUAL = { nums: ["02", "12", "82"], tpl: DUAL4_CD, fn: ["NOR4", "NAND4", "AND4"] };
const CD_TRIPLE = { nums: ["23", "25", "73", "75"], tpl: TRIPLE3, fn: ["NAND3", "NOR3", "AND3", "OR3"] };
const CD_HEX = { nums: ["69", "49"], tpl: HEX14, fn: ["INV", "INV-BUF"] };
const CD_BRANDS = ["cd", "hef", "mc", "tc", "hcf", "bu"];

const cdDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const packs: { nums: string[]; tpl: Record<string, string>; fn: string[] }[] = [CD_QUAD, CD_DUAL, CD_TRIPLE, CD_HEX];
  for (const pack of packs) {
    pack.nums.forEach((num, i) => {
      for (const brand of CD_BRANDS) {
        const pre = brand === "mc" ? "mc140" : `${brand}40`;
        const w = 19;
        out.push(
          def(`${pre}${num}`, `${pre.toUpperCase()}${num}`, "ic", w, 6.5, dipPins(14, w, 6.5, pack.tpl), {
            logic_function: pack.fn[i],
          }),
        );
      }
    });
  }
  return out;
};

// ---------------------------------------------------------------- clones of base 74HC SKUs (HCT/AC mirror full HC catalogs)
const cloneFromBase = (base: PartDefinition[]): PartDefinition[] => {
  const out: PartDefinition[] = [];
  for (const d of base) {
    const m = /^74hc(\d{2,3})$/.exec(d.type);
    if (m) {
      for (const fam of ["74HCT", "74AC"]) {
        out.push({ ...d, type: `${fam.toLowerCase()}${m[1]}`, label: `${fam}${m[1]}` });
      }
    }
    const c = /^(cd|hef|tc)(40\d\d|45\d\d)$/.exec(d.type);
    if (c) {
      for (const brand of ["hef", "mc", "tc", "cd"]) {
        const pre = brand === "mc" ? "mc14" : `${brand}`;
        const t = `${pre}${c[2]}`;
        if (t !== d.type) out.push({ ...d, type: t, label: t.toUpperCase() });
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------- passives: zeners / rectifiers
const ZENERS = ["2v4", "2v7", "3v0", "3v3", "3v6", "3v9", "4v3", "4v7", "5v1", "5v6", "6v2", "6v8", "7v5", "8v2", "9v1", "10v", "11v", "12v", "13v", "15v", "16v", "18v", "20v", "22v", "24v", "27v", "30v", "33v", "36v"];

const diodeDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const axial = (type: string, label: string, props: Record<string, unknown> = {}) =>
    out.push(def(type, label, "semiconductor", 9, 3.2, row([["A", "Anode"], ["K", "Cathode"]], 3.2, 1, 8), props));
  ["1", "2", "3", "4", "5", "6"].forEach((n) => axial(`1n400${n}`, `1N400${n}`, { max_voltage_V: Number(n) * 50 + 50 }));
  axial("uf4007", "UF4007");
  ["5817", "5818", "5820", "5821", "5822", "5824"].forEach((n) => axial(`1n${n}`, `1N${n}`));
  ["5400", "5401", "5402", "5404", "5406", "5408"].forEach((n) => axial(`1n${n}`, `1N${n}`));
  ["41", "42", "43", "54"].forEach((n) => axial(`bat${n}`, `BAT${n}`));
  axial("her207", "HER207");
  for (const z of ZENERS) {
    out.push(def(`zener-${z}`, `Z ${z.toUpperCase()}`, "semiconductor", 7, 2.6, row([["A", "Anode"], ["K", "Cathode"]], 2.6, 1, 6), { zener_voltage_V: z.endsWith("v") ? Number(z.slice(0, -1)) : Number(z.replace("v", ".")) }));
  }
  return out;
};

// ---------------------------------------------------------------- LEDs
const LED_COLORS: [string, string][] = [
  ["red", "#ff2a2a"], ["green", "#28c840"], ["yellow", "#ffd23f"], ["blue", "#3a7bff"],
  ["white", "#f4f6fb"], ["amber", "#ff9f1a"], ["orange", "#ff6a00"], ["ir", "#3a1a4a"],
];
const ledDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const led = (type: string, label: string, w: number, h: number, pins: PinSpec[], color: string) =>
    out.push(def(type, label, "led-display", w, h, row(pins, h, 1, w - 1), { color }));
  for (const [c] of LED_COLORS) {
    led(`led-3mm-${c}`, `3mm ${c}`, 5, 6.5, ["A", "K"], c);
    led(`led-5mm-${c}`, `5mm ${c}`, 6, 7.5, ["A", "K"], c);
    led(`led-8mm-${c}`, `8mm ${c}`, 8, 8.5, ["A", "K"], c);
    led(`led-10mm-${c}`, `10mm ${c}`, 10, 10, ["A", "K"], c);
  }
  led("led-rgb-cc", "RGB CC", 8, 8, ["R", "G", "B", "K"], "rgb");
  led("led-rgb-ca", "RGB CA", 8, 8, ["R", "G", "B", "A"], "rgb");
  led("led-blink-red", "BLINK", 5, 7.5, ["A", "K"], "red");
  led("led-blink-blue", "BLINK", 5, 7.5, ["A", "K"], "blue");
  return out;
};

// ---------------------------------------------------------------- transistors
const to92 = (type: string, label: string, order: PinSpec[]) =>
  def(type, label, "semiconductor", 5, 5, row(order, 5, 1.2, 3.8));
const to220 = (type: string, label: string, order: PinSpec[]) =>
  def(type, label, "semiconductor", 10, 15, row(order, 15, 2.5, 7.5));

const transistorDefs = (): PartDefinition[] => [
  to92("2n3904", "2N3904", ["E", "B", "C"]),
  to92("2n3906", "2N3906", ["E", "B", "C"]),
  to92("2n2222a", "2N2222A", ["E", "B", "C"]),
  to92("2n5401", "2N5401", ["E", "B", "C"]),
  to92("2n5551", "2N5551", ["E", "B", "C"]),
  to92("2n7000", "2N7000", ["S", "G", "D"]),
  to92("bc546", "BC546", ["C", "B", "E"]),
  to92("bc548", "BC548", ["C", "B", "E"]),
  to92("bc549", "BC549", ["C", "B", "E"]),
  to92("bc550", "BC550", ["C", "B", "E"]),
  to92("bc556", "BC556", ["C", "B", "E"]),
  to92("bc558", "BC558", ["C", "B", "E"]),
  to92("bc559", "BC559", ["C", "B", "E"]),
  to92("bc560", "BC560", ["C", "B", "E"]),
  def("bd140", "BD140", "semiconductor", 12, 16, [px("E", "Emitter", 3, 16), px("C", "Collector", 6, 16), px("B", "Base", 9, 16)], {}),
  to220("tip3055", "TIP3055", ["B", "C", "E"]),
  to220("tip32c", "TIP32C", ["B", "C", "E"]),
  to220("tip35c", "TIP35C", ["B", "C", "E"]),
  to220("tip42c", "TIP42C", ["B", "C", "E"]),
  ...["120", "121", "122", "123", "125", "126", "127"].map((n) => to220(`tip${n}`, `TIP${n}`, ["B", "C", "E"])),
  ...["510", "520", "530", "610", "620", "630", "640", "644", "660"].map((n) => to220(`irf${n}n`, `IRF${n}N`, ["G", "D", "S"])),
  to220("irfz24n", "IRFZ24N", ["G", "D", "S"]),
  to220("irfz34n", "IRFZ34N", ["G", "D", "S"]),
  to220("irfz48n", "IRFZ48N", ["G", "D", "S"]),
  to220("irf9530", "IRF9530", ["G", "D", "S"]),
  to220("irf1404", "IRF1404", ["G", "D", "S"]),
  to220("irlz44n", "IRLZ44N", ["G", "D", "S"]),
  to220("irf5210", "IRF5210", ["G", "D", "S"]),
  def("2n3055", "2N3055", "semiconductor", 20, 12, [px("B", "Base", 6, 12), px("E", "Emitter", 14, 12), px("C", "Case", 17, 6)], {}),
];

// ---------------------------------------------------------------- more ICs
const memDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  for (const n of ["04", "08", "16", "32", "64", "128", "256", "512"]) {
    out.push(def(`24c${n}`, `24C${n}`, "ic", 10, 6.5, dipPins(8, 10, 6.5, { "1": "A0", "2": "A1", "3": "A2", "4": "GND", "5": "SDA", "6": "SCL", "7": "WP", "8": "VCC" }), { memory_kb: Number(n) / 8 }));
  }
  for (const n of ["010", "020", "040", "080", "160", "320", "640", "128", "256", "512"]) {
    out.push(def(`25aa${n}`, `25AA${n}`, "ic", 10, 6.5, dipPins(8, 10, 6.5, { "1": "/CS", "2": "SO", "3": "/WP", "4": "GND", "5": "SI", "6": "SCK", "7": "/HOLD", "8": "VCC" })));
  }
  out.push(def("6116", "6116", "ic", 19, 6.5, dipPins(24, 19, 6.5, { "12": "GND", "24": "VCC" })));
  out.push(def("6264", "6264", "ic", 19, 6.5, dipPins(28, 19, 6.5, { "14": "GND", "28": "VCC" })));
  out.push(def("27c256", "27C256", "ic", 19, 6.5, dipPins(28, 19, 6.5, { "14": "GND", "28": "VCC" })));
  return out;
};

const AMP8 = { "1": "OUT1", "2": "IN1-", "3": "IN1+", "4": "V-", "5": "IN2+", "6": "IN2-", "7": "OUT2", "8": "V+" };
const ampDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const SINGLE8 = { "1": "BAL", "2": "IN-", "3": "IN+", "4": "V-", "5": "BAL2", "6": "OUT", "7": "V+", "8": "NC" };
  const IA8 = { "1": "RG", "2": "IN-", "3": "IN+", "4": "V-", "5": "REF", "6": "OUT", "7": "V+", "8": "RG2" };
  const TIMER555 = { "1": "GND", "2": "TRIG", "3": "OUT", "4": "RST", "5": "CV", "6": "THR", "7": "DIS", "8": "VCC" };
  const d8 = (type: string, label: string, names: Record<string, string>, props: Record<string, unknown> = {}) =>
    out.push(def(type, label, "ic", 10, 6.5, dipPins(8, 10, 6.5, names), props));
  d8("opa2134", "OPA2134", AMP8, { slew_rate_V_us: 20 });
  d8("ne5532", "NE5532", AMP8);
  d8("lm833", "LM833", AMP8);
  d8("lt1013", "LT1013", AMP8);
  d8("tl071", "TL071", SINGLE8);
  d8("ne5534", "NE5534", { ...SINGLE8, "8": "COMP" });
  d8("ad620", "AD620", IA8, { kind: "instrumentation" });
  d8("ina128", "INA128", IA8, { kind: "instrumentation" });
  d8("tlc555", "TLC555", TIMER555, { kind: "timer" });
  d8("se555", "SE555", TIMER555, { kind: "timer" });
  out.push(def("lm556", "LM556", "ic", 19, 6.5, dipPins(14, 19, 6.5, { "7": "GND", "14": "VCC" }), { kind: "timer" }));
  return out;
};

const regDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const t220pins = () => row([["IN", "Input"], ["GND", "Ground"], ["OUT", "Output"]], 15, 2.5, 7.5);
  for (const v of ["05", "06", "08", "10", "15", "18", "24"]) {
    out.push(def(`l78${v}`, `78${v}`, "ic", 10, 15, t220pins(), { output_voltage_V: Number(v) }));
  }
  for (const v of ["05", "09", "12", "15"]) {
    out.push(def(`l79${v}`, `79${v}`, "ic", 10, 15, row([["GND", "Ground"], ["IN", "Input"], ["OUT", "Output"]], 15, 2.5, 7.5), { output_voltage_V: Number(v), rail: "negative" }));
  }
  for (const v of ["12", "18", "25", "33", "50"]) {
    out.push(def(`ams1117-${v}`, `AMS1117-${v === "12" ? "1.2" : v === "18" ? "1.8" : v === "25" ? "2.5" : v === "33" ? "3.3" : "5.0"}`, "ic", 7, 5, row([["GND", "Ground"], ["OUT", "Output"], ["IN", "Input"]], 5, 1.5, 5.5)));
  }
  out.push(def("ld1117-33", "LD1117-3.3", "ic", 7, 5, row([["GND", "Ground"], ["OUT", "Output"], ["IN", "Input"]], 5, 1.5, 5.5)));
  out.push(def("lm2596s", "LM2596S", "ic", 15, 10, row([["VIN", "Vin"], ["OUT", "Out"], ["GND", "GND"], ["FB", "Feedback"], ["ON", "Enable"]], 10, 1.5, 13.5), { kind: "buck" }));
  out.push(def("mc34063", "MC34063", "ic", 10, 6.5, dipPins(8, 10, 6.5, {}), { kind: "switcher" }));
  out.push(def("lm2576", "LM2576", "ic", 10, 15, row([["IN", "Vin"], ["OUT", "Out"], ["GND", "GND"], ["FB", "FB"], ["ON", "ON"]], 15, 1.5, 8.5), { kind: "buck" }));
  return out;
};

const optoDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const opto6 = (type: string, label: string, props: Record<string, unknown> = {}) =>
    out.push(def(type, label, "ic", 8, 6.5, dipPins(6, 8, 6.5, { "1": "A", "2": "K", "3": "NC", "4": "E", "5": "NC", "6": "C" }), props));
  ["4n25", "4n35", "4n37", "pc817", "tlp521", "moc3021", "moc3023", "moc3041", "moc3063"].forEach((t) =>
    opto6(t, t.toUpperCase(), t.startsWith("moc") ? { kind: "triac-driver" } : { kind: "optocoupler" }),
  );
  out.push(def("uln2003a", "ULN2003A", "ic", 19, 6.5, dipPins(16, 19, 6.5, { "8": "GND", "9": "COM", "16": "VCC" }), { kind: "darlington" }));
  out.push(def("uln2004a", "ULN2004A", "ic", 19, 6.5, dipPins(16, 19, 6.5, { "8": "GND", "9": "COM", "16": "VCC" }), { kind: "darlington" }));
  out.push(def("mc1413", "MC1413", "ic", 19, 6.5, dipPins(16, 19, 6.5, { "8": "GND", "9": "COM", "16": "VCC" }), { kind: "darlington" }));
  out.push(def("ir2110", "IR2110", "ic", 20, 7.5, dipPins(14, 20, 6.5, { "1": "LO", "2": "COM", "3": "VCC", "4": "NC", "5": "VS", "6": "VB", "7": "HO", "8": "NC", "9": "VDD", "10": "HIN", "11": "SD", "12": "LIN", "13": "VSS", "14": "NC" }), { kind: "gate-driver" }));
  out.push(def("tc4427", "TC4427", "ic", 10, 6.5, dipPins(8, 10, 6.5, { "4": "GND", "8": "VDD" }), { kind: "gate-driver" }));
  out.push(def("tlp250", "TLP250", "ic", 10, 6.5, dipPins(8, 10, 6.5, { "1": "NC", "2": "A", "3": "K", "4": "NC", "5": "GND", "6": "VO", "7": "VO", "8": "VCC" }), { kind: "gate-driver" }));
  return out;
};

// ---------------------------------------------------------------- connectors
const connDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const screw = (n: number) =>
    out.push(def(`screw-terminal-${n}`, `SCREW ${n}P`, "connector", n * 5 + 2, 7, row(Array.from({ length: n }, (_, i) => String(i + 1)), 7, 3, n * 5 - 1)));
  [2, 4, 5, 6, 8, 10, 12].forEach(screw);
  const dupont = (n: number) =>
    out.push(def(`dupont-${n}`, `DUPONT ${n}P`, "connector", n * 2.5 + 1, 4, row(Array.from({ length: n }, (_, i) => String(i + 1)), 4, 1.5, n * 2.5 - 0.5)));
  [2, 3, 4, 5, 6, 7, 8].forEach(dupont);
  const hdr = (type: string, label: string, n: number) =>
    out.push(def(type, label, "connector", n * 2 + 2, 4.5, row(Array.from({ length: n }, (_, i) => String(i + 1)), 4.5, 1.5, n * 2 + 0.5)));
  hdr("jst-ph3", "JST-PH3", 3); hdr("jst-ph4", "JST-PH4", 4); hdr("jst-ph5", "JST-PH5", 5); hdr("jst-ph6", "JST-PH6", 6);
  hdr("jst-xh3", "JST-XH3", 3); hdr("jst-xh4", "JST-XH4", 4); hdr("jst-xh5", "JST-XH5", 5);
  out.push(def("banana-jack-t", "BANANA", "connector", 8, 10, [px("TIP", "Tip", 2.5, 10), px("GND", "Lug", 5.5, 10)], {}));
  out.push(def("banana-jack-g", "BANANA G", "connector", 8, 10, [px("TIP", "Tip", 2.5, 10), px("GND", "Lug", 5.5, 10)], {}));
  out.push(def("rca-jack", "RCA", "connector", 9, 11, [px("TIP", "Tip", 3, 11), px("GND", "Ground", 6, 11)], {}));
  out.push(def("xlr-3m", "XLR-3M", "connector", 16, 16, row(["1", "2", "3"], 16, 5, 11), {}));
  out.push(def("xlr-3f", "XLR-3F", "connector", 16, 16, row(["1", "2", "3"], 16, 5, 11), {}));
  out.push(def("de9-m", "DE9-M", "connector", 22, 8, [...row(["1", "2", "3", "4", "5"], 8, 3, 19), ...row(["6", "7", "8", "9"], 4, 4.5, 17.5)], {}));
  out.push(def("de9-f", "DE9-F", "connector", 22, 8, [...row(["1", "2", "3", "4", "5"], 4, 3, 19), ...row(["6", "7", "8", "9"], 8, 4.5, 17.5)], {}));
  out.push(def("db25-f", "DB25-F", "connector", 34, 9, [...row(["13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"], 4, 3, 31), ...row(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], 9, 4, 30)], {}));
  out.push(def("rj11", "RJ11", "connector", 12, 13, row(["1", "2", "3", "4", "5", "6"], 13, 2, 10), {}));
  out.push(def("rj45", "RJ45", "connector", 14, 14, row(["1", "2", "3", "4", "5", "6", "7", "8"], 14, 1.5, 12.5), {}));
  const ffc = (n: number) => out.push(def(`ffc-${n}`, `FFC ${n}P`, "connector", n * 1 + 4, 5, row(Array.from({ length: n }, (_, i) => String(i + 1)), 5, 2, n + 2)));
  [6, 10, 12, 20].forEach(ffc);
  out.push(def("dc-plug-21", "DC 2.1", "connector", 11, 9, [px("TIP", "Tip", 3, 9), px("SLEEVE", "Sleeve", 8, 9)], {}));
  out.push(def("dc-plug-25", "DC 2.5", "connector", 11, 9, [px("TIP", "Tip", 3, 9), px("SLEEVE", "Sleeve", 8, 9)], {}));
  out.push(def("dc-plug-55", "DC 5.5", "connector", 13, 10, [px("TIP", "Tip", 4, 10), px("SLEEVE", "Sleeve", 9, 10)], {}));
  out.push(def("usb-b-socket", "USB-B", "connector", 12, 16, row(["VBUS", "D-", "D+", "GND"], 16, 2, 10), {}));
  out.push(def("usb-mini-b", "USB-MINI", "connector", 8, 10, row(["VBUS", "D-", "D+", "ID", "GND"], 10, 1, 7), {}));
  out.push(def("xt30", "XT30", "connector", 8, 8, [px("+", "+", 2.5, 8), px("-", "−", 5.5, 8)], {}));
  out.push(def("xt60", "XT60", "connector", 12, 10, [px("+", "+", 3.5, 10), px("-", "−", 8.5, 10)], {}));
  out.push(def("jst-ec2", "EC2", "connector", 8, 8, [px("+", "+", 2.5, 8), px("-", "−", 5.5, 8)], {}));
  return out;
};

// ---------------------------------------------------------------- switches
const swDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  for (const n of [1, 2, 3, 4, 5, 6, 10, 12, 16]) {
    out.push(def(`dip-${n}`, `DIP-${n * 2}`, "input", n * 2.4 + 2, 6, [...row(Array.from({ length: n }, (_, i) => String(i + 1)), 6, 2, n * 2.4), ...row(Array.from({ length: n }, (_, i) => String(i + n + 1)), 0, 2, n * 2.4)], {}));
  }
  out.push(def("toggle-spst", "TOGGLE", "input", 7, 12, row(["1", "2"], 12, 2.5, 4.5), {}));
  out.push(def("toggle-spdt", "TOGGLE", "input", 9, 12, row(["1", "2", "3"], 12, 2, 7), {}));
  out.push(def("toggle-dpdt", "TOGGLE", "input", 13, 12, [...row(["1", "2", "3"], 12, 2, 11), ...row(["4", "5", "6"], 6, 2, 11)], {}));
  out.push(def("toggle-mini", "MINI-TOG", "input", 5, 10, row(["1", "2"], 10, 1.5, 3.5), {}));
  out.push(def("slide-3pos", "SLIDE 3P", "input", 10, 6, row(["1", "2", "3"], 6, 2, 8), {}));
  out.push(def("slide-micro", "μSLIDE", "input", 8, 5, row(["1", "2"], 5, 2, 6), {}));
  for (const [stem, color] of [["red", "#e8593c"], ["blue", "#3a7bff"], ["brown", "#8a5a2c"], ["black", "#2b2f36"], ["silver", "#c0c8d0"]] as [string, string][]) {
    out.push(def(`mx-${stem}`, `MX ${stem}`, "input", 15.6, 15.6, [...col(["SW1", "SW2"], 1, 6, 10), ...col(["K1", "K2", "K3", "K4", "K5"], 14.6, 4, 12)], { color }));
  }
  out.push(def("microswitch-kw10", "KW10", "input", 13, 7, row(["C", "NO", "NC"], 7, 2, 11), {}));
  out.push(def("microswitch-ss5", "SS-5GL", "input", 20, 10, row(["C", "NO", "NC"], 10, 3, 17), {}));
  out.push(def("microswitch-v10", "V-10", "input", 13, 7, row(["C", "NO", "NC"], 7, 2, 11), {}));
  out.push(def("keylock-1p2t", "KEYLOCK", "input", 12, 14, row(["1", "2", "3"], 14, 3, 9), {}));
  out.push(def("tilt-mercury", "MERCURY", "input", 8, 10, [px("1", "1", 3, 10), px("2", "2", 5, 10)], {}));
  return out;
};

// ---------------------------------------------------------------- batteries / power / electromech
const pwrDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const holder = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "power", w, h, [px("+", "+", w / 2 - 3, h), px("-", "−", w / 2 + 3, h)]));
  holder("aa-holder-1", "AA x1", 15, 52); holder("aa-holder-2", "AA x2", 15, 52);
  holder("aa-holder-3", "AA x3", 15, 52); holder("aa-holder-4", "AA x4", 15, 52);
  holder("aaa-holder-1", "AAA x1", 12, 46); holder("aaa-holder-2", "AAA x2", 12, 46);
  holder("aaa-holder-3", "AAA x3", 12, 46);
  holder("18650-holder-1", "18650 x1", 21, 76); holder("18650-holder-2", "18650 x2", 21, 76);
  holder("coin-2450", "CR2450", 25, 23); holder("v9-clip", "9V CLIP", 16, 20);
  holder("lipo-1s", "LiPo 1S", 25, 16); holder("lipo-3s", "LiPo 3S", 30, 18); holder("lipo-4s", "LiPo 4S", 36, 20);
  holder("solar-5v", "SOLAR 5V", 70, 70); holder("solar-6v", "SOLAR 6V", 85, 85); holder("solar-12v", "SOLAR 12V", 100, 100);
  out.push(def("hlk-pm01", "HLK-PM01", "power", 34, 20, [...row(["AC-N", "AC-L"], 0, 8, 26), ...row(["+5V", "GND"], 20, 8, 26)], { nominal_voltage_V: 5 }));
  out.push(def("hlk-pm03", "HLK-PM03", "power", 34, 20, [...row(["AC-N", "AC-L"], 0, 8, 26), ...row(["+3V3", "GND"], 20, 8, 26)], { nominal_voltage_V: 3.3 }));
  out.push(def("lm2596-module", "LM2596", "module", 43, 21, [...row(["IN+", "IN-"], 0, 8, 35), ...row(["OUT+", "OUT-"], 21, 8, 35)], {}));
  out.push(def("xl6009-module", "XL6009", "module", 43, 21, [...row(["IN+", "IN-"], 0, 8, 35), ...row(["OUT+", "OUT-"], 21, 8, 35)], {}));
  out.push(def("mp1584-module", "MP1584", "module", 22, 17, [...row(["IN+", "IN-"], 0, 5, 17), ...row(["OUT+", "OUT-"], 17, 5, 17)], {}));
  const relay = (type: string, label: string, v: number) =>
    out.push(def(type, label, "output", 19, 15.5, [...row(["COIL1", "COIL2"], 15.5, 3, 16), ...row(["NO", "COM", "NC"], 0, 5, 14)], { nominal_voltage_V: v }));
  relay("relay-hk4100f", "HK4100F", 5);
  relay("relay-jqc3f-5v", "JQC-3F", 5); relay("relay-jqc3f-12v", "JQC-3F", 12); relay("relay-jqc3f-24v", "JQC-3F", 24);
  out.push(def("reed-relay", "REED-RLY", "output", 12, 8, [...row(["COIL1", "COIL2"], 8, 2, 4), ...row(["1", "2"], 0, 8, 10)], {}));
  out.push(def("relay-4ch", "RLY 4CH", "module", 56, 40, [...row(["VCC", "GND", "IN1", "IN2", "IN3", "IN4"], 40, 5, 51), ...row(["NO1", "NO2", "NO3", "NO4"], 0, 6, 50)], {}));
  out.push(def("ssr-dc", "SSR-DC", "output", 24, 18, [...row(["IN+", "IN-"], 0, 6, 18), ...row(["NO", "COM"], 18, 8, 16)], {}));
  out.push(def("ssr-ac", "SSR-AC", "output", 24, 18, [...row(["IN+", "IN-"], 0, 6, 18), ...row(["NO", "COM"], 18, 8, 16)], {}));
  out.push(def("spk-050", "SPK 0.5W", "output", 22, 22, [px("+", "+", 8, 22), px("-", "−", 14, 22)], {}));
  out.push(def("spk-1w", "SPK 1W", "output", 28, 28, [px("+", "+", 10, 28), px("-", "−", 18, 28)], {}));
  out.push(def("spk-2w", "SPK 2W", "output", 40, 40, [px("+", "+", 15, 40), px("-", "−", 25, 40)], {}));
  out.push(def("spk-3w", "SPK 3W", "output", 45, 45, [px("+", "+", 17, 45), px("-", "−", 28, 45)], {}));
  out.push(def("piezo-disc", "PIEZO", "output", 14, 14, [px("+", "+", 5, 14), px("-", "−", 9, 14)], {}));
  out.push(def("horn-12v", "HORN", "output", 32, 32, [px("+", "+", 12, 32), px("-", "−", 20, 32)], {}));
  out.push(def("heating-cartridge", "HEATER", "output", 25, 8, [px("+", "+", 8, 8), px("-", "−", 17, 8)], {}));
  out.push(def("solenoid-plunger", "SOLENOID", "output", 20, 14, [px("M+", "Coil +", 7, 14), px("M-", "Coil −", 13, 14)], {}));
  return out;
};

// ---------------------------------------------------------------- motors / drivers / RF / displays / sensors
const miscDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const motor2 = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "motor", w, h, [px("M-", "Motor −", w / 2 - 3, h), px("M+", "Motor +", w / 2 + 3, h)], {}));
  motor2("n10-motor", "N10", 10, 12); motor2("n30-motor", "N30", 15, 18);
  motor2("37gb-gearmotor", "37GB", 37, 33); motor2("520-motor", "520", 35, 25);
  motor2("540-motor", "540", 35, 25); motor2("775-motor", "775", 42, 30);
  motor2("worm-gearmotor", "WORM", 37, 33);
  const nema = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "motor", w, h, row(["A1", "A2", "B1", "B2"], h, w * 0.3, w * 0.7), { step_angle_deg: 1.8 }));
  nema("nema8", "NEMA 8", 20, 20); nema("nema11", "NEMA 11", 28, 28); nema("nema14", "NEMA 14", 35, 35);
  const servo = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "motor", w, h, row(["GND", "VIN", "PWM"], h, w * 0.3, w * 0.7)));
  servo("servo-mg995", "MG995", 40, 20); servo("servo-mg996r", "MG996R", 40, 20);
  servo("servo-sg5010", "SG5010", 32, 28); servo("servo-ds3225", "DS3225", 40, 20);
  servo("servo-mg958", "MG958", 45, 20); servo("servo-ls006", "LS006", 22, 12);
  const fan = (type: string, label: string, s: number) =>
    out.push(def(type, label, "motor", s, s, row(["GND", "VIN", "PWM"], s, s * 0.3, s * 0.7)));
  fan("fan-40mm", "40mm", 40); fan("fan-60mm", "60mm", 60);
  fan("fan-80mm", "80mm", 80); fan("fan-120mm", "120mm", 120);
  // drivers
  const driver = (type: string, label: string, pins: PinSpec[], w = 34, h = 22, props: Record<string, unknown> = {}) =>
    out.push(def(type, label, "module", w, h, row(pins, h, 3, w - 3), props));
  driver("tb6560", "TB6560", ["ENA-", "ENA+", "PUL-", "PUL+", "DIR-", "DIR+", "A+", "A-", "B+", "B-"]);
  driver("tb6600", "TB6600", ["ENA-", "ENA+", "PUL-", "PUL+", "DIR-", "DIR+", "A+", "A-", "B+", "B-"]);
  driver("tmc2208", "TMC2208", ["DIR", "STEP", "EN", "VM", "GND", "B2", "B1", "A1", "A2", "VIO", "GND2"], 16, 20);
  driver("tmc2209", "TMC2209", ["DIR", "STEP", "EN", "VM", "GND", "B2", "B1", "A1", "A2", "VIO", "GND2"], 16, 20);
  driver("tmc2130", "TMC2130", ["DIR", "STEP", "EN", "VM", "GND", "B2", "B1", "A1", "A2", "VIO", "GND2"], 16, 20);
  driver("tmc5160", "TMC5160", ["VM", "GND", "A1", "A2", "B1", "B2", "SPI"], 22, 16);
  driver("l298n-module", "L298N", ["12V", "GND", "5V", "ENA", "IN1", "IN2", "IN3", "IN4", "ENB", "OUT1", "OUT2", "OUT3", "OUT4"], 43, 43);
  driver("drv8833", "DRV8833", ["VCC", "GND", "AIN1", "AIN2", "BIN1", "BIN2", "A1", "A2", "B1", "B2"], 22, 16);
  driver("vnh2sp30", "VNH2SP30", ["VCC", "GND", "IN_A", "IN_B", "EN_A", "EN_B", "OUT_A", "OUT_B", "CS"], 43, 30);
  // rf / comm
  out.push(def("nrf24l01", "nRF24L01", "module", 15, 29, row(["VCC", "GND", "CE", "CSN", "SCK", "MOSI", "MISO", "IRQ"], 29, 1.5, 13.5)));
  out.push(def("nrf24l01-pa", "nRF24 PA", "module", 15, 34, row(["VCC", "GND", "CE", "CSN", "SCK", "MOSI", "MISO", "IRQ"], 34, 1.5, 13.5)));
  out.push(def("rfm95w", "RFM95W", "module", 32, 18, row(["VIN", "GND", "MOSI", "MISO", "SCK", "CS", "RST", "IRQ"], 18, 3, 29)));
  out.push(def("sx1262", "SX1262", "module", 32, 18, row(["VIN", "GND", "MOSI", "MISO", "SCK", "CS", "RST", "IRQ"], 18, 3, 29)));
  out.push(def("e32-ttl-100", "E32", "module", 21, 33, row(["M0", "M1", "AUX", "TX", "RX", "VCC", "GND"], 33, 2, 19)));
  out.push(def("rf433-tx", "433 TX", "module", 14, 20, row(["VCC", "GND", "DATA"], 20, 3, 11)));
  out.push(def("rf433-rx", "433 RX", "module", 14, 20, row(["VCC", "GND", "DATA"], 20, 3, 11)));
  out.push(def("jdy-31", "JDY-31", "module", 27, 13, row(["VCC", "GND", "TX", "RX"], 13, 4, 23)));
  out.push(def("at-09", "AT-09", "module", 27, 13, row(["VCC", "GND", "TX", "RX"], 13, 4, 23)));
  for (const [type, label] of [["sim800c", "SIM800C"], ["sim900a", "SIM900A"], ["a6-mini", "A6 MINI"], ["a7", "A7"]]) {
    out.push(def(type, label, "module", 23, 20, row(["VCC", "GND", "TX", "RX"], 20, 5, 18)));
  }
  for (const [type, label] of [["neo-7m", "NEO-7M"], ["neo-8m", "NEO-8M"], ["neo-9m", "NEO-9M"], ["atgm336h", "ATGM336H"], ["l80-gps", "L80"], ["bn-220", "BN-220"]]) {
    out.push(def(type, label, "module", 36, 24, row(["VCC", "GND", "TX", "RX"], 24, 7, 29)));
  }
  out.push(def("vs1838b", "VS1838B", "sensor", 6, 7, row(["OUT", "GND", "VCC"], 7, 1.5, 4.5)));
  out.push(def("tsop4838", "TSOP4838", "sensor", 6, 7, row(["OUT", "GND", "VCC"], 7, 1.5, 4.5)));
  out.push(def("antenna-433", "ANT 433", "module", 6, 25, [px("ANT", "Feed", 2, 25), px("GND", "GND", 4, 25)], {}));
  out.push(def("antenna-2g4", "ANT 2.4G", "module", 12, 30, [px("ANT", "Feed", 2, 30), px("GND", "GND", 10, 30)], {}));
  out.push(def("antenna-gps", "GPS PATCH", "module", 25, 25, [px("ANT", "Feed", 4, 25), px("GND", "GND", 20, 25)], {}));
  out.push(def("antenna-gsm", "GSM COIL", "module", 8, 20, [px("ANT", "Feed", 3, 20), px("GND", "GND", 5, 20)], {}));
  out.push(def("antenna-wifi", "WIFI DUCK", "module", 8, 24, [px("ANT", "Feed", 2, 24), px("GND", "GND", 6, 24)], {}));
  out.push(def("nodemcu-32s", "NODEMCU-32S", "module", 52, 30, [...col(["3V3", "EN", "VP", "VN", "34", "35", "32", "33", "25", "26", "27", "14"], 2.2, 3, 27), ...col(["12", "13", "GND", "23", "22", "TXD", "RXD", "21", "19", "18", "5", "17"], 49.8, 3, 27)]));
  out.push(def("wemos-r32", "D1 R32", "board", 69, 54, [...row(["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13"], 2.2, 15, 65), ...row(["VIN", "GND", "5V", "3V3", "EN"], 51.8, 13, 31), ...row(["A0", "A3", "A4", "A5", "A6", "A7"], 51.8, 36, 62)]));
  out.push(def("esp32-s2-mini", "S2-MINI", "module", 18, 24, row(["GND", "IO2", "IO0", "RX", "TX", "EN", "RST", "VCC"], 24, 2, 16)));
  out.push(def("esp32-s3-mini", "S3-MINI", "module", 18, 24, row(["GND", "IO2", "IO0", "RX", "TX", "EN", "RST", "VCC"], 24, 2, 16)));
  out.push(def("esp32-c3-mini", "C3-MINI", "module", 18, 24, row(["GND", "IO2", "IO0", "RX", "TX", "EN", "RST", "VCC"], 24, 2, 16)));
  // displays
  const lcd = (type: string, label: string, w: number, h: number, n: number) =>
    out.push(def(type, label, "display", w, h, row(Array.from({ length: n }, (_, i) => ["VSS", "VDD", "VO", "RS", "RW", "E", "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "A", "K"][i] ?? String(i + 1)), h, 3, w - 3)));
  lcd("lcd-0802", "LCD 8x2", 58, 16, 16); lcd("lcd-1602", "LCD 16x2", 80, 36, 16); lcd("lcd-1604", "LCD 16x4", 80, 58, 16);
  out.push(def("lcd-1602-i2c", "1602 I2C", "module", 42, 20, row(["VCC", "GND", "SDA", "SCL"], 20, 8, 34)));
  const oled = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "display", w, h, row(["VCC", "GND", "SDA", "SCL"], h, 3, w - 3)));
  oled("oled-049", "OLED 0.49", 12, 12); oled("oled-091", "OLED 0.91", 28, 13); oled("oled-130", "OLED 1.3", 35, 20); oled("oled-154", "OLED 1.54", 38, 24); oled("sh1107-168", "OLED 1.68", 42, 28);
  const tft = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "display", w, h, row(["VCC", "GND", "CS", "RST", "DC", "MOSI", "MISO", "SCK", "LED"], h, 4, w - 4)));
  tft("st7789-130", "ST7789 1.3", 32, 34); tft("st7789-154", "ST7789 1.54", 38, 36); tft("st7789-200", "ST7789 2.0", 44, 44); tft("ili9488-350", "ILI9488 3.5", 56, 62);
  const eink = (type: string, label: string, w: number, h: number) =>
    out.push(def(type, label, "display", w, h, row(["VCC", "GND", "DIN", "CLK", "CS", "DC", "RST", "BUSY"], h, 5, w - 5)));
  eink("eink-154", "E-INK 1.54", 28, 22); eink("eink-213", "E-INK 2.13", 33, 26); eink("eink-420", "E-INK 4.2", 55, 40); eink("eink-750", "E-INK 7.5", 90, 60);
  const nixie = (type: string, label: string, w: number) =>
    out.push(def(type, label, "display", w, w * 2.1, row(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "AN"], w * 2.1, w * 0.1, w * 0.9)));
  nixie("nixie-in4", "IN-4", 13); nixie("nixie-in8", "IN-8", 15); nixie("nixie-in12", "IN-12", 18); nixie("nixie-in18", "IN-18", 20);
  out.push(def("iv3-vfd", "IV-3 VFD", "display", 13, 28, row(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "AN"], 28, 1.5, 11.5)));
  out.push(def("tm1637-6digit", "6DIGIT", "display", 42, 20, row(["VCC", "GND", "DIO", "CLK"], 20, 8, 34)));
  out.push(def("neopixel-ring12", "RING 12", "display", 34, 34, [px("5V", "Power", 13, 2), px("GND", "Ground", 17, 2), px("DIN", "Data in", 21, 2), px("DOUT", "Data out", 25, 2)]));
  out.push(def("neopixel-ring24", "RING 24", "display", 56, 56, [px("5V", "Power", 22, 2), px("GND", "Ground", 27, 2), px("DIN", "Data in", 32, 2), px("DOUT", "Data out", 37, 2)]));
  out.push(def("neopixel-stick16", "NPX x16", "module", 84, 10, row(["DIN", "5V", "GND"], 10, 2, 8)));
  out.push(def("ws2812-matrix16", "MATRIX 16", "display", 64, 64, row(["5V", "GND", "DIN", "DOUT"], 64, 12, 52)));
  // sensors
  const i2c6 = (type: string, label: string) =>
    out.push(def(type, label, "sensor", 18, 14, row(["VCC", "GND", "SCL", "SDA", "INT"], 14, 2, 16)));
  const i2c4 = (type: string, label: string) =>
    out.push(def(type, label, "sensor", 16, 12, row(["VCC", "GND", "SDA", "SCL"], 12, 3, 13)));
  out.push(def("ina219", "INA219", "sensor", 26, 16, [...row(["IP+", "IP-"], 0, 6, 20), ...row(["VCC", "GND", "SDA", "SCL"], 16, 4, 22)]));
  out.push(def("ina226", "INA226", "sensor", 26, 16, [...row(["IP+", "IP-"], 0, 6, 20), ...row(["VCC", "GND", "SDA", "SCL"], 16, 4, 22)]));
  i2c4("ina260", "INA260");
  for (const [type, label] of [["acs712-05b", "ACS712-05"], ["acs712-20a", "ACS712-20"], ["acs712-30a", "ACS712-30"]]) {
    out.push(def(type, label, "sensor", 31, 18, [...row(["IP+", "IP-"], 0, 8, 23), ...row(["VCC", "GND", "VO"], 18, 8, 23)]));
  }
  out.push(def("max31855", "MAX31855", "sensor", 18, 14, row(["VCC", "GND", "SCK", "SO", "CS"], 14, 2, 16)));
  out.push(def("max31856", "MAX31856", "sensor", 18, 14, row(["VCC", "GND", "CLK", "MOSI", "MISO", "CS"], 14, 1.5, 16.5)));
  out.push(def("max31865", "MAX31865", "sensor", 18, 14, row(["VCC", "GND", "CLK", "SDI", "SDO", "CS", "RDY"], 14, 1, 17)));
  out.push(def("ad8495", "AD8495", "sensor", 14, 10, row(["VCC", "GND", "OUT"], 10, 3, 11)));
  out.push(def("pzem-004t", "PZEM-004T", "sensor", 34, 20, row(["VCC", "GND", "TX", "RX"], 20, 6, 28)));
  out.push(def("sht11", "SHT11", "sensor", 12, 8, row(["1", "2", "3", "4"], 8, 2, 10)));
  out.push(def("sht15", "SHT15", "sensor", 12, 8, row(["1", "2", "3", "4"], 8, 2, 10)));
  for (const [type, label] of [["sht30", "SHT30"], ["sht35", "SHT35"], ["sht40", "SHT40"], ["sht41", "SHT41"]]) i2c4(type, label);
  i2c4("bmp388", "BMP388"); i2c4("bmp390", "BMP390");
  i2c6("bmi160", "BMI160"); i2c6("bmi270", "BMI270"); i2c6("bmm150", "BMM150"); i2c6("lis3dh", "LIS3DH");
  i2c6("lsm6ds3", "LSM6DS3"); i2c6("icm20948", "ICM20948"); i2c6("lsm9ds1", "LSM9DS1");
  i2c4("veml7700", "VEML7700"); i2c4("tsl2591", "TSL2591"); i2c4("opt3001", "OPT3001"); i2c4("isl29125", "ISL29125");
  i2c6("vcnl4010", "VCNL4010"); i2c6("vcnl4040", "VCNL4040");
  out.push(def("tcs3200", "TCS3200", "sensor", 28, 20, row(["VCC", "GND", "S0", "S1", "S2", "S3", "OUT", "OE"], 20, 3, 25)));
  out.push(def("gp2y0a02", "GP2Y0A02", "sensor", 20, 18, row(["VCC", "GND", "VO"], 18, 5, 15)));
  out.push(def("us-100", "US-100", "sensor", 22, 16, row(["VCC", "GND", "TRIG", "ECHO", "EN"], 16, 3, 19)));
  out.push(def("srf05", "SRF05", "sensor", 26, 18, row(["VCC", "GND", "TRIG", "ECHO", "MODE"], 18, 3, 23)));
  out.push(def("ec11", "EC11", "input", 14, 14, [...row(["A", "C", "B"], 14, 3, 11), ...row(["S1", "S2"], 6, 4, 10)]));
  out.push(def("hall-a3144", "A3144", "sensor", 5, 5, row(["VCC", "GND", "OUT"], 5, 1.2, 3.8)));
  out.push(def("hall-44e", "44E", "sensor", 5, 5, row(["VCC", "GND", "OUT"], 5, 1.2, 3.8)));
  out.push(def("hall-49e", "49E", "sensor", 5, 5, row(["VCC", "GND", "OUT"], 5, 1.2, 3.8)));
  out.push(def("tmp36", "TMP36", "sensor", 5, 5, row(["VCC", "VOUT", "GND"], 5, 1.2, 3.8)));
  out.push(def("mcp9700", "MCP9700", "sensor", 5, 5, row(["VCC", "VOUT", "GND"], 5, 1.2, 3.8)));
  i2c4("lm75", "LM75");
  out.push(def("turbidity", "TURBID", "sensor", 30, 18, row(["VCC", "GND", "AO"], 18, 8, 22)));
  out.push(def("anemometer", "ANEMO", "sensor", 30, 22, row(["VCC", "GND", "PULSE"], 22, 8, 22)));
  out.push(def("sound-detector", "SOUND", "sensor", 16, 12, row(["VCC", "GND", "AO", "DO"], 12, 3, 13)));
  return out;
};


// ---------------------------------------------------------------- bench passives / electromech / connectivity (non-IC expansion to 1500+)
const benchDefs = (): PartDefinition[] => {
  const out: PartDefinition[] = [];
  const OHMS: [string, number][] = [["1r0",1],["4r7",4.7],["10r",10],["22r",22],["47r",47],["100r",100],["150r",150],["220r",220],["330r",330],["470r",470],["1k",1000],["1k5",1500],["2k2",2200],["3k3",3300],["4k7",4700],["6k8",6800],["10k",10000],["15k",15000],["22k",22000],["33k",33000],["47k",47000],["68k",68000],["100k",100000],["150k",150000],["220k",220000],["330k",330000],["470k",470000],["680k",680000],["1M",1e6],["2M2",2.2e6],["4M7",4.7e6],["10M",1e7]];
  for (const [code, r] of OHMS) out.push(def(`resistor-${code.toLowerCase()}`, code.toUpperCase(), "passive", 9, 3.2, [px("1", "1", 0, 1.6), px("2", "2", 9, 1.6)], { resistance_ohms: r }));
  for (const [size, w, h] of [["0603", 1.6, 0.8], ["0805", 2, 1.25]] as [string, number, number][])
    for (const code of ["0r", "10r", "100r", "1k", "4k7", "10k", "100k", "1M"])
      out.push(def(`smd-res-${size}-${code.toLowerCase()}`, code.toUpperCase(), "passive", w, h, [px("1", "1", 0.2, h / 2), px("2", "2", w - 0.2, h / 2)], {}));
  for (const [t, w, h] of [["0603-100n", 1.6, 0.8], ["0603-1u", 1.6, 0.8], ["0805-100n", 2, 1.25], ["0805-1u", 2, 1.25], ["1206-10u", 3.2, 1.6], ["1206-22u", 3.2, 1.6]] as [string, number, number][])
    out.push(def(`smd-cap-${t}`, t.split("-")[1].toUpperCase(), "passive", w, h, [px("1", "1", 0.2, h / 2), px("2", "2", w - 0.2, h / 2)], {}));
  const RAD: [string, number, number, number][] = [["1u",6.3,11,2.5],["4u7",6.3,11,2.5],["10u",6.3,11,2.5],["22u",6.3,11,2.5],["33u",6.3,11,2.5],["47u",6.3,11,2.5],["68u",8,11.5,3.5],["100u",8,11.5,3.5],["150u",8,11.5,3.5],["220u",8,11.5,3.5],["330u",8,11.5,3.5],["470u",10,16,5],["680u",10,16,5],["1000u",10,16,5],["2200u",12.5,20,5],["4700u",12.5,20,5]];
  for (const [code, w, h, pp] of RAD) out.push(def(`cap-rad-${code}`, code.toUpperCase(), "passive", w, h, [px("+", "+", w / 2 - pp / 2, h), px("-", "−", w / 2 + pp / 2, h)], {}));
  for (const code of ["102", "103", "104", "224", "474", "105", "225", "335"]) out.push(def(`cap-film-${code}`, code, "passive", 10, 8, [px("1", "1", 3, 8), px("2", "2", 7, 8)], {}));
  for (const code of ["101", "15p", "33p", "47p", "105"]) out.push(def(`cap-ceramic-${code}`, code, "passive", 8, 10, [px("1", "1", 2.5, 10), px("2", "2", 5.5, 10)], {}));
  for (const code of ["3m579", "4m", "6m", "8m", "10m", "11m059", "12m", "14m318", "16m", "18m432", "20m", "24m", "25m", "27m", "32m"]) out.push(def(`crystal-${code}`, code.toUpperCase(), "passive", 11.5, 5, [px("1", "1", 3.4, 5), px("2", "2", 8.1, 5)], {}));
  out.push(def("crystal-cyl-32k768", "32.768k", "passive", 2.5, 8, [px("1", "1", 0.8, 8), px("2", "2", 1.7, 8)], {}));
  for (const code of ["4m", "8m", "12m", "16m", "20m", "24m", "25m", "32m", "40m", "50m"]) out.push(def(`osc-${code}`, code.toUpperCase(), "passive", 5, 3.2, [px("1", "1", 0.8, 0.5), px("2", "OUT", 4.2, 0.5), px("3", "VDD", 4.2, 2.7), px("4", "GND", 0.8, 2.7)], {}));
  for (const code of ["1uh", "4u7", "10uh", "22uh", "47uh", "100uh", "220uh", "470uh", "1mh"]) out.push(def(`inductor-${code}`, code.toUpperCase(), "passive", 8, 10, [px("1", "1", 2.5, 10), px("2", "2", 5.5, 10)], {}));
  for (const [code, w] of [["07d471", 7], ["10d471", 10], ["14d471", 14]] as [string, number][]) out.push(def(`mov-${code}`, code.toUpperCase(), "passive", w, 9, [px("1", "1", w / 2 - 2.5, 9), px("2", "2", w / 2 + 2.5, 9)], {}));
  for (const code of ["10k", "47k", "100k"]) out.push(def(`thermistor-${code}`, code, "passive", 5, 8, [px("1", "1", 1.5, 8), px("2", "2", 3.5, 8)], {}));
  for (const [code, w] of [["5d", 9], ["10d", 12], ["47d", 18]] as [string, number][]) out.push(def(`inrush-ntc-${code}`, code.toUpperCase(), "passive", w, 10, [px("1", "1", w / 2 - 2.5, 10), px("2", "2", w / 2 + 2.5, 10)], {}));
  for (const code of ["250ma", "500ma", "1a", "2a", "3a", "5a", "8a", "10a"]) out.push(def(`fuse-glass-${code}`, code.toUpperCase(), "passive", 20, 5, [px("1", "1", 0, 2.5), px("2", "2", 20, 2.5)], {}));
  out.push(def("fuse-holder-panel", "FUSE-H", "passive", 18, 8, [px("1", "1", 3, 8), px("2", "2", 15, 8)], {}));
  out.push(def("fuse-holder-pcb", "FUSE-PCB", "passive", 10, 8, [px("1", "1", 2, 8), px("2", "2", 8, 8)], {}));
  for (const v of ["5v", "12v", "24v"]) out.push(def(`relay-bare-${v}`, v.toUpperCase(), "output", 19, 15.5, [px("C1", "Coil", 2, 15.5), px("C2", "Coil", 5, 15.5), px("COM", "COM", 11, 15.5), px("NO", "NO", 14, 15.5), px("NC", "NC", 17, 15.5)], {}));
  for (const [code, taper] of [["1k", "lin"], ["10k", "lin"], ["100k", "lin"], ["500k", "lin"], ["1M", "lin"], ["10k", "log"], ["100k", "log"]] as [string, string][]) out.push(def(`pot-${code.toLowerCase()}-${taper}`, `B${code.toUpperCase()}`, "passive", 17, 17, row(["1", "2", "3"], 17, 4, 13), { taper }));
  for (const n of [45, 60, 75, 100]) out.push(def(`slide-pot-${n}`, `${n}mm`, "input", n + 15, 9, row(["1", "2", "3"], 9, (n + 15) / 2 - 2.5, (n + 15) / 2 + 2.5), {}));
  const hdr1 = (n: number) => out.push(def(`header-1x${n}`, `1x${n}`, "connector", n * 2.54, 2.54, row(Array.from({ length: n }, (_, i) => String(i + 1)), 2.54, 1.27, (n - 1) * 2.54 + 1.27), {}));
  [2, 3, 5, 6, 7, 9, 10, 12, 13, 14, 15, 16, 20, 24, 30, 36, 40].forEach(hdr1);
  const hdr2 = (n: number) => out.push(def(`header-2x${n}`, `2x${n}`, "connector", n * 2.54, 5.08, [...row(Array.from({ length: n }, (_, i) => String(i + 1)), 1.27, 1.27, (n - 1) * 2.54 + 1.27), ...row(Array.from({ length: n }, (_, i) => String(n + i + 1)), 3.81, 1.27, (n - 1) * 2.54 + 1.27)], {}));
  [4, 5, 6, 8, 10, 13, 20].forEach(hdr2);
  const fem1 = (n: number) => out.push(def(`female-1x${n}`, `F1x${n}`, "connector", n * 2.54, 2.54, row(Array.from({ length: n }, (_, i) => String(i + 1)), 2.54, 1.27, (n - 1) * 2.54 + 1.27), {}));
  [4, 6, 8, 10, 12, 16, 20, 40].forEach(fem1);
  const fem2 = (n: number) => out.push(def(`female-2x${n}`, `F2x${n}`, "connector", n * 2.54, 5.08, [...row(Array.from({ length: n }, (_, i) => String(i + 1)), 1.27, 1.27, (n - 1) * 2.54 + 1.27), ...row(Array.from({ length: n }, (_, i) => String(n + i + 1)), 3.81, 1.27, (n - 1) * 2.54 + 1.27)], {}));
  [4, 8, 10, 20].forEach(fem2);
  for (const n of [10, 16, 20, 26, 34, 40]) {
    const half = n / 2;
    out.push(def(`idc-${n}`, `IDC${n}`, "connector", half * 2.54 + 3, 8.8, [...row(Array.from({ length: half }, (_, i) => String(i + 1)), 2.54, 2.77, (half - 1) * 2.54 + 2.77), ...row(Array.from({ length: half }, (_, i) => String(n - i)), 6.26, 2.77, (half - 1) * 2.54 + 2.77)], {}));
  }
  for (const n of [3, 7, 9, 11, 14, 16]) out.push(def(`screw-terminal-${n}`, `SCREW ${n}P`, "connector", n * 5 + 2, 7, row(Array.from({ length: n }, (_, i) => String(i + 1)), 7, 3, n * 5 - 1), {}));
  for (const n of [2, 3, 4]) out.push(def(`screw-term-508-${n}`, `KF301-${n}`, "connector", n * 5.08 + 2, 8, row(Array.from({ length: n }, (_, i) => String(i + 1)), 8, 3, n * 5.08 - 1), {}));
  for (const n of [9, 10, 12]) out.push(def(`dupont-${n}`, `DUPONT ${n}P`, "connector", n * 2.5 + 1, 4, row(Array.from({ length: n }, (_, i) => String(i + 1)), 4, 1.5, n * 2.5 - 0.5), {}));
  for (const kind of ["mm", "ff", "mf"]) for (const len of [10, 20, 30]) out.push(def(`jumper-${kind}-${len}`, `${kind.toUpperCase()} ${len}cm`, "connector", 26, 22, [px("1", "1", 3, 22), px("2", "2", 23, 22)], {}));
  for (const n of [4, 6, 8, 10]) out.push(def(`res-net-${n}`, `RN${n}`, "passive", n * 2.54, 5, row(Array.from({ length: n }, (_, i) => String(i + 1)), 5, 1.27, (n - 1) * 2.54 + 1.27), {}));
  for (const [t, w, h] of [["4x4", 4, 4], ["6x6", 6, 6], ["12x12", 12, 12], ["3x6", 3, 6]] as [string, number, number][]) out.push(def(`tact-${t}`, t, "input", w, h, [px("1", "1", 0.8, 0.8), px("2", "2", w - 0.8, 0.8), px("3", "3", 0.8, h - 0.8), px("4", "4", w - 0.8, h - 0.8)], {}));
  for (const n of [7, 8, 9, 14, 18, 20]) out.push(def(`dip-${n}`, `DIP-${n * 2}`, "input", n * 2.4 + 2, 6, [...row(Array.from({ length: n }, (_, i) => String(i + 1)), 6, 2, n * 2.4), ...row(Array.from({ length: n }, (_, i) => String(i + n + 1)), 0, 2, n * 2.4)], {}));
  for (const color of ["pink", "cyan", "warm"]) {
    out.push(def(`led-5mm-${color}`, `5mm ${color}`, "led-display", 6, 7.5, [px("A", "A", 1, 7.5), px("K", "K", 5, 7.5)], { color }));
    out.push(def(`led-3mm-${color}`, `3mm ${color}`, "led-display", 5, 6.5, [px("A", "A", 1, 6.5), px("K", "K", 4, 6.5)], { color }));
  }
  for (const color of ["red", "green", "blue"]) out.push(def(`led-8mm-${color}`, `8mm ${color}`, "led-display", 9.5, 10, [px("A", "A", 2, 10), px("K", "K", 7, 10)], { color }));
  out.push(def("led-bicolor-3", "BICOLOR", "led-display", 5, 6.5, [px("A", "A", 1, 6.5), px("K", "K", 2.5, 6.5), px("B", "B", 4, 6.5)], {}));
  for (const color of ["green", "blue", "white", "amber"]) out.push(def(`seven-seg-${color}`, `7SEG ${color}`, "display", 12.7, 19, [...row(["1", "2", "3", "4", "5"], 0, 1.27, 11.43), ...row(["6", "7", "8", "9", "10"], 19, 1.27, 11.43)], { color }));
  for (const sz of [25, 45, 57]) out.push(def(`spk-${sz}mm`, `${sz}mm`, "output", sz, sz, row(["+", "-"], sz, sz * 0.35, sz * 0.65), {}));
  out.push(def("bulb-e5", "E5", "output", 8, 12, [px("1", "1", 3, 12), px("2", "2", 5, 12)], {}));
  out.push(def("bulb-e14", "E14", "output", 12, 20, [px("1", "1", 5, 20), px("2", "2", 7, 20)], {}));
  out.push(def("cell-aaa", "AAA", "power", 44, 10, [px("+", "+", 0, 5), px("-", "-", 44, 5)], {}));
  out.push(def("cell-c", "C", "power", 50, 26, [px("+", "+", 0, 13), px("-", "-", 50, 13)], {}));
  out.push(def("cell-d", "D", "power", 61, 34, [px("+", "+", 0, 17), px("-", "-", 61, 17)], {}));
  out.push(def("cell-cr123a", "CR123A", "power", 34, 17, [px("+", "+", 0, 8.5), px("-", "-", 34, 8.5)], {}));
  out.push(def("aaa-holder-4", "AAA×4", "power", 48, 52, [px("+", "+", 6, 52), px("-", "-", 42, 52)], {}));
  out.push(def("18650-holder-3", "18650×3", "power", 63, 70, [px("+", "+", 8, 70), px("-", "-", 55, 70)], {}));
  out.push(def("18650-holder-4", "18650×4", "power", 84, 70, [px("+", "+", 8, 70), px("-", "-", 76, 70)], {}));
  out.push(def("wcharge-coil-tx", "QI-TX", "power", 40, 40, [px("1", "1", 18, 40), px("2", "2", 22, 40)], {}));
  out.push(def("micro-usb-plug", "MICRO-B", "connector", 12, 6, row(["VBUS", "D-", "D+", "ID", "GND"], 6, 2, 10), {}));
  out.push(def("din5-plug", "DIN5", "connector", 16, 16, row(["1", "2", "3", "4", "5"], 16, 3, 13), {}));
  out.push(def("speakon-nl4", "NL4", "connector", 23, 23, [px("+", "+", 9, 23), px("-", "-", 14, 23)], {}));
  out.push(def("xt90", "XT90", "connector", 16, 12, [px("+", "+", 5, 12), px("-", "−", 11, 12)], {}));
  for (const c of ["red", "black"]) out.push(def(`banana-plug-${c}`, `BANANA ${c[0].toUpperCase()}`, "connector", 14, 5, [px("IN", "Screw", 2, 2.5), px("OUT", "Tip", 12, 2.5)], { color: c }));
  out.push(def("alligator-clip", "GATOR", "connector", 45, 7, [px("1", "Wire", 3, 3.5), px("2", "Jaw", 42, 3.5)], {}));
  out.push(def("test-hook", "HOOK", "connector", 15, 5, [px("1", "Wire", 2, 2.5), px("2", "Hook", 13, 2.5)], {}));
  for (const [t, w, h] of [["n20-motor", 12, 10], ["310-motor", 20, 14], ["550-motor", 37, 25]] as [string, number, number][]) out.push(def(t, t.split("-")[0].toUpperCase(), "motor", w, h, [px("M-", "Motor −", w / 2 - 3, h), px("M+", "Motor +", w / 2 + 3, h)], {}));
  for (const code of ["5516", "5528", "5549"]) out.push(def(`ldr-${code}`, code, "sensor", 6, 8, [px("1", "1", 2, 8), px("2", "2", 4, 8)], {}));
  out.push(def("temp-probe-ds18b20", "DS18B20-P", "sensor", 40, 6, [px("DQ", "Data", 36, 3), px("GND", "GND", 39, 3)], {}));
  out.push(def("oled-066", "OLED 0.66", "display", 18, 14, row(["GND", "VCC", "SCL", "SDA"], 14, 3, 15), {}));
  const perf = (colsN: number, rowsN: number, name: string) => out.push(def(name, name.split("-")[1].toUpperCase(), "passive", colsN * 2.54 + 3, rowsN * 2.54 + 3, Array.from({ length: colsN * rowsN }, (_, i) => px(`h${Math.floor(i / colsN) + 1}${(i % colsN) + 1}`, `h${Math.floor(i / colsN) + 1}${(i % colsN) + 1}`, 2.54 + (i % colsN) * 2.54, 2.54 + Math.floor(i / colsN) * 2.54)), {}));
  perf(7, 9, "perfboard-7x9"); perf(10, 15, "perfboard-10x15");
  return out;
};

/** All generated family defs (deduped against base by type). */
export function buildFamilyDefs(base: PartDefinition[]): PartDefinition[] {
  const seen = new Set(base.map((d) => d.type));
  const all = [
    ...logicDefs(),
    ...cdDefs(),
    ...cloneFromBase(base),
    ...diodeDefs(),
    ...ledDefs(),
    ...transistorDefs(),
    ...memDefs(),
    ...ampDefs(),
    ...regDefs(),
    ...optoDefs(),
    ...connDefs(),
    ...swDefs(),
    ...pwrDefs(),
    ...miscDefs(),
    ...benchDefs(),
  ];
  const out: PartDefinition[] = [];
  for (const d of all) {
    if (seen.has(d.type)) continue;
    seen.add(d.type);
    out.push(d);
  }
  return out;
}
