import { memo } from "react";
import { useSimStore } from "../sim/SimProvider";
import type { ReactElement } from "react";
import type { PartDefinition, Transform } from "@audrino/schema";
import { partDef } from "@audrino/schema";
import { entityScale, pinWorldPos as sharedPinWorldPos } from "../dsl/netsFromConnections";
import {
  Board,
  Crystal,
  Led5,
  Mark,
  To92,
  To220,
  Dip,
  ElectrolyticTop,
  FemaleHeader,
  MaleHeader,
  MountHole,
  Qfn,
  Smd3,
  SmdPassive,
  Tact,
  UsbShell,
} from "./partsCore";
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
  // One canonical implementation (rotation + component scale) shared with
  // relayoutWires/buildNetsAndWires — art and wire endpoints never diverge.
  return sharedPinWorldPos({ id: "", type: entity.type, transform: entity.transform }, pinId);
}

// ---- palette ---------------------------------------------------------------
const PCB_TEAL = "#0b7f78";
const PCB_TEAL_D = "#08605b";
const PCB_GREEN_D = "#14522d";
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
  rotate,
  spacing,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  children: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  rotate?: number;
  spacing?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={anchor}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      style={{
        fontSize: size,
        fontFamily: "ui-monospace, Menlo, monospace",
        fontWeight: weight,
        pointerEvents: "none",
        letterSpacing: spacing,
      }}
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
  // Genuine UNO R3 top view (official store photograph, shield-standard
  // header coordinates): USB-B + metal reset tact top-left, 16U2 ICSP (JP2)
  // and QFN-32 16U2 below them, HC-49S crystal mid-left, L/TX/RX SMD LEDs in a
  // column at x≈27, ∞ ARDUINO logo + UNO R3 badge centre, ATMEGA328P-PU DIP-28
  // (notch left) centre-right, main ICSP 2×3 at the right edge, two radial
  // electrolytics + DPAK regulator bottom-left, barrel jack protruding left,
  // POWER/ANALOG IN white silk boxes over the bottom headers.
  const top = d.pins.filter((p) => p.y < 10).sort((a, b) => a.x - b.x);
  const bot = d.pins.filter((p) => p.y > 40).sort((a, b) => a.x - b.x);
  const power = bot.filter((p) => !/^A[0-5]$/.test(p.id));
  const analog = bot.filter((p) => /^A[0-5]$/.test(p.id));
  const PWM = new Set(["3", "5", "6", "9", "10", "11"]);
  const smdLed = (x: number, y: number, label: string, c: string, side: "left" | "right" = "left") => (
    <g key={label}>
      <Silk x={side === "left" ? x - 0.7 : x + 2.4} y={y + 1.15} size={1.25} fill={SILK} anchor={side === "left" ? "end" : "start"}>
        {label}
      </Silk>
      <rect x={x} y={y} width={1.7} height={0.95} rx={0.22} fill="#e8ecef" stroke={METAL_D} strokeWidth={0.12} />
      <rect x={x + 0.42} y={y + 0.16} width={0.86} height={0.63} rx={0.14} fill={c} />
    </g>
  );
  const icsp2 = [
    [16.1, 4.9], [18.64, 4.9], [21.18, 4.9],
    [16.1, 7.44], [18.64, 7.44], [21.18, 7.44],
  ];
  const icspMain = [
    [64.7, 21.7], [67.24, 21.7],
    [64.7, 24.24], [67.24, 24.24],
    [64.7, 26.78], [67.24, 26.78],
  ];
  const mcuPins = [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `m${i}`, x: 31.4 + i * 2.54, y: 31.9 })),
    ...Array.from({ length: 14 }, (_, i) => ({ id: `n${i}`, x: 31.4 + i * 2.54, y: 39.9 })),
  ];
  return (
    <g>
      <Board
        w={69}
        h={54}
        fill={PCB_TEAL}
        edge={PCB_TEAL_D}
        traces={[
          "M 30 30 L 27 26 L 30 22", "M 41 31 L 39 26 L 43 23", "M 55 31 L 58 27",
          "M 20 35 L 16 37", "M 46 42 L 46 45 L 51 46", "M 60 20 L 63 22",
        ]}
      />
      {/* mounting holes */}
      {[[15.24, 2.6], [14, 50.9], [66, 17.8], [66, 45.8]].map(([x, y]) => (
        <MountHole key={`${x},${y}`} x={x} y={y} r={1.55} />
      ))}
      {/* USB-B shell */}
      <UsbShell x={0.4} y={8.2} w={11} h={12} kind="b" />
      {/* reset tact + vertical RESET silk */}
      <Tact x={3.4} y={1.3} w={6.2} h={5.6} plunger={METAL_L} frame={METAL} />
      <Silk x={2.2} y={7.4} size={1.05} fill={SILK} rotate={-90} anchor="start">RESET</Silk>
      {/* 16U2 ICSP (populated) + JP2 pads */}
      <MaleHeader pts={icsp2.map(([x, y]) => ({ x, y }))} />
      <rect x={16.9} y={9.5} width={5.6} height={4.6} rx={0.3} fill="none" stroke={SILK} strokeWidth={0.25} />
      {[[18.2, 10.6], [21.2, 10.6], [18.2, 12.9], [21.2, 12.9], [18.2, 11.75], [21.2, 11.75]].map(([x, y]) => (
        <Hole key={`j${x},${y}`} x={x} y={y} r={0.5} />
      ))}
      <Silk x={16.2} y={12.4} size={0.85} fill={SILK} rotate={-90}>JP2</Silk>
      {/* ATmega16U2 QFN-32 */}
      <Qfn x={17.3} y={15.1} w={5.4} h={5.4} label="16U2" pads={8} />
      {/* HC-49S crystal */}
      <Crystal x={13.9} y={24.1} w={10.2} h={4.7} oval label="16.000" />
      {/* status LEDs L / TX / RX (column) + ON (right edge) */}
      {smdLed(26.6, 9.9, "L", "#e8c33a")}
      {smdLed(26.6, 15.8, "TX", "#e8c33a")}
      {smdLed(26.6, 18.1, "RX", "#e8c33a")}
      {smdLed(58.6, 15.6, "ON", "#59d97e", "right")}
      <Silk x={26.2} y={28.6} size={0.95} fill={SILK} rotate={-90}>RST</Silk>
      {/* ∞ ARDUINO logo (− / + in the loops) + ® */}
      <g fill="none" stroke={SILK} strokeWidth={1.15}>
        <circle cx={36.6} cy={15.1} r={3.15} />
        <circle cx={42.7} cy={15.1} r={3.15} />
      </g>
      <path d="M 35.2 15.1 L 38 15.1" stroke={SILK} strokeWidth={0.85} />
      <path d="M 41.3 15.1 L 44.1 15.1 M 42.7 13.7 L 42.7 16.5" stroke={SILK} strokeWidth={0.85} />
      <Silk x={46.4} y={12.6} size={1.1} fill={SILK}>®</Silk>
      <Silk x={33.5} y={20.6} size={2.5} weight={800} fill={SILK} anchor="start" spacing={0.35}>ARDUINO</Silk>
      {/* UNO R3 badge */}
      <rect x={33.4} y={22.2} width={9.6} height={3.5} rx={0.25} fill={SILK} />
      <Silk x={38.2} y={24.85} size={2.3} weight={800} fill={PCB_TEAL} spacing={0.3}>UNO</Silk>
      <rect x={43.5} y={22.2} width={4.4} height={3.5} rx={0.25} fill="none" stroke={SILK} strokeWidth={0.3} />
      <Silk x={45.7} y={24.85} size={2.1} weight={700} fill={SILK}>R3</Silk>
      <Silk x={54.9} y={28.4} size={1.05} weight={700} fill={SILK} anchor="start" spacing={0.2}>ARDUINO.CC</Silk>
      {/* ATmega328P-PU DIP-28, notch toward the USB end */}
      <Dip x={29.9} y={32.6} w={35.4} h={6.6} pins={mcuPins} label="ATMEGA328P-PU" code="2039YE8" />
      {/* radial electrolytics + DPAK regulator + SMA diode */}
      <ElectrolyticTop x={17.9} y={43.5} r={2.75} stripe={null} />
      <ElectrolyticTop x={24.8} y={43.5} r={2.75} stripe={null} />
      <rect x={3.1} y={31.5} width={6.6} height={2.3} rx={0.3} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={3.1} y={33.8} width={6.6} height={3.6} rx={0.35} fill="url(#matBlack)" stroke="#000" strokeWidth={0.18} />
      {[4.4, 6.4, 8.4].map((x) => (
        <rect key={x} x={x - 0.35} y={37.4} width={0.7} height={1.3} fill={LEAD} />
      ))}
      <SmdPassive x={2.7} y={24.4} w={3.9} h={2.5} body="#22262d" />
      {/* scattered 0805 passives */}
      <SmdPassive x={29.4} y={9.7} w={1.7} h={0.95} body="#3a3220" term={METAL_D} />
      <SmdPassive x={29.4} y={15.7} w={1.7} h={0.95} body="#17181c" code="" />
      <SmdPassive x={29.4} y={18} w={1.7} h={0.95} body="#3a3220" />
      <SmdPassive x={44.6} y={25.6} w={1.7} h={0.95} body="#17181c" />
      <SmdPassive x={47.2} y={29.4} w={1.7} h={0.95} body="#3a3220" />
      <SmdPassive x={54.6} y={23.6} w={1.7} h={0.95} body="#17181c" />
      <SmdPassive x={57.2} y={25.8} w={1.7} h={0.95} body="#3a3220" />
      <SmdPassive x={36.4} y={29.2} w={1.7} h={0.95} body="#17181c" />
      {/* main ICSP 2×3 */}
      <MaleHeader pts={icspMain.map(([x, y]) => ({ x, y }))} />
      <Silk x={65.9} y={20.2} size={0.95} fill={SILK}>ICSP</Silk>
      {/* barrel jack */}
      <rect x={0.5} y={39.7} width={13.2} height={10.4} rx={0.7} fill="#191c21" stroke="#000" strokeWidth={0.3} />
      <rect x={0.5} y={39.7} width={13.2} height={1.1} rx={0.5} fill="#fff" opacity={0.08} />
      <circle cx={4.9} cy={44.9} r={3.15} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
      <circle cx={4.9} cy={44.9} r={1.35} fill="#050506" />
      <rect x={10.6} y={41.2} width={2.2} height={7.4} rx={0.4} fill="#22262b" />
      {/* silkscreen: digital group (vertical labels like the real board) */}
      <rect x={31.5} y={8.1} width={15.1} height={2.4} rx={0.2} fill={SILK} />
      <Silk x={39.05} y={9.85} size={1.5} weight={700} fill={PCB_TEAL} spacing={0.2}>DIGITAL (PWM~)</Silk>
      {top.map((p) => (
        <Silk key={`s${p.id}`} x={p.x + 0.45} y={4.4} size={1.25} fill={SILK} rotate={90} anchor="start">
          {p.name}
        </Silk>
      ))}
      {top
        .filter((p) => PWM.has(p.name))
        .map((p) => (
          <Silk key={`p${p.id}`} x={p.x - 0.7} y={4.9} size={1.2} fill={SILK} rotate={90} anchor="start">~</Silk>
        ))}
      <Silk x={top.find((p) => p.id === "D1")!.x + 0.55} y={8.1} size={1.15} fill={SILK} rotate={90} anchor="start">TX→</Silk>
      <Silk x={top.find((p) => p.id === "D0")!.x + 0.55} y={8.1} size={1.15} fill={SILK} rotate={90} anchor="start">RX←</Silk>
      {/* silkscreen: power + analog groups in white boxes, vertical labels */}
      <rect x={33.2} y={42.7} width={8.6} height={2.6} rx={0.2} fill={SILK} />
      <Silk x={37.5} y={44.55} size={1.6} weight={700} fill={PCB_TEAL} spacing={0.2}>POWER</Silk>
      <rect x={44.4} y={42.7} width={12.2} height={2.6} rx={0.2} fill={SILK} />
      <Silk x={50.5} y={44.55} size={1.6} weight={700} fill={PCB_TEAL} spacing={0.2}>ANALOG IN</Silk>
      {power.map((p, i) => (
        <g key={`pl${p.id}`}>
          {i === 4 && <rect x={p.x - 1.15} y={45.4} width={2.3} height={4.2} rx={0.2} fill={SILK} />}
          <Silk x={p.x + 0.45} y={45.7} size={1.25} fill={i === 4 ? PCB_TEAL : SILK} rotate={90} anchor="start">
            {p.name === "Reset" ? "RESET" : p.name}
          </Silk>
        </g>
      ))}
      {analog.map((p) => (
        <Silk key={`al${p.id}`} x={p.x + 0.45} y={45.7} size={1.25} fill={SILK} rotate={90} anchor="start">
          {p.name}
        </Silk>
      ))}
      {/* headers */}
      <FemaleHeader pts={top.slice(0, 10)} />
      <FemaleHeader pts={top.slice(10)} />
      <FemaleHeader pts={power} />
      <FemaleHeader pts={analog} />
    </g>
  );
};

