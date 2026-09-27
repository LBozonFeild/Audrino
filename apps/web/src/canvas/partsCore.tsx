/**
 * partsCore — photoreal vector primitives shared by every art file.
 *
 * Everything here is drawn top-down in millimetres against real component
 * datasheet outlines (body sizes, lead pitches, marking bands), so the catalog
 * art reads as a 1:1 photograph of the bench: epoxy bodies carry laser
 * marking, metal carries brushed gradients, silkscreen carries the strings the
 * manufacturer actually prints. Gradients/filters live in `ArtDefs`
 * (PartGlyph.tsx) and are mounted once per canvas.
 */
import type { ReactElement } from "react";

export const METAL = "#b8c2cc";
export const METAL_D = "#8f9aa6";
export const METAL_L = "#d8dee5";
export const GOLD = "#c9a227";
export const GOLD_D = "#8a7420";
export const BLACK = "#14161a";
export const CHIP = "#101318";
export const SILK = "#f2f6fa";
export const LEAD = "#aeb8c2";
export const PCB_TEAL = "#0b7f78";
export const PCB_TEAL_D = "#08605b";
export const PCB_BLUE = "#0a74b8";
export const PCB_BLUE_D = "#075a92";
export const PCB_NAVY = "#1d4e89";
export const PCB_GREEN = "#1e6f3e";
export const PCB_GREEN_D = "#14522d";
export const PCB_RED = "#a63328";
export const PCB_PURPLE = "#5b3f8c";
export const PCB_DARK = "#171c26";

const MONO = "ui-monospace, Menlo, Consolas, monospace";

export function Silk(props: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  children: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  rotate?: number;
  family?: string;
  spacing?: number;
}): ReactElement {
  const { x, y, size = 1.4, fill = SILK, weight = 600, anchor = "middle", rotate, family = MONO, spacing } = props;
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={anchor}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      style={{
        fontSize: size,
        fontFamily: family,
        fontWeight: weight,
        pointerEvents: "none",
        letterSpacing: spacing,
      }}
    >
      {props.children}
    </text>
  );
}

/** Laser/ink marking printed on a package body (light grey on black epoxy). */
export function Mark(props: { x: number; y: number; size?: number; children: string; anchor?: "start" | "middle" | "end"; fill?: string }): ReactElement {
  const { x, y, size = 1.1, anchor = "middle", fill = "#98a1ab" } = props;
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} style={{ fontSize: size, fontFamily: MONO, fontWeight: 500, pointerEvents: "none" }}>
      {props.children}
    </text>
  );
}

export function Lead(props: { x1: number; y1: number; x2: number; y2: number; w?: number }): ReactElement {
  const { x1, y1, x2, y2, w = 0.6 } = props;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LEAD} strokeWidth={w} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={w * 0.3} strokeLinecap="round" opacity={0.35} />
    </g>
  );
}

/** Through-hole pad: gold annular ring + drilled bore. */
export function Hole({ x, y, r = 0.55 }: { x: number; y: number; r?: number }): ReactElement {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={GOLD} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={GOLD_D} strokeWidth={0.1} />
      <circle cx={x} cy={y} r={r * 0.52} fill="#39311f" />
      <circle cx={x} cy={y} r={r * 0.52} fill="none" stroke="#000" strokeWidth={0.08} opacity={0.6} />
    </g>
  );
}

/** DIP lead: shoulder + tapered foot, as seen from above. */
function DipLead({ x, y, dir, axis }: { x: number; y: number; dir: 1 | -1; axis: "v" | "h" }): ReactElement {
  if (axis === "v") {
    return (
      <g>
        <path d={`M ${x - 0.55} ${y} L ${x + 0.55} ${y} L ${x + 0.42} ${y + dir * 0.9} L ${x - 0.42} ${y + dir * 0.9} Z`} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.08} />
        <rect x={x - 0.28} y={dir === 1 ? y + 0.9 : y + 0.9 - 1.6} width={0.56} height={0.7} fill={METAL_D} />
      </g>
    );
  }
  return (
    <g>
      <path d={`M ${x} ${y - 0.55} L ${x} ${y + 0.55} L ${x + dir * 0.9} ${y + 0.42} L ${x + dir * 0.9} ${y - 0.42} Z`} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.08} />
      <rect x={dir === 1 ? x + 0.9 : x + 0.9 - 1.6} y={y - 0.28} width={0.7} height={0.56} fill={METAL_D} />
    </g>
  );
}

