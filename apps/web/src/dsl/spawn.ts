/**
 * AI project generation (PLAN §9.4): the model returns a *semantic* circuit
 * (parts, connections, firmware, BOM, wiring steps) — this module turns it into
 * a fully valid Project with deterministic auto-layout and wire building. The
 * LLM never authors millimeters; unknown parts/pins degrade to warnings, and
 * the whole doc passes validateProject before the user ever sees it.
 */
import type { ComponentPlacement, Project } from "@audrino/schema";
import { partDef, validateProject } from "@audrino/schema";
import { createEmptyProject } from "./load";
import { buildNetsAndWires, type EntityPlace } from "./netsFromConnections";

export interface SpawnPart {
  ref: string;
  type: string;
  value?: string;
}

export interface SpawnSpec {
  name?: string;
  board?: string;
  parts: SpawnPart[];
  connections: [string, string][];
  sketch?: string;
  bom?: string[];
  wiringSteps?: string[];
  explanation?: string;
}

export type ParseSpawnResult = { ok: true; spec: SpawnSpec } | { ok: false; error: string };

export interface SpawnResult {
  doc: Project | null;
  error?: string;
  warnings: string[];
}

/* ------------------------------------------------------------ normalization */

/** Common spoken/model names → catalog types. */
const TYPE_ALIASES: Record<string, string> = {
  uno: "arduino-uno", "arduino-uno": "arduino-uno", arduino: "arduino-uno",
  nano: "arduino-nano", "arduino-nano": "arduino-nano",
  esp32: "esp32-devkit", "esp32-devkit-c": "esp32-devkit", "esp8266": "esp8266-nodemcu",
  led: "led", "red-led": "led", "green-led": "led", "yellow-led": "led", "blue-led": "led",
  "rgb-led": "rgb-led", rgb: "rgb-led", neopixel: "ws2812", ws2812: "ws2812",
  resistor: "resistor", r: "resistor",
  capacitor: "capacitor", cap: "capacitor",
  "electrolytic-capacitor": "electrolytic-capacitor",
  diode: "diode", "1n4007": "1n4007",
  pot: "potentiometer", potentiometer: "potentiometer", trimmer: "potentiometer",
  button: "pushbutton", pushbutton: "pushbutton", "push-button": "pushbutton", switch: "toggle-switch",
  "toggle-switch": "toggle-switch", "slide-switch": "slide-switch",
  servo: "sg90-servo", "micro-servo": "sg90-servo", "sg90": "sg90-servo", "sg90-servo": "sg90-servo",
  motor: "dc-motor", "dc-motor": "dc-motor", buzzer: "buzzer", piezo: "buzzer", speaker: "speaker",
  relay: "relay-module", "relay-module": "relay-module",
  ultrasonic: "hc-sr04", "hc-sr04": "hc-sr04", "hcsr04": "hc-sr04",
  dht: "dht22", dht22: "dht22", dht11: "dht11",
  oled: "oled-ssd1306", ssd1306: "oled-ssd1306", "lcd1602": "lcd1602-i2c",
  "74hc595": "74hc595", "shift-register": "74hc595", "7-seg": "seven-segment", "seven-segment": "seven-segment",
  pir: "pir", motion: "pir", ldr: "ldr", "photoresistor": "ldr", thermistor: "thermistor",
  "lm35": "lm35", "mq-2": "mq-2", gas: "mq-2", "bmp280": "bmp280",
  "ne555": "ne555", "555": "ne555", "l293d": "l293d", "uln2003": "uln2003",
  "regulator-7805": "regulator-7805", "7805": "regulator-7805", "lm317": "lm317",
  "breadboard": "breadboard-400", "breadboard-mini": "breadboard-mini",
  "breadboard-170": "breadboard-170", "mini-breadboard": "breadboard-170",
  "breadboard-400": "breadboard-400", "half-breadboard": "breadboard-400",
  "breadboard-830": "breadboard-830", "full-breadboard": "breadboard-830",
  "battery": "battery-9v", "battery-9v": "battery-9v",
};

const BOARD_TYPES = new Set(["arduino-uno", "arduino-nano", "esp32-devkit", "esp8266-nodemcu", "rp-pico"]);

const CORE_TYPES = [
  "arduino-uno", "arduino-nano", "esp32-devkit",
  "resistor", "capacitor", "electrolytic-capacitor", "diode", "inductor", "ldr", "thermistor", "potentiometer",
  "led", "rgb-led", "ws2812", "oled-ssd1306", "seven-segment", "lcd1602-i2c", "tm1637",
  "pushbutton", "toggle-switch", "slide-switch", "rotary-encoder", "joystick", "keypad-4x4", "touch-ttp223", "limit-switch", "ir-receiver",
  "sg90-servo", "dc-motor", "buzzer", "speaker", "relay-module", "stepper-28byj",
  "dht11", "dht22", "hc-sr04", "bmp280", "mq-2", "pir", "mpu6050", "ds18b20", "lm35",
  "74hc595", "ne555", "l293d", "uln2003", "cd4017", "atmega328p-dip",
  "regulator-7805", "lm317", "breadboard-170", "breadboard-400", "breadboard-830",
  "breadboard-mini", "battery-9v", "terminal-2",
];

