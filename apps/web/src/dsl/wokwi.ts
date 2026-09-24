/**
 * Wokwi diagram.json interop (PLAN §11.4). Import maps wokwi part types onto
 * catalog definitions by NAME (aliases for pin naming differences); export is
 * the inverse for the mapped set and honestly reports everything it skips.
 * Coordinates: 1 wokwi unit ≈ 0.254 mm (10 u = 0.1"), shifted into our world.
 */
import type { ComponentPlacement, BoardPlacement, Net, Project, WireSegment } from "@audrino/schema";
import { partDef, validateProject, M0_PIN_CATALOG } from "@audrino/schema";
import { createEmptyProject } from "./load";

const UNIT_MM = 0.254;
const ORIGIN = 512; // keeps typical diagrams (negative tops) inside the world

interface WokwiPart {
  type: string;
  id: string;
  top?: number;
  left?: number;
  rotate?: number;
  attrs?: Record<string, string>;
}

type WokwiConnection = (string | string[])[];

interface WokwiDiagram {
  version?: number;
  parts?: WokwiPart[];
  connections?: WokwiConnection[];
}

export interface WokwiImportResult {
  doc: Project | null;
  error?: string;
  warnings: string[];
}

export interface WokwiExportResult {
  diagram: Record<string, unknown>;
  skipped: string[];
}

type PinMap = Record<string, string>; // wokwi pin name (lower) -> our pin id

const NUM16: PinMap = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 1), String(i + 1)]));

const WOKWI_IN: Record<string, { type: string; pins: PinMap }> = {
  "wokwi-arduino-uno": {
    type: "arduino-uno",
    pins: {
      ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [String(i), `D${i}`])),
      ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`a${i}`, `A${i}`])),
      gnd: "GND", "gnd.1": "GND", "gnd.2": "GND", "5v": "5V", "3v3": "3V3", vin: "VIN", rst: "RST",
    },
  },
  "wokwi-arduino-nano": {
    type: "arduino-nano",
    pins: {
      ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [String(i), `D${i}`])),
      ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`a${i}`, `A${i}`])),
      gnd: "GND", "5v": "5V", "3v3": "3V3", rst: "RST", vin: "VIN",
    },
  },
  "wokwi-esp32-devkit-c": {
    type: "esp32-devkit",
    pins: {
      "3v3": "3V3", en: "EN", vp: "VP", vn: "VN", tx: "TXD", rx: "RXD", gnd: "GND",
      ...Object.fromEntries(["34", "35", "32", "33", "25", "26", "27", "14", "12", "13", "23", "22", "21", "19", "18", "5", "17"].map((p) => [p, p])),
    },
  },
  "wokwi-led": { type: "led", pins: { a: "A", k: "K", c: "K" } },
  "wokwi-rgb-led": { type: "rgb-led", pins: { r: "R", g: "G", b: "B", com: "K", c: "K", k: "K", a: "K" } },
  "wokwi-resistor": { type: "resistor", pins: { "1": "1", "2": "2" } },
  "wokwi-capacitor": { type: "capacitor", pins: { "1": "1", "2": "2" } },
  "wokwi-diode": { type: "diode", pins: { a: "A", k: "K", c: "K" } },
  "wokwi-potentiometer": { type: "potentiometer", pins: { "1": "1", "2": "2", "3": "3", l: "1", w: "2", r: "3" } },
  "wokwi-pushbutton": { type: "pushbutton", pins: { "1.l": "1", "1.r": "1", "2.l": "2", "2.r": "2" } },
  "wokwi-slide-switch": { type: "slide-switch", pins: { "1": "1", "2": "2", "3": "3" } },
  "wokwi-servo": { type: "sg90-servo", pins: { gnd: "GND", "v+": "VCC", vcc: "VCC", pwm: "PWM", sig: "PWM" } },
  "wokwi-buzzer": { type: "buzzer", pins: { "1": "+", "2": "-", "+": "+", "-": "-" } },
  "wokwi-dht22": { type: "dht22", pins: { vcc: "VCC", gnd: "GND", dat: "DATA", sda: "DATA", data: "DATA" } },
  "wokwi-dht11": { type: "dht11", pins: { vcc: "VCC", gnd: "GND", dat: "DATA", sda: "DATA", data: "DATA" } },
  "wokwi-hc-sr04": { type: "hc-sr04", pins: { vcc: "VCC", gnd: "GND", trig: "TRIG", echo: "ECHO" } },
  "wokwi-74hc595": {
    type: "74hc595",
    pins: {
      ...NUM16,
      q0: "15", q1: "1", q2: "2", q3: "3", q4: "4", q5: "5", q6: "6", q7: "7",
      gnd: "8", q7s: "9", rclk: "10", stcp: "10", srclk: "11", shcp: "11",
      srclr: "12", mr: "12", oe: "13", ser: "14", ds: "14", vcc: "16",
    },
  },
  "wokwi-ssd1306": { type: "oled-ssd1306", pins: { vcc: "VCC", gnd: "GND", scl: "SCL", sda: "SDA" } },
  "wokwi-neopixel": { type: "ws2812", pins: { din: "DIN", dout: "DOUT", "5v": "VCC", vcc: "VCC", gnd: "GND" } },
};

