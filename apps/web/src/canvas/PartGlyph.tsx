import { memo } from "react";
import { useSimStore } from "../sim/SimProvider";
import type { ReactElement } from "react";
import type { PartDefinition, Transform } from "@audrino/schema";
import { partDef } from "@audrino/schema";
import { EXTRA_ART } from "./partsArtExtra";
import { partNameLabel } from "./pinLabel";
import { BATCH2_ART } from "./partsArtBatch2";
import { BATCH3_ART } from "./partsArtBatch3";
import { BATCH4_ART } from "./partsArtBatch4";
import { resolveFamilyArt } from "./partsArtBatch5";

/**
 * Real-life SVG part visuals (top view, mm units). Props mirror the future
 * `PartVisual` interface ({ def, state }) so M1 can swap in wokwi-elements
 * without touching Canvas.tsx. Pin anchors come from the shared PartDefinition
 * tables in @audrino/schema — wires land on real pads/legs.
 */

export interface PartSize {
  w: number;
  h: number;
}

export function partSize(type: string): PartSize {
  return partDef(type)?.size_mm ?? { w: 24, h: 16 };
}

export function partLabel(type: string): string {
  return partDef(type)?.label ?? type.toUpperCase().slice(0, 5);
}

export function pinLocalPos(type: string, pinId: string): { x: number; y: number } | null {
  const pin = partDef(type)?.pins.find((p) => p.id === pinId);
  return pin ? { x: pin.x, y: pin.y } : null;
}

export function pinWorldPos(
  entity: { type: string; transform: Transform },
  pinId: string,
): [number, number] | null {
  const local = pinLocalPos(entity.type, pinId);
  if (!local) return null;
  return [entity.transform.x + local.x, entity.transform.y + local.y];
}

// ---- palette ---------------------------------------------------------------
const PCB_BLUE = "#0a74b8";
const PCB_BLUE_D = "#075a92";
const PCB_NAVY = "#1d4e89";
const PCB_GREEN = "#1e6f3e";
const PCB_RED = "#a63328";
const PCB_PURPLE = "#5b3f8c";
const PCB_DARK = "#171c26";
const METAL = "#b8c2cc";
const METAL_D = "#8f9aa6";
const METAL_L = "#d8dee5";
const GOLD = "#c9a227";
const BLACK = "#14161a";
const CHIP = "#0d0f12";
const SILK = "#eef4f9";
const CERAMIC = "#d2b48c";
const LEAD = "#a8b2bc";

const LED_COLORS: Record<string, [string, string]> = {
  red: ["#ff5252", "#b91c1c"],
  green: ["#4ade80", "#15803d"],
  yellow: ["#fde047", "#ca8a04"],
  blue: ["#60a5fa", "#1d4ed8"],
  white: ["#f8fafc", "#94a3b8"],
  orange: ["#fb923c", "#c2410c"],
};

const BAND_COLORS = ["#14161a", "#7a4a1e", "#c22", "#e72", "#dd0", "#3a3", "#39c", "#93c", "#888", "#eee"];

function bandCodes(ohms: number): [number, number, number] {
  const exp = Math.floor(Math.log10(Math.max(ohms, 0.1)));
  let d = Math.round(ohms / 10 ** (exp - 1));
  let mult = exp - 1;
  while (d >= 100) {
    d = Math.round(d / 10);
    mult += 1;
  }
  return [Math.floor(d / 10) % 10, d % 10, Math.max(-2, Math.min(8, mult))];
}

// ---- tiny primitives ---------------------------------------------------------
function Lead({ x1, y1, x2, y2, w = 0.7 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LEAD} strokeWidth={w} strokeLinecap="round" />;
}

function Hole({ x, y, r = 0.62 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={GOLD} />
      <circle cx={x} cy={y} r={r * 0.5} fill="#3a3220" />
    </g>
  );
}

function Silk({
  x,
  y,
  size = 1.6,
  fill = SILK,
  children,
  weight = 600,
  anchor = "middle",
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  children: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={anchor}
      style={{ fontSize: size, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: weight, pointerEvents: "none" }}
    >
      {children}
    </text>
  );
}

/** Black female header strip running through the given hole positions. */
function Header({ pts, vertical }: { pts: { x: number; y: number }[]; vertical?: boolean }) {
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const v = vertical ?? Math.max(...ys) - Math.min(...ys) > Math.max(...xs) - Math.min(...xs);
  const x = Math.min(...xs) - 1.35;
  const y = Math.min(...ys) - 1.35;
  const w = (v ? 0 : Math.max(...xs) - Math.min(...xs)) + 2.7;
  const h = (v ? Math.max(...ys) - Math.min(...ys) : 0) + 2.7;
  return (
    <g>
      <rect x={x - 0.4} y={y - 0.4} width={w + 0.8} height={h + 0.8} rx={0.7} fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={0.22} />
      <rect x={x} y={y} width={w} height={h} rx={0.5} fill="#16181d" stroke="#0b0d10" strokeWidth={0.25} />
      <rect x={x} y={y} width={w} height={0.7} rx={0.3} fill="#fff" opacity={0.1} />
      {pts.map((p) => (
        <SquareHole key={`${p.x},${p.y}`} x={p.x} y={p.y} />
      ))}
    </g>
  );
}

/** Square female-header socket: gold rim, dark square bore, clip glint. */
function SquareHole({ x, y, s = 1.5 }: { x: number; y: number; s?: number }) {
  const h = s / 2;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x - h} y={y - h} width={s} height={s} rx={0.25} fill={GOLD} stroke="#8a7420" strokeWidth={0.12} />
      <rect x={x - h + 0.32} y={y - h + 0.32} width={s - 0.64} height={s - 0.64} rx={0.15} fill="#14161a" />
      <path d={`M ${x - h + 0.4} ${y - h + 0.45} L ${x + h - 0.4} ${y - h + 0.45}`} stroke="#c9ced6" strokeWidth={0.14} opacity={0.85} />
    </g>
  );
}

function ScrewBlock({ x, y, w = 7, h = 5, label }: { x: number; y: number; w?: number; h?: number; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.4} fill="#2f8f5b" stroke="#1f6b41" strokeWidth={0.3} />
      <circle cx={x + w / 2} cy={y + h / 2} r={h * 0.3} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <line x1={x + w / 2 - h * 0.18} y1={y + h / 2} x2={x + w / 2 + h * 0.18} y2={y + h / 2} stroke={METAL_D} strokeWidth={0.3} />
      {label && <Silk x={x + w / 2} y={y + h - 0.7} size={1.05} fill="#eafff2">{label}</Silk>}
    </g>
  );
}

function Chip({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.4} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <circle cx={x + 1.1} cy={y + 1.1} r={0.45} fill="#3a3f46" />
      {label && <Silk x={x + w / 2} y={y + h / 2 + 0.9} size={1.15} fill="#9aa7b4">{label}</Silk>}
    </g>
  );
}

/** Shared photoreal materials (gradients, epoxy domes, lift shadows). SVG
 *  url() refs are document-scoped — mount once per canvas (see Canvas.tsx). */