export function normalizeType(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (partDef(t)) return t;
  const alias = TYPE_ALIASES[t];
  if (alias && partDef(alias)) return alias;
  return null;
}

/** Case-insensitive pin id or name match against the catalog definition. */
export function resolveSpawnPin(type: string, pin: string): string | null {
  const def = partDef(type);
  if (!def) return null;
  const p = pin.trim().toLowerCase();
  const byId = def.pins.find((x) => x.id.toLowerCase() === p);
  if (byId) return byId.id;
  const byName = def.pins.find((x) => x.name.toLowerCase() === p);
  return byName ? byName.id : null;
}

function parseValue(type: string, value: string | undefined, props: Record<string, unknown>): void {
  if (!value) return;
  if (type === "resistor") {
    const m = /^\s*(\d+(?:\.\d+)?)\s*([kKmM]?)/.exec(value);
    if (m) {
      const n = parseFloat(m[1]);
      props.resistance_ohms = m[2].toLowerCase() === "k" ? n * 1e3 : m[2].toLowerCase() === "m" ? n * 1e6 : n;
    }
  } else if (type === "capacitor") {
    const m = /^\s*(\d+(?:\.\d+)?)\s*([uµnp])?F?\s*$/i.exec(value);
    if (m) {
      const n = parseFloat(m[1]);
      const unit = (m[2] ?? "u").toLowerCase();
      props.capacitance_uF = unit === "n" ? n / 1e3 : unit === "p" ? n / 1e6 : n;
    }
  } else if (type === "led") {
    const v = value.trim().toLowerCase();
    if (/^(red|green|yellow|blue|white|orange)$/.test(v)) props.color = v;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/* ------------------------------------------------------------------ parse */

export function parseSpawn(text: string): ParseSpawnResult {
  const t = text.trim();
  if (!t) return { ok: false, error: "model returned an empty reply" };
  const finish = (o: Record<string, unknown>): ParseSpawnResult | null => {
    if (!Array.isArray(o.parts) || !Array.isArray(o.connections)) return null;
    return {
      ok: true,
      spec: {
        name: typeof o.name === "string" ? o.name : undefined,
        board: typeof o.board === "string" ? o.board : undefined,
        parts: o.parts
          .filter(isRecord)
          .map((p) => ({ ref: String(p.ref ?? p.id ?? ""), type: String(p.type ?? ""), value: p.value !== undefined ? String(p.value) : undefined })),
        connections: o.connections
          .filter((c): c is unknown[] => Array.isArray(c) && c.length >= 2)
          .map((c) => [String(c[0]), String(c[1])] as [string, string]),
        sketch: typeof o.sketch === "string" ? o.sketch : typeof o.code === "string" ? o.code : undefined,
        bom: Array.isArray(o.bom) ? o.bom.map(String) : undefined,
        wiringSteps: Array.isArray(o.wiringSteps) ? o.wiringSteps.map(String) : Array.isArray(o.wiring) ? o.wiring.map(String) : undefined,
        explanation: typeof o.explanation === "string" ? o.explanation : typeof o.why === "string" ? o.why : undefined,
      },
    };
  };
  try {
    const o = JSON.parse(t);
    if (isRecord(o)) {
      const r = finish(o);
      if (r) return r;
    }
  } catch {
    /* not bare JSON */
  }
  for (const f of t.matchAll(/```([a-zA-Z+#]*)[ \t]*\n([\s\S]*?)```/g)) {
    if (f[1].toLowerCase() !== "json") continue;
    try {
      const o = JSON.parse(f[2].trim());
      if (isRecord(o)) {
        const r = finish(o);
        if (r) return r;
      }
    } catch {
      /* keep looking */
    }
  }
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try {
      const o = JSON.parse(t.slice(s, e + 1));
      if (isRecord(o)) {
        const r = finish(o);
        if (r) return r;
      }
    } catch {
      /* brace blob is not JSON */
    }
  }
  return { ok: false, error: "could not find a circuit spec (parts[] + connections[]) in the model reply" };
}

/* ------------------------------------------------------------------ build */

export function buildSpawnProject(spec: SpawnSpec): SpawnResult {
  const warnings: string[] = [];
  const boardType = normalizeType(spec.board ?? "arduino-uno") ?? "arduino-uno";
  if (!BOARD_TYPES.has(boardType)) {
    warnings.push(`board "${spec.board}" not recognized — using arduino-uno`);
  }

  const seen = new Set<string>(["board1"]);
  const entities: EntityPlace[] = [{ id: "board1", type: BOARD_TYPES.has(boardType) ? boardType : "arduino-uno", transform: { x: 56, y: 64 } }];
  const components: ComponentPlacement[] = [];
  let grid = 0;
  for (const p of spec.parts) {
    const type = normalizeType(p.type);
    if (!type) {
      warnings.push(`skipped unknown part type "${p.type}" (${p.ref})`);
      continue;
    }
    if (BOARD_TYPES.has(type)) {
      warnings.push(`ignoring extra board "${p.ref}" — one board per project`);
      continue;
    }
    let ref = (p.ref || type).slice(0, 24);
    while (seen.has(ref)) ref = `${ref}x`;
    seen.add(ref);
    const props: Record<string, unknown> = { ...(partDef(type)?.defaultProps ?? {}) };
    parseValue(type, p.value, props);
    const transform = { x: 56 + (grid % 4) * 110, y: 180 + Math.floor(grid / 4) * 90 };
    grid += 1;
    components.push({ id: ref, type, props, transform });
    entities.push({ id: ref, type, transform });
  }

  const pairs: [string, string][] = [];
  for (const [aRaw, bRaw] of spec.connections) {
    const resolve = (ep: string): string | null => {
      const i = Math.min(...[ep.indexOf(":"), ep.indexOf(".")].filter((x) => x > 0).concat([9999]));
      if (i === 9999) return null;
      const ref = ep.slice(0, i);
      const pin = ep.slice(i + 1);
      const ent = entities.find((x) => x.id === ref || x.id.toLowerCase() === ref.toLowerCase());
      if (!ent) return null;
      const pinId = resolveSpawnPin(ent.type, pin);
      if (!pinId) return null;
      return `${ent.id}:${pinId}`;
    };
    const pa = resolve(aRaw);
    const pb = resolve(bRaw);
    if (!pa || !pb) {
      warnings.push(`skipped connection ${aRaw} → ${bRaw} (unknown endpoint)`);
      continue;
    }
    pairs.push([pa, pb]);
  }

  const { nets, wires } = buildNetsAndWires(pairs, entities);

  const doc = createEmptyProject();
  doc.meta.name = (spec.name ?? "AI circuit").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80) || "AI circuit";
  doc.boards = [{ id: "board1", type: entities[0].type, transform: entities[0].transform }];
  doc.components = components;
  doc.nets = nets;
  doc.wires = wires;
  const sketch = (spec.sketch ?? "void setup() {\n}\n\nvoid loop() {\n}\n").replace(/\r\n/g, "\n");
  doc.code = { main: "sketch.ino", files: { "sketch.ino": sketch.endsWith("\n") ? sketch : `${sketch}\n` } };
  doc.ai = {
    bom: spec.bom ?? [],
    wiringSteps: spec.wiringSteps ?? [],
    explanation: spec.explanation ?? "",
  };

  const res = validateProject(doc);
  if (!res.ok) return { doc: null, error: res.errors.map((e) => e.message).join("; "), warnings };
  return { doc, warnings };
}