const BOARD_TYPES = new Set(["wokwi-arduino-uno", "wokwi-arduino-nano", "wokwi-esp32-devkit-c"]);

/** our type -> {wokwi type, our pin id -> wokwi pin name} */
const WOKWI_OUT: Record<string, { type: string; pins: PinMap }> = Object.fromEntries(
  Object.entries(WOKWI_IN).map(([wType, m]) => {
    const rev: PinMap = {};
    for (const [wPin, ourPin] of Object.entries(m.pins)) {
      if (!(ourPin in rev)) rev[ourPin] = wPin;
    }
    return [m.type, { type: wType, pins: rev }];
  }),
);

function parseOhms(v: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([kKmM]?)(?:\s*[rRΩohm]*)\s*$/.exec(v);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === "k" ? n * 1e3 : m[2].toLowerCase() === "m" ? n * 1e6 : n;
}

function parseUF(v: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([uµnp])?F?\s*$/i.exec(v);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2] ?? "u").toLowerCase();
  return unit === "n" ? n / 1e3 : unit === "p" ? n / 1e6 : n;
}

function propsFor(wType: string, attrs: Record<string, string>, type: string): Record<string, unknown> {
  const base = { ...(partDef(type)?.defaultProps ?? {}) };
  if (wType === "wokwi-resistor" && attrs.value) {
    const ohms = parseOhms(attrs.value);
    if (ohms !== null) base.resistance_ohms = ohms;
  }
  if (wType === "wokwi-capacitor" && attrs.value) {
    const uf = parseUF(attrs.value);
    if (uf !== null) base.capacitance_uF = uf;
  }
  if (wType === "wokwi-led" && attrs.color) base.color = attrs.color;
  return base;
}

function rotatedPin(mm: { w: number; h: number }, x: number, y: number, rot: number): [number, number] {
  const r = ((rot % 360) + 360) % 360;
  if (r === 90) return [mm.h - y, x];
  if (r === 180) return [mm.w - x, mm.h - y];
  if (r === 270) return [y, mm.w - x];
  return [x, y];
}

/** `"part:pin"` (wokwi) — fall back to first "."-split for hand-written files. */
function splitEndpoint(ep: string): { ref: string; pin: string } | null {
  const i = ep.indexOf(":");
  if (i > 0) return { ref: ep.slice(0, i), pin: ep.slice(i + 1) };
  const j = ep.indexOf(".");
  if (j > 0) return { ref: ep.slice(0, j), pin: ep.slice(j + 1) };
  return null;
}