/**
 * Dual-in-line package: matte epoxy body, mould parting seam, pin-1 dimple,
 * index notch, two rows of stamped leads and laser marking. Works for both
 * orientations (pins in two horizontal rows or two vertical columns).
 */
export function Dip(props: {
  x: number;
  y: number;
  w: number;
  h: number;
  pins: { x: number; y: number; id: string }[];
  label?: string;
  code?: string;
  leadLen?: number;
}): ReactElement {
  const { x, y, w, h, pins, label, code } = props;
  const ys = [...new Set(pins.map((p) => Math.round(p.y * 10) / 10))];
  const horizontal = ys.length === 2; // two rows → leads exit top & bottom
  const rowA = pins.filter((p) => (horizontal ? Math.round(p.y * 10) / 10 === ys[0] : p.x < x + w / 2));
  const rowB = pins.filter((p) => (horizontal ? Math.round(p.y * 10) / 10 === ys[1] : p.x >= x + w / 2));
  return (
    <g>
      {(horizontal ? rowA : rowA).map((p) => (
        <DipLead key={`a${p.id}`} x={horizontal ? p.x : x + 0.35} y={horizontal ? (ys[0] < y + h / 2 ? y + 0.2 : p.y) : p.y} dir={-1} axis={horizontal ? "h" : "v"} />
      ))}
      {rowB.map((p) => (
        <DipLead key={`b${p.id}`} x={horizontal ? p.x : x + w - 0.35} y={horizontal ? (ys[1] > y + h / 2 ? y + h - 0.2 : p.y) : p.y} dir={1} axis={horizontal ? "h" : "v"} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={0.55} fill="url(#matBlack)" stroke="#000" strokeWidth={0.22} />
      <rect x={x + 0.35} y={y + 0.35} width={w - 0.7} height={h - 0.7} rx={0.4} fill="none" stroke="#ffffff" strokeWidth={0.12} opacity={0.09} />
      <rect x={x + 0.5} y={y + 0.45} width={w - 1} height={h * 0.28} rx={0.35} fill="#fff" opacity={0.05} />
      <path d={`M ${x} ${y + h / 2 - 1.15} A 1.15 1.15 0 0 0 ${x} ${y + h / 2 + 1.15} Z`} fill="#05070a" />
      <path d={`M ${x} ${y + h / 2 - 1.15} A 1.15 1.15 0 0 0 ${x} ${y + h / 2 + 1.15}`} fill="none" stroke="#3d434b" strokeWidth={0.14} />
      <circle cx={x + 1.5} cy={y + 1.5} r={0.52} fill="#05070a" />
      <circle cx={x + 1.5} cy={y + 1.5} r={0.52} fill="none" stroke="#454b54" strokeWidth={0.1} />
      {label && (
        <Mark x={x + w / 2 + 0.6} y={y + h / 2 + (code ? 0.15 : 0.4)} size={Math.min(1.5, (w * 0.62) / label.length)}>
          {label}
        </Mark>
      )}
      {code && (
        <Mark x={x + w / 2 + 0.6} y={y + h / 2 + 1.55} size={Math.min(1.05, (w * 0.5) / code.length)} fill="#7d868f">
          {code}
        </Mark>
      )}
    </g>
  );
}

/** TO-92: D-section body (flat face toward viewer), printed type + lot code. */
export function To92({ x, y, w, h, label, code }: { x: number; y: number; w: number; h: number; label: string; code?: string }): ReactElement {
  const r = w / 2;
  return (
    <g>
      <path d={`M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`} fill="url(#matBlack)" stroke="#000" strokeWidth={0.2} />
      <path d={`M ${x + 0.5} ${y + h - 0.4} L ${x + 0.5} ${y + r} A ${r - 0.5} ${r - 0.5} 0 0 1 ${x + w * 0.62} ${y + 0.62}`} fill="none" stroke="#fff" strokeWidth={0.35} opacity={0.12} />
      <Mark x={x + w / 2} y={y + r + 0.6} size={Math.min(1.35, (w * 0.86) / label.length)} fill="#c8cdd3">
        {label}
      </Mark>
      {code && (
        <Mark x={x + w / 2} y={y + r + 2} size={Math.min(0.95, (w * 0.7) / code.length)} fill="#8b939c">
          {code}
        </Mark>
      )}
    </g>
  );
}

/** TO-220: metal tab with mounting hole, black moulded body, 3 staggered legs. */
export function To220({ x, y, w, h, label, code, legs = 3 }: { x: number; y: number; w: number; h: number; label: string; code?: string; legs?: number }): ReactElement {
  const tabH = h * 0.42;
  return (
    <g>
      <rect x={x} y={y} width={w} height={tabH} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
      <circle cx={x + w / 2} cy={y + tabH * 0.5} r={Math.min(1.8, tabH * 0.36)} fill="#454c55" stroke="#31383f" strokeWidth={0.2} />
      <circle cx={x + w / 2} cy={y + tabH * 0.5} r={Math.min(1.8, tabH * 0.36)} fill="none" stroke="#e8edf2" strokeWidth={0.14} opacity={0.5} />
      <rect x={x} y={y + tabH} width={w} height={h - tabH} rx={0.45} fill="url(#matBlack)" stroke="#000" strokeWidth={0.22} />
      <rect x={x + 0.4} y={y + tabH + 0.35} width={w - 0.8} height={(h - tabH) * 0.3} rx={0.3} fill="#fff" opacity={0.06} />
      <Mark x={x + w / 2} y={y + tabH + (h - tabH) * 0.52} size={Math.min(1.7, (w * 0.8) / label.length)} fill="#c8cdd3">
        {label}
      </Mark>
      {code && (
        <Mark x={x + w / 2} y={y + tabH + (h - tabH) * 0.82} size={Math.min(1, (w * 0.62) / code.length)} fill="#8b939c">
          {code}
        </Mark>
      )}
      {Array.from({ length: legs }, (_, i) => {
        const lx = x + (w * (i + 1)) / (legs + 1);
        return <rect key={i} x={lx - 0.4} y={y + h - 0.2} width={0.8} height={1.6} fill={LEAD} stroke="#7c848e" strokeWidth={0.08} />;
      })}
    </g>
  );
}

/** SOT-23 / SOD-123 style SMD: black body + gull-wing leads. */
export function Smd3({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label?: string }): ReactElement {
  return (
    <g>
      <rect x={x - 0.5} y={y + h * 0.15} width={0.7} height={h * 0.32} fill={METAL_D} />
      <rect x={x - 0.5} y={y + h * 0.55} width={0.7} height={h * 0.32} fill={METAL_D} />
      <rect x={x + w - 0.2} y={y + h * 0.35} width={0.7} height={h * 0.32} fill={METAL_D} />
      <rect x={x} y={y} width={w} height={h} rx={0.25} fill="url(#matBlack)" stroke="#000" strokeWidth={0.14} />
      {label && <Mark x={x + w / 2} y={y + h / 2 + 0.35} size={Math.min(0.85, (w * 0.7) / label.length)}>{label}</Mark>}
    </g>
  );
}

/** Chip resistor / SMD passive: ceramic body with terminals + optional code. */
export function SmdPassive({ x, y, w, h, body = "#17181c", code, term = METAL_D }: { x: number; y: number; w: number; h: number; body?: string; code?: string; term?: string }): ReactElement {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.18} fill={body} stroke="#000" strokeWidth={0.1} />
      <rect x={x} y={y} width={w * 0.22} height={h} rx={0.18} fill={term} />
      <rect x={x + w * 0.78} y={y} width={w * 0.22} height={h} rx={0.18} fill={term} />
      {code && <Mark x={x + w / 2} y={y + h / 2 + 0.32} size={Math.min(0.75, (w * 0.5) / code.length)} fill="#e8ecef">{code}</Mark>}
    </g>
  );
}

/** Radial electrolytic from above: sleeve, crimp, vent cross, polarity stripe. */
export function ElectrolyticTop({ x, y, r, sleeve = "#2b3a67", stripe }: { x: number; y: number; r: number; sleeve?: string; stripe?: string | null }): ReactElement {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={sleeve} stroke="#0d1428" strokeWidth={0.25} />
      <circle cx={x} cy={y} r={r * 0.86} fill="none" stroke="#fff" strokeWidth={0.16} opacity={0.14} />
      <path d={`M ${x} ${y - r * 0.62} L ${x} ${y + r * 0.62} M ${x - r * 0.62} ${y} L ${x + r * 0.62} ${y}`} stroke="#8f9aa6" strokeWidth={0.35} opacity={0.8} />
      {stripe && (
        <path d={`M ${x - r * 0.9} ${y} A ${r * 0.9} ${r * 0.9} 0 0 1 ${x + r * 0.9} ${y}`} fill="none" stroke={stripe} strokeWidth={r * 0.34} opacity={0.9} transform={`rotate(115 ${x} ${y})`} />
      )}
      <circle cx={x - r * 0.32} cy={y - r * 0.36} r={r * 0.22} fill="#fff" opacity={0.16} />
    </g>
  );
}