export function ArtDefs() {
  return (
    <defs>
      <linearGradient id="matSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fdfefe" />
        <stop offset="0.35" stopColor="#c3cad2" />
        <stop offset="0.65" stopColor="#8e97a2" />
        <stop offset="1" stopColor="#5c6570" />
      </linearGradient>
      <linearGradient id="matBrass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe9b0" />
        <stop offset="0.5" stopColor="#d8a13e" />
        <stop offset="1" stopColor="#8f5f18" />
      </linearGradient>
      <linearGradient id="matBlack" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#55555c" />
        <stop offset="0.4" stopColor="#2c2c33" />
        <stop offset="1" stopColor="#101014" />
      </linearGradient>
      <linearGradient id="matAbs" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffef8" />
        <stop offset="0.55" stopColor="#f0efe6" />
        <stop offset="1" stopColor="#d6d4c6" />
      </linearGradient>
      <linearGradient id="matCeramic" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6e3b4" />
        <stop offset="0.5" stopColor="#e2c288" />
        <stop offset="1" stopColor="#b98f52" />
      </linearGradient>
      <linearGradient id="matCan" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f4f7fa" />
        <stop offset="0.45" stopColor="#aab3bd" />
        <stop offset="1" stopColor="#5f6872" />
      </linearGradient>
      {(["red", "green", "blue", "yellow", "white", "orange"] as const).map((c) => {
        const pair = LED_COLORS[c] ?? LED_COLORS.red!;
        return (
          <radialGradient key={c} id={`matDome-${c}`} cx="0.35" cy="0.28" r="0.95">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor={pair[0]} stopOpacity="0.95" />
            <stop offset="1" stopColor={pair[1]} />
          </radialGradient>
        );
      })}
      <pattern id="matGrid" width="5" height="5" patternUnits="userSpaceOnUse">
        <path className="grid-line" d="M 5 0 L 0 0 L 0 5" fill="none" />
      </pattern>
      <pattern id="matGridMajor" width="25" height="25" patternUnits="userSpaceOnUse">
        <rect width="25" height="25" fill="url(#matGrid)" />
        <path className="grid-line-major" d="M 25 0 L 0 0 L 0 25" fill="none" />
      </pattern>
      <filter id="matLift" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0.15" dy="0.5" stdDeviation="0.35" floodColor="#000" floodOpacity="0.3" />
      </filter>
    </defs>
  );
}

/** Per-pin silk labels nudged toward the board center (like real silkscreen). */
function PinSilk({ d }: { d: PartDefinition }) {
  const cx = d.size_mm.w / 2;
  const cy = d.size_mm.h / 2;
  return (
    <g style={{ pointerEvents: "none" }}>
      {d.pins.map((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const vert = Math.abs(dy) * d.size_mm.w >= Math.abs(dx) * d.size_mm.h;
        const x = vert ? p.x : p.x - Math.sign(dx || 1) * 1.7;
        const y = vert ? p.y - Math.sign(dy || 1) * 1.35 : p.y + 0.4;
        return (
          <Silk key={`s${p.id}`} x={x} y={y} size={0.95} fill={SILK}>
            {p.name.length <= 5 ? p.name : p.id}
          </Silk>
        );
      })}
    </g>
  );
}

type ArtFn = (d: PartDefinition, values: Record<string, unknown>) => ReactElement;

// ---- boards --------------------------------------------------------------------
const Uno: ArtFn = (d) => {
  // Layout mirrors the genuine UNO R3 (shield-standard header coordinates):
  // USB + reset top-left, SCL/SDA block then 13…8 | 7…0 along the top,
  // crystal + ICSP left-center, ATmega328P DIP-28 center-right, POWER at
  // x≈28 and ANALOG IN at x≈51 along the bottom, barrel jack bottom-left.
  const top = d.pins.filter((p) => p.y < 10).sort((x, y) => x.x - y.x);
  const bot = d.pins.filter((p) => p.y > 40).sort((x, y) => x.x - y.x);
  const power = bot.filter((p) => !/^A[0-5]$/.test(p.id));
  const analog = bot.filter((p) => /^A[0-5]$/.test(p.id));
  const PWM = new Set(["3", "5", "6", "9", "10", "11"]);
  const smd = (x: number, y: number, w = 2.2, h = 1.2, c = METAL_D) => (
    <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} rx={0.2} fill={c} />
  );
  const statusLed = (x: number, y: number, label: string, c: string) => (
    <g key={label}>
      <Silk x={x - 0.6} y={y + 1.05} size={1.15} fill={SILK} anchor="end">{label}</Silk>
      <rect x={x} y={y} width={1.7} height={1.15} rx={0.3} fill="#dfe4ea" stroke={METAL_D} strokeWidth={0.15} />
      <rect x={x + 0.28} y={y + 0.22} width={1.14} height={0.7} rx={0.2} fill={c} />
    </g>
  );
  const hole = (x: number, y: number) => (
    <g key={`h${x},${y}`}>
      <circle cx={x} cy={y} r={1.35} fill="#f3f2ea" stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={x} cy={y} r={0.85} fill="#c9c8be" stroke={METAL_D} strokeWidth={0.2} />
    </g>
  );
  return (
    <g>
      <rect x={0.3} y={0.3} width={68.4} height={53.4} rx={1.6} fill={PCB_BLUE} stroke={PCB_BLUE_D} strokeWidth={0.5} />
      <rect x={0.8} y={0.8} width={67.4} height={52.4} rx={1.3} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={0.4} />
      {[
        [15.24, 2.6],
        [14, 50.9],
        [66, 17.8],
        [66, 45.8],
      ].map(([x, y]) => hole(x, y))}
      {/* USB-B (shell, shield, tongue, contacts) */}
      <rect x={0.5} y={8.5} width={10.5} height={11.5} rx={0.8} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={1.3} y={9.7} width={8.9} height={9.1} rx={0.5} fill="#8f9aa6" />
      <rect x={1.9} y={10.7} width={7.7} height={7.1} rx={0.4} fill="#20242b" />
      <rect x={2.7} y={12.7} width={6.1} height={2.7} rx={0.3} fill="#dfe4ea" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={3.3 + i * 1.35} y={13} width={0.5} height={2.1} fill={GOLD} />
      ))}
      {/* reset button — top-left beside the USB, red actuator */}
      <rect x={5.2} y={1.8} width={6.4} height={5.8} rx={0.7} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
      <circle cx={8.4} cy={4.7} r={1.8} fill="#c2262b" stroke="#7a1216" strokeWidth={0.25} />
      <circle cx={7.8} cy={4.1} r={0.5} fill="#fff" opacity={0.35} />
      {/* ATmega328P DIP-28 — 35.5 mm body, notch left, pin-1 dot */}
      <rect x={33} y={33.2} width={33.5} height={11.6} rx={0.6} fill={CHIP} stroke="#000" strokeWidth={0.25} />
      <path d="M 33 37.4 A 1.6 1.6 0 0 0 33 40.4 Z" fill="#3a3f46" />
      <circle cx={35} cy={35.2} r={0.5} fill="#3a3f46" />
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i}>
          <rect x={33.9 + i * 2.32} y={32.3} width={1.1} height={0.95} fill={METAL_D} />
          <rect x={33.9 + i * 2.32} y={44.75} width={1.1} height={0.95} fill={METAL_D} />
        </g>
      ))}
      <Silk x={49.7} y={40.4} size={1.5} fill="#8f9aa6">ATMEGA328P</Silk>
      {/* crystal can + frequency marking */}
      <rect x={16.5} y={26.5} width={9} height={3.4} rx={1.6} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={21} y={31.8} size={0.85} fill={SILK}>16.000</Silk>
      {/* ICSP 2×3 (round male pins), center-left above the DIP */}
      {[
        [22.5, 43.4],
        [25.5, 43.4],
        [28.5, 43.4],
        [22.5, 46.4],
        [25.5, 46.4],
        [28.5, 46.4],
      ].map(([x, y]) => (
        <Hole key={`${x},${y}`} x={x} y={y} r={0.5} />
      ))}
      <Silk x={25.5} y={41.4} size={0.8} fill={SILK}>ICSP</Silk>
      {/* barrel jack — bottom-left */}
      <rect x={1.5} y={40} width={10} height={11.5} rx={0.8} fill={BLACK} stroke="#000" strokeWidth={0.3} />
      <circle cx={6.5} cy={45.7} r={2.7} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
      <circle cx={6.5} cy={45.7} r={1.1} fill="#050506" />
      {/* SMD cluster: USB-serial bridge, regulator, caps/resistors */}
      <Chip x={12.5} y={20.5} w={7} h={4.6} label="16U2" />
      <rect x={11.5} y={32} width={5} height={3.2} rx={0.3} fill="#2b2f36" stroke="#000" strokeWidth={0.15} />
      {smd(17.2, 32.8, 1.2, 1.8)}
      {smd(12, 37, 2.2, 1.2)}
      {smd(16, 37.5, 2.2, 1.2)}
      {smd(18.5, 30.4, 1.4, 1)}
      {smd(21, 31, 1.8, 1)}
      {smd(23.4, 30.4, 1.6, 1, CERAMIC)}
      {/* status LEDs: L · TX · RX (left of the logo) · ON (right edge) */}
      {statusLed(24.2, 12.4, "L", "#e2b211")}
      {statusLed(24.2, 16.3, "TX", "#e2b211")}
      {statusLed(24.2, 20.2, "RX", "#e2b211")}
      {statusLed(65.2, 14.2, "ON", "#3c6")}
      {/* ∞ ARDUINO logo + UNO oval */}
      <Silk x={38.5} y={18.5} size={3.2} weight={800} fill={SILK}>∞</Silk>
      <Silk x={44.5} y={20.6} size={1.8} weight={700} fill={SILK}>ARDUINO</Silk>
      <rect x={53.5} y={13.2} width={11.5} height={7} rx={3.5} fill="none" stroke={SILK} strokeWidth={0.35} />
      <Silk x={59.25} y={18.3} size={3.2} weight={800} fill={SILK}>UNO</Silk>
      {/* faint copper under the solder mask */}
      <g fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={0.55}>
        <path d="M 30 33 L 27 28 L 30 24" />
        <path d="M 40 32 L 38 27 L 42 24" />
        <path d="M 55 33 L 58 28" />
        <path d="M 20 34 L 16 36" />
        <path d="M 45 45 L 45 48 L 50 49" />
      </g>
      {/* silkscreen: digital group + PWM ~ + TX/RX arrows */}
      <Silk x={25} y={9.8} size={1.2} fill={SILK} anchor="start">DIGITAL (PWM ~)</Silk>
      {top.map((p) => (
        <Silk key={`s${p.id}`} x={p.x} y={5.9} size={1.3} fill={SILK}>{p.name}</Silk>
      ))}
      {top
        .filter((p) => PWM.has(p.name))
        .map((p) => (
          <Silk key={`p${p.id}`} x={p.x} y={7.5} size={1.2} fill={SILK}>~</Silk>
        ))}
      <Silk x={top.find((p) => p.id === "D1")!.x - 0.4} y={9.8} size={0.95} fill={SILK}>TX-&gt;1</Silk>
      <Silk x={top.find((p) => p.id === "D0")!.x - 0.4} y={9.8} size={0.95} fill={SILK}>RX-&lt;-0</Silk>
      {/* silkscreen: power + analog groups */}
      <Silk x={35.5} y={45.6} size={1.35} fill={SILK}>POWER</Silk>
      <Silk x={57.2} y={45.6} size={1.35} fill={SILK}>ANALOG IN</Silk>
      {[...power, ...analog].map((p) => (
        <Silk key={`s${p.id}`} x={p.x} y={49.2} size={1.1} fill={SILK}>{p.name}</Silk>
      ))}
      {/* headers with square female sockets */}
      <Header pts={top.slice(0, 10)} />
      <Header pts={top.slice(10)} />
      <Header pts={power} />
      <Header pts={analog} />
    </g>
  );
};