const Nano: ArtFn = (d) => (
  <g>
    <Board w={45} h={19} fill={PCB_TEAL} edge={PCB_TEAL_D} rx={1} />
    <UsbShell x={19.4} y={0.2} w={6.2} h={3.4} kind="mini" />
    {/* ATmega328P in QFN-32 + FT232RL SSOP-28 */}
    <Qfn x={20.2} y={7} w={7.4} h={7.4} label="328P" pads={8} />
    <rect x={30.4} y={7.6} width={7.6} height={4.4} rx={0.35} fill="url(#matBlack)" stroke="#000" strokeWidth={0.15} />
    {Array.from({ length: 7 }, (_, i) => (
      <g key={i}>
        <rect x={30.9 + i * 1} y={7.1} width={0.5} height={0.5} fill={METAL_D} />
        <rect x={30.9 + i * 1} y={12} width={0.5} height={0.5} fill={METAL_D} />
      </g>
    ))}
    <Mark x={34.2} y={10.2} size={0.95}>FT232RL</Mark>
    {/* SOT-223 regulator + SS1P3L diode + polyfuse + crystal */}
    <rect x={8.6} y={7.4} width={4.6} height={1.7} rx={0.25} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.12} />
    <rect x={8.6} y={9.1} width={4.6} height={2.6} rx={0.3} fill="url(#matBlack)" stroke="#000" strokeWidth={0.14} />
    <SmdPassive x={14.6} y={6.6} w={2.6} h={1.7} body="#22262d" />
    <SmdPassive x={14.6} y={10.4} w={2.6} h={1.7} body="#8a6a2c" term={METAL_D} />
    <Crystal x={9.4} y={12.6} w={3.6} h={2.2} oval={false} />
    {/* ICSP 2×3 at the far end */}
    <MaleHeader pts={[{ x: 39.4, y: 7.4 }, { x: 41.4, y: 7.4 }, { x: 39.4, y: 9.4 }, { x: 41.4, y: 9.4 }, { x: 39.4, y: 11.4 }, { x: 41.4, y: 11.4 }]} />
    <Silk x={22.5} y={16.9} size={1.35} weight={700} spacing={0.2}>NANO</Silk>
    <g fill="none" stroke={SILK} strokeWidth={0.55}>
      <circle cx={17.4} cy={15.6} r={1.15} />
      <circle cx={19.6} cy={15.6} r={1.15} />
    </g>
    <MaleHeader pts={d.pins.slice(0, 15)} />
    <MaleHeader pts={d.pins.slice(15)} />
  </g>
);