/* ----------------------------------------------------------------- prompt */

export function coreCatalogDigest(): string {
  return CORE_TYPES.map((t) => {
    const def = partDef(t);
    if (!def) return "";
    const pins = def.pins.map((p) => (p.name && p.name !== p.id ? `${p.id}(${p.name})` : p.id)).join(",");
    return `${t}: ${pins}`;
  })
    .filter(Boolean)
    .join("\n");
}

export function buildSpawnMessages(prompt: string, attemptErrors: string[] = []): { role: "system" | "user" | "assistant"; content: string }[] {
  const system = `You design Arduino circuits for the Audrino simulator. Reply with ONLY one JSON object, no markdown fences:
{"name": "short project name",
 "board": "arduino-uno",
 "parts": [{"ref": "R1", "type": "resistor", "value": "220"}, {"ref": "LED1", "type": "led", "value": "red"}],
 "connections": [["board1.D13", "R1.1"], ["R1.2", "LED1.A"], ["LED1.K", "board1.GND"]],
 "sketch": "complete .ino with setup() and loop()",
 "bom": ["220Ω resistor", "red LED"],
 "wiringSteps": ["D13 → R1 pin 1", "R1 pin 2 → LED anode", "LED cathode → GND"],
 "explanation": "one short paragraph on how it works"}
Rules: refs are short unique ids; the board is always ref "board1" and is NOT in parts[]. Connection endpoints are "<ref>.<pin>" with pin ids EXACTLY as listed below. Use ONLY these part types:
${coreCatalogDigest()}
Put a 220–330Ω resistor in series with every LED. Keep circuits minimal and runnable.`;
  const msgs: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
    { role: "user", content: prompt },
  ];
  for (let i = 0; i < attemptErrors.length; i++) {
    msgs.push({ role: "assistant", content: "(previous attempt failed validation)" });
    msgs.push({ role: "user", content: `That spec was rejected: ${attemptErrors[i]}. Return ONLY a corrected JSON object.` });
  }
  return msgs;
}