const Nano: ArtFn = (d) => (
  <g>
    <rect x={0.3} y={0.3} width={44.4} height={18.4} rx={1} fill={PCB_BLUE} stroke={PCB_BLUE_D} strokeWidth={0.4} />
    <rect x={19.5} y={0} width={6} height={3.6} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <Chip x={19.5} y={6.5} w={8} h={8} label="328P" />
    <rect x={30} y={8} width={4} height={2} rx={0.9} fill={METAL} />
    <circle cx={36} cy={5} r={0.7} fill="#c22" />
    <Silk x={22.5} y={17.2} size={1.5}>NANO</Silk>
    <Header pts={d.pins.slice(0, 12)} vertical />
    <Header pts={d.pins.slice(12)} vertical />
    <PinSilk d={d} />
  </g>
);

const Esp32: ArtFn = (d) => (
  <g>
    <rect x={0.3} y={0.3} width={51.4} height={29.4} rx={1} fill={PCB_DARK} stroke="#0b0d10" strokeWidth={0.4} />
    <rect x={22.5} y={0} width={7} height={3.4} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <rect x={15} y={5} width={20} height={14} rx={0.7} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <Silk x={25} y={13.5} size={2} fill="#3a3f46">ESP32</Silk>
    {/* PCB antenna */}
    <path
      d="M 40 4 L 47 4 L 47 6 L 41.5 6 L 41.5 8 L 47 8 L 47 10 L 41.5 10 L 41.5 12 L 47 12"
      fill="none"
      stroke={GOLD}
      strokeWidth={0.55}
    />
    <Chip x={20} y={22} w={8} h={5} label="CH340" />
    <circle cx={13} cy={24} r={0.7} fill="#48f" />
    <circle cx={15.5} cy={24} r={0.5} fill="#3c6" />
    <Silk x={33} y={25} size={1.3} fill="#8f9aa6">DEVKIT</Silk>
    <Header pts={d.pins.slice(0, 12)} vertical />
    <Header pts={d.pins.slice(12)} vertical />
    <PinSilk d={d} />
  </g>
);

const NodeMcu: ArtFn = (d) => (
  <g>
    <rect x={0.3} y={0.3} width={48.4} height={25.4} rx={1} fill={PCB_DARK} stroke="#0b0d10" strokeWidth={0.4} />
    <rect x={19} y={0} width={6.5} height={3.4} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <rect x={8} y={4} width={18} height={12} rx={0.7} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <Silk x={17} y={11.5} size={1.6} fill="#3a3f46">ESP-12</Silk>
    <path
      d="M 30 4 L 45 4 L 45 6 L 32 6 L 32 8 L 45 8 L 45 10 L 32 10 L 32 12 L 45 12 L 45 14 L 32 14"
      fill="none"
      stroke={GOLD}
      strokeWidth={0.5}
    />
    <Chip x={20} y={19} w={7} h={4.5} label="USB" />
    <circle cx={32} cy={21} r={0.6} fill="#3c6" />
    <Silk x={38} y={22} size={1.3} fill="#8f9aa6">NODEMCU</Silk>
    <Header pts={d.pins.slice(0, 8)} vertical />
    <Header pts={d.pins.slice(8)} vertical />
    <PinSilk d={d} />
  </g>
);

const Pico: ArtFn = (d) => (
  <g>
    <rect x={0.3} y={0.3} width={50.4} height={20.4} rx={1} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.4} />
    <rect x={2} y={0} width={6.5} height={3.8} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <Chip x={20} y={6} w={9} h={9} label="RP2040" />
    <Chip x={31} y={8} w={4} h={4} />
    <rect x={37} y={7.5} width={4} height={3.5} rx={0.5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    <Silk x={24} y={18.6} size={1.5}>PICO</Silk>
    <Header pts={d.pins.slice(0, 10)} vertical />
    <Header pts={d.pins.slice(10)} vertical />
    <PinSilk d={d} />
  </g>
);

// ---- leds / displays --------------------------------------------------------------
const Led: ArtFn = (d, values) => {
  const colorName = String(values.color ?? "red");
  const [lens, rim] = LED_COLORS[colorName] ?? LED_COLORS.red;
  const a = d.pins[0];
  const k = d.pins[1];
  const r = 3;
  const cx = 6;
  const cy = 5.6;
  const half = Math.sqrt(r * r - 2.2 * 2.2);
  return (
    <g>
      <path d={`M 8.2 ${cy - half} A ${r} ${r} 0 1 0 8.2 ${cy + half} Z`} fill={`url(#matDome-${LED_COLORS[colorName] ? colorName : "red"})`} stroke={rim} strokeWidth={0.35} />
      <ellipse cx={4.9} cy={3.9} rx={1.25} ry={0.8} fill="#fff" opacity={0.55} transform="rotate(-30 4.9 3.9)" />
      <circle cx={5.1} cy={cy} r={0.55} fill={METAL} />
      <path d="M 6.6 3.6 L 7.5 3.6 L 7.5 7.6 L 6.6 7.6 Z" fill={rim} opacity={0.55} />
      <path d={`M ${a.x + 2} ${a.y} L 5.1 ${cy + 0.6}`} stroke={LEAD} strokeWidth={0.75} fill="none" strokeLinecap="round" />
      <path d={`M ${k.x - 2} ${k.y} L 7.2 ${cy + 1}`} stroke={LEAD} strokeWidth={0.75} fill="none" strokeLinecap="round" />
    </g>
  );
};