const Esp32: ArtFn = (d) => (
  <g>
    <Board w={52} h={30} fill={PCB_DARK} edge="#0b0d10" rx={1.1} />
    <UsbShell x={22.4} y={0.1} w={7} h={3.4} kind="micro" />
    {/* WROOM-32 module: shield + meander PCB antenna */}
    <rect x={15} y={4.6} width={21} height={14.4} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
    <rect x={15.5} y={5.1} width={20} height={0.7} rx={0.35} fill="#fff" opacity={0.4} />
    <Mark x={25.5} y={13.4} size={1.7} fill="#3a3f46">ESP32-WROOM</Mark>
    <path
      d="M 37.5 4.9 L 46.5 4.9 L 46.5 6.6 L 39.2 6.6 L 39.2 8.3 L 46.5 8.3 L 46.5 10 L 39.2 10 L 39.2 11.7 L 46.5 11.7"
      fill="none"
      stroke={GOLD}
      strokeWidth={0.6}
    />
    {/* CP2102 + LDO + LEDs */}
    <Qfn x={20} y={22} w={5} h={4.4} label="CP2102" pads={4} />
    <Smd3 x={29} y={22.6} w={3} h={2.4} />
    <SmdPassive x={34.5} y={23} w={1.6} h={0.9} body="#e8ecef" term={METAL_D} />
    <SmdPassive x={37.5} y={23} w={1.6} h={0.9} body="#e8593c" term={METAL_D} />
    <Silk x={44} y={26.4} size={1.2} weight={700} fill="#8f9aa6">DEVKIT</Silk>
    <MaleHeader pts={d.pins.slice(0, 15)} />
    <MaleHeader pts={d.pins.slice(15)} />
  </g>
);

