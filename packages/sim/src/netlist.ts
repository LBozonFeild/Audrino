/**
 * Circuit → analog netlist. Board GND pin = node 0. Board rails 5V/3V3 are
 * ideal sources (golden: rc-divider = exactly 2.5 V). GPIO pins are Thevenin
 * (25 Ω + 20 k pull-up res_sw) switched by MCU pin mode.
 */
import type { CircuitSpec, PinModeState, SimComponentSpec } from "./types";
import type { Element } from "./mna";

const LED_VF: Record<string, number> = { red: 2.0, green: 2.2, yellow: 2.1, orange: 2.1, blue: 3.1, white: 3.1 };

export interface GpioBinding {
  ref: string;
  pin: number;
  pinName: string;
  node: number;
  thevIdx: number;
  pullIdx: number;
}

export interface LedBinding {
  ref: string;
  anodeNode: number;
  cathodeNode: number;
  diodeIdx: number;
  diode: Extract<Element, { kind: "diode" }>;
}

export interface Netlist {
  nodeCount: number;
  elements: Element[];
  gpio: GpioBinding[];
  leds: LedBinding[];
  pinToNode: Map<string, number>;
  probeNode(probe: string): number | null;
}

/** Part pin lists without schema dependency (see installParts). */
let DEF_PINS: Record<string, string[]> = {};
let PIN_ALIASES: Record<string, Record<string, string>> = {};
export function installParts(defs: Record<string, { pins?: { id: string; name: string }[] }>): void {
  DEF_PINS = {};
  PIN_ALIASES = {};
  for (const [id, d] of Object.entries(defs)) {
    DEF_PINS[id] = d.pins?.map((p) => p.id) ?? [];
    PIN_ALIASES[id] = {};
    for (const p of d.pins ?? []) if (p.name !== p.id) PIN_ALIASES[id][p.name] = p.id;
  }
}

/** Pin strings are pin ids; schema pin names resolve to their id. */
function resolvePin(type: string, pin: string): string {
  return PIN_ALIASES[type]?.[pin] ?? pin;
}

const UNO_PINS = [
  "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13",
  "A0", "A1", "A2", "A3", "A4", "A5", "GND", "5V", "3V3", "VIN", "RST",
];

/** Builtin pin lists so the engine works without schema install (goldens, tests). */
function builtinPins(type: string): string[] {
  if (klass(type) === "board") return UNO_PINS;
  if (type === "resistor" || type === "capacitor") return ["1", "2"];
  if (type === "led") return ["A", "K"];
  return [];
}

function pinsOfPart(c: SimComponentSpec): string[] {
  return DEF_PINS[c.type] ?? builtinPins(c.type);
}

export function pinsOf(circuit: CircuitSpec | undefined, ref: string): string[] {
  const c = circuit?.components.find((x) => x.ref === ref);
  return c ? pinsOfPart(c) : [];
}