/** 5 mm LED: flange, dome highlight, internal post + reflector cup. */
export function Led5({ cx, cy, dome, rim, lit }: { cx: number; cy: number; dome: string; rim: string; lit?: boolean }): ReactElement {
  const r = 2.5;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 0.35} fill={rim} opacity={0.55} />
      <circle cx={cx} cy={cy} r={r} fill={dome} stroke={rim} strokeWidth={0.22} />
      {/* flat cathode side chord */}
      <path d={`M ${cx + r * 0.62} ${cy - r * 0.79} A ${r} ${r} 0 0 1 ${cx + r * 0.62} ${cy + r * 0.79} L ${cx + r * 0.62} ${cy - r * 0.79} Z`} fill="#000" opacity={0.12} />
      {/* reflector cup + anvil */}
      <path d={`M ${cx - 0.85} ${cy + 0.9} L ${cx + 0.85} ${cy + 0.9} L ${cx + 0.5} ${cy - 0.15} L ${cx - 0.5} ${cy - 0.15} Z`} fill="#c9ced6" opacity={0.75} />
      <rect x={cx + 0.35} y={cy - 1.1} width={0.7} height={1.5} fill="#c9ced6" opacity={0.6} />
      <circle cx={cx} cy={cy - 0.35} r={0.42} fill="#fff8d8" opacity={0.85} />
      <ellipse cx={cx - r * 0.38} cy={cy - r * 0.44} rx={r * 0.42} ry={r * 0.24} fill="#fff" opacity={0.6} transform={`rotate(-32 ${cx - r * 0.38} ${cy - r * 0.44})`} />
      {lit && <circle cx={cx} cy={cy} r={r * 1.9} fill={dome} opacity={0.35} />}
    </g>
  );
}