const NodeMcu: ArtFn = (d) => (
  <g>
    <Board w={49} h={26} fill={PCB_BLUE} edge={PCB_BLUE_D} rx={1.1} />
    <UsbShell x={19} y={0.1} w={6.6} h={3.2} kind="micro" />
    <rect x={7.6} y={4} width={17.4} height={12.4} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
    <Mark x={16.3} y={11} size={1.5} fill="#3a3f46">ESP-12E</Mark>
    <path
      d="M 26.4 4.4 L 44 4.4 L 44 6 L 28 6 L 28 7.6 L 44 7.6 L 44 9.2 L 28 9.2 L 28 10.8 L 44 10.8 L 44 12.4 L 28 12.4"
      fill="none"
      stroke={GOLD}
      strokeWidth={0.55}
    />
    <Qfn x={19.4} y={19} w={5} h={4} label="CP2102" pads={4} />
    <SmdPassive x={30} y={20} w={1.6} h={0.9} body="#59d97e" term={METAL_D} />
    <SmdPassive x={33} y={20} w={1.6} h={0.9} body="#3a7bff" term={METAL_D} />
    <Silk x={39.5} y={22.4} size={1.2} weight={700}>NODEMCU</Silk>
    <MaleHeader pts={d.pins.slice(0, 15)} />
    <MaleHeader pts={d.pins.slice(15)} />
  </g>
);