function num(prop: unknown, dflt: number): number {
  const n = typeof prop === "string" ? Number(prop) : typeof prop === "number" ? prop : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

function klass(type: string): string {
  if (type.startsWith("arduino-uno")) return "board";
  if (type === "resistor") return "res";
  if (type === "capacitor") return "cap";
  if (type === "led") return "led";
  return "unknown";
}

function pinKey(ref: string, pin: string): string {
  return `${ref}:${pin}`;
}

export function buildNetlist(spec: CircuitSpec): Netlist {
  const uf = new Map<string, string>();
  const find = (k: string): string => {
    const p = uf.get(k) ?? k;
    if (p !== k) {
      const r = find(p);
      uf.set(k, r);
      return r;
    }
    uf.set(k, k);
    return k;
  };
  const link = (a: string, b: string) => uf.set(find(a), find(b));

  const parts: SimComponentSpec[] = spec.components;
  const boardPart = parts.find((c) => klass(c.type) === "board");
  const boardRef = boardPart?.ref ?? "board";

  const typeOf = new Map(parts.map((c) => [c.ref, c.type] as const));
  const keyOf = (ref: string, pin: string) => pinKey(ref, resolvePin(typeOf.get(ref) ?? "", pin));
  for (const c of parts) for (const p of pinsOfPart(c)) find(pinKey(c.ref, p));
  if (spec.wires) for (const [r1, p1, r2, p2] of spec.wires) link(keyOf(r1, p1), keyOf(r2, p2));
  if (spec.nets) for (const net of spec.nets) for (let i = 1; i < net.pins.length; i++) {
    const [r0, p0] = net.pins[0].split(":");
    const [ri, pi] = net.pins[i].split(":");
    link(keyOf(r0, p0), keyOf(ri, pi));
  }

  const nodes = new Map<string, number>();
  const N = { count: 1 };
  const gndKey = pinKey(boardRef, "GND");
  /* unify every board GND-named pin into one ground group */
  for (const c of parts) {
    if (c.ref !== boardRef) continue;
    for (const p of pinsOfPart(c)) if (/^GND/i.test(p)) link(pinKey(c.ref, p), gndKey);
  }
  const assignNode = (key: string): number => {
    const root = find(key);
    if (root === find(gndKey)) return 0; /* anything wired to board GND is node 0 */
    let n = nodes.get(root);
    if (n === undefined) {
      n = N.count++;
      nodes.set(root, n);
    }
    return n;
  };
  const pinNode = (ref: string, pin: string): number => {
    if (ref === boardRef && /^GND/i.test(pin)) return 0;
    return assignNode(pinKey(ref, pin));
  };

  const elements: Element[] = [];
  const gpio: GpioBinding[] = [];
  const leds: LedBinding[] = [];
  const pinToNode = new Map<string, number>();

  for (const c of parts) {
    for (const p of pinsOfPart(c)) pinToNode.set(pinKey(c.ref, p), pinNode(c.ref, p));
  }
  if (spec.wires) {
    for (const [r1, p1, r2, p2] of spec.wires) {
      pinToNode.set(pinKey(r1, p1), pinNode(r1, p1));
      pinToNode.set(pinKey(r2, p2), pinNode(r2, p2));
    }
  }
  if (spec.nets) {
    for (const net of spec.nets) for (const pin of net.pins) {
      const [r, p] = pin.split(":");
      pinToNode.set(pin, pinNode(r, p));
    }
  }

  for (const c of parts) {
    const k = klass(c.type);
    const props = c.props ?? {};
    if (k === "board") {
      const pinN = (name: string) => pinNode(c.ref, name);
      const fiveV = pinN("5V");
      elements.push({ kind: "vsrc", a: fiveV, b: 0, volts: 5 });
      elements.push({ kind: "vsrc", a: pinN("3V3"), b: 0, volts: 3.3 });
      elements.push({ kind: "res", a: pinN("RST"), b: fiveV, ohms: 10000 }); /* RST pull-up */
      for (const name of pinsOfPart(c)) {
        let mcu = -1;
        const dm = /^D(\d+)$/.exec(name);
        const am = /^A(\d+)$/.exec(name);
        if (dm) mcu = Number(dm[1]);
        else if (am) mcu = 14 + Number(am[1]);
        if (mcu < 0) continue;
        const node = pinNode(c.ref, name);
        elements.push({ kind: "thev", a: node, b: 0, volts: 5, rser: 25, active: false });
        elements.push({ kind: "res_sw", a: node, b: fiveV, closed: false, ohmsClosed: 20000 });
        gpio.push({ ref: c.ref, pin: mcu, pinName: name, node, thevIdx: elements.length - 2, pullIdx: elements.length - 1 });
      }
    } else if (k === "res") {
      elements.push({ kind: "res", a: pinNode(c.ref, "1"), b: pinNode(c.ref, "2"), ohms: num(props["resistance_ohms"], 1000) });
    } else if (k === "cap") {
      elements.push({ kind: "cap", a: pinNode(c.ref, "1"), b: pinNode(c.ref, "2"), farads: num(props["capacitance_uF"], 1) * 1e-6 });
    } else if (k === "led") {
      const nA = pinNode(c.ref, "A");
      const nK = pinNode(c.ref, "K");
      const color = typeof props["color"] === "string" ? props["color"] : "red";
      const d: Extract<Element, { kind: "diode" }> = { kind: "diode", a: nA, b: nK, vf: LED_VF[color] ?? 2, ron: 20 };
      elements.push(d);
      leds.push({ ref: c.ref, anodeNode: nA, cathodeNode: nK, diodeIdx: elements.length - 1, diode: d });
    }
  }

  /* unconnected pins on a floating node: warn (hand-held) */
  const deg = new Map<string, number>();
  const bump = (k: string) => deg.set(k, (deg.get(k) ?? 0) + 1);
  for (const c of parts) for (const p of pinsOfPart(c)) bump(pinKey(c.ref, p));
  if (spec.wires)
    for (const [r1, p1, r2, p2] of spec.wires) {
      bump(pinKey(r1, p1));
      bump(pinKey(r2, p2));
    }
  for (const [k, d] of deg) if (d <= 1 && !/^.*:(GND|5V|3V3|VIN|RST|NC)\d*$/i.test(k)) console.warn(`[sim] pin ${k} is unconnected`);

  return {
    nodeCount: N.count,
    elements,
    gpio,
    leds,
    pinToNode,
    probeNode(probe: string): number | null {
      const [ref, pin] = probe.split(":");
      const n = pinToNode.get(pinKey(ref, pin));
      return n === undefined ? null : n;
    },
  };
}

export function applyPinMode(nl: Netlist, mcuPin: number, mode: PinModeState): void {
  const g = nl.gpio.find((x) => x.pin === mcuPin);
  if (!g) return;
  const thev = nl.elements[g.thevIdx];
  const pull = nl.elements[g.pullIdx];
  if (thev.kind !== "thev" || pull.kind !== "res_sw") return;
  switch (mode) {
    case "high":
      thev.active = true;
      thev.volts = 5;
      pull.closed = false;
      break;
    case "low":
      thev.active = true;
      thev.volts = 0;
      pull.closed = false;
      break;
    case "pullup":
      thev.active = false;
      pull.closed = true;
      break;
    case "z":
    default:
      thev.active = false;
      pull.closed = false;
      break;
  }
}