/** 6 mm tactile switch: metal-framed body? (black base), round plunger, 4 legs. */
export function Tact({ x, y, w = 6, h = 6, plunger = "#0d0f12", frame = METAL }: { x: number; y: number; w?: number; h?: number; plunger?: string; frame?: string }): ReactElement {
  return (
    <g>
      {[[x - 0.7, y + 0.8], [x + w - 0.1, y + 0.8], [x - 0.7, y + h - 1.6], [x + w - 0.1, y + h - 1.6]].map(([lx, ly], i) => (
        <rect key={i} x={lx} y={ly} width={0.8} height={0.9} rx={0.15} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.08} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={0.35} fill={frame} stroke="#6f7a86" strokeWidth={0.18} />
      <rect x={x + 0.35} y={y + 0.35} width={w - 0.7} height={h - 0.7} rx={0.3} fill="#cfd6dd" />
      <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.32} fill={plunger} stroke="#000" strokeWidth={0.16} />
      <circle cx={x + w / 2 - 0.35} cy={y + h / 2 - 0.4} r={Math.min(w, h) * 0.1} fill="#fff" opacity={0.3} />
    </g>
  );
}

/** Black female header: shroud + square bores with clip glints. */
export function FemaleHeader({ pts, pitch = 2.54 }: { pts: { x: number; y: number }[]; pitch?: number }): ReactElement | null {
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const vertical = Math.max(...ys) - Math.min(...ys) > Math.max(...xs) - Math.min(...xs);
  const x = Math.min(...xs) - pitch / 2;
  const y = Math.min(...ys) - pitch / 2;
  const w = (vertical ? 0 : Math.max(...xs) - Math.min(...xs)) + pitch;
  const h = (vertical ? Math.max(...ys) - Math.min(...ys) : 0) + pitch;
  return (
    <g>
      <rect x={x - 0.15} y={y - 0.15} width={w + 0.3} height={h + 0.3} rx={0.35} fill="#000" opacity={0.35} />
      <rect x={x} y={y} width={w} height={h} rx={0.3} fill="#16181d" stroke="#04060a" strokeWidth={0.22} />
      <rect x={x + 0.18} y={y + 0.18} width={w - 0.36} height={0.5} rx={0.25} fill="#fff" opacity={0.1} />
      {pts.map((p) => (
        <g key={`${p.x},${p.y}`}>
          <rect x={p.x - 0.95} y={p.y - 0.95} width={1.9} height={1.9} rx={0.18} fill="#0a0c0f" />
          <rect x={p.x - 0.62} y={p.y - 0.62} width={1.24} height={1.24} rx={0.12} fill={GOLD} stroke={GOLD_D} strokeWidth={0.1} />
          <rect x={p.x - 0.4} y={p.y - 0.4} width={0.8} height={0.8} rx={0.08} fill="#101318" />
          <path d={`M ${p.x - 0.45} ${p.y - 0.5} L ${p.x + 0.45} ${p.y - 0.5}`} stroke="#dfe5ea" strokeWidth={0.12} opacity={0.8} />
        </g>
      ))}
    </g>
  );
}

/** 2.54 mm male pin header (square posts). */
export function MaleHeader({ pts }: { pts: { x: number; y: number }[] }): ReactElement | null {
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const vertical = Math.max(...ys) - Math.min(...ys) > Math.max(...xs) - Math.min(...xs);
  const x = Math.min(...xs) - 1.27;
  const y = Math.min(...ys) - 1.27;
  const w = (vertical ? 0 : Math.max(...xs) - Math.min(...xs)) + 2.54;
  const h = (vertical ? Math.max(...ys) - Math.min(...ys) : 0) + 2.54;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.25} fill="#16181d" stroke="#04060a" strokeWidth={0.2} />
      {pts.map((p) => (
        <g key={`${p.x},${p.y}`}>
          <rect x={p.x - 0.55} y={p.y - 0.55} width={1.1} height={1.1} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.08} />
          <rect x={p.x - 0.2} y={p.y - 0.55} width={0.4} height={1.1} fill="#fff" opacity={0.35} />
        </g>
      ))}
    </g>
  );
}