const Pico: ArtFn = (d) => (
  <g>
    <Board w={51} h={21} fill={PCB_GREEN} edge={PCB_GREEN_D} rx={1.1} />
    <UsbShell x={2.2} y={0.2} w={7.4} h={3.6} kind="micro" />
    <Qfn x={19.6} y={6.4} w={7} h={7} label="RP2040" pads={8} />
    <rect x={29.4} y={8} width={4.4} height={3.4} rx={0.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
    <Mark x={31.6} y={10.1} size={0.85} fill="#3a3f46">W25Q16</Mark>
    <Crystal x={13.4} y={12.4} w={3.4} h={2} oval={false} />
    <Tact x={12.6} y={5.4} w={4} h={3.2} plunger={METAL_L} frame={METAL} />
    <Silk x={14.6} y={4.9} size={0.9}>BOOTSEL</Silk>
    <SmdPassive x={36} y={7} w={1.6} h={0.9} body="#e8593c" term={METAL_D} />
    <SmdPassive x={36} y={12} w={1.6} h={0.9} body="#59d97e" term={METAL_D} />
    <Silk x={42} y={11.4} size={1.5} weight={700} spacing={0.2}>PICO</Silk>
    <MaleHeader pts={d.pins.slice(0, 20)} />
    <MaleHeader pts={d.pins.slice(20)} />
  </g>
);

// ---- leds / displays --------------------------------------------------------------
const Led: ArtFn = (d, values) => {
  const colorName = String(values.color ?? "red");
  const pair = LED_COLORS[colorName] ?? LED_COLORS.red;
  const a = d.pins[0];
  const k = d.pins[1];
  const cx = 6;
  const cy = 5.4;
  return (
    <g>
      <Led5 cx={cx} cy={cy} dome={`url(#matDome-${LED_COLORS[colorName] ? colorName : "red"})`} rim={pair[1]} />
      {/* lead frame: anode kinked, cathode straight */}
      <path d={`M ${a.x} ${a.y} L ${a.x} ${cy + 2.2} L ${cx - 0.9} ${cy + 2.6}`} stroke={LEAD} strokeWidth={0.72} fill="none" strokeLinecap="round" />
      <path d={`M ${k.x} ${k.y} L ${k.x} ${cy + 2.2} L ${cx + 0.9} ${cy + 2.6}`} stroke={LEAD} strokeWidth={0.72} fill="none" strokeLinecap="round" />
    </g>
  );
};

const RgbLed: ArtFn = (d) => (
  <g>
    <circle cx={7} cy={5.9} r={4.8} fill="#dfe6ee" stroke="#9aa7b4" strokeWidth={0.4} />
    <ellipse cx={4.9} cy={3.4} rx={1.7} ry={1.05} fill="#fff" opacity={0.55} transform="rotate(-30 4.9 3.4)" />
    <circle cx={5.1} cy={5.7} r={0.85} fill="#e33" />
    <circle cx={7} cy={5.7} r={0.85} fill="#3c6" />
    <circle cx={8.9} cy={5.7} r={0.85} fill="#48f" />
    <rect x={4.6} y={7.3} width={4.8} height={1.05} rx={0.4} fill={METAL_D} />
    {d.pins.map((p, i) => (
      <Lead key={p.id} x1={4.2 + i * 1.9} y1={9.8} x2={p.x} y2={p.y} />
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
    <Board w={60} h={32} fill={PCB_GREEN} edge={PCB_GREEN_D} rx={1} />
    {[
      [2.5, 2.5],
      [57.5, 2.5],
      [2.5, 29.5],
      [57.5, 29.5],
    ].map(([x, y]) => (
      <MountHole key={`${x},${y}`} x={x} y={y} r={1.5} />
    ))}
    {/* steel bezel + polariser + 16×2 character field */}
    <rect x={4} y={3} width={46} height={21} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
    <rect x={5.4} y={4.4} width={43.2} height={18.2} rx={0.4} fill="#23272e" />
    <rect x={6.4} y={5.4} width={41.2} height={16.2} rx={0.3} fill="#9db98a" />
    <rect x={6.4} y={5.4} width={41.2} height={4} fill="#fff" opacity={0.12} />
    {Array.from({ length: 16 }, (_, i) => (
      <g key={i}>
        <rect x={7.4 + i * 2.5} y={6.8} width={2} height={3.4} rx={0.2} fill="#3a4a34" opacity={0.5} />
        <rect x={7.4 + i * 2.5} y={13.4} width={2} height={3.4} rx={0.2} fill="#3a4a34" opacity={0.5} />
      </g>
    ))}
    {/* I2C backpack on the right */}
    <rect x={51} y={5} width={7.6} height={20} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <circle cx={54.8} cy={9.4} r={1.7} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
    <Qfn x={52.2} y={14} w={5} h={4.4} label="" pads={4} />
    <Silk x={27} y={27.6} size={1.5} weight={700} spacing={0.2}>LCD1602 · I2C</Silk>
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
    [4.3, BAND_COLORS[b1]],
    [6.5, BAND_COLORS[b2]],
    [8.7, BAND_COLORS[mult + 1] ?? "#7a4a1e"],
    [15.9, GOLD],
  ];
  return (
    <g>
      <Lead x1={d.pins[0].x} y1={4} x2={1.6} y2={4} w={0.75} />
      <Lead x1={20.4} y1={4} x2={d.pins[1].x} y2={4} w={0.75} />
      {/* dog-bone ceramic body */}
      <path
        d="M 2.6 0.3 Q 1.5 0.3 1.5 1.6 L 1.5 6.4 Q 1.5 7.7 2.6 7.7 L 19.4 7.7 Q 20.5 7.7 20.5 6.4 L 20.5 1.6 Q 20.5 0.3 19.4 0.3 Z"
        fill="url(#matCeramic)"
        stroke="#a98a58"
        strokeWidth={0.25}
      />
      <path d="M 2.6 0.3 Q 1.5 0.3 1.5 1.6 L 1.5 6.4 Q 1.5 7.7 2.6 7.7 L 3.6 7.7 L 3.6 0.3 Z" fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.12} />
      <path d="M 19.4 0.3 Q 20.5 0.3 20.5 1.6 L 20.5 6.4 Q 20.5 7.7 19.4 7.7 L 18.4 7.7 L 18.4 0.3 Z" fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.12} />
      <rect x={3.8} y={0.85} width={14.4} height={1.15} rx={0.55} fill="#fff" opacity={0.35} />
      {bands.map(([x, c]) => (
        <g key={x}>
          <rect x={x} y={0.3} width={1.3} height={7.4} fill={c} />
          <rect x={x} y={0.85} width={1.3} height={1.15} fill="#fff" opacity={0.22} />
        </g>
      ))}
    </g>
  );
};

const Capacitor: ArtFn = () => (
  <g>
    <path d="M 2.1 1.8 Q 6 -0.4 9.9 1.8 L 9.9 8.5 Q 6 10.9 2.1 8.5 Z" fill="#e3c95f" stroke="#b9a13e" strokeWidth={0.3} />
    <rect x={3.8} y={2.1} width={3.8} height={1.1} rx={0.4} fill="#fff" opacity={0.3} />
    <Lead x1={5} y1={9} x2={4} y2={10} />
    <Lead x1={7} y1={9} x2={8} y2={10} />
  </g>
);

const Electrolytic: ArtFn = () => (
  <g>
    <Lead x1={4.4} y1={13.2} x2={4} y2={16} />
    <Lead x1={7.6} y1={13.2} x2={8} y2={16} />
    {/* aluminium can + PVC sleeve */}
    <rect x={1.1} y={0.2} width={9.8} height={13.2} rx={1} fill="#2b3a67" stroke="#101a35" strokeWidth={0.3} />
    <rect x={1.1} y={0.2} width={9.8} height={1.9} rx={0.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
    <path d="M 3.6 1.15 L 8.4 1.15 M 6 0.3 L 6 2.05" stroke="#5c6570" strokeWidth={0.22} />
    {/* polarity stripe */}
    <rect x={1.1} y={2.1} width={2.3} height={11.3} fill="#dfe6ee" opacity={0.92} />
    <Silk x={2.25} y={5.6} size={1.5} fill="#2b3a67" weight={800}>−</Silk>
    <Silk x={2.25} y={8.6} size={1.5} fill="#2b3a67" weight={800}>−</Silk>
    <Silk x={2.25} y={11.6} size={1.5} fill="#2b3a67" weight={800}>−</Silk>
    <Mark x={7.2} y={6.4} size={1.5} fill="#cdd6e4">100µF</Mark>
    <Mark x={7.2} y={8.6} size={1.5} fill="#cdd6e4">25V</Mark>
    {/* crimp + sheen */}
    <rect x={1.1} y={11.6} width={9.8} height={1.1} fill="#101a35" opacity={0.55} />
    <rect x={9.2} y={2.4} width={1.1} height={10.6} rx={0.5} fill="#fff" opacity={0.14} />
  </g>
);

const Inductor: ArtFn = () => (
  <g>
    <Lead x1={0} y1={5} x2={2} y2={5} w={0.8} />
    <Lead x1={14} y1={5} x2={16} y2={5} w={0.8} />
    <rect x={2} y={1.5} width={12} height={7} rx={0.8} fill="#3a4a3a" stroke="#253025" strokeWidth={0.3} />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M ${3.2 + i * 2.2} 1.8 Q ${4.4 + i * 2.2} 5 ${3.2 + i * 2.2} 8.2`} fill="none" stroke="#c87f2f" strokeWidth={0.65} />
    ))}
  </g>
);

const Diode: ArtFn = () => (
  <g>
    <Lead x1={0} y1={3} x2={3.8} y2={3} w={0.75} />
    <Lead x1={12.2} y1={3} x2={16} y2={3} w={0.75} />
    <rect x={3.8} y={0.5} width={8.4} height={5} rx={1.3} fill="#17181c" stroke="#000" strokeWidth={0.2} />
    <rect x={4.5} y={1} width={6.2} height={0.85} rx={0.4} fill="#fff" opacity={0.18} />
    <rect x={10} y={0.5} width={1.3} height={5} fill="#d8d8d8" />
  </g>
);

const Ldr: ArtFn = () => (
  <g>
    <circle cx={6} cy={5.5} r={6} fill="#27332c" stroke="#151c18" strokeWidth={0.35} />
    <polyline
      points="2.6,1.2 9.4,2.8 2.6,4.4 9.4,6 2.6,7.6 9.4,9.2 2.6,10.8"
      fill="none"
      stroke="#c9b458"
      strokeWidth={0.6}
      strokeLinejoin="round"
    />
    <path d="M 2.2 3.2 A 5.6 5.6 0 0 1 6 0.1" stroke="#fff" strokeWidth={0.5} opacity={0.25} fill="none" />
    <Lead x1={5} y1={11.5} x2={4} y2={14} />
    <Lead x1={7} y1={11.5} x2={8} y2={14} />
  </g>
);

const Thermistor: ArtFn = () => (
  <g>
    <circle cx={5} cy={4.5} r={4} fill="#3a6ea5" stroke="#274e78" strokeWidth={0.3} />
    <circle cx={3.7} cy={3} r={1.15} fill="#fff" opacity={0.35} />
    <Lead x1={4} y1={8.2} x2={3} y2={12} />
    <Lead x1={6} y1={8.2} x2={7} y2={12} />
  </g>
);

const Potentiometer: ArtFn = () => (
  <g>
    <rect x={0.2} y={0.1} width={11.6} height={10.9} rx={0.9} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.3} />
    <circle cx={6} cy={5.6} r={3.2} fill={GOLD} stroke="#8a7420" strokeWidth={0.25} />
    <line x1={3.8} y1={5.6} x2={8.2} y2={5.6} stroke="#8a7420" strokeWidth={0.45} />
    <line x1={6} y1={3.4} x2={6} y2={7.8} stroke="#8a7420" strokeWidth={0.45} />
    <Silk x={1.5} y={2.3} size={1.25} fill="#d7dee9">1</Silk>
    <Silk x={10.5} y={2.3} size={1.25} fill="#d7dee9">3</Silk>
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
    const fieldBottom = Math.max(...holes.map((p) => p.y)) + 1.27;
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
              {Array.from({ length: cols }, (_, c) =>
                (c + 1) % 5 === 0 ? (
                  <g key={c}>
                    <text
                      x={holes.find((p) => HOLE_RE.exec(p.id)![2] === String(c + 1))!.x}
                      y={fieldTop - 0.35}
                      fontSize={1.15}
                      fill="#7c7663"
                      textAnchor="middle"
                    >
                      {c + 1}
                    </text>
                    <text
                      x={holes.find((p) => HOLE_RE.exec(p.id)![2] === String(c + 1))!.x}
                      y={fieldBottom + 1.35}
                      fontSize={1.15}
                      fill="#7c7663"
                      textAnchor="middle"
                    >
                      {c + 1}
                    </text>
                  </g>
                ) : null,
              )}
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
      <To92 x={1.2} y={0.4} w={9.6} h={9.4} label={label} code="24N" />
      <Lead x1={3} y1={9.8} x2={3} y2={12} />
      <Lead x1={6} y1={9.8} x2={6} y2={12} />
      <Lead x1={9} y1={9.8} x2={9} y2={12} />
    </g>
  );
}

function to220(label: string): ArtFn {
  return () => (
    <g>
      <To220 x={0.6} y={0.2} w={10.8} h={14.4} label={label} code="24N" />
      <Lead x1={3} y1={14.8} x2={3} y2={16} />
      <Lead x1={6} y1={14.8} x2={6} y2={16} />
      <Lead x1={9} y1={14.8} x2={9} y2={16} />
    </g>
  );
}

// ---- input ---------------------------------------------------------------------------
const Pushbutton: ArtFn = () => (
  <g>
    {/* bent legs out of the 6 mm tact body */}
    <Lead x1={0} y1={7} x2={1.2} y2={7} w={0.75} />
    <Lead x1={12.8} y1={7} x2={14} y2={7} w={0.75} />
    <Tact x={1.2} y={1.2} w={11.6} h={11.6} plunger="#0d0f12" frame="#22262b" />
  </g>
);

const ToggleSwitch: ArtFn = () => (
  <g>
    <g transform="rotate(-28 7 5)">
      <rect x={6.05} y={-1.2} width={1.9} height={7.2} rx={0.95} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    </g>
    <circle cx={7} cy={5} r={2.3} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.25} />
    <rect x={1.6} y={4.5} width={10.8} height={6.8} rx={0.9} fill="#8f9aa6" stroke={METAL_D} strokeWidth={0.3} />
    <rect x={1.6} y={3.7} width={10.8} height={1.6} rx={0.6} fill={METAL} />
    <Lead x1={4} y1={11.3} x2={4} y2={12} />
    <Lead x1={10} y1={11.3} x2={10} y2={12} />
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
    <Board w={42} h={22} fill={PCB_NAVY} edge="#163a66" rx={0.9} />
    {[
      [11, 8.4],
      [31, 8.4],
    ].map(([x, y]) => (
      <g key={x}>
        <circle cx={x} cy={y} r={4.7} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
        <circle cx={x} cy={y} r={3.9} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
        <circle cx={x} cy={y} r={3.2} fill="#8f9aa6" />
        <circle cx={x} cy={y} r={2.3} fill="#5c6570" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={x + Math.cos(a) * 2.75} cy={y + Math.sin(a) * 2.75} r={0.28} fill="#3a3f46" />;
        })}
        <circle cx={x - 1.4} cy={y - 1.6} r={0.9} fill="#fff" opacity={0.35} />
      </g>
    ))}
    <Crystal x={19.4} y={6.6} w={3.4} h={2.1} oval={false} />
    <Silk x={21} y={16.4} size={1.8} weight={700} spacing={0.2}>HC-SR04</Silk>
    {d.pins.map((p, i) => (
      <g key={p.id}>
        <Silk x={p.x} y={p.y - 2.6} size={0.95}>{["VCC", "TRIG", "ECHO", "GND"][i] ?? p.id}</Silk>
      </g>
    ))}
    <MaleHeader pts={d.pins.map((p) => ({ x: p.x, y: p.y - 1 }))} />
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
    {/* stamped steel can + black end bell + white 5-way connector */}
    <rect x={1} y={2} width={20} height={16} rx={1.1} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
    <rect x={1.6} y={2.6} width={18.8} height={3} rx={1} fill="#fff" opacity={0.35} />
    <rect x={18.4} y={2} width={2.6} height={16} rx={0.8} fill="#22262b" stroke="#000" strokeWidth={0.2} />
    <circle cx={9.6} cy={10} r={2.6} fill={METAL_D} stroke="#5c6570" strokeWidth={0.25} />
    <circle cx={9.6} cy={10} r={1.1} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    <Mark x={10} y={15.4} size={1.35} fill="#3a3f46">28BYJ-48</Mark>
    <Mark x={10} y={17} size={1} fill="#5c6570">5V STEPPER</Mark>
    <rect x={21.6} y={2.6} width={6.4} height={19.4} rx={0.6} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.25} />
    {d.pins.map((p, i) => (
      <g key={p.id}>
        <rect x={23} y={4 + i * 3.4} width={3.4} height={1.6} rx={0.2} fill="#39311f" />
        <Lead x1={26.4} y1={4.8 + i * 3.4} x2={p.x} y2={p.y} w={0.45} />
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
  /** Render at catalog size with no component boost (palette previews). */
  raw?: boolean;
}) {
  const d = partDef(props.type);
  const { w, h } = partSize(props.type);
  const art = d ? (ART[d.type] ?? resolveFamilyArt(d.type) ?? fallbackArt)(d, props.values ?? {}) : fallbackArt({ ...({} as PartDefinition), label: "?", size_mm: { w: 24, h: 16 } });
  const lit = useSimStore((s) => {
    if (!props.partRef) return false;
    return !!s.leds.find((l) => l.ref === props.partRef && l.lit);
  });
  const rot = props.transform.rotation_deg;
  // Components render COMPONENT_SCALE bigger about their centre; boards (and
  // raw palette previews) stay 1:1. pinWorldPos applies the same transform.
  const s = props.raw ? 1 : entityScale(props.type);
  const scaleT = s === 1 ? "" : ` translate(${w / 2} ${h / 2}) scale(${s}) translate(${-w / 2} ${-h / 2})`;
  return (
    <g
      className={`part${props.board ? " board" : ""}${props.selected ? " selected" : ""}`}
      transform={
        rot
          ? `translate(${props.transform.x} ${props.transform.y}) rotate(${rot} ${w / 2} ${h / 2})`
          : `translate(${props.transform.x} ${props.transform.y})`
      }
    >
      <g transform={scaleT || undefined}>
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
    </g>
  );
});