const RgbLed: ArtFn = (d) => (
  <g>
    <circle cx={7} cy={6.4} r={3.4} fill="#dfe6ee" stroke="#9aa7b4" strokeWidth={0.4} />
    <ellipse cx={5.6} cy={4.6} rx={1.3} ry={0.85} fill="#fff" opacity={0.55} transform="rotate(-30 5.6 4.6)" />
    <circle cx={5.6} cy={6.2} r={0.6} fill="#e33" />
    <circle cx={7} cy={6.2} r={0.6} fill="#3c6" />
    <circle cx={8.4} cy={6.2} r={0.6} fill="#48f" />
    <rect x={5.2} y={7.4} width={3.6} height={0.8} rx={0.3} fill={METAL_D} />
    {d.pins.map((p, i) => (
      <Lead key={p.id} x1={4.2 + i * 1.9} y1={9.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Ws2812: ArtFn = () => (
  <g>
    <rect x={2} y={2} width={8} height={8} rx={0.8} fill="#e8e8e6" stroke="#b8bcc0" strokeWidth={0.35} />
    <circle cx={6} cy={6} r={2.2} fill="#d9d2b8" stroke="#b0a98c" strokeWidth={0.25} />
    <ellipse cx={5.3} cy={5.2} rx={0.8} ry={0.5} fill="#fff" opacity={0.5} />
    <path d="M 2 3.2 L 3.4 2 L 2 2 Z" fill="#c22" />
    <Silk x={6} y={11} size={0.9} fill="#5c6572">5050</Silk>
    {[
      [2, 2],
      [10, 2],
      [2, 10],
      [10, 10],
    ].map(([x, y]) => (
      <rect key={`${x}`} x={x - 1} y={y - 1} width={2} height={2} fill={GOLD} stroke="#8a7420" strokeWidth={0.15} />
    ))}
  </g>
);

const Oled: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={2} width={29} height={26} rx={0.8} fill="#1a2733" stroke="#0b1219" strokeWidth={0.35} />
    <rect x={3} y={3} width={24} height={14.5} rx={0.5} fill="#0b1520" stroke="#24384c" strokeWidth={0.3} />
    <rect x={4} y={4} width={22} height={12.5} fill="#0e1d2c" opacity={0.8} />
    <Silk x={15} y={11} size={2} fill="#5ac8fa">SSD1306</Silk>
    <Silk x={15} y={21.5} size={1.4} fill="#8f9aa6">I2C OLED</Silk>
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y - 1} />
        <Silk x={p.x} y={p.y - 2.4} size={0.95}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

const Lcd1602: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={59} height={31} rx={0.8} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.4} />
    <rect x={3} y={2} width={45} height={20} rx={0.5} fill="#334155" stroke="#1e293b" strokeWidth={0.3} />
    <rect x={4.5} y={3.5} width={42} height={17} fill="#8fb0c4" />
    {Array.from({ length: 16 }, (_, i) => (
      <rect key={`a${i}`} x={6 + i * 2.5} y={5.5} width={1.8} height={3} fill="#2c3e50" opacity={0.55} />
    ))}
    {Array.from({ length: 16 }, (_, i) => (
      <rect key={`b${i}`} x={6 + i * 2.5} y={12} width={1.8} height={3} fill="#2c3e50" opacity={0.55} />
    ))}
    {/* I2C backpack */}
    <rect x={50} y={5} width={8} height={20} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <circle cx={54} cy={10} r={1.8} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
    <Chip x={51.2} y={15} w={5} h={4} />
    <Silk x={26} y={27} size={1.4}>LCD1602 · I2C</Silk>
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y - 1} />
        <Silk x={p.x} y={p.y - 2.3} size={0.95}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

// ---- passives -----------------------------------------------------------------
const Resistor: ArtFn = (d, values) => {
  const ohms = Number(values.resistance_ohms ?? 220);
  const [b1, b2, mult] = bandCodes(ohms);
  const bands: [number, string][] = [
    [6, BAND_COLORS[b1]],
    [8, BAND_COLORS[b2]],
    [12.6, BAND_COLORS[mult + 1] ?? "#7a4a1e"],
    [15.4, GOLD],
  ];
  return (
    <g>
      <Lead x1={d.pins[0].x} y1={4} x2={4.5} y2={4} w={0.8} />
      <Lead x1={17.5} y1={4} x2={d.pins[1].x} y2={4} w={0.8} />
      <rect x={4.5} y={1.3} width={13} height={5.4} rx={2.2} fill="url(#matCeramic)" stroke="#b09060" strokeWidth={0.3} />
      <rect x={4.5} y={1.3} width={1.4} height={5.4} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={16.1} y={1.3} width={1.4} height={5.4} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={5.9} y={1.75} width={10} height={0.85} rx={0.4} fill="#fff" opacity={0.3} />
      {bands.map(([x, c]) => (
        <rect key={x} x={x} y={1.3} width={0.95} height={5.4} fill={c} />
      ))}
    </g>
  );
};

const Capacitor: ArtFn = () => (
  <g>
    <path d="M 3.5 3 Q 6 1.2 8.5 3 L 8.5 7.6 Q 6 9.4 3.5 7.6 Z" fill="#e3c95f" stroke="#b9a13e" strokeWidth={0.3} />
    <rect x={4.6} y={2.8} width={2.6} height={0.8} rx={0.3} fill="#fff" opacity={0.3} />
    <Lead x1={5} y1={8} x2={4} y2={10} />
    <Lead x1={7} y1={8} x2={8} y2={10} />
  </g>
);

const Electrolytic: ArtFn = () => (
  <g>
    <rect x={2.5} y={1.5} width={7} height={10.5} rx={0.7} fill="#2b3a67" stroke="#1c2745" strokeWidth={0.3} />
    <rect x={2.5} y={1.5} width={7} height={1.8} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
    <line x1={4.5} y1={2.4} x2={7.5} y2={2.4} stroke={METAL_D} strokeWidth={0.25} />
    <line x1={6} y1={1.7} x2={6} y2={3.1} stroke={METAL_D} strokeWidth={0.25} />
    <rect x={2.5} y={3.3} width={1.6} height={8.7} fill="#dfe6ee" opacity={0.85} />
    <Silk x={3.3} y={6} size={1.2} fill="#1c2745" weight={800}>−</Silk>
    <Silk x={3.3} y={8.4} size={1.2} fill="#1c2745" weight={800}>−</Silk>
    <Silk x={6.8} y={8} size={1.2}>100µ</Silk>
    <Lead x1={4.5} y1={12} x2={4} y2={16} />
    <Lead x1={7.5} y1={12} x2={8} y2={16} />
  </g>
);

const Inductor: ArtFn = () => (
  <g>
    <Lead x1={0} y1={5} x2={3.5} y2={5} w={0.8} />
    <Lead x1={12.5} y1={5} x2={16} y2={5} w={0.8} />
    <rect x={3.5} y={2.5} width={9} height={5} rx={0.6} fill="#3a4a3a" stroke="#253025" strokeWidth={0.3} />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M ${4.4 + i * 1.7} 2.8 Q ${5.3 + i * 1.7} 5 ${4.4 + i * 1.7} 7.2`} fill="none" stroke="#c87f2f" strokeWidth={0.55} />
    ))}
  </g>
);

const Diode: ArtFn = () => (
  <g>
    <Lead x1={0} y1={3} x2={5} y2={3} w={0.75} />
    <Lead x1={11} y1={3} x2={16} y2={3} w={0.75} />
    <rect x={5} y={1.4} width={6} height={3.2} rx={0.9} fill="#17181c" stroke="#000" strokeWidth={0.2} />
    <rect x={5.5} y={1.7} width={4.4} height={0.6} rx={0.3} fill="#fff" opacity={0.18} />
    <rect x={9.2} y={1.4} width={1} height={3.2} fill="#d8d8d8" />
  </g>
);

const Ldr: ArtFn = () => (
  <g>
    <circle cx={6} cy={6} r={4.8} fill="#27332c" stroke="#151c18" strokeWidth={0.35} />
    <polyline
      points="3.4,2.6 8.6,3.8 3.4,5 8.6,6.2 3.4,7.4 8.6,8.6 3.4,9.8"
      fill="none"
      stroke="#c9b458"
      strokeWidth={0.5}
      strokeLinejoin="round"
    />
    <path d="M 3 3.5 A 4.2 4.2 0 0 1 6 1.9" stroke="#fff" strokeWidth={0.5} opacity={0.25} fill="none" />
    <Lead x1={5} y1={10.6} x2={4} y2={14} />
    <Lead x1={7} y1={10.6} x2={8} y2={14} />
  </g>
);

const Thermistor: ArtFn = () => (
  <g>
    <circle cx={5} cy={4} r={2.5} fill="#3a6ea5" stroke="#274e78" strokeWidth={0.3} />
    <circle cx={4.2} cy={3.2} r={0.8} fill="#fff" opacity={0.35} />
    <Lead x1={4} y1={6.2} x2={3} y2={12} />
    <Lead x1={6} y1={6.2} x2={7} y2={12} />
  </g>
);

const Potentiometer: ArtFn = () => (
  <g>
    <rect x={1} y={1} width={10} height={10} rx={0.7} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.3} />
    <circle cx={6} cy={6} r={2.2} fill={GOLD} stroke="#8a7420" strokeWidth={0.25} />
    <line x1={4.5} y1={6} x2={7.5} y2={6} stroke="#8a7420" strokeWidth={0.35} />
    <line x1={6} y1={4.5} x2={6} y2={7.5} stroke="#8a7420" strokeWidth={0.35} />
    <Silk x={2.4} y={2.8} size={1} fill="#d7dee9">1</Silk>
    <Silk x={9.6} y={2.8} size={1} fill="#d7dee9">3</Silk>
    <Lead x1={2} y1={11} x2={2} y2={14} />
    <Lead x1={6} y1={11} x2={6} y2={14} />
    <Lead x1={10} y1={11} x2={10} y2={14} />
  </g>
);

/** Solderless breadboard — molded ABS body, beveled edge, center channel,
 *  recessed sockets with steel clip glints, red/blue rail stripes with +/−
 *  end marks, column numbers and a–j row letters. */
const HOLE_RE = /^([a-j])(\d+)$/;
const RAIL_RE = /^([np][tb])(\d+)$/;

function breadboardArt(withLabels: boolean): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    const holes = d.pins.filter((p) => HOLE_RE.test(p.id));
    const rails = d.pins.filter((p) => RAIL_RE.test(p.id));
    const cols = Math.max(...holes.map((p) => Number(HOLE_RE.exec(p.id)![2])));
    const rows = [...new Set(holes.map((p) => HOLE_RE.exec(p.id)![1]))].sort();
    const rowY = new Map(rows.map((L) => [L, holes.find((p) => p.id.startsWith(L))!.y]));
    const fieldTop = Math.min(...holes.map((p) => p.y)) - 1.27;
    const midY = ((rowY.get("e") ?? h / 2) + (rowY.get("f") ?? h / 2)) / 2;
    const railRows = [...new Set(rails.map((p) => RAIL_RE.exec(p.id)![1]))].sort(
      (a, b) => rails.find((p) => p.id.startsWith(a))!.y - rails.find((p) => p.id.startsWith(b))!.y,
    );
    const socket = (p: { x: number; y: number; id: string }) => (
      <g key={p.id} style={{ pointerEvents: "none" }}>
        <rect x={p.x - 0.78} y={p.y - 0.78} width={1.56} height={1.56} rx={0.25} fill="#5c5648" />
        <rect x={p.x - 0.44} y={p.y - 0.44} width={0.88} height={0.88} rx={0.14} fill="#14161a" />
        <path d={`M ${p.x - 0.3} ${p.y - 0.24} L ${p.x + 0.3} ${p.y - 0.24}`} stroke="#c9ced6" strokeWidth={0.14} fill="none" opacity={0.9} />
      </g>
    );
    return (
      <g>
        <g>
          <rect x={0.3} y={0.3} width={w - 0.6} height={h - 0.6} rx={1.2} fill="url(#matAbs)" stroke="#b9b5a2" strokeWidth={0.4} />
          <rect x={0.9} y={0.9} width={w - 1.8} height={h - 1.8} rx={0.9} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={0.3} />
          {rowY.has("e") && rowY.has("f") && (
            <>
              <rect x={1.6} y={midY - 0.8} width={w - 3.2} height={1.6} rx={0.8} fill="#d2cfbe" />
              <rect x={1.6} y={midY - 0.8} width={w - 3.2} height={0.55} rx={0.28} fill="#a9a592" opacity={0.6} />
            </>
          )}
          {railRows.map((rr) => {
            const pts = rails.filter((p) => p.id.startsWith(rr));
            const plus = pts[0]!.name === "+";
            const y = pts[0]!.y;
            const x0 = pts[0]!.x - 1.27;
            const x1 = pts[pts.length - 1]!.x + 1.27;
            return (
              <g key={rr} style={{ pointerEvents: "none" }}>
                <rect x={x0} y={y + (plus ? 0.95 : -1.25)} width={x1 - x0} height={0.3} fill={plus ? "#e23b3b" : "#2f5fd6"} opacity={0.85} />
                <Silk x={x0 - 0.7} y={y + 0.5} size={1.3} fill={plus ? "#c22" : "#26c"}>{plus ? "+" : "\u2212"}</Silk>
                <Silk x={x1 + 0.7} y={y + 0.5} size={1.3} fill={plus ? "#c22" : "#26c"}>{plus ? "+" : "\u2212"}</Silk>
              </g>
            );
          })}
          {withLabels && (
            <g style={{ pointerEvents: "none" }} fontFamily="ui-monospace, Menlo, monospace">
              {Array.from({ length: cols }, (_, c) => (
                <text key={c} x={holes.find((p) => HOLE_RE.exec(p.id)![2] === String(c + 1))!.x} y={fieldTop - 0.2} fontSize={1.05} fill="#8f8a78" textAnchor="middle">
                  {c + 1}
                </text>
              ))}
              {rows.map((L) => (
                <text key={L} x={1.1} y={rowY.get(L)! + 0.4} fontSize={0.95} fill="#8f8a78" textAnchor="start">
                  {L}
                </text>
              ))}
            </g>
          )}
          {holes.map(socket)}
          {rails.map(socket)}
          <rect x={0.3} y={h - 1.4} width={w - 0.6} height={0.6} rx={0.3} fill="#000" opacity={0.06} />
        </g>
      </g>
    );
  };
}

const BreadboardMini: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={1} width={29} height={22} rx={1} fill="url(#matAbs)" stroke="#c9c5b4" strokeWidth={0.35} />
    <line x1={2} y1={12} x2={28} y2={12} stroke="#c9c5b4" strokeWidth={0.3} strokeDasharray="1 0.8" />
    <line x1={3} y1={3.5} x2={27} y2={3.5} stroke="#c22" strokeWidth={0.3} />
    <line x1={3} y1={20.5} x2={27} y2={20.5} stroke="#26c" strokeWidth={0.3} />
    {d.pins.map((p) => (
      <g key={p.id}>
        <circle cx={p.x} cy={p.y} r={0.85} fill="#5c5648" />
        <circle cx={p.x} cy={p.y} r={0.45} fill="#14161a" />
      </g>
    ))}
    <Silk x={3} y={8.2} size={0.9} fill="#8f8a78" anchor="start">a</Silk>
    <Silk x={3} y={14.2} size={0.9} fill="#8f8a78" anchor="start">b</Silk>
  </g>
);

// ---- semiconductors -------------------------------------------------------------
function to92(label: string): ArtFn {
  return () => (
    <g>
      <path d="M 2.6 8.5 L 2.6 5 A 3.4 3.4 0 0 1 9.4 5 L 9.4 8.5 Z" fill="#1a1c20" stroke="#000" strokeWidth={0.25} />
      <path d="M 3.4 4.6 A 2.6 2.6 0 0 1 6 2.7" stroke="#fff" strokeWidth={0.4} opacity={0.16} fill="none" />
      <Silk x={6} y={1.6} size={1.4}>{label}</Silk>
      <Lead x1={3} y1={8.5} x2={3} y2={12} />
      <Lead x1={6} y1={8.5} x2={6} y2={12} />
      <Lead x1={9} y1={8.5} x2={9} y2={12} />
    </g>
  );
}

function to220(label: string): ArtFn {
  return () => (
    <g>
      <rect x={2} y={0.5} width={8} height={5.5} rx={0.4} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={6} cy={3.2} r={1.15} fill="#5c6572" stroke={METAL_D} strokeWidth={0.2} />
      <rect x={2} y={6} width={8} height={6} rx={0.4} fill="#17181c" stroke="#000" strokeWidth={0.25} />
      <Silk x={6} y={9.8} size={1.5}>{label}</Silk>
      <Lead x1={3} y1={12} x2={3} y2={16} />
      <Lead x1={6} y1={12} x2={6} y2={16} />
      <Lead x1={9} y1={12} x2={9} y2={16} />
    </g>
  );
}

// ---- input ---------------------------------------------------------------------------
const Pushbutton: ArtFn = () => (
  <g>
    <Lead x1={0} y1={7} x2={2.5} y2={7} w={0.8} />
    <Lead x1={11.5} y1={7} x2={14} y2={7} w={0.8} />
    <rect x={2.5} y={2.5} width={9} height={9} rx={0.6} fill="#9aa7b4" stroke={METAL_D} strokeWidth={0.3} />
    <rect x={3.8} y={3.8} width={6.4} height={6.4} rx={0.4} fill="#c0c8d0" stroke={METAL_D} strokeWidth={0.2} />
    <circle cx={7} cy={7} r={2.9} fill="#1a1c20" stroke="#000" strokeWidth={0.25} />
    <path d="M 5.2 5.4 A 2.4 2.4 0 0 1 7 4.6" stroke="#fff" strokeWidth={0.45} opacity={0.22} fill="none" />
    <rect x={3.6} y={11.5} width={1.3} height={1.8} fill={METAL_D} />
    <rect x={9.1} y={11.5} width={1.3} height={1.8} fill={METAL_D} />
    <rect x={3.6} y={0.7} width={1.3} height={1.8} fill={METAL_D} />
    <rect x={9.1} y={0.7} width={1.3} height={1.8} fill={METAL_D} />
  </g>
);

const ToggleSwitch: ArtFn = () => (
  <g>
    <g transform="rotate(-28 7 5.5)">
      <rect x={6.3} y={0.2} width={1.5} height={5.6} rx={0.75} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    </g>
    <circle cx={7} cy={5.5} r={1.7} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.25} />
    <rect x={3} y={5} width={8} height={5} rx={0.7} fill="#8f9aa6" stroke={METAL_D} strokeWidth={0.3} />
    <rect x={3} y={4.4} width={8} height={1.2} rx={0.5} fill={METAL} />
    <Lead x1={4} y1={10} x2={4} y2={12} />
    <Lead x1={10} y1={10} x2={10} y2={12} />
  </g>
);

const RotaryEncoder: ArtFn = (d) => (
  <g>
    <rect x={2.5} y={5} width={11} height={10} rx={0.7} fill="#2a2e35" stroke="#000" strokeWidth={0.3} />
    <circle cx={8} cy={9.5} r={2.7} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <circle cx={8} cy={9.5} r={1.6} fill={METAL_L} />
    {Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={8 + Math.cos(a) * 2.35}
          y1={9.5 + Math.sin(a) * 2.35}
          x2={8 + Math.cos(a) * 2.7}
          y2={9.5 + Math.sin(a) * 2.7}
          stroke={METAL_D}
          strokeWidth={0.25}
        />
      );
    })}
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={15} x2={p.x} y2={p.y} />
    ))}
    <Silk x={8} y={4} size={1.2}>ENC</Silk>
  </g>
);

const HcSr04: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={1} width={41} height={21} rx={0.8} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.4} />
    {[
      [11, 8],
      [31, 8],
    ].map(([x, y]) => (
      <g key={x}>
        <circle cx={x} cy={y} r={4.4} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.3} />
        <circle cx={x} cy={y} r={3.4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
        <circle cx={x} cy={y} r={2.1} fill="#6f7a86" />
        {[
          [-0.9, -0.9],
          [0.9, -0.9],
          [-0.9, 0.9],
          [0.9, 0.9],
        ].map(([dx, dy]) => (
          <circle key={`${dx}`} cx={x + dx} cy={y + dy} r={0.35} fill="#3a3f46" />
        ))}
      </g>
    ))}
    <rect x={20} y={7} width={3} height={2} rx={0.9} fill={METAL} />
    <Silk x={21} y={17.5} size={1.7}>HC-SR04</Silk>
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y - 1} />
        <Silk x={p.x} y={p.y - 2.2} size={0.95}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

const Dht11: ArtFn = (d) => (
  <g>
    <rect x={1.5} y={1} width={11} height={16} rx={0.8} fill="#cfd8e3" stroke="#9aa7b4" strokeWidth={0.3} />
    {[3.2, 5.4, 7.6, 9.8].map((y) => (
      <rect key={y} x={3.2} y={y} width={7.6} height={1} rx={0.4} fill="#8f9aa6" opacity={0.8} />
    ))}
    <Silk x={7} y={14.5} size={1.5} fill="#3a3f46">DHT11</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={17} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Pir: ArtFn = (d) => (
  <g>
    <circle cx={14} cy={13} r={11.8} fill="#1a3a2a" stroke="#0f2419" strokeWidth={0.4} />
    <circle cx={14} cy={12.5} r={7.6} fill="#e8eef4" stroke="#b8c2cc" strokeWidth={0.35} />
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={14 + Math.cos(a) * 1.4}
          y1={12.5 + Math.sin(a) * 1.4}
          x2={14 + Math.cos(a) * 7.6}
          y2={12.5 + Math.sin(a) * 7.6}
          stroke="#b8c2cc"
          strokeWidth={0.3}
          opacity={0.7}
        />
      );
    })}
    <circle cx={14} cy={12.5} r={4.4} fill="none" stroke="#b8c2cc" strokeWidth={0.25} opacity={0.6} />
    <circle cx={14} cy={12.5} r={1.3} fill="none" stroke="#b8c2cc" strokeWidth={0.25} opacity={0.6} />
    <circle cx={22.5} cy={20} r={0.5} fill={GOLD} />
    <circle cx={20.5} cy={21.5} r={0.5} fill={GOLD} />
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y - 1.2} r={0.55} />
        <Silk x={p.x} y={p.y - 2.6} size={0.95}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

const IrReceiver: ArtFn = (d) => (
  <g>
    <rect x={2.5} y={1.5} width={5} height={6.5} rx={2.4} fill="#221a2e" stroke="#000" strokeWidth={0.25} />
    <ellipse cx={4.6} cy={3.4} rx={1.1} ry={0.7} fill="#6d5a8a" opacity={0.5} transform="rotate(-30 4.6 3.4)" />
    <circle cx={5} cy={5} r={1.2} fill="#0d0a14" />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={8} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Joystick: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={21} height={21.5} rx={0.7} fill="#1d6a3a" stroke="#14522d" strokeWidth={0.35} />
    <rect x={1.5} y={1.5} width={5.5} height={4} rx={0.4} fill={METAL_D} />
    <rect x={15} y={1.5} width={5.5} height={4} rx={0.4} fill={METAL_D} />
    <circle cx={11} cy={10.5} r={4.6} fill="#22262c" stroke="#000" strokeWidth={0.3} />
    <circle cx={11} cy={10} r={3.1} fill="#101216" stroke="#000" strokeWidth={0.25} />
    <path d="M 9.3 8.6 A 2.4 2.4 0 0 1 11 7.9" stroke="#fff" strokeWidth={0.45} opacity={0.25} fill="none" />
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y - 1.2} r={0.55} />
        <Silk x={p.x} y={p.y - 2.5} size={0.9}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

const Keypad: ArtFn = (d) => {
  const labels = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"];
  return (
    <g>
      <rect x={0.5} y={0.5} width={39} height={35} rx={1} fill="#2b2f36" stroke="#000" strokeWidth={0.35} />
      {labels.map((lb, i) => {
        const cx = 3.5 + (i % 4) * 8.9;
        const cy = 3 + Math.floor(i / 4) * 8.2;
        return (
          <g key={lb}>
            <rect x={cx} y={cy} width={7.2} height={6.2} rx={0.8} fill="#454c58" stroke="#5c6572" strokeWidth={0.3} />
            <rect x={cx + 0.5} y={cy + 0.4} width={6.2} height={1.6} rx={0.5} fill="#fff" opacity={0.08} />
            <Silk x={cx + 3.6} y={cy + 4.6} size={2}>{lb}</Silk>
          </g>
        );
      })}
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={35.5} x2={p.x} y2={p.y} w={0.6} />
      ))}
    </g>
  );
};

const Mpu6050: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={17} height={15.5} rx={0.6} fill={PCB_PURPLE} stroke="#42296b" strokeWidth={0.35} />
    <Chip x={5} y={3} w={8} h={8} label="6050" />
    <rect x={1.5} y={3} width={2} height={1.2} fill={METAL_D} />
    <Silk x={9} y={13.6} size={1.2}>GY-521</Silk>
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y - 1} r={0.55} />
        <Silk x={p.x} y={p.y - 2.2} size={0.9}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

// ---- output --------------------------------------------------------------------------
function servoArt(body: { x: number; y: number; w: number; h: number }, caseColor: string, label: string, horn: { x: number; y: number; r: number }, pins: PartDefinition["pins"]): ReactElement {
  return (
    <g>
      <rect x={body.x} y={body.y - 1.6} width={5} height={1.6} rx={0.4} fill={caseColor} stroke="#000" strokeWidth={0.15} />
      <rect x={body.x} y={body.y + body.h} width={5} height={1.6} rx={0.4} fill={caseColor} stroke="#000" strokeWidth={0.15} />
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={1} fill={caseColor} stroke="#000" strokeWidth={0.3} />
      <rect x={body.x + 0.4} y={body.y + 0.4} width={body.w - 0.8} height={1.2} rx={0.5} fill="#fff" opacity={0.15} />
      {/* horn */}
      <g transform={`rotate(-18 ${horn.x} ${horn.y})`}>
        <rect x={horn.x - horn.r * 1.7} y={horn.y - 1.1} width={horn.r * 3.4} height={2.2} rx={1.1} fill="#f2f2f0" stroke={METAL_D} strokeWidth={0.2} />
        <rect x={horn.x - 1.1} y={horn.y - horn.r * 1.5} width={2.2} height={horn.r * 3} rx={1.1} fill="#f2f2f0" stroke={METAL_D} strokeWidth={0.2} />
      </g>
      <circle cx={horn.x} cy={horn.y} r={horn.r * 0.62} fill="#e8e8e6" stroke={METAL_D} strokeWidth={0.2} />
      <circle cx={horn.x} cy={horn.y} r={0.55} fill={METAL_D} />
      <Silk x={body.x + body.w * 0.68} y={body.y + body.h * 0.72} size={1.3}>{label}</Silk>
      {/* 3-wire cable */}
      {[
        ["#6b4a2e", -3],
        ["#c0392b", 0],
        ["#e67e22", 3],
      ].map(([c, dy], i) => (
        <path
          key={c as string}
          d={`M ${body.x + body.w} ${body.y + body.h / 2} Q ${body.x + body.w + 2} ${body.y + body.h / 2 + (dy as number)} ${pins[i].x - 1} ${pins[i].y}`}
          fill="none"
          stroke={c as string}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

const Sg90: ArtFn = (d) => servoArt({ x: 8, y: 4, w: 22, h: 16 }, "#2b6cb8", "SG90", { x: 13, y: 12, r: 3.4 }, d.pins);
const Mg996: ArtFn = (d) => servoArt({ x: 10, y: 5, w: 26, h: 18 }, "#2f3e56", "MG996R", { x: 17, y: 14, r: 4 }, d.pins);

const DcMotor: ArtFn = (d) => (
  <g>
    <rect x={2} y={4} width={17} height={10} rx={5} fill="#c2ccd4" stroke={METAL_D} strokeWidth={0.35} />
    <rect x={14.5} y={4} width={4.5} height={10} rx={2.2} fill="#9aa7b4" stroke={METAL_D} strokeWidth={0.25} />
    <rect x={19} y={7.8} width={5} height={2.4} rx={0.5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    <rect x={4} y={2.8} width={7} height={1.2} rx={0.4} fill="#e8eef4" opacity={0.5} />
    <rect x={7} y={14} width={1.6} height={2.4} fill={METAL_D} />
    <rect x={15} y={14} width={1.6} height={2.4} fill={METAL_D} />
    <Lead x1={d.pins[0].x} y1={16.2} x2={d.pins[0].x} y2={d.pins[0].y} />
    <Lead x1={d.pins[1].x} y1={16.2} x2={d.pins[1].x} y2={d.pins[1].y} />
  </g>
);

const Stepper: ArtFn = (d) => (
  <g>
    <rect x={1} y={2} width={20} height={16} rx={1} fill="#f0c33c" stroke="#c79a25" strokeWidth={0.35} />
    <rect x={9.5} y={0} width={3.5} height={2.6} rx={0.4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    <Silk x={11} y={9.5} size={1.5} fill="#4a3b10">28BYJ-48</Silk>
    <Silk x={11} y={12} size={1.1} fill="#4a3b10">5V STEPPER</Silk>
    <rect x={23} y={2} width={6.5} height={20} rx={0.6} fill="#1a1c20" stroke="#000" strokeWidth={0.25} />
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={28.5} y={p.y} r={0.5} />
        <Lead x1={21} y1={4 + (p.y - 3) * 0.8} x2={23} y2={p.y} w={0.45} />
      </g>
    ))}
  </g>
);

const Buzzer: ArtFn = () => (
  <g>
    <circle cx={6} cy={6} r={4.8} fill="#1a1c20" stroke="#000" strokeWidth={0.3} />
    <circle cx={6.3} cy={5.6} r={1.15} fill="#050506" />
    <path d="M 3.2 3.8 A 3.5 3.5 0 0 1 6 2.4" stroke="#fff" strokeWidth={0.45} opacity={0.18} fill="none" />
    <Silk x={3.3} y={3.4} size={1.4} fill="#8f9aa6">+</Silk>
    <Lead x1={4} y1={10.5} x2={4} y2={12} />
    <Lead x1={8} y1={10.5} x2={8} y2={12} />
  </g>
);

const Speaker: ArtFn = () => (
  <g>
    <rect x={1} y={1} width={16} height={16} rx={1} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
    <circle cx={9} cy={9} r={6.3} fill="#454c58" stroke="#5c6572" strokeWidth={0.25} />
    <circle cx={9} cy={9} r={2.4} fill="#2b2f36" stroke="#5c6572" strokeWidth={0.2} />
    <path d="M 5 5.4 A 5 5 0 0 1 9 3.2" stroke="#fff" strokeWidth={0.4} opacity={0.15} fill="none" />
    <Lead x1={7} y1={17} x2={7} y2={18} />
    <Lead x1={11} y1={17} x2={11} y2={18} />
    <Silk x={2.6} y={2.8} size={1.1} fill="#8f9aa6">+</Silk>
  </g>
);

const RelayModule: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={35} height={27} rx={0.7} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.35} />
    <rect x={3.5} y={5} width={16} height={17} rx={0.8} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.3} />
    <Silk x={11.5} y={12.5} size={1.5}>SONGLE</Silk>
    <Silk x={11.5} y={15} size={1}>SRD-05VDC</Silk>
    <Chip x={4} y={23} w={5} h={3.5} />
    <Chip x={11} y={23} w={4} h={3.5} />
    {[
      ["COM", 3],
      ["NO", 11],
      ["NC", 19],
    ].map(([lb, y]) => (
      <g key={lb as string}>
        <ScrewBlock x={25.5} y={y as number} w={9.5} h={6} label={lb as string} />
      </g>
    ))}
    {d.pins.filter((p) => p.x < 20).map((p) => (
      <Hole key={p.id} x={p.x} y={p.y - 1.2} />
    ))}
  </g>
);

const L298n: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={39} height={31} rx={0.7} fill={PCB_RED} stroke="#7c241b" strokeWidth={0.35} />
    <rect x={13} y={6} width={16} height={15} rx={0.5} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
    {Array.from({ length: 7 }, (_, i) => (
      <line key={i} x1={15 + i * 2} y1={6.6} x2={15 + i * 2} y2={20.4} stroke="#454c58" strokeWidth={0.5} />
    ))}
    <Silk x={21} y={24.5} size={1.5}>L298N</Silk>
    {d.pins.filter((p) => p.y < 1).map((p, i) => (
      <ScrewBlock key={p.id} x={p.x - 3.4} y={0.2} w={6.8} h={5} label={["O1", "O2", "O3", "O4"][i]} />
    ))}
    {d.pins.filter((p) => p.x < 1).map((p, i) => (
      <ScrewBlock key={p.id} x={0.2} y={p.y - 2.5} w={5} h={5} label={["+12", "G", "+5"][i]} />
    ))}
    <Header pts={d.pins.filter((p) => p.y > 30)} />
    <Chip x={31} y={8} w={6} h={8} />
  </g>
);

// ---- power ---------------------------------------------------------------------------------
const Battery9v: ArtFn = () => (
  <g>
    <rect x={1} y={4} width={16} height={24} rx={1.2} fill="#23262b" stroke="#000" strokeWidth={0.35} />
    <rect x={1} y={11} width={16} height={8.5} fill="#e8e8e6" />
    <Silk x={9} y={17.2} size={3.6} fill="#14161a" weight={800}>9V</Silk>
    <Silk x={9} y={13.6} size={1.05} fill="#3a3f46">ALKALINE</Silk>
    {/* snap terminals */}
    <circle cx={6.5} cy={2.2} r={1.8} fill={GOLD} stroke="#8a7420" strokeWidth={0.25} />
    <circle cx={12.5} cy={2.2} r={2.1} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.25} />
    <circle cx={12.5} cy={2.2} r={1} fill="#3a3f46" />
    <rect x={6.1} y={0} width={0.9} height={1.2} fill={GOLD} />
    <rect x={12.05} y={0} width={0.9} height={1.2} fill={METAL_D} />
  </g>
);

const Cr2032: ArtFn = () => (
  <g>
    <rect x={1} y={4} width={20} height={16} rx={1} fill="#1a1c20" stroke="#000" strokeWidth={0.3} />
    <circle cx={11} cy={12} r={7} fill="#c2ccd4" stroke={METAL_D} strokeWidth={0.35} />
    <circle cx={11} cy={12} r={5.4} fill="none" stroke={METAL_D} strokeWidth={0.25} />
    <Silk x={14.6} y={8.6} size={2} fill="#5c6572">+</Silk>
    <rect x={7} y={20} width={1.2} height={2} fill={METAL_D} />
    <rect x={13} y={20} width={1.2} height={2} fill={METAL_D} />
  </g>
);

export const LEGACY_ART: Record<string, ArtFn> = {
  "arduino-uno": Uno,
  "arduino-nano": Nano,
  "esp32-devkit": Esp32,
  "esp8266-nodemcu": NodeMcu,
  "rp-pico": Pico,
  led: Led,
  "rgb-led": RgbLed,
  ws2812: Ws2812,
  "oled-ssd1306": Oled,
  "lcd1602-i2c": Lcd1602,
  resistor: Resistor,
  capacitor: Capacitor,
  "electrolytic-capacitor": Electrolytic,
  inductor: Inductor,
  diode: Diode,
  ldr: Ldr,
  thermistor: Thermistor,
  potentiometer: Potentiometer,
  "breadboard-mini": BreadboardMini,
  "breadboard-170": breadboardArt(true),
  "breadboard-400": breadboardArt(true),
  "breadboard-830": breadboardArt(true),
  "transistor-npn": to92("NPN"),
  "transistor-pnp": to92("PNP"),
  "mosfet-n": to220("MOSFET"),
  "regulator-7805": to220("7805"),
  pushbutton: Pushbutton,
  "toggle-switch": ToggleSwitch,
  "rotary-encoder": RotaryEncoder,
  "hc-sr04": HcSr04,
  dht11: Dht11,
  pir: Pir,
  "ir-receiver": IrReceiver,
  joystick: Joystick,
  "keypad-4x4": Keypad,
  mpu6050: Mpu6050,
  "sg90-servo": Sg90,
  "mg996r-servo": Mg996,
  "dc-motor": DcMotor,
  "stepper-28byj": Stepper,
  buzzer: Buzzer,
  speaker: Speaker,
  "relay-module": RelayModule,
  l298n: L298n,
  "battery-9v": Battery9v,
  cr2032: Cr2032,
};

const ART: Record<string, ArtFn> = { ...LEGACY_ART, ...EXTRA_ART, ...BATCH2_ART, ...BATCH3_ART, ...BATCH4_ART };

/** Coverage probe for tests: does this type resolve to real art (not fallback)? */
export function hasArt(type: string): boolean {
  return ART[type] !== undefined || resolveFamilyArt(type) !== null;
}

function fallbackArt(d: PartDefinition): ReactElement {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.4} y={0.4} width={w - 0.8} height={h - 0.8} rx={1} fill="#2b2f36" stroke={METAL_D} strokeWidth={0.35} />
      <Silk x={w / 2} y={h / 2 + 0.8} size={Math.min(2.4, h / 4)}>{d.label}</Silk>
    </g>
  );
}

export const PartGlyph = memo(function PartGlyph(props: {
  type: string;
  transform: Transform;
  values?: Record<string, unknown>;
  selected?: boolean;
  board?: boolean;
  partRef?: string;
}) {
  const d = partDef(props.type);
  const { w, h } = partSize(props.type);
  const art = d ? (ART[d.type] ?? resolveFamilyArt(d.type) ?? fallbackArt)(d, props.values ?? {}) : fallbackArt({ ...({} as PartDefinition), label: "?", size_mm: { w: 24, h: 16 } });
  const lit = useSimStore((s) => {
    if (!props.partRef) return false;
    return !!s.leds.find((l) => l.ref === props.partRef && l.lit);
  });
  const rot = props.transform.rotation_deg;
  return (
    <g
      className={`part${props.board ? " board" : ""}${props.selected ? " selected" : ""}`}
      transform={
        rot
          ? `translate(${props.transform.x} ${props.transform.y}) rotate(${rot} ${w / 2} ${h / 2})`
          : `translate(${props.transform.x} ${props.transform.y})`
      }
    >
      <g filter="url(#matLift)">{art}</g>
      {props.partRef && !props.board && (
        <text className="part-label" x={w / 2} y={h + 2.8} textAnchor="middle">
          {partNameLabel(props.partRef, props.values ?? {})}
        </text>
      )}
      {lit && (
        <g className="led-glow" style={{ pointerEvents: "none" }}>
          <circle cx={w / 2} cy={h / 2} r={Math.max(w, h) * 0.72} fill="#ffb84d" opacity={0.2} />
          <circle cx={w / 2} cy={h / 2} r={Math.max(w, h) * 0.3} fill="#ffd27a" opacity={0.7} />
          <circle cx={w / 2} cy={h / 2} r={Math.max(w, h) * 0.14} fill="#fff6d8" opacity={0.95} />
        </g>
      )}
      {props.selected && (
        <rect
          x={-1.3}
          y={-1.3}
          width={w + 2.6}
          height={h + 2.6}
          rx={1.6}
          fill="none"
          stroke="#f0a244"
          strokeWidth={0.5}
          strokeDasharray="2.4 1.2"
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  );
});