/** KF301-style screw terminal: blue/green box, wire entries, screw slots. */
export function ScrewTerminal({ x, y, w, h, pins, color = "#1d5c9a", dark = "#0f3a66" }: { x: number; y: number; w: number; h: number; pins: { x: number; y: number; id?: string }[]; color?: string; dark?: string }): ReactElement {
  const n = Math.max(1, pins.length);
  const seg = w / n;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.5} fill={color} stroke={dark} strokeWidth={0.28} />
      <rect x={x + 0.25} y={y + 0.25} width={w - 0.5} height={0.6} rx={0.3} fill="#fff" opacity={0.16} />
      {pins.map((p, i) => (
        <g key={p.id ?? i}>
          <rect x={x + i * seg + seg * 0.14} y={y + h * 0.16} width={seg * 0.72} height={h * 0.42} rx={0.3} fill="#0b1c30" />
          <circle cx={p.x} cy={y + h * 0.74} r={Math.min(seg * 0.3, h * 0.26)} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.16} />
          <rect x={p.x - seg * 0.22} y={y + h * 0.74 - 0.28} width={seg * 0.44} height={0.56} rx={0.14} fill="#4c5560" transform={`rotate(${i % 2 ? 90 : 0} ${p.x} ${y + h * 0.74})`} />
        </g>
      ))}
    </g>
  );
}

/** USB-B / micro-B / C shell seen from above. */
export function UsbShell({ x, y, w, h, kind = "b" }: { x: number; y: number; w: number; h: number; kind?: "b" | "micro" | "c" | "mini" }): ReactElement {
  if (kind === "b") {
    const c = 1.6;
    return (
      <g>
        <path
          d={`M ${x} ${y + c} L ${x + c} ${y} L ${x + w - c} ${y} L ${x + w} ${y + c} L ${x + w} ${y + h - c} L ${x + w - c} ${y + h} L ${x + c} ${y + h} L ${x} ${y + h - c} Z`}
          fill="url(#matSteel)"
          stroke="#5c6570"
          strokeWidth={0.25}
        />
        <rect x={x + 0.6} y={y + 0.6} width={w - 1.2} height={h - 1.2} rx={0.7} fill="#9aa4ae" />
        <rect x={x + 1.4} y={y + h * 0.16} width={w - 2.6} height={h * 0.68} rx={0.5} fill="#23272e" />
        <rect x={x + 2.2} y={y + h * 0.34} width={w - 4.2} height={h * 0.32} rx={0.3} fill="#e6ebef" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={x + 2.8 + i * ((w - 5.6) / 3)} y={y + h * 0.37} width={0.55} height={h * 0.26} fill={GOLD} />
        ))}
        <rect x={x + 0.6} y={y + 0.6} width={w - 1.2} height={0.7} rx={0.35} fill="#fff" opacity={0.4} />
      </g>
    );
  }
  if (kind === "micro" || kind === "mini") {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
        <rect x={x + 0.5} y={y + h * 0.22} width={w - 1} height={h * 0.56} rx={0.5} fill="#23272e" />
        <rect x={x + 0.5} y={y + h * 0.22} width={w - 1} height={0.4} rx={0.2} fill="#fff" opacity={0.3} />
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
      <rect x={x + 0.6} y={y + 0.6} width={w - 1.2} height={h - 1.2} rx={(h - 1.2) / 2} fill="#23272e" />
      <rect x={x + 1.4} y={y + h / 2 - 0.35} width={w - 2.8} height={0.7} rx={0.35} fill="#c9ced6" />
    </g>
  );
}