export function importWokwiDiagram(raw: string | WokwiDiagram, opts: { sketch?: string; name?: string } = {}): WokwiImportResult {
  const warnings: string[] = [];
  let d: WokwiDiagram;
  try {
    d = typeof raw === "string" ? (JSON.parse(raw) as WokwiDiagram) : raw;
  } catch {
    return { doc: null, error: "not valid JSON", warnings };
  }
  if (!d || !Array.isArray(d.parts)) return { doc: null, error: "missing parts[]", warnings };

  const boards: BoardPlacement[] = [];
  const components: ComponentPlacement[] = [];
  const usedIds = new Set<string>();
  const typeById = new Map<string, string>();

  for (const p of d.parts) {
    const map = WOKWI_IN[p.type];
    if (!map) {
      warnings.push(`skipped unmapped part "${p.type}" (id ${p.id})`);
      continue;
    }
    let id = p.id || "part";
    while (usedIds.has(id)) id = `${p.id}_2`;
    usedIds.add(id);
    typeById.set(id, map.type);
    const transform = {
      x: Math.round(((p.left ?? 0) * UNIT_MM + ORIGIN) * 10) / 10,
      y: Math.round(((p.top ?? 0) * UNIT_MM + ORIGIN) * 10) / 10,
      rotation_deg: ((p.rotate ?? 0) % 360 + 360) % 360,
    };
    if (BOARD_TYPES.has(p.type)) boards.push({ id, type: map.type, transform });
    else components.push({ id, type: map.type, props: propsFor(p.type, p.attrs ?? {}, map.type), transform });
  }

  // connections -> nets (union pin endpoints), wires = straight pin-to-pin chains
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p2 = parent.get(x) ?? x;
    if (p2 !== x) {
      const r = find(p2);
      parent.set(x, r);
      return r;
    }
    parent.set(x, x);
    return x;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const resolved: [string, string][] = [];

  for (const c of d.connections ?? []) {
    const a = splitEndpoint(String(c[0] ?? ""));
    const b = splitEndpoint(String(c[1] ?? ""));
    if (!a || !b) {
      warnings.push(`skipped malformed connection ${JSON.stringify([c[0], c[1]])}`);
      continue;
    }
    const mapPin = (ep: { ref: string; pin: string }): string | null => {
      const ourType = typeById.get(ep.ref);
      if (!ourType) return null;
      const mapEntry = Object.values(WOKWI_IN).find((m) => m.type === ourType);
      const ourPin = mapEntry?.pins[ep.pin.toLowerCase()];
      if (!ourPin || !M0_PIN_CATALOG[ourType]?.includes(ourPin)) return null;
      return `${ep.ref}:${ourPin}`;
    };
    const pa = mapPin(a);
    const pb = mapPin(b);
    if (!pa || !pb) {
      warnings.push(`skipped connection ${c[0]} → ${c[1]} (unknown endpoint)`);
      continue;
    }
    resolved.push([pa, pb]);
    union(pa, pb);
  }

  const groups = new Map<string, string[]>();
  for (const pin of parent.keys()) {
    const root = find(pin);
    const g = groups.get(root) ?? [];
    g.push(pin);
    groups.set(root, g);
  }

  const nets: Net[] = [];
  const wires: WireSegment[] = [];
  let nSeq = 0;
  let wSeq = 0;
  const entities = [...boards, ...components];
  const pinPos = (key: string): [number, number] | null => {
    const [ref, pinId] = key.split(":");
    const e = entities.find((x) => x.id === ref);
    if (!e) return null;
    const def = partDef(e.type);
    const pin = def?.pins.find((p) => p.id === pinId);
    if (!def || !pin) return null;
    const [rx, ry] = rotatedPin(def.size_mm, pin.x, pin.y, e.transform.rotation_deg ?? 0);
    return [e.transform.x + rx, e.transform.y + ry];
  };

  for (const pins of groups.values()) {
    if (pins.length < 2) continue;
    const netId = `net${++nSeq}`;
    nets.push({ id: netId, pins: [...pins].sort() });
    for (let i = 1; i < pins.length; i++) {
      const a = pinPos(pins[i - 1]);
      const b = pinPos(pins[i]);
      if (!a || !b) continue;
      wires.push({ id: `w${++wSeq}`, net: netId, points: [a, b] });
    }
  }

  const doc = createEmptyProject();
  doc.meta.name = (opts.name ?? "wokwi import").slice(0, 80);
  doc.boards = boards;
  doc.components = components;
  doc.nets = nets;
  doc.wires = wires;
  if (opts.sketch !== undefined) {
    doc.code = { main: "sketch.ino", files: { "sketch.ino": opts.sketch } };
  }
  const res = validateProject(doc);
  if (!res.ok) return { doc: null, error: res.errors.map((e) => e.message).join("; "), warnings };
  return { doc, warnings };
}

/** Inverse mapping — unmapped parts land in `skipped` (never silently dropped). */
export function exportWokwi(doc: Project): WokwiExportResult {
  const skipped: string[] = [];
  const parts: Record<string, unknown>[] = [];
  const idMap = new Map<string, string>(); // our id -> wokwi id
  let seq = 0;

  for (const e of [...doc.boards, ...doc.components]) {
    const map = WOKWI_OUT[e.type];
    if (!map) {
      skipped.push(`${e.id} (${e.type})`);
      continue;
    }
    seq += 1;
    const wid = `p${seq}`;
    idMap.set(e.id, wid);
    const attrs: Record<string, string> = {};
    const props = (e as ComponentPlacement).props;
    if (e.type === "resistor" && typeof props?.resistance_ohms === "number") attrs.value = String(props.resistance_ohms);
    if (e.type === "capacitor" && typeof props?.capacitance_uF === "number") attrs.value = `${props.capacitance_uF}uF`;
    if (e.type === "led" && typeof props?.color === "string") attrs.color = props.color;
    parts.push({
      type: map.type,
      id: wid,
      left: Math.round((e.transform.x - ORIGIN) / UNIT_MM),
      top: Math.round((e.transform.y - ORIGIN) / UNIT_MM),
      rotate: ((e.transform.rotation_deg ?? 0) % 360 + 360) % 360,
      attrs,
    });
  }

  const connections: (string | string[])[][] = [];
  for (const net of doc.nets) {
    const eps = net.pins
      .map((key) => {
        const i = key.indexOf(":");
        const ref = key.slice(0, i);
        const pinId = key.slice(i + 1);
        const wid = idMap.get(ref);
        const wPin = wid ? WOKWI_OUT[entitiesType(doc, ref)]?.pins[pinId] : undefined;
        return wid && wPin ? `${wid}:${wPin}` : null;
      })
      .filter((x): x is string => x !== null);
    for (let i = 1; i < eps.length; i++) connections.push([eps[i - 1], eps[i], "green", []]);
  }

  return {
    diagram: { version: 1, author: "Audrino", editor: "wokwi", parts, connections },
    skipped,
  };
}

function entitiesType(doc: Project, ref: string): string {
  const e = [...doc.boards, ...doc.components].find((x) => x.id === ref);
  return e?.type ?? "";
}