/** Crystal: HC-49 oval can or small metal rectangle. */
export function Crystal({ x, y, w, h, oval = true, label }: { x: number; y: number; w: number; h: number; oval?: boolean; label?: string }): ReactElement {
  return (
    <g>
      {oval ? (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#matCan)" stroke="#5c6570" strokeWidth={0.2} />
          <rect x={x + h * 0.18} y={y + h * 0.16} width={w - h * 0.36} height={h * 0.26} rx={h * 0.13} fill="#fff" opacity={0.45} />
        </g>
      ) : (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
          <rect x={x + 0.4} y={y + 0.4} width={w - 0.8} height={0.6} rx={0.3} fill="#fff" opacity={0.4} />
        </g>
      )}
      {label && (
        <Mark x={x + w / 2} y={y + h / 2 + 0.4} size={Math.min(0.95, (w * 0.7) / label.length)} fill="#4c5560">
          {label}
        </Mark>
      )}
    </g>
  );
}

/** QFN/QFP square IC: body, pin-1 dot, edge pads. */
export function Qfn({ x, y, w, h, label, pads = 8 }: { x: number; y: number; w: number; h: number; label?: string; pads?: number }): ReactElement {
  const per = Math.max(2, Math.round(pads / 4));
  const idx = Array.from({ length: per }, (_, i) => (per === 1 ? 0.5 : (i + 0.5) / per));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.45} fill="url(#matBlack)" stroke="#000" strokeWidth={0.18} />
      <rect x={x + 0.3} y={y + 0.3} width={w - 0.6} height={h - 0.6} rx={0.35} fill="none" stroke="#fff" strokeWidth={0.1} opacity={0.1} />
      <circle cx={x + 1} cy={y + 1} r={0.4} fill="#3d434b" />
      {idx.map((f) => (
        <g key={f}>
          <rect x={x + w * f - 0.3} y={y - 0.45} width={0.6} height={0.5} fill={GOLD} />
          <rect x={x + w * f - 0.3} y={y + h - 0.05} width={0.6} height={0.5} fill={GOLD} />
          <rect x={x - 0.45} y={y + h * f - 0.3} width={0.5} height={0.6} fill={GOLD} />
          <rect x={x + w - 0.05} y={y + h * f - 0.3} width={0.5} height={0.6} fill={GOLD} />
        </g>
      ))}
      {label && <Mark x={x + w / 2} y={y + h / 2 + 0.45} size={Math.min(1.15, (w * 0.7) / label.length)}>{label}</Mark>}
    </g>
  );
}

/** PCB substrate with edge highlight + optional copper whisper traces. */
export function Board({ w, h, fill, edge, rx = 1.4, traces }: { w: number; h: number; fill: string; edge: string; rx?: number; traces?: string[] }): ReactElement {
  return (
    <g>
      <rect x={0.3} y={0.3} width={w - 0.6} height={h - 0.6} rx={rx} fill={fill} stroke={edge} strokeWidth={0.45} />
      <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={rx - 0.3} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={0.35} />
      {traces && (
        <g fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={0.5}>
          {traces.map((dPath) => (
            <path key={dPath} d={dPath} />
          ))}
        </g>
      )}
    </g>
  );
}

/** Mounting hole: bare ring + drilled centre. */
export function MountHole({ x, y, r = 1.6 }: { x: number; y: number; r?: number }): ReactElement {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 0.55} fill="#cfd4d9" stroke="#8f9aa6" strokeWidth={0.25} />
      <circle cx={x} cy={y} r={r + 0.55} fill="none" stroke="#fff" strokeWidth={0.2} opacity={0.5} />
      <circle cx={x} cy={y} r={r} fill="#e8e6dc" stroke="#9aa0a6" strokeWidth={0.2} />
      <circle cx={x} cy={y} r={r - 0.35} fill="#b9b8ae" />
    </g>
  );
}
