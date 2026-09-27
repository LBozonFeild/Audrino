import type { ReactElement } from "react";
import type { PartDefinition, PartPin } from "@audrino/schema";
import {
  Crystal,
  Dip,
  ElectrolyticTop,
  FemaleHeader,
  Led5,
  Mark,
  MountHole,
  Qfn,
  ScrewTerminal,
  SmdPassive,
  MaleHeader,
  Tact,
  To220,
  To92,
  Lead as CoreLead,
} from "./partsCore";

/**
 * Batch-5 art: pattern-resolved families (thousands of SKUs → few art rules).
 * Every factory paints the part's real label from the definition.
 */

const LEAD = "#a8b2bc";
const METAL = "#b8c2cc";
const METAL_D = "#8f9aa6";
const METAL_L = "#d8dee5";
const GOLD = "#c9a227";
const GOLD_D = "#8a7420";
const CHIP = "#0d0f12";
const SILK = "#eef4f9";
const PCB_NAVY = "#1d4e89";
const PCB_GREEN = "#1e6f3e";
const PCB_BLUE = "#0a74b8";

type ArtFn = (d: PartDefinition, values: Record<string, unknown>) => ReactElement;

const text = (d: PartDefinition): string => d.label || d.type.toUpperCase();

function Silk({ x, y, size = 1.2, fill = SILK, children, anchor = "middle" }: { x: number; y: number; size?: number; fill?: string; children: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} style={{ fontSize: size, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 600, pointerEvents: "none" }}>
      {children}
    </text>
  );
}

function Lead({ x1, y1, x2, y2, w = 0.55 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LEAD} strokeWidth={w} strokeLinecap="round" />;
}

function Hole({ x, y, r = 0.45 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={GOLD} />
      <circle cx={x} cy={y} r={r * 0.5} fill="#3a3220" />
    </g>
  );
}

// ---- family art rules (all read the real label from the def) -------------------
const dipArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const rows = [...new Set(d.pins.map((p) => Math.round(p.y * 10) / 10))];
  const horizontal = rows.length === 2;
  const body = horizontal
    ? { x: 1.4, y: h * 0.28, w: w - 2.8, h: h * 0.44 }
    : { x: w * 0.28, y: 1.4, w: w * 0.44, h: h - 2.8 };
  return (
    <g>
      <Dip x={body.x} y={body.y} w={body.w} h={body.h} pins={d.pins} label={label} code={label.length < 12 ? "24N" : undefined} />
    </g>
  );
};

const to92Art: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <To92 x={w / 2 - 2.4} y={0.6} w={4.8} h={h * 0.62} label={label} code="24N" />
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={0.6 + h * 0.62} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const to220Art: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <To220 x={0.5} y={0.5} w={w - 1} h={h * 0.72} label={label} code="24N" legs={d.pins.length} />
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={0.5 + h * 0.72 + 1.2} x2={p.x} y2={p.y} w={0.55} />
      ))}
    </g>
  );
};

const doArt = (band: string, body: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const glass = body !== "#22262d" && body !== "#c8442c";
  return (
    <g>
      <CoreLead x1={0.4} y1={h / 2} x2={w * 0.24} y2={h / 2} w={0.5} />
      <CoreLead x1={w * 0.76} y1={h / 2} x2={w - 0.4} y2={h / 2} w={0.5} />
      <path
        d={`M ${w * 0.28} ${h * 0.16} Q ${w * 0.2} ${h * 0.16} ${w * 0.2} ${h * 0.34} L ${w * 0.2} ${h * 0.66} Q ${w * 0.2} ${h * 0.84} ${w * 0.28} ${h * 0.84} L ${w * 0.72} ${h * 0.84} Q ${w * 0.8} ${h * 0.84} ${w * 0.8} ${h * 0.66} L ${w * 0.8} ${h * 0.34} Q ${w * 0.8} ${h * 0.16} ${w * 0.72} ${h * 0.16} Z`}
        fill={body}
        stroke="#00000055"
        strokeWidth={0.18}
      />
      <rect x={w * 0.24} y={h * 0.2} width={w * 0.5} height={h * 0.16} rx={h * 0.08} fill="#fff" opacity={glass ? 0.4 : 0.14} />
      <rect x={w * 0.62} y={h * 0.16} width={w * 0.09} height={h * 0.68} fill={band} />
      <Mark x={w / 2} y={h * 0.1} size={Math.min(1, (w * 0.5) / label.length)} fill="#5b6470">
        {label}
      </Mark>
    </g>
  );
};

const zenerArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <Lead x1={0.5} y1={h / 2} x2={w - 0.5} y2={h / 2} w={0.5} />
      <rect x={w * 0.2} y={h * 0.15} width={w * 0.6} height={h * 0.7} rx={h * 0.35} fill="#f0783c" stroke="#000" strokeWidth={0.2} />
      <rect x={w * 0.62} y={h * 0.2} width={w * 0.08} height={h * 0.6} fill="#2b2f36" />
      <Silk x={w / 2} y={h * 0.08} size={1}>{label}</Silk>
    </g>
  );
};

const LED_BODY: Record<string, string> = {
  uv: "#8b5cf6",
  pink: "#f472b6",
  cyan: "#22d3ee",
  warm: "#ffd9a0",
  red: "#ff2a2a", green: "#28c840", yellow: "#ffd23f", blue: "#3a7bff",
  white: "#f4f6fb", amber: "#ff9f1a", orange: "#ff6a00", ir: "#3a1a4a", rgb: "#c06ae0",
};
const ledArt = (color: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const dome = LED_BODY[color] ?? "#ff2a2a";
  const cx = w / 2;
  const cy = h * 0.36;
  return (
    <g>
      <Led5 cx={cx} cy={cy} dome={dome} rim="#00000044" />
      {d.pins.map((p, i) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + 2.4} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const relayArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const ssr = /^ssr-/.test(d.type);
  const n = ssr ? 0 : Number(/(\d)ch/.exec(d.type)?.[1] ?? 1);
  if (ssr) {
    return (
      <g>
        <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.6} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.3} />
        <rect x={0.5} y={h * 0.32} width={w - 1} height={h * 0.36} fill="#c8342a" />
        <Mark x={w / 2} y={h * 0.55} size={Math.min(1.6, (w * 0.7) / label.length)} fill="#fff">
          {label}
        </Mark>
        <ScrewTerminal x={1.2} y={1} w={w * 0.28} h={3.4} pins={[{ x: 1.2 + w * 0.14, y: 2 }]} color="#e8e6dc" dark="#b9b5a2" />
        <ScrewTerminal x={w - 1.2 - w * 0.28} y={1} w={w * 0.28} h={3.4} pins={[{ x: w - 1.2 - w * 0.14, y: 2 }]} color="#e8e6dc" dark="#b9b5a2" />
        {d.pins.map((p) => (
          <Hole key={p.id} x={p.x} y={p.y > h / 2 ? p.y - 0.8 : p.y + 0.8} r={0.45} />
        ))}
      </g>
    );
  }
  const relays = Math.max(1, Math.min(4, n));
  const rw = (w - 2) / relays;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.4} rx={0.7} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      {Array.from({ length: relays }, (_, i) => (
        <g key={i}>
          <rect x={1.2 + i * rw} y={1.4} width={rw - 1} height={h * 0.42} rx={0.5} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.25} />
          <rect x={1.2 + i * rw + 0.5} y={1.9} width={rw - 2} height={h * 0.14} rx={0.3} fill="#e8eef4" opacity={0.85} />
          <Mark x={1.2 + i * rw + rw / 2 - 0.5} y={1.9 + h * 0.115} size={Math.min(0.9, (rw * 0.7) / 8)} fill="#1d4e89">
            SONGLE
          </Mark>
          <Mark x={1.2 + i * rw + rw / 2 - 0.5} y={1.4 + h * 0.34} size={Math.min(0.85, (rw * 0.6) / 8)} fill="#dfe6ee">
            SRD-05V
          </Mark>
        </g>
      ))}
      {relays > 1 && (
        <ScrewTerminal x={1.2} y={h * 0.52} w={w - 2.4} h={h * 0.3} pins={Array.from({ length: relays * 2 }, (_, i) => ({ x: 1.2 + ((w - 2.4) * (i + 0.5)) / (relays * 2), y: h * 0.67, id: `t${i}` }))} color="#1d5c9a" />
      )}
      <Silk x={w / 2} y={h - 3.9} size={Math.min(1.3, 16 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 0.9} r={0.45} />
          <CoreLead x1={p.x} y1={p.y - 0.4} x2={p.x} y2={p.y} w={0.5} />
        </g>
      ))}
    </g>
  );
};

const screwArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <ScrewTerminal x={0.5} y={0.6} w={w - 1} h={h - 4.2} pins={d.pins} />
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 3.4} x2={p.x} y2={p.y} w={0.55} />
      ))}
    </g>
  );
};

const holderArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const coin = /coin|v9/.test(d.type);
  const cells = /18650/.test(d.type) ? Math.max(1, Math.round((w - 2) / 21)) : /aa|aaa/.test(d.type) ? Math.max(1, Math.min(4, Math.round((w - 2) / 15))) : 0;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.4} rx={0.8} fill="#22262b" stroke="#000" strokeWidth={0.3} />
      {coin ? (
        <g>
          <circle cx={w / 2} cy={(h - 3) / 2 + 0.5} r={Math.min(w, h - 3) * 0.42} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
          <circle cx={w / 2} cy={(h - 3) / 2 + 0.5} r={Math.min(w, h - 3) * 0.3} fill="none" stroke="#8f9aa6" strokeWidth={0.25} />
          <Mark x={w / 2} y={(h - 3) / 2 + 1} size={1.4} fill="#4c5560">+</Mark>
        </g>
      ) : (
        Array.from({ length: cells }, (_, i) => {
          const cw = (w - 3) / cells;
          const cx = 1.5 + i * cw + cw / 2;
          return (
            <g key={i}>
              <rect x={1.5 + i * cw + 0.6} y={1.6} width={cw - 1.2} height={h - 6.4} rx={(cw - 1.2) / 2} fill={/18650/.test(d.type) ? "#3f8f4a" : "#c9a227"} stroke="#00000055" strokeWidth={0.2} />
              <rect x={1.5 + i * cw + 0.6} y={1.6} width={cw - 1.2} height={(h - 6.4) * 0.16} rx={0.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.12} />
              <rect x={cx - 0.5} y={1.2} width={1} height={0.6} rx={0.3} fill={METAL_L} />
              <rect x={1.5 + i * cw + 0.9} y={2.4} width={(cw - 1.2) * 0.22} height={h - 8} fill="#fff" opacity={0.18} />
            </g>
          );
        })
      )}
      <Mark x={w / 2} y={h - 4.2} size={Math.min(1.1, 22 / label.length)} fill="#8f9aa6">
        {label}
      </Mark>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} w={0.6} />
      ))}
    </g>
  );
};

const moduleArt = (fill = PCB_NAVY): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.2;
  const pinsBottom = d.pins.filter((p) => p.y > h - 2);
  const pinsSide = d.pins.filter((p) => p.y <= h - 2);
  const iw = Math.min(8, w * 0.42);
  const ih = Math.min(6, bh * 0.5);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={bh} rx={0.8} fill={fill} stroke="#00000044" strokeWidth={0.3} />
      <rect x={0.9} y={0.9} width={w - 1.8} height={bh - 0.8} rx={0.6} fill="none" stroke="#fff" strokeOpacity={0.13} strokeWidth={0.28} />
      {w > 15 && <MountHole x={2.3} y={2.3} r={0.85} />}
      {w > 15 && <MountHole x={w - 2.3} y={2.3} r={0.85} />}
      <Qfn x={w / 2 - iw / 2} y={bh / 2 - ih / 2 - 0.6} w={iw} h={ih} label={label.slice(0, 9).toUpperCase()} pads={6} />
      <SmdPassive x={1.5} y={bh - 2.6} w={1.7} h={0.95} body="#3a3220" />
      <SmdPassive x={w - 3.2} y={1.5} w={1.7} h={0.95} />
      <Crystal x={w - 6.4} y={bh - 3} w={3.2} h={1.7} oval={false} />
      <Silk x={w / 2} y={bh - 0.8} size={Math.min(1.4, 18 / label.length)}>{label}</Silk>
      {pinsSide.map((p) => (
        <Hole key={p.id} x={p.x > w / 2 ? p.x + 0.5 : p.x - 0.5} y={p.y} r={0.45} />
      ))}
      {pinsBottom.length > 0 && <MaleHeader pts={pinsBottom.map((p) => ({ x: p.x, y: p.y - 1.15 }))} />}
      {pinsBottom.map((p) => (
        <CoreLead key={`l${p.id}`} x1={p.x} y1={p.y - 0.3} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

const screenArt = (screen: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.4;
  const t = d.type;
  const eink = /eink/.test(t);
  const charLcd = /lcd-|nokia/.test(t);
  const oled = /oled|sh110/.test(t);
  const pcb = eink ? "#8c2f2f" : oled ? "#1d4e89" : charLcd ? "#1d4e89" : "#14161a";
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={bh} rx={0.8} fill={pcb} stroke="#00000055" strokeWidth={0.3} />
      <rect x={0.9} y={0.9} width={w - 1.8} height={bh - 0.8} rx={0.6} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={0.26} />
      {w > 18 && <MountHole x={2.2} y={2.2} r={0.9} />}
      {w > 18 && <MountHole x={w - 2.2} y={2.2} r={0.9} />}
      {charLcd && (
        <g>
          <rect x={2.4} y={2} width={w - 4.8} height={bh - 4.4} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.28} />
          <rect x={3.4} y={3} width={w - 6.8} height={bh - 6.4} rx={0.35} fill="#23272e" />
          <rect x={4.2} y={3.8} width={w - 8.4} height={bh - 8} fill={screen} />
          <rect x={4.2} y={3.8} width={w - 8.4} height={(bh - 8) * 0.22} fill="#fff" opacity={0.14} />
          {Array.from({ length: Math.min(20, Math.floor((w - 10) / 2.6)) }, (_, i) => (
            <g key={i}>
              <rect x={5 + i * 2.6} y={4.6} width={1.9} height={(bh - 10) * 0.4} fill="#2c3e50" opacity={0.5} />
              <rect x={5 + i * 2.6} y={4.6 + (bh - 10) * 0.52} width={1.9} height={(bh - 10) * 0.4} fill="#2c3e50" opacity={0.5} />
            </g>
          ))}
        </g>
      )}
      {oled && (
        <g>
          <rect x={w * 0.12} y={1.8} width={w * 0.76} height={bh - 3.6} rx={0.4} fill="#0b1520" stroke="#24384c" strokeWidth={0.28} />
          <rect x={w * 0.16} y={2.6} width={w * 0.68} height={bh - 5.2} fill={screen} opacity={0.9} />
          <rect x={w * 0.16} y={2.6} width={w * 0.68} height={(bh - 5.2) * 0.25} fill="#fff" opacity={0.08} />
        </g>
      )}
      {eink && (
        <g>
          <rect x={2.2} y={1.8} width={w - 4.4} height={bh - 5} rx={0.4} fill="#cfd4d8" stroke="#9aa0a6" strokeWidth={0.25} />
          <rect x={3} y={2.6} width={w - 6} height={bh - 6.6} fill={screen} />
          <rect x={w / 2 - 4} y={bh - 3.4} width={8} height={2.6} rx={0.3} fill="#22262b" />
        </g>
      )}
      {!charLcd && !oled && !eink && (
        <g>
          <rect x={2} y={1.8} width={w - 4} height={bh - 3.8} rx={0.45} fill="#0d0f12" stroke="#000" strokeWidth={0.25} />
          <rect x={3} y={2.8} width={w - 6} height={bh - 5.8} fill={screen} />
          <rect x={3} y={2.8} width={w - 6} height={(bh - 5.8) * 0.2} fill="#fff" opacity={0.1} />
          <rect x={w - 8} y={bh - 4.6} width={5.4} height={3} rx={0.3} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.16} />
        </g>
      )}
      <Silk x={w / 2} y={bh - 0.7} size={Math.min(1.3, 18 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} r={0.45} />
          <CoreLead x1={p.x} y1={p.y - 0.5} x2={p.x} y2={p.y} w={0.45} />
        </g>
      ))}
    </g>
  );
};

const nixieArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const cx = w / 2;
  const tubeH = h * 0.72;
  return (
    <g>
      {/* glass envelope + getter flash + stacked mesh anode */}
      <rect x={cx - w * 0.32} y={0.6} width={w * 0.64} height={tubeH} rx={w * 0.32} fill="#dfeef7" stroke="#b8c8d8" strokeWidth={0.3} opacity={0.9} />
      <rect x={cx - w * 0.24} y={1.4} width={w * 0.48} height={tubeH - 1.6} rx={w * 0.24} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.5} />
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx={cx} cy={2.4 + i * (tubeH - 3) / 5} rx={w * 0.2} ry={0.5} fill="none" stroke="#9fb4c4" strokeWidth={0.22} opacity={0.7} />
      ))}
      <Silk x={cx} y={tubeH * 0.62} size={w * 0.42} fill="#ff8866">8</Silk>
      <Silk x={cx} y={tubeH * 0.62} size={w * 0.42} fill="#ffb4a0">8</Silk>
      {/* bakelite base + pin circle */}
      <rect x={cx - w * 0.34} y={tubeH + 0.4} width={w * 0.68} height={h - tubeH - 3.6} rx={0.5} fill="#22262b" stroke="#000" strokeWidth={0.2} />
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 3.2} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <Mark x={cx} y={h - 3.6} size={0.8} fill="#5b6470">
        {label}
      </Mark>
    </g>
  );
};

const switchArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const t = d.type;
  const legs = (ys: number) =>
    d.pins.map((p) => <CoreLead key={p.id} x1={p.x} y1={ys} x2={p.x} y2={p.y} w={0.45} />);
  if (/^dip-/.test(t)) {
    const n = d.pins.length / 2;
    const pitch = (w - 3) / Math.max(1, n);
    return (
      <g>
        <rect x={0.6} y={h * 0.24} width={w - 1.2} height={h * 0.44} rx={0.5} fill="#3b4a8c" stroke="#26305c" strokeWidth={0.28} />
        <rect x={0.9} y={h * 0.27} width={w - 1.8} height={0.5} rx={0.25} fill="#fff" opacity={0.18} />
        {Array.from({ length: n }, (_, i) => {
          const sx = 1.6 + i * pitch + pitch / 2;
          const on = i % 2 === 0;
          return (
            <g key={i}>
              <rect x={sx - pitch * 0.32} y={h * 0.29} width={pitch * 0.64} height={h * 0.34} rx={0.25} fill="#0e1226" />
              <rect x={sx - pitch * 0.24} y={on ? h * 0.31 : h * 0.45} width={pitch * 0.48} height={h * 0.18} rx={0.2} fill="#e8eef4" />
              <Mark x={sx} y={h * 0.2} size={0.75} fill="#5b6470">{String(i + 1)}</Mark>
            </g>
          );
        })}
        <Mark x={w / 2} y={h * 0.86} size={0.8} fill="#5b6470">{label}</Mark>
        {legs(h * 0.68)}
      </g>
    );
  }
  if (/^toggle-/.test(t)) {
    return (
      <g>
        <circle cx={w / 2} cy={h * 0.42} r={Math.min(w, h) * 0.24} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
        <circle cx={w / 2} cy={h * 0.42} r={Math.min(w, h) * 0.17} fill="none" stroke="#8f9aa6" strokeWidth={0.3} />
        <g transform={`rotate(-24 ${w / 2} ${h * 0.42})`}>
          <rect x={w / 2 - 0.8} y={h * 0.42 - Math.min(w, h) * 0.62} width={1.6} height={Math.min(w, h) * 0.62} rx={0.8} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.16} />
          <circle cx={w / 2} cy={h * 0.42 - Math.min(w, h) * 0.6} r={1.1} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
        </g>
        <Mark x={w / 2} y={h * 0.82} size={0.8} fill="#5b6470">{label}</Mark>
        {legs(h * 0.66)}
      </g>
    );
  }
  if (/^slide-/.test(t)) {
    return (
      <g>
        <rect x={0.6} y={h * 0.28} width={w - 1.2} height={h * 0.4} rx={0.45} fill="#22262b" stroke="#000" strokeWidth={0.25} />
        <rect x={w * 0.42} y={h * 0.18} width={w * 0.16} height={h * 0.26} rx={0.25} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.15} />
        {Array.from({ length: 3 }, (_, i) => (
          <rect key={i} x={1.4 + i * ((w - 2.8) / 2)} y={h * 0.34} width={0.5} height={h * 0.28} fill="#0d0f12" />
        ))}
        <Mark x={w / 2} y={h * 0.86} size={0.8} fill="#5b6470">{label}</Mark>
        {legs(h * 0.68)}
      </g>
    );
  }
  if (/^push-/.test(t)) {
    return (
      <g>
        <Tact x={w / 2 - 3} y={h / 2 - 3} w={6} h={6} plunger="#0d0f12" frame="#22262b" />
        {legs(h / 2 + 3)}
      </g>
    );
  }
  if (/^microswitch/.test(t)) {
    return (
      <g>
        <rect x={w * 0.12} y={h * 0.3} width={w * 0.76} height={h * 0.42} rx={0.5} fill="#22262b" stroke="#000" strokeWidth={0.25} />
        <circle cx={w * 0.24} cy={h * 0.51} r={0.7} fill={METAL_D} />
        <rect x={w * 0.3} y={h * 0.16} width={w * 0.5} height={0.7} rx={0.35} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.12} />
        <Mark x={w / 2} y={h * 0.56} size={Math.min(0.9, (w * 0.5) / label.length)} fill="#c8cdd3">{label}</Mark>
        {legs(h * 0.72)}
      </g>
    );
  }
  if (/keylock|key-switch/.test(t)) {
    return (
      <g>
        <rect x={w * 0.14} y={h * 0.2} width={w * 0.72} height={h * 0.52} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
        <circle cx={w / 2} cy={h * 0.46} r={Math.min(w, h) * 0.18} fill="#22262b" />
        <rect x={w / 2 - 0.35} y={h * 0.46 - 1.2} width={0.7} height={2.4} rx={0.3} fill="#0d0f12" />
        {legs(h * 0.72)}
      </g>
    );
  }
  if (/tilt/.test(t)) {
    return (
      <g>
        <rect x={w / 2 - 1.6} y={1} width={3.2} height={h * 0.6} rx={1.6} fill="#171a1f" stroke="#000" strokeWidth={0.2} />
        <circle cx={w / 2} cy={h * 0.52} r={0.8} fill={METAL_D} />
        {legs(h * 0.7)}
      </g>
    );
  }
  if (/ec11|rotary-/.test(t)) {
    return (
      <g>
        <rect x={w * 0.16} y={h * 0.34} width={w * 0.68} height={h * 0.44} rx={0.5} fill="#2a2e35" stroke="#000" strokeWidth={0.25} />
        <circle cx={w / 2} cy={h * 0.34} r={Math.min(w, h) * 0.2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
        <rect x={w / 2 - 0.5} y={h * 0.34 - Math.min(w, h) * 0.2} width={1} height={Math.min(w, h) * 0.2} fill={METAL_D} />
        {legs(h * 0.78)}
      </g>
    );
  }
  // fallback: sealed tact / arcade style
  return (
    <g>
      <rect x={0.6} y={h * 0.26} width={w - 1.2} height={h * 0.44} rx={0.6} fill="#1d222a" stroke="#000" strokeWidth={0.3} />
      <circle cx={w / 2} cy={h * 0.48} r={Math.min(w, h) * 0.18} fill="#e8593c" />
      <Mark x={w / 2} y={h * 0.86} size={Math.min(1, 12 / label.length)} fill="#8f9aa6">{label}</Mark>
      {legs(h * 0.7)}
    </g>
  );
};

const mxArt = (color: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {/* switch housing + contacts */}
      <rect x={w / 2 - 7} y={h / 2 - 6.5} width={14} height={13} rx={0.8} fill="#22262b" stroke="#000" strokeWidth={0.3} />
      {[-5.5, 5.5].map((dx) => (
        <rect key={dx} x={w / 2 + dx - 0.6} y={h / 2 + 6.5} width={1.2} height={1.6} fill={METAL_D} />
      ))}
      {/* keycap: sculpted top + cylindrical dish */}
      <rect x={w / 2 - 9} y={h / 2 - 9} width={18} height={18} rx={1.4} fill={color} stroke="#00000055" strokeWidth={0.3} />
      <rect x={w / 2 - 6.4} y={h / 2 - 6.4} width={12.8} height={12.8} rx={1} fill="#ffffff" opacity={0.14} />
      <rect x={w / 2 - 6.4} y={h / 2 - 6.4} width={12.8} height={3} rx={1} fill="#ffffff" opacity={0.12} />
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={p.y < h / 2 ? h / 2 + 6.5 : p.y - 1.6} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

// ---- connectors ---------------------------------------------------------------
const stripArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const female = /dupont-f|ffc-/.test(d.type);
  return (
    <g>
      {female ? (
        <FemaleHeader pts={d.pins.map((p) => ({ x: p.x, y: h * 0.42 }))} pitch={Math.min(2.54, (w - 1) / Math.max(1, d.pins.length))} />
      ) : (
        <g>
          <rect x={0.5} y={h * 0.2} width={w - 1} height={h * 0.44} rx={0.35} fill="#16181d" stroke="#04060a" strokeWidth={0.2} />
          {d.pins.map((p) => (
            <g key={p.id}>
              <rect x={p.x - 0.5} y={h * 0.26} width={1} height={h * 0.32} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.08} />
              <rect x={p.x - 0.16} y={h * 0.26} width={0.32} height={h * 0.32} fill="#fff" opacity={0.35} />
            </g>
          ))}
        </g>
      )}
      <Mark x={w / 2} y={h * 0.86} size={0.8} fill="#5b6470">
        {label}
      </Mark>
      {d.pins.map((p) => (
        <CoreLead key={`l${p.id}`} x1={p.x} y1={h * 0.64} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const plugArt = (kind: "barrel" | "usb" | "xt" | "banana" | "bullet"): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      {kind === "barrel" && (
        <g>
          <rect x={1} y={h * 0.22} width={w - 2} height={h * 0.5} rx={1.4} fill="#22262b" stroke="#000" strokeWidth={0.28} />
          <rect x={1} y={h * 0.26} width={w - 2} height={0.7} rx={0.35} fill="#fff" opacity={0.1} />
          <rect x={0.4} y={h * 0.32} width={3.4} height={h * 0.3} rx={1.2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
          <circle cx={1.6} cy={h * 0.47} r={0.7} fill="#050506" />
          <rect x={w - 3.4} y={h * 0.34} width={2.4} height={h * 0.26} rx={0.4} fill={METAL_D} />
        </g>
      )}
      {kind === "usb" && (
        <g>
          <rect x={1} y={h * 0.14} width={w - 2} height={h * 0.52} rx={0.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
          <rect x={2.2} y={h * 0.26} width={w - 4.4} height={h * 0.28} rx={0.4} fill="#23272e" />
          <rect x={3} y={h * 0.32} width={w - 6} height={h * 0.14} rx={0.3} fill="#e8eef4" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={3.6 + i * ((w - 8) / 3)} y={h * 0.33} width={0.5} height={h * 0.12} fill={GOLD} />
          ))}
        </g>
      )}
      {kind === "xt" && (
        <g>
          <rect x={1} y={h * 0.16} width={w - 2} height={h * 0.56} rx={1.2} fill="#f2b733" stroke="#8a7420" strokeWidth={0.35} />
          <rect x={1.4} y={h * 0.2} width={w - 2.8} height={0.6} rx={0.3} fill="#fff" opacity={0.3} />
          {d.pins.map((p, i) => (
            <g key={p.id}>
              <circle cx={p.x} cy={h * 0.44} r={Math.min(1.6, w * 0.11)} fill={i === 0 ? "#c9a227" : "#8f9aa6"} stroke="#5c6570" strokeWidth={0.2} />
              <circle cx={p.x} cy={h * 0.44} r={Math.min(0.7, w * 0.05)} fill="#3a3f46" />
            </g>
          ))}
        </g>
      )}
      {kind === "banana" && (
        <g>
          <rect x={w / 2 - 3} y={h * 0.2} width={6} height={h * 0.5} rx={0.8} fill={/g$|black/.test(d.type) ? "#22262b" : "#c8342a"} stroke="#00000055" strokeWidth={0.25} />
          <circle cx={w / 2} cy={h * 0.32} r={Math.min(w, h) * 0.16} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
          <circle cx={w / 2} cy={h * 0.32} r={Math.min(w, h) * 0.07} fill="#3a3f46" />
        </g>
      )}
      {kind === "bullet" && (
        <g>
          <rect x={w * 0.24} y={h * 0.16} width={w * 0.52} height={h * 0.56} rx={w * 0.26} fill="#f2b733" stroke="#8a7420" strokeWidth={0.3} />
          <rect x={w * 0.3} y={h * 0.2} width={w * 0.14} height={h * 0.48} rx={w * 0.07} fill="#fff" opacity={0.25} />
        </g>
      )}
      <Mark x={w / 2} y={h * 0.92} size={0.8} fill="#5b6470">{label}</Mark>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h * 0.7} x2={p.x} y2={p.y} w={0.55} />
      ))}
    </g>
  );
};

const jackArt = (kind: "dsub" | "rj" | "xlr"): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      {kind === "dsub" && (
        <g>
          <path d={`M 2 ${h * 0.16} L ${w - 2} ${h * 0.16} L ${w - 3.4} ${h * 0.68} L 3.4 ${h * 0.68} Z`} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.28} />
          <path d={`M 3.6 ${h * 0.24} L ${w - 3.6} ${h * 0.24} L ${w - 4.6} ${h * 0.6} L 4.6 ${h * 0.6} Z`} fill="#23272e" />
          {d.pins.map((p, i) => (
            <circle key={p.id} cx={p.x} cy={p.y < h / 2 ? h * 0.34 : h * 0.5} r={0.5} fill={GOLD} stroke={GOLD_D} strokeWidth={0.1} />
          ))}
          <circle cx={1.6} cy={h * 0.42} r={0.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
          <circle cx={w - 1.6} cy={h * 0.42} r={0.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
        </g>
      )}
      {kind === "rj" && (
        <g>
          <rect x={1} y={h * 0.12} width={w - 2} height={h * 0.58} rx={0.7} fill="#cfd8e3" stroke={METAL_D} strokeWidth={0.28} />
          <rect x={w * 0.2} y={h * 0.26} width={w * 0.6} height={h * 0.3} rx={0.35} fill="#23272e" />
          {d.pins.map((p) => (
            <rect key={p.id} x={p.x - 0.3} y={h * 0.28} width={0.6} height={h * 0.2} fill={GOLD} />
          ))}
          <rect x={w / 2 - 1.6} y={h * 0.56} width={3.2} height={h * 0.14} rx={0.3} fill="#9aa4ae" />
        </g>
      )}
      {kind === "xlr" && (
        <g>
          <circle cx={w / 2} cy={h * 0.4} r={Math.min(w, h) * 0.36} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.35} />
          <circle cx={w / 2} cy={h * 0.4} r={Math.min(w, h) * 0.28} fill="#23272e" />
          {d.pins.map((p, i) => (
            <circle key={p.id} cx={w / 2 + (i - 1) * 2.2} cy={h * 0.4 + (i === 1 ? -1.4 : 1)} r={0.75} fill={GOLD} stroke={GOLD_D} strokeWidth={0.12} />
          ))}
          <rect x={w / 2 - 0.8} y={h * 0.4 + Math.min(w, h) * 0.3} width={1.6} height={1.4} rx={0.3} fill={METAL_D} />
        </g>
      )}
      <Mark x={w / 2} y={h * 0.92} size={0.85} fill="#5b6470">{label}</Mark>
      {d.pins.map((p) => (
        <CoreLead key={`l${p.id}`} x1={p.x} y1={h * 0.74} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

// ---- sensor bricks / breakouts --------------------------------------------------
const tsopArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <path d={`M ${w * 0.2} ${h * 0.7} L ${w * 0.2} ${h * 0.3} Q ${w * 0.2} ${h * 0.14} ${w * 0.36} ${h * 0.14} L ${w * 0.64} ${h * 0.14} Q ${w * 0.8} ${h * 0.14} ${w * 0.8} ${h * 0.3} L ${w * 0.8} ${h * 0.7} Z`} fill="#14161a" stroke="#000" strokeWidth={0.25} />
      <rect x={w * 0.32} y={h * 0.22} width={w * 0.36} height={h * 0.3} rx={0.5} fill="#3a2a4a" />
      <circle cx={w * 0.42} cy={h * 0.3} r={0.5} fill="#6d5a8a" opacity={0.7} />
      <Mark x={w / 2} y={h * 0.66} size={0.7} fill="#8b939c">{label}</Mark>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h * 0.7} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const brkArt = (extra: "none" | "lens" | "twin" | "mic" | "term" = "none", fill = PCB_NAVY): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bw = w - 1;
  const bh = h - 3.4;
  const pinsBottom = d.pins.filter((p) => p.y > h - 2);
  const pinsSide = d.pins.filter((p) => p.y <= h - 2);
  return (
    <g>
      <rect x={0.5} y={0.5} width={bw} height={bh} rx={0.7} fill={fill} stroke="#00000044" strokeWidth={0.3} />
      <rect x={0.85} y={0.85} width={bw - 0.7} height={bh - 0.7} rx={0.5} fill="none" stroke="#fff" strokeOpacity={0.13} strokeWidth={0.25} />
      {bw > 11 && <MountHole x={2} y={2} r={0.8} />}
      {bw > 11 && <MountHole x={bw - 1.5} y={2} r={0.8} />}
      {extra === "lens" && (
        <g>
          <rect x={2.2} y={2.2} width={4.2} height={4.6} rx={0.6} fill="#0d0f12" />
          <circle cx={4.3} cy={4} r={0.9} fill="#6d5a8a" opacity={0.65} />
          <circle cx={4} cy={3.6} r={0.35} fill="#fff" opacity={0.4} />
        </g>
      )}
      {extra === "twin" && (
        <g>
          <circle cx={4} cy={bh / 2 - 0.6} r={1.9} fill="#14161a" stroke="#000" strokeWidth={0.15} />
          <circle cx={3.4} cy={bh / 2 - 1.2} r={0.5} fill="#3a2a4a" opacity={0.8} />
          <circle cx={8.6} cy={bh / 2 - 0.6} r={1.4} fill="#221a2e" />
        </g>
      )}
      {extra === "mic" && (
        <g>
          <circle cx={4} cy={bh / 2 - 0.6} r={1.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
          <circle cx={4} cy={bh / 2 - 0.6} r={0.5} fill="#3a3f46" />
        </g>
      )}
      {extra === "term" && (
        <ScrewTerminal x={2} y={1.6} w={5.4} h={3.6} pins={[{ x: 4.7, y: 3, id: "t" }]} />
      )}
      <Qfn x={extra === "none" ? bw / 2 - 3.1 : 8.4} y={bh / 2 - 2.2} w={6.2} h={4.4} label={label.slice(0, 8).toUpperCase()} pads={6} />
      <SmdPassive x={bw - 3.4} y={bh - 2.4} w={1.7} h={0.95} body="#3a3220" />
      <SmdPassive x={bw - 3.4} y={1.4} w={1.7} h={0.95} />
      <Silk x={bw / 2} y={bh - 0.7} size={Math.min(1.3, 16 / label.length)}>{label}</Silk>
      {pinsSide.map((p) => (
        <Hole key={p.id} x={p.x > w / 2 ? p.x + 0.5 : p.x - 0.5} y={p.y} r={0.45} />
      ))}
      {pinsBottom.length > 0 && <MaleHeader pts={pinsBottom.map((p) => ({ x: p.x, y: p.y - 1.1 }))} />}
      {pinsBottom.map((p) => (
        <CoreLead key={`l${p.id}`} x1={p.x} y1={p.y - 0.3} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const usArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.4;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={bh} rx={0.8} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      {[w * 0.3, w * 0.7].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={bh * 0.42} r={Math.min(w, h) * 0.21} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
          <circle cx={cx} cy={bh * 0.42} r={Math.min(w, h) * 0.16} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
          <circle cx={cx} cy={bh * 0.42} r={Math.min(w, h) * 0.09} fill="#5c6570" />
          <circle cx={cx - 1} cy={bh * 0.42 - 1.2} r={0.7} fill="#fff" opacity={0.35} />
        </g>
      ))}
      <Crystal x={w / 2 - 1.7} y={bh * 0.72} w={3.4} h={1.8} oval={false} />
      <Silk x={w / 2} y={bh - 0.7} size={Math.min(1.3, 14 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} r={0.45} />
          <CoreLead x1={p.x} y1={p.y - 0.5} x2={p.x} y2={p.y} w={0.45} />
        </g>
      ))}
    </g>
  );
};

const brickArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.4;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={bh} rx={1} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.35} />
      <rect x={2.2} y={2.2} width={w - 4.4} height={bh * 0.42} rx={0.5} fill="#22262b" />
      <Mark x={w / 2} y={2.2 + bh * 0.27} size={Math.min(1.4, (w * 0.6) / label.length)} fill="#e8eef4">
        {label}
      </Mark>
      <Mark x={w / 2} y={bh * 0.72} size={Math.min(1, (w * 0.5) / 8)} fill="#5b6470">AC-DC</Mark>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y < h / 2 ? p.y + 0.8 : p.y - 0.8} r={0.5} />
        </g>
      ))}
    </g>
  );
};

const buckModuleArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.4;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={bh} rx={0.7} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={0.85} y={0.85} width={w - 1.7} height={bh - 0.7} rx={0.5} fill="none" stroke="#fff" strokeOpacity={0.13} strokeWidth={0.25} />
      {/* shielded inductor + trim pot + SOIC-8 controller + SS diode */}
      <rect x={2} y={bh / 2 - 3} width={6} height={5.6} rx={0.6} fill="#2b2f36" stroke="#000" strokeWidth={0.25} />
      <rect x={2.6} y={bh / 2 - 2.4} width={4.8} height={0.7} fill="#c87f2f" opacity={0.8} />
      <rect x={2.6} y={bh / 2 - 0.9} width={4.8} height={0.7} fill="#c87f2f" opacity={0.8} />
      <rect x={9.6} y={bh / 2 - 2.2} width={4} height={4} rx={0.5} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.2} />
      <circle cx={11.6} cy={bh / 2 - 0.2} r={1.1} fill="url(#matBrass)" stroke="#8f5f18" strokeWidth={0.15} />
      <path d={`M 10.9 ${bh / 2 - 0.2} L 12.3 ${bh / 2 - 0.2} M 11.6 ${bh / 2 - 0.9} L 11.6 ${bh / 2 + 0.5}`} stroke="#6b4a12" strokeWidth={0.22} />
      <rect x={15} y={bh / 2 - 1.6} width={4.6} height={3.2} rx={0.3} fill="#17181c" stroke="#000" strokeWidth={0.15} />
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i}>
          <rect x={15.5 + i * 1.1} y={bh / 2 - 2.1} width={0.5} height={0.5} fill={METAL_D} />
          <rect x={15.5 + i * 1.1} y={bh / 2 + 1.6} width={0.5} height={0.5} fill={METAL_D} />
        </g>
      ))}
      <SmdPassive x={w - 4} y={1.4} w={2} h={1.1} body="#22262d" />
      <Silk x={w / 2} y={bh - 0.7} size={Math.min(1.4, 18 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y > h - 2 ? p.y - 1 : p.y + 1} r={0.5} />
          <CoreLead x1={p.x} y1={p.y > h - 2 ? p.y - 0.5 : p.y + 0.5} x2={p.x} y2={p.y} w={0.5} />
        </g>
      ))}
    </g>
  );
};

// ---- motors / mechs --------------------------------------------------------------
const motorArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.6;
  return (
    <g>
      {/* brushed-steel can + end bell + shaft + terminal tabs */}
      <rect x={1} y={1} width={w - 2} height={bh} rx={Math.min(2.4, w * 0.16)} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.35} />
      <rect x={1.6} y={1.6} width={w - 3.2} height={bh * 0.2} rx={0.8} fill="#fff" opacity={0.35} />
      <rect x={w - 4.4} y={1} width={3.4} height={bh} rx={1.4} fill="#9aa4ae" stroke="#6f7a86" strokeWidth={0.2} />
      <circle cx={w / 2 - 1} cy={bh / 2 + 1} r={Math.min(1.6, w * 0.08)} fill={METAL_D} stroke="#5c6570" strokeWidth={0.15} />
      <rect x={w / 2 - 1.6} y={-0.6} width={3.2} height={2.4} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
      <Mark x={w / 2 - 1} y={bh * 0.68} size={Math.min(1.3, (w * 0.5) / label.length)} fill="#3a3f46">
        {label}
      </Mark>
      {d.pins.map((p, i) => (
        <g key={p.id}>
          <rect x={p.x - 0.7} y={bh + 0.6} width={1.4} height={1.2} rx={0.2} fill={i === 0 ? "#c8342a" : "#22262b"} />
          <CoreLead x1={p.x} y1={bh + 1.6} x2={p.x} y2={p.y} w={0.55} />
        </g>
      ))}
    </g>
  );
};

const servoArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bh = h - 3.6;
  const blue = /sg9|mg90/.test(d.type);
  const caseC = blue ? "#1c2a67" : "#22262b";
  return (
    <g>
      {/* mounting flanges */}
      <rect x={1.4} y={bh * 0.3} width={w - 2.8} height={2.2} rx={0.6} fill={caseC} stroke="#000" strokeWidth={0.2} />
      <circle cx={2.6} cy={bh * 0.3 + 1.1} r={0.7} fill="#0d0f12" />
      <circle cx={w - 2.6} cy={bh * 0.3 + 1.1} r={0.7} fill="#0d0f12" />
      <rect x={w * 0.24} y={1.4} width={w * 0.52} height={bh - 1.4} rx={1.1} fill={caseC} stroke="#000" strokeWidth={0.3} />
      <rect x={w * 0.24 + 0.4} y={1.8} width={w * 0.52 - 0.8} height={1.1} rx={0.5} fill="#fff" opacity={0.14} />
      {/* output shaft + horn screw */}
      <circle cx={w * 0.36} cy={bh * 0.34} r={Math.min(w, h) * 0.14} fill="#0d0f12" />
      <circle cx={w * 0.36} cy={bh * 0.34} r={Math.min(w, h) * 0.09} fill={METAL_D} />
      <circle cx={w * 0.36} cy={bh * 0.34} r={0.5} fill={METAL_L} />
      {/* sticker label */}
      <rect x={w * 0.28} y={bh * 0.52} width={w * 0.44} height={bh * 0.3} rx={0.4} fill="#e8e6dc" opacity={0.92} />
      <Mark x={w * 0.5} y={bh * 0.52 + bh * 0.19} size={Math.min(1.2, (w * 0.34) / label.length)} fill="#22262b">
        {label}
      </Mark>
      {/* 3-wire harness */}
      {["#6b4a2e", "#c0392b", "#e67e22"].map((c, i) => (
        <path key={c} d={`M ${w * 0.76} ${bh * (0.55 + i * 0.1)} Q ${w * 0.86} ${bh * (0.5 + i * 0.14)} ${d.pins[i] ? d.pins[i].x : w - 2} ${d.pins[i] ? d.pins[i].y - 1 : bh}`} fill="none" stroke={c} strokeWidth={0.75} strokeLinecap="round" />
      ))}
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={p.y - 1} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

const fanArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 2.6) / 2 + 0.8;
  const label = text(d);
  const R = Math.min(w, h - 2.6) * 0.42;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 3.6} rx={1.2} fill="#22262b" stroke="#000" strokeWidth={0.4} />
      {[
        [3.2, 3.2],
        [w - 3.2, 3.2],
        [3.2, h - 6.2],
        [w - 3.2, h - 6.2],
      ].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={1.3} fill="#0d0f12" stroke="#3a3f46" strokeWidth={0.2} />
      ))}
      <circle cx={cx} cy={cy} r={R} fill="#171a1f" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M ${cx + Math.cos(a) * R * 0.28} ${cy + Math.sin(a) * R * 0.28} Q ${cx + Math.cos(a + 0.5) * R * 0.8} ${cy + Math.sin(a + 0.5) * R * 0.8} ${cx + Math.cos(a + 1.05) * R * 0.94} ${cy + Math.sin(a + 1.05) * R * 0.94}`}
            fill="none"
            stroke="#454c58"
            strokeWidth={R * 0.3}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={R * 0.3} fill="#22262b" stroke="#3a3f46" strokeWidth={0.25} />
      <rect x={cx - R * 0.5} y={cy - R * 0.22} width={R} height={R * 0.44} rx={0.4} fill="#e8e6dc" opacity={0.85} />
      <Mark x={cx} y={cy + R * 0.1} size={Math.min(1.1, (R * 0.9) / label.length)} fill="#22262b">
        {label}
      </Mark>
      {/* corner struts */}
      {[45, 135, 225, 315].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <line key={deg} x1={cx + Math.cos(a) * R} y1={cy + Math.sin(a) * R} x2={cx + Math.cos(a) * (R + 2.4)} y2={cy + Math.sin(a) * (R + 2.4)} stroke="#22262b" strokeWidth={1.6} />;
      })}
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.6} x2={p.x} y2={p.y} w={0.55} />
      ))}
    </g>
  );
};

const nemaArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 4} rx={1} fill="#8a929c" stroke="#5f6872" strokeWidth={0.4} />
      <rect x={2.5} y={2.5} width={w - 5} height={h - 7} rx={0.8} fill="#a9b2bc" />
      <circle cx={w / 2} cy={h / 2 - 1.5} r={w * 0.16} fill="#6f7a86" stroke="#5f6872" strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2 - 1.5} r={w * 0.07} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={i % 2 === 0 ? 4.5 : w - 4.5} cy={i < 2 ? 4.5 : h - 7.5} r={1.2} fill="#3a3f46" />
      ))}
      <Silk x={w / 2} y={h - 5} size={Math.max(0.9, Math.min(1.6, 18 / label.length))}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} w={0.55} />
      ))}
    </g>
  );
};

const speakerArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const cx = w / 2;
  const cy = (h - 2.6) / 2 + 0.6;
  const R = Math.min(w, h - 2.6) * 0.44;
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="#22262b" stroke="#000" strokeWidth={0.35} />
      <circle cx={cx} cy={cy} r={R * 0.92} fill="none" stroke="#3a3f46" strokeWidth={R * 0.12} />
      <path d={`M ${cx - R * 0.7} ${cy} A ${R * 0.7} ${R * 0.7} 0 0 1 ${cx + R * 0.7} ${cy} L ${cx + R * 0.34} ${cy + R * 0.1} A ${R * 0.34} ${R * 0.34} 0 0 0 ${cx - R * 0.34} ${cy + R * 0.1} Z`} fill="#454c58" />
      <circle cx={cx} cy={cy} r={R * 0.3} fill="#454c58" stroke="#5c6572" strokeWidth={0.2} />
      <circle cx={cx} cy={cy} r={R * 0.12} fill="#14161a" />
      {[-1, 1].map((s) => (
        <circle key={s} cx={cx + s * R * 0.86} cy={cy} r={0.7} fill={GOLD} stroke={GOLD_D} strokeWidth={0.12} />
      ))}
      <Mark x={cx} y={h - 1.4} size={Math.min(1, 12 / label.length)} fill="#5b6470">
        {label}
      </Mark>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + R * 0.5} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};


// ---- bench components (non-IC additions) ---------------------------------------
const discCapArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <CoreLead x1={w * 0.32} y1={h * 0.62} x2={w * 0.32} y2={h} w={0.45} />
      <CoreLead x1={w * 0.68} y1={h * 0.62} x2={w * 0.68} y2={h} w={0.45} />
      <path d={`M ${w / 2} 0.4 Q ${w - 0.4} 0.6 ${w - 0.6} ${h * 0.36} Q ${w - 0.4} ${h * 0.62} ${w / 2} ${h * 0.66} Q 0.4 ${h * 0.62} 0.6 ${h * 0.36} Q 0.4 0.6 ${w / 2} 0.4 Z`} fill="#d8b26e" stroke="#a9834a" strokeWidth={0.25} />
      <path d={`M ${w * 0.2} 0.9 Q ${w * 0.5} 0.55 ${w * 0.8} 0.9`} fill="none" stroke="#fff" strokeWidth={0.4} opacity={0.35} />
      <Mark x={w / 2} y={h * 0.44} size={Math.min(1.5, (w * 0.7) / label.length)} fill="#5b4322">
        {label}
      </Mark>
    </g>
  );
};

const drumArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 3) / 2 + 0.6;
  const r = Math.min(w, h - 3) * 0.46;
  return (
    <g>
      <CoreLead x1={cx - r * 0.5} y1={cy + r} x2={cx - r * 0.5} y2={h} w={0.5} />
      <CoreLead x1={cx + r * 0.5} y1={cy + r} x2={cx + r * 0.5} y2={h} w={0.5} />
      <circle cx={cx} cy={cy} r={r} fill="#171a1f" stroke="#000" strokeWidth={0.25} />
      <circle cx={cx} cy={cy} r={r * 0.98} fill="none" stroke="#0d0f12" strokeWidth={r * 0.16} />
      {Array.from({ length: 6 }, (_, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * (0.34 + i * 0.11)} fill="none" stroke="#c87f2f" strokeWidth={0.35} opacity={0.85} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.26} fill="#22262b" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.34} r={r * 0.16} fill="#fff" opacity={0.14} />
    </g>
  );
};

const BLADE: Record<string, string> = { "5a": "#d8a13e", "7.5a": "#8a5a2c", "10a": "#c8342a", "15a": "#2b6cb8", "20a": "#e8c33a", "30a": "#3fae6a" };
const bladeFuseArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const code = d.type.replace("fuse-blade-", "");
  const color = BLADE[code] ?? "#c8342a";
  return (
    <g>
      <rect x={2.4} y={h - 3.4} width={3} height={3.4} rx={0.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={w - 5.4} y={h - 3.4} width={3} height={3.4} rx={0.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={1} y={1} width={w - 2} height={h - 4} rx={1.1} fill={color} opacity={0.82} stroke="#00000044" strokeWidth={0.25} />
      <rect x={1.5} y={1.5} width={w - 3} height={1} rx={0.5} fill="#fff" opacity={0.35} />
      <path d={`M 3.9 ${h - 4} L 3.9 ${h * 0.4} Q 3.9 2.6 5.4 2.6 L ${w - 5.4} 2.6 Q ${w - 3.9} 2.6 ${w - 3.9} ${h * 0.4} L ${w - 3.9} ${h - 4}`} fill="none" stroke="#e8eef4" strokeWidth={1.1} opacity={0.8} />
      <Mark x={w / 2} y={h * 0.62} size={1.6} fill="#fff">
        {code.toUpperCase()}
      </Mark>
    </g>
  );
};

const trimmerArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.4} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <rect x={0.6} y={0.6} width={w - 1.2} height={h - 3} rx={0.5} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.28} />
      <rect x={1} y={1} width={w - 2} height={0.8} rx={0.4} fill="#fff" opacity={0.18} />
      <circle cx={w / 2} cy={(h - 2.4) / 2 + 0.6} r={Math.min(w, h) * 0.24} fill="url(#matBrass)" stroke="#8f5f18" strokeWidth={0.2} />
      <path d={`M ${w / 2 - 1.4} ${(h - 2.4) / 2 + 0.6} L ${w / 2 + 1.4} ${(h - 2.4) / 2 + 0.6}`} stroke="#6b4a12" strokeWidth={0.4} />
      <Mark x={w / 2} y={h - 3.2} size={0.8} fill="#dfe6ee">3362</Mark>
    </g>
  );
};

const wwArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={2} y2={h / 2} w={0.7} />
      <CoreLead x1={w - 2} y1={h / 2} x2={w} y2={h / 2} w={0.7} />
      <rect x={2} y={0.8} width={w - 4} height={h - 1.6} rx={0.8} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.3} />
      <rect x={2.6} y={1.4} width={w - 5.2} height={1.2} rx={0.6} fill="#fff" opacity={0.5} />
      <Mark x={w / 2} y={h / 2 + 0.7} size={1.6} fill="#3a3f46">{`${label} 10Ω`}</Mark>
    </g>
  );
};

const thermalFuseArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={2.4} y2={h / 2} w={0.5} />
      <CoreLead x1={w - 2.4} y1={h / 2} x2={w} y2={h / 2} w={0.5} />
      <rect x={2.4} y={0.6} width={w - 4.8} height={h - 1.2} rx={(h - 1.2) / 2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
      <Mark x={w / 2} y={h / 2 + 0.4} size={0.9} fill="#3a3f46">TF 120°C</Mark>
    </g>
  );
};

const perfArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.4} y={0.4} width={w - 0.8} height={h - 0.8} rx={0.8} fill="#d2b48c" stroke="#a98a58" strokeWidth={0.35} />
      <rect x={0.8} y={0.8} width={w - 1.6} height={h - 1.6} rx={0.6} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.3} />
      {d.pins.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={0.85} fill="#c9a227" />
          <circle cx={p.x} cy={p.y} r={0.85} fill="none" stroke="#8a7420" strokeWidth={0.12} />
          <circle cx={p.x} cy={p.y} r={0.42} fill="#39311f" />
        </g>
      ))}
    </g>
  );
};

const photoTrArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h * 0.66} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <path d={`M ${w * 0.1} ${h * 0.7} L ${w * 0.1} ${h * 0.36} A ${w * 0.4} ${w * 0.4} 0 0 1 ${w * 0.9} ${h * 0.36} L ${w * 0.9} ${h * 0.7} Z`} fill="#171a1f" stroke="#000" strokeWidth={0.2} />
      <rect x={w * 0.28} y={h * 0.16} width={w * 0.44} height={h * 0.34} rx={0.4} fill="#7a1f1f" />
      <rect x={w * 0.34} y={h * 0.2} width={w * 0.14} height={h * 0.26} rx={0.3} fill="#fff" opacity={0.35} />
    </g>
  );
};

const photoDiArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.36;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.8} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <circle cx={cx} cy={cy} r={r + 0.3} fill="#0d0f12" />
      <circle cx={cx} cy={cy} r={r} fill="#1d2c4f" stroke="#0b1220" strokeWidth={0.2} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#31456f" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.34} r={r * 0.2} fill="#fff" opacity={0.4} />
    </g>
  );
};

const laserArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 3) / 2 + 1;
  const r = Math.min(w, h - 3) * 0.44;
  return (
    <g>
      <path d={`M ${cx - 1.6} ${cy + r} Q ${cx - 2.4} ${h - 1} ${d.pins[0].x} ${d.pins[0].y}`} fill="none" stroke="#c8342a" strokeWidth={0.7} strokeLinecap="round" />
      <path d={`M ${cx + 1.6} ${cy + r} Q ${cx + 2.4} ${h - 1} ${d.pins[1].x} ${d.pins[1].y}`} fill="none" stroke="#22262b" strokeWidth={0.7} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="#22262b" stroke="#000" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#0d0f12" />
      <circle cx={cx} cy={cy} r={r * 0.3} fill="#5b0d0d" />
      <circle cx={cx} cy={cy} r={r * 0.14} fill="#ff2a2a" />
      <circle cx={cx} cy={cy} r={r * 0.06} fill="#ffd2d2" />
      <circle cx={cx - r * 0.34} cy={cy - r * 0.38} r={r * 0.16} fill="#fff" opacity={0.25} />
    </g>
  );
};

const bulbArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const gy = h * 0.36;
  const r = Math.min(w, h * 0.7) * 0.44;
  return (
    <g>
      <CoreLead x1={d.pins[0].x} y1={h - 2.6} x2={d.pins[0].x} y2={d.pins[0].y} w={0.5} />
      <CoreLead x1={d.pins[1].x} y1={h - 2.6} x2={d.pins[1].x} y2={d.pins[1].y} w={0.5} />
      <circle cx={cx} cy={gy} r={r} fill="#eef6fb" opacity={0.75} stroke="#b8c8d8" strokeWidth={0.3} />
      <path d={`M ${cx - r * 0.4} ${gy + r * 0.5} L ${cx - r * 0.2} ${gy - r * 0.3} L ${cx} ${gy + r * 0.4} L ${cx + r * 0.2} ${gy - r * 0.3} L ${cx + r * 0.4} ${gy + r * 0.5}`} fill="none" stroke="#c9a227" strokeWidth={0.35} />
      <circle cx={cx - r * 0.34} cy={gy - r * 0.4} r={r * 0.2} fill="#fff" opacity={0.6} />
      <rect x={cx - r * 0.5} y={gy + r - 0.4} width={r} height={h - 2.6 - gy - r + 0.6} rx={0.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
      <path d={`M ${cx - r * 0.5} ${gy + r + 0.6} L ${cx + r * 0.5} ${gy + r + 0.6} M ${cx - r * 0.5} ${gy + r + 1.6} L ${cx + r * 0.5} ${gy + r + 1.6}`} stroke="#8f9aa6" strokeWidth={0.3} />
    </g>
  );
};

const neonArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const gy = h * 0.34;
  const r = Math.min(w, h * 0.66) * 0.44;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={gy + r} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <circle cx={cx} cy={gy} r={r} fill="#f6e8e0" opacity={0.8} stroke="#d8b8a8" strokeWidth={0.3} />
      <rect x={cx - r * 0.5} y={gy - r * 0.5} width={r * 0.34} height={r} rx={0.2} fill="#e8593c" opacity={0.85} />
      <rect x={cx + r * 0.16} y={gy - r * 0.5} width={r * 0.34} height={r} rx={0.2} fill="#e8593c" opacity={0.85} />
      <circle cx={cx - r * 0.3} cy={gy - r * 0.44} r={r * 0.16} fill="#fff" opacity={0.6} />
    </g>
  );
};

const micArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 3) / 2 + 0.8;
  const r = Math.min(w, h - 3) * 0.46;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.8} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke="#8f9aa6" strokeWidth={0.25} />
      <circle cx={cx} cy={cy - r * 0.3} r={0.5} fill="#3a3f46" />
      <circle cx={cx} cy={cy} r={0.5} fill="#3a3f46" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.4} r={r * 0.18} fill="#fff" opacity={0.4} />
    </g>
  );
};

const rockerArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const lit = /lit/.test(d.type);
  return (
    <g>
      {d.pins.map((p) => (
        <g key={p.id}>
          <rect x={p.x - 1.4} y={h - 2.2} width={2.8} height={2.2} rx={0.3} fill="url(#matBrass)" stroke="#8f5f18" strokeWidth={0.15} />
        </g>
      ))}
      <rect x={0.6} y={0.6} width={w - 1.2} height={h - 2.6} rx={1.2} fill="#22262b" stroke="#000" strokeWidth={0.35} />
      <rect x={1.6} y={1.6} width={w - 3.2} height={h - 4.6} rx={0.9} fill="#0d0f12" />
      <rect x={2.4} y={2.4} width={w - 4.8} height={h - 6.2} rx={0.7} fill={lit ? "#c8342a" : "#1a1c20"} stroke="#000" strokeWidth={0.2} />
      <path d={`M 2.4 ${h / 2 - 1.4} L ${w - 2.4} ${h / 2 - 1.4}`} stroke="#000" strokeWidth={0.3} opacity={0.6} />
      <rect x={2.4} y={2.4} width={w - 4.8} height={(h - 6.2) * 0.42} rx={0.6} fill="#fff" opacity={lit ? 0.28 : 0.1} />
      <Silk x={w * 0.3} y={h * 0.42} size={2.2} fill="#e8eef4">I</Silk>
      <Silk x={w * 0.7} y={h * 0.44} size={2.2} fill="#e8eef4">O</Silk>
    </g>
  );
};

const floatArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 4} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <rect x={cx - 1.6} y={0.6} width={3.2} height={h - 5} rx={1.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
      <circle cx={cx} cy={h * 0.52} r={w * 0.42} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.35} />
      <circle cx={cx} cy={h * 0.52} r={w * 0.42} fill="none" stroke="#fff" strokeWidth={0.5} opacity={0.4} />
      <rect x={cx - 2.4} y={h - 5.4} width={4.8} height={3} rx={0.6} fill="#22262b" stroke="#000" strokeWidth={0.2} />
    </g>
  );
};

const vibArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h * 0.68} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <rect x={cx - w * 0.4} y={0.6} width={w * 0.8} height={h * 0.66} rx={w * 0.4} fill="#171a1f" stroke="#000" strokeWidth={0.2} />
      <rect x={cx - w * 0.4} y={h * 0.24} width={w * 0.8} height={1} fill={METAL_D} />
      <circle cx={cx - w * 0.14} cy={h * 0.18} r={0.5} fill="#fff" opacity={0.2} />
    </g>
  );
};

const thermoArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 3) / 2 + 0.8;
  const r = Math.min(w * 0.62, h - 3) * 0.5;
  return (
    <g>
      {d.pins.map((p) => (
        <g key={p.id}>
          <rect x={p.x - 1.5} y={cy + r - 0.6} width={3} height={h - 3 - cy - r + 1.4} rx={0.4} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
          <CoreLead x1={p.x} y1={h - 2.6} x2={p.x} y2={p.y} w={0.5} />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={r} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke="#8f9aa6" strokeWidth={0.3} />
      <Mark x={cx} y={cy + 0.5} size={0.9} fill="#3a3f46">95°C</Mark>
    </g>
  );
};

const loadCellArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const wires = ["#c8342a", "#0d0f12", "#3fae6a", "#e8eef4"];
  return (
    <g>
      <rect x={0.6} y={0.6} width={w - 4} height={h - 1.2} rx={1.2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.35} />
      <rect x={1.2} y={1.2} width={w - 5.2} height={1.2} rx={0.6} fill="#fff" opacity={0.4} />
      {[3.4, h - 3.4].map((y) => (
        <g key={y}>
          <circle cx={4} cy={y} r={1.5} fill="#454c55" stroke="#31383f" strokeWidth={0.2} />
          <circle cx={w - 8} cy={y} r={1.5} fill="#454c55" stroke="#31383f" strokeWidth={0.2} />
        </g>
      ))}
      <rect x={w * 0.36} y={h * 0.24} width={w * 0.2} height={h * 0.52} rx={0.6} fill="#8f9aa6" opacity={0.5} />
      {d.pins.map((p, i) => (
        <path key={p.id} d={`M ${w - 3.4} ${p.y} Q ${w - 1.6} ${p.y} ${p.x} ${p.y}`} fill="none" stroke={wires[i] ?? "#888"} strokeWidth={0.8} strokeLinecap="round" />
      ))}
    </g>
  );
};

const cellArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const CELL: Record<string, [string, string]> = { "18650": ["#3f8f4a", "18650"], aa: ["#c9a227", "AA 1.5V"], aaa: ["#c9a227", "AAA 1.5V"], c: ["#22262b", "C 1.5V"], d: ["#22262b", "D 1.5V"], cr123a: ["#2b6cb8", "CR123A 3V"] };
  const kind = d.type.replace("cell-", "");
  const li = kind === "18650";
  const wrap = (CELL[kind] ?? ["#c9a227", kind])[0];
  return (
    <g>
      <rect x={2.4} y={0.6} width={w - 4.8} height={h - 1.2} rx={(h - 1.2) / 2} fill={wrap} stroke="#00000055" strokeWidth={0.3} />
      <rect x={2.4} y={0.6} width={(w - 4.8) * 0.16} height={h - 1.2} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={w - 2.4 - (w - 4.8) * 0.12} y={0.6} width={(w - 4.8) * 0.12} height={h - 1.2} rx={0.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={0.4} y={h / 2 - 1} width={2.2} height={2} rx={0.6} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
      <rect x={3} y={1.2} width={w - 6} height={(h - 2.4) * 0.24} rx={0.6} fill="#fff" opacity={0.22} />
      <Mark x={w / 2} y={h / 2 + 0.8} size={Math.min(2, (w * 0.4) / 6)} fill="#fff">
        {(CELL[kind] ?? ["", kind.toUpperCase()])[1]}
      </Mark>
      <Silk x={1.6} y={h / 2 - 1.6} size={1.6} fill="#5b6470">+</Silk>
    </g>
  );
};

const coinArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 2.6) / 2 + 0.6;
  const r = Math.min(w, h - 2.6) * 0.46;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.7} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke="#8f9aa6" strokeWidth={0.25} />
      <Mark x={cx} y={cy - r * 0.2} size={1.2} fill="#4c5560">CR2032</Mark>
      <Mark x={cx} y={cy + r * 0.42} size={1.4} fill="#4c5560">3V +</Mark>
    </g>
  );
};

const coilArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 3) / 2 + 1;
  const r = Math.min(w, h - 3) * 0.46;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.9} x2={p.x} y2={p.y} w={0.6} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="#f2ead8" stroke="#d8cbb0" strokeWidth={0.4} />
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={cx} cy={cy} r={r * (0.3 + i * 0.1)} fill="none" stroke="#c87f2f" strokeWidth={0.5} opacity={0.9} />
      ))}
      <path d={`M ${cx + r * 0.98} ${cy} L ${cx + r * 0.98} ${cy + 2}`} stroke="#c87f2f" strokeWidth={0.5} />
    </g>
  );
};

const plug35Art: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={p.y} x2={w - 6} y2={p.y} w={0.4} />
      ))}
      <rect x={w - 6.6} y={0.4} width={6} height={h - 0.8} rx={0.8} fill="#22262b" stroke="#000" strokeWidth={0.25} />
      <rect x={2} y={h / 2 - 1.1} width={w - 8} height={2.2} rx={1.1} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
      <rect x={5} y={h / 2 - 1.3} width={0.7} height={2.6} fill="#0d0f12" />
      <rect x={8} y={h / 2 - 1.3} width={0.7} height={2.6} fill="#0d0f12" />
      <circle cx={1.4} cy={h / 2} r={1.1} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
    </g>
  );
};

const usbcPlugArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.2} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <rect x={1} y={0.6} width={w - 2} height={h - 2.8} rx={(h - 2.8) / 2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
      <rect x={1.8} y={1.3} width={w - 3.6} height={h - 4.2} rx={(h - 4.2) / 2} fill="#23272e" />
      <rect x={3} y={h / 2 - 1.5} width={w - 6} height={1.1} rx={0.55} fill="#c9ced6" />
    </g>
  );
};

const dipSocketArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const left = d.pins.filter((p) => p.x < w / 2);
  const y0 = Math.min(...left.map((p) => p.y)) - 1.27;
  const y1 = Math.max(...left.map((p) => p.y)) + 1.27;
  return (
    <g>
      <rect x={0.6} y={y0} width={w - 1.2} height={y1 - y0} rx={0.4} fill="#22262b" stroke="#000" strokeWidth={0.25} />
      {d.pins.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={0.85} fill="#0d0f12" />
          <circle cx={p.x} cy={p.y} r={0.55} fill={GOLD} stroke={GOLD_D} strokeWidth={0.1} />
          <circle cx={p.x} cy={p.y} r={0.28} fill="#101318" />
        </g>
      ))}
    </g>
  );
};

const mainsPlugArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  return (
    <g>
      {d.pins.map((p) => (
        <g key={p.id}>
          <rect x={p.x - 0.9} y={h * 0.52} width={1.8} height={h * 0.34} rx={0.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
          <CoreLead x1={p.x} y1={h * 0.86} x2={p.x} y2={p.y} w={0.5} />
        </g>
      ))}
      <circle cx={cx} cy={h * 0.32} r={w * 0.42} fill="#22262b" stroke="#000" strokeWidth={0.35} />
      <circle cx={cx} cy={h * 0.32} r={w * 0.3} fill="#171a1f" />
      <circle cx={cx - w * 0.14} cy={h * 0.2} r={w * 0.08} fill="#fff" opacity={0.12} />
    </g>
  );
};

const whipArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 6} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <rect x={cx - 3} y={h - 9} width={6} height={5} rx={0.8} fill="#22262b" stroke="#000" strokeWidth={0.3} />
      <rect x={cx - 1.9} y={h * 0.34} width={3.8} height={h - 9 - h * 0.34} rx={1.6} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
      <rect x={cx - 1.4} y={h * 0.16} width={2.8} height={h * 0.2} rx={1.2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.18} />
      <rect x={cx - 0.9} y={0.6} width={1.8} height={h * 0.17} rx={0.9} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.16} />
      <circle cx={cx} cy={0.9} r={1} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
    </g>
  );
};


const solarPanelArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cols = Math.max(2, Math.round((w - 2) / 9));
  const rows = Math.max(2, Math.round((h - 2) / 9));
  const cw = (w - 2.4) / cols;
  const ch = (h - 2.4) / rows;
  return (
    <g>
      <rect x={0.4} y={0.4} width={w - 0.8} height={h - 0.8} rx={0.7} fill="#c9ced6" stroke="#8f9aa6" strokeWidth={0.3} />
      <rect x={1.2} y={1.2} width={w - 2.4} height={h - 2.4} rx={0.4} fill="#16375f" stroke="#0d2440" strokeWidth={0.25} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <g key={`${r}-${c}`}>
            <rect x={1.35 + c * cw} y={1.35 + r * ch} width={cw - 0.3} height={ch - 0.3} rx={0.25} fill="#1d4373" stroke="#0d2440" strokeWidth={0.18} />
            <line x1={1.35 + c * cw + (cw - 0.3) / 3} y1={1.5 + r * ch} x2={1.35 + c * cw + (cw - 0.3) / 3} y2={1.2 + r * ch + ch} stroke="#8fa8c4" strokeWidth={0.22} opacity={0.7} />
            <line x1={1.35 + c * cw + (2 * (cw - 0.3)) / 3} y1={1.5 + r * ch} x2={1.35 + c * cw + (2 * (cw - 0.3)) / 3} y2={1.2 + r * ch + ch} stroke="#8fa8c4" strokeWidth={0.22} opacity={0.7} />
          </g>
        )),
      )}
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 1} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

const lipoPackArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cells = d.type.replace(/[^0-9]/g, "") || "1";
  return (
    <g>
      {d.pins.map((p, i) => (
        <path key={p.id} d={`M ${p.x} ${h - 2.2} Q ${p.x + (i === 0 ? -1 : 1) * 0.8} ${h - 1.2} ${p.x} ${p.y}`} fill="none" stroke={i === 0 ? "#c8342a" : "#0d0f12"} strokeWidth={0.7} strokeLinecap="round" />
      ))}
      <rect x={0.8} y={0.8} width={w - 1.6} height={h - 3} rx={1.1} fill="#2b6cb8" stroke="#1d4e86" strokeWidth={0.35} />
      <rect x={1.4} y={1.4} width={w - 2.8} height={(h - 4.2) * 0.22} rx={0.6} fill="#fff" opacity={0.22} />
      <rect x={w * 0.2} y={h * 0.3} width={w * 0.6} height={h * 0.34} rx={0.5} fill="#e8eef4" />
      <Mark x={w / 2} y={h * 0.44} size={Math.min(1.6, (w * 0.5) / 5)} fill="#22262b">{`LiPo ${cells}S`}</Mark>
      <Mark x={w / 2} y={h * 0.58} size={Math.min(1, (w * 0.5) / 8)} fill="#5b6470">{`${(Number(cells) * 3.7).toFixed(1)}V`}</Mark>
    </g>
  );
};

const piezoArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 2.6) / 2 + 0.6;
  const r = Math.min(w, h - 2.6) * 0.46;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.7} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="#c9a227" stroke="#8a7420" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#e8e6dc" stroke="#b9b5a2" strokeWidth={0.2} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.34} r={r * 0.16} fill="#fff" opacity={0.5} />
    </g>
  );
};


// ---- 1500-catalog expansion: bench passives & connectivity ---------------------
const BAND = ["#17181c", "#7a4a12", "#c8342a", "#e8862c", "#e8c33a", "#3fae6a", "#2b6cb8", "#8b5cf6", "#9aa2ab", "#e8eef4"];
const resBandArt: ArtFn = (d) => {
  const ohms = Number(d.defaultProps.resistance_ohms ?? 1000);
  const exp = Math.floor(Math.log10(ohms));
  const two = Math.round(ohms / Math.pow(10, exp - 1));
  const mult = exp - 1;
  const { w, h } = d.size_mm;
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={1.4} y2={h / 2} w={0.55} />
      <CoreLead x1={w - 1.4} y1={h / 2} x2={w} y2={h / 2} w={0.55} />
      <rect x={1.4} y={0.3} width={w - 2.8} height={h - 0.6} rx={(h - 0.6) / 2} fill="#d8b26e" stroke="#a9834a" strokeWidth={0.2} />
      <rect x={1.8} y={0.5} width={w - 3.6} height={0.5} rx={0.25} fill="#fff" opacity={0.35} />
      {[0.3, 0.42, 0.54].map((f, i) => (
        <rect key={i} x={w * f} y={0.3} width={0.55} height={h - 0.6} fill={i === 0 ? BAND[Math.floor(two / 10)] : i === 1 ? BAND[two % 10] : mult < 0 ? "#d8c27a" : BAND[mult]} />
      ))}
      <rect x={w * 0.72} y={0.3} width={0.55} height={h - 0.6} fill={GOLD} />
    </g>
  );
};

const smdResArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return <SmdPassive x={0} y={0} w={w} h={h} code={(d.type.split("-").pop() ?? "").toUpperCase()} />;
};

const smdCapArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return <SmdPassive x={0} y={0} w={w} h={h} body="#c8a06a" term={METAL_D} />;
};

const elecRadArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const bh = h - 3;
  const sleeve = h >= 16 ? "#1d4e89" : "#17181c";
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={bh - 0.4} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <rect x={0.3} y={0.5} width={w - 0.6} height={bh} rx={0.9} fill={sleeve} stroke="#000" strokeWidth={0.25} />
      <rect x={0.7} y={0.9} width={1.3} height={bh - 0.8} rx={0.5} fill="#e8eef4" opacity={0.85} />
      <line x1={0.3} y1={2.2} x2={w - 0.3} y2={2.2} stroke="#000" strokeWidth={0.25} opacity={0.5} />
      <rect x={1.2} y={0.8} width={w - 2.4} height={bh * 0.16} rx={0.5} fill="#fff" opacity={0.18} />
      <Mark x={w / 2 + 0.6} y={bh * 0.55} size={Math.min(1.5, (w * 0.7) / text(d).length)} fill="#e8eef4">
        {text(d)}
      </Mark>
    </g>
  );
};

const filmBoxArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.2} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 2.6} rx={0.9} fill="#e8c33a" stroke="#b99a20" strokeWidth={0.25} />
      <rect x={1} y={1} width={w - 2} height={1} rx={0.5} fill="#fff" opacity={0.35} />
      <Mark x={w / 2} y={(h - 2.6) / 2 + 1} size={1.3} fill="#5b4322">
        {text(d)}
      </Mark>
    </g>
  );
};

const crystalHzArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 1.4} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <Crystal x={0.5} y={0.4} w={w - 1} h={h - 1.8} label={text(d)} />
    </g>
  );
};

const crystalCylArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2} x2={p.x} y2={p.y} w={0.35} />
      ))}
      <rect x={0.15} y={0.3} width={w - 0.3} height={h - 2.2} rx={(w - 0.3) / 2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
    </g>
  );
};

const oscSmdArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <rect key={p.id} x={p.x - 0.5} y={p.y - 0.35} width={1} height={0.7} rx={0.2} fill={METAL_D} />
      ))}
      <rect x={0.5} y={0.3} width={w - 1} height={h - 0.6} rx={0.35} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <Mark x={w / 2} y={h / 2 + 0.3} size={0.7} fill="#3a3f46">
        {text(d)}
      </Mark>
    </g>
  );
};

const radIndArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const bh = h - 2.4;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={bh - 0.3} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <rect x={0.5} y={0.4} width={w - 1} height={bh} rx={0.8} fill="#2f7d32" stroke="#1d5a20" strokeWidth={0.25} />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={0.7} y1={1.2 + i * (bh - 1.6) / 4} x2={w - 0.7} y2={1.2 + i * (bh - 1.6) / 4} stroke="#1d5a20" strokeWidth={0.35} opacity={0.8} />
      ))}
      <rect x={1} y={0.7} width={w - 2} height={0.8} rx={0.4} fill="#fff" opacity={0.2} />
    </g>
  );
};

const movArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const r = Math.min(w * 0.46, (h - 2.4) * 0.5);
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.2} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <circle cx={cx} cy={(h - 2.4) / 2 + 0.5} r={r} fill="#2b6cb8" stroke="#1d4e86" strokeWidth={0.3} />
      <Mark x={cx} y={(h - 2.4) / 2 + 1} size={Math.min(1.2, (r * 1.4) / 6)} fill="#e8eef4">
        {text(d)}
      </Mark>
    </g>
  );
};

const ntcDiscArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h * 0.42} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <circle cx={w / 2} cy={h * 0.3} r={Math.min(w, h) * 0.26} fill="#17181c" stroke="#000" strokeWidth={0.2} />
      <circle cx={w / 2 - 0.4} cy={h * 0.24} r={0.4} fill="#fff" opacity={0.25} />
    </g>
  );
};

const inrushArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const r = Math.min(w * 0.42, (h - 2.6) * 0.5);
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.4} x2={p.x} y2={p.y} w={0.6} />
      ))}
      <circle cx={cx} cy={(h - 2.6) / 2 + 0.6} r={r} fill="#17181c" stroke="#000" strokeWidth={0.3} />
      <Mark x={cx} y={(h - 2.6) / 2 + 1.1} size={Math.min(1.4, (r * 1.5) / 5)} fill="#9aa2ab">
        {text(d)}
      </Mark>
    </g>
  );
};

const glassFuseArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={2.2} y2={h / 2} w={0.55} />
      <CoreLead x1={w - 2.2} y1={h / 2} x2={w} y2={h / 2} w={0.55} />
      <rect x={2} y={0.5} width={2.4} height={h - 1} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={w - 4.4} y={0.5} width={2.4} height={h - 1} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.15} />
      <rect x={4.2} y={0.8} width={w - 8.4} height={h - 1.6} rx={(h - 1.6) / 2} fill="#eef6fb" opacity={0.65} stroke="#b8c8d8" strokeWidth={0.2} />
      <line x1={4.4} y1={h / 2} x2={w - 4.4} y2={h / 2} stroke="#c9a227" strokeWidth={0.35} />
    </g>
  );
};

const fuseHolderArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const panel = /panel/.test(d.type);
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.4} x2={p.x} y2={p.y} w={0.55} />
      ))}
      <rect x={0.6} y={0.6} width={w - 1.2} height={h - 3} rx={0.8} fill="#17181c" stroke="#000" strokeWidth={0.3} />
      {panel ? (
        <g>
          <circle cx={w / 2} cy={(h - 2.4) / 2 + 0.6} r={Math.min(w, h - 2.4) * 0.3} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
          <rect x={w / 2 - 1.6} y={(h - 2.4) / 2 + 0.2} width={3.2} height={0.8} rx={0.4} fill="#3a3f46" />
        </g>
      ) : (
        <rect x={w * 0.2} y={1.4} width={w * 0.6} height={h - 4.6} rx={0.6} fill="#23272e" />
      )}
    </g>
  );
};

const relayBareArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.4} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <rect x={0.6} y={0.6} width={w - 1.2} height={h - 3} rx={0.8} fill="#2b6cb8" stroke="#1d4e86" strokeWidth={0.35} />
      <rect x={1.4} y={1.4} width={w - 2.8} height={(h - 4.6) * 0.3} rx={0.5} fill="#fff" opacity={0.25} />
      <Mark x={w / 2} y={h * 0.42} size={1.3} fill="#e8eef4">{`SRD-${text(d)}`}</Mark>
      <Mark x={w / 2} y={h * 0.62} size={0.9} fill="#cfe0f2">SONGLE</Mark>
    </g>
  );
};

const potArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 4) / 2 + 0.6;
  const r = Math.min(w, h - 4) * 0.46;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.8} x2={p.x} y2={p.y} w={0.55} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.35} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke="#8f9aa6" strokeWidth={0.3} strokeDasharray="1 0.8" />
      <circle cx={cx} cy={cy} r={r * 0.42} fill="#3a3f46" />
      <circle cx={cx} cy={cy} r={r * 0.3} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
      <rect x={cx - 0.5} y={cy - r * 0.3} width={1} height={r * 0.24} rx={0.3} fill="#3a3f46" />
      <Mark x={cx} y={cy + r * 0.66} size={0.9} fill="#3a3f46">
        {text(d)}
      </Mark>
    </g>
  );
};

const idcArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.8} width={w - 1} height={h - 1.6} rx={0.5} fill="#22262b" stroke="#000" strokeWidth={0.3} />
      <rect x={w / 2 - 1} y={0.8} width={2} height={1.2} rx={0.3} fill="#0d0f12" />
      {d.pins.map((p) => (
        <rect key={p.id} x={p.x - 0.5} y={p.y - 0.5} width={1} height={1} rx={0.2} fill={GOLD} stroke={GOLD_D} strokeWidth={0.1} />
      ))}
    </g>
  );
};

const jumperArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const kind = d.type.split("-")[1] ?? "mm";
  const coil = "#e8862c";
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx={w / 2 + (i - 2.5) * 2.6} cy={h * 0.45} rx={2.2} ry={h * 0.28} fill="none" stroke={coil} strokeWidth={0.9} />
      ))}
      <rect x={1} y={h - 5} width={3} height={4} rx={0.4} fill={kind === "ff" || kind === "mf" ? "#17181c" : METAL_D} stroke="#000" strokeWidth={0.2} />
      <rect x={w - 4} y={h - 5} width={3} height={4} rx={0.4} fill={kind === "mm" || kind === "mf" ? "#17181c" : METAL_D} stroke="#000" strokeWidth={0.2} />
      <CoreLead x1={2.5} y1={h - 1} x2={d.pins[0].x} y2={d.pins[0].y} w={0.5} />
      <CoreLead x1={w - 2.5} y1={h - 1} x2={d.pins[1].x} y2={d.pins[1].y} w={0.5} />
    </g>
  );
};

const resNetArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={h - 2.2} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 2.6} rx={0.5} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.25} />
      <Mark x={w / 2} y={(h - 2.6) / 2 + 1} size={1.1} fill="#e8eef4">{`A${d.pins.length - 1}02`}</Mark>
    </g>
  );
};

const tactArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return <Tact x={0.8} y={0.8} w={w - 1.6} h={h - 1.6} />;
};

const bicolorArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const r = Math.min(w, h - 2.4) * 0.42;
  const cy = (h - 2.4) / 2 + 0.6;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.8} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`} fill="#c8342a" />
      <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`} fill="#3fae6a" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00000033" strokeWidth={0.2} />
      <circle cx={cx - r * 0.34} cy={cy - r * 0.38} r={r * 0.18} fill="#fff" opacity={0.5} />
    </g>
  );
};

const SEG_COLORS: Record<string, string> = { green: "#3fae6a", blue: "#3a7bff", white: "#e8eef4", amber: "#e8862c", red: "#e8342a" };
const sevenSegArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const color = SEG_COLORS[d.type.split("-")[2] ?? "red"] ?? "#e8342a";
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={p.y === 0 ? 1.6 : h - 1.6} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <rect x={0.5} y={1.4} width={w - 1} height={h - 2.8} rx={0.6} fill="#17181c" stroke="#000" strokeWidth={0.3} />
      <rect x={1.6} y={2.6} width={w - 3.2} height={h - 5.2} rx={0.4} fill="#0d0f12" />
      <Mark x={w / 2} y={h / 2 + 2.4} size={h * 0.42} fill={color}>8.</Mark>
    </g>
  );
};

const headerFamilyArt: ArtFn = (d) => <MaleHeader pts={d.pins} />;
const femaleFamilyArt: ArtFn = (d) => <FemaleHeader pts={d.pins} />;

const ldrArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const r = Math.min(w, h - 2.4) * 0.42;
  const cy = (h - 2.4) / 2 + 0.5;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.8} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="#d8863c" stroke="#a9642a" strokeWidth={0.25} />
      <path d={`M ${cx - r * 0.5} ${cy - r * 0.4} L ${cx + r * 0.5} ${cy - r * 0.4} L ${cx - r * 0.5} ${cy} L ${cx + r * 0.5} ${cy} L ${cx - r * 0.5} ${cy + r * 0.4} L ${cx + r * 0.5} ${cy + r * 0.4}`} fill="none" stroke={GOLD} strokeWidth={0.45} />
    </g>
  );
};

const tempProbeArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <path d={`M ${w * 0.55} ${h / 2} Q ${w * 0.75} ${h / 2 - 2} ${w * 0.9} ${h / 2}`} fill="none" stroke="#c8342a" strokeWidth={0.9} strokeLinecap="round" />
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x - 1} y1={h / 2} x2={p.x} y2={p.y} w={0.4} />
      ))}
      <rect x={1} y={h / 2 - 2} width={w * 0.42} height={4} rx={2} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.25} />
      <rect x={w * 0.43} y={h / 2 - 1.2} width={w * 0.14} height={2.4} rx={1} fill="#22262b" />
    </g>
  );
};

const bananaPlugArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const color = /red/.test(d.type) ? "#c8342a" : "#17181c";
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={2} y2={h / 2} w={0.5} />
      <rect x={2} y={0.6} width={w * 0.5} height={h - 1.2} rx={0.7} fill={color} stroke="#00000055" strokeWidth={0.25} />
      <rect x={2 + w * 0.5} y={h / 2 - 1.1} width={w * 0.28} height={2.2} rx={0.5} fill={GOLD} stroke={GOLD_D} strokeWidth={0.15} />
      <circle cx={w - 1.4} cy={h / 2} r={1.3} fill={GOLD} stroke={GOLD_D} strokeWidth={0.2} />
      <circle cx={w - 1.4} cy={h / 2} r={0.5} fill="#39311f" />
    </g>
  );
};

const alligatorArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={3} y2={h / 2} w={0.55} />
      <rect x={3} y={0.7} width={w * 0.42} height={h - 1.4} rx={1} fill="#c8342a" stroke="#00000055" strokeWidth={0.25} />
      <path d={`M ${3 + w * 0.42} ${h / 2 - 1.6} L ${w - 4} ${h / 2 - 1.6} L ${w - 6} ${h / 2 - 0.6} L ${w - 4} ${h / 2 - 0.6} L ${w - 6} ${h / 2 + 0.4} L ${w - 3} ${h / 2 + 0.4} L ${w - 5} ${h / 2 + 1.4} L ${3 + w * 0.42} ${h / 2 + 1.6} Z`} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.2} />
    </g>
  );
};

const testHookArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <CoreLead x1={0} y1={h / 2} x2={2.4} y2={h / 2} w={0.45} />
      <rect x={2.4} y={0.8} width={w * 0.45} height={h - 1.6} rx={0.8} fill="#17181c" stroke="#000" strokeWidth={0.2} />
      <path d={`M ${2.4 + w * 0.45} ${h / 2} Q ${w - 3} ${h / 2 - 2.4} ${w - 1.6} ${h / 2 - 0.6} Q ${w - 1} ${h / 2 + 0.4} ${w - 2.4} ${h / 2 + 0.6}`} fill="none" stroke={METAL} strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
};

const din5Art: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.36;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.9} x2={p.x} y2={p.y} w={0.45} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="#17181c" />
      {[[-0.5, -0.2], [0, -0.45], [0.5, -0.2], [-0.35, 0.3], [0.35, 0.3]].map(([fx, fy], i) => (
        <circle key={i} cx={cx + fx * r} cy={cy + fy * r} r={0.7} fill={GOLD} stroke={GOLD_D} strokeWidth={0.1} />
      ))}
      <rect x={cx - 0.5} y={cy + r * 0.55} width={1} height={r * 0.3} rx={0.3} fill="#3a3f46" />
    </g>
  );
};

const speakonArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 3) / 2 + 0.6;
  const r = Math.min(w, h - 3) * 0.44;
  return (
    <g>
      {d.pins.map((p) => (
        <CoreLead key={p.id} x1={p.x} y1={cy + r * 0.8} x2={p.x} y2={p.y} w={0.6} />
      ))}
      <rect x={cx - r - 1.4} y={cy - 1.4} width={1.6} height={2.8} rx={0.4} fill="#22262b" />
      <rect x={cx + r - 0.2} y={cy - 1.4} width={1.6} height={2.8} rx={0.4} fill="#22262b" />
      <circle cx={cx} cy={cy} r={r} fill="#22262b" stroke="#000" strokeWidth={0.35} />
      <circle cx={cx} cy={cy} r={r * 0.6} fill="#0d0f12" />
      <rect x={cx - r * 0.5} y={cy - 0.7} width={r} height={1.4} rx={0.5} fill={METAL_D} />
    </g>
  );
};

// ---- pattern resolver ------------------------------------------------------------
const DIP_IC = /^(24c|m25|25aa|27c|6\d{3}|4n\d|pc817|tlp|moc|uln|mc14|mc3|ir21|tc44|lm[0-9]|tlc|se5|opa|ne5|lt1|ad6|ina1|ad8|ca3|ua7|tl0|tl4|icl|sg3|uc3|pt2|xr2|dac|lf3|max\d|tda\d|da[cs]\d)[\w-]*$/;

const byPrefixArt = (type: string): ArtFn | null => {
  const t = type.toLowerCase();
  if (/^cap-ceramic/.test(t)) return discCapArt;
  if (/^inductor-drum/.test(t)) return drumArt;
  if (/^fuse-blade/.test(t)) return bladeFuseArt;
  if (/^trimmer-3362/.test(t)) return trimmerArt;
  if (/^resistor-wirewound/.test(t)) return wwArt;
  if (/^thermal-fuse/.test(t)) return thermalFuseArt;
  if (/^perfboard-/.test(t)) return perfArt;
  if (/^phototransistor-/.test(t)) return photoTrArt;
  if (/^photodiode-/.test(t)) return photoDiArt;
  if (/^laser-/.test(t)) return laserArt;
  if (/^bulb-/.test(t)) return bulbArt;
  if (/^neon-/.test(t)) return neonArt;
  if (/^mic-electret/.test(t)) return micArt;
  if (/^rocker-/.test(t)) return rockerArt;
  if (/^float-switch/.test(t)) return floatArt;
  if (/^vibration-switch/.test(t)) return vibArt;
  if (/^thermostat-/.test(t)) return thermoArt;
  if (/^load-cell/.test(t)) return loadCellArt;
  if (/^cell-(18650|aa|aaa|c|d|cr123a)/.test(t)) return cellArt;
  if (/^cell-cr2032/.test(t)) return coinArt;
  if (/^wcharge-coil/.test(t)) return coilArt;
  if (/^plug-35mm/.test(t)) return plug35Art;
  if (/^usb-c-plug/.test(t)) return usbcPlugArt;
  if (/^dip-socket/.test(t)) return dipSocketArt;
  if (/^mains-plug/.test(t)) return mainsPlugArt;
  if (/^resistor-/.test(t)) return resBandArt;
  if (/^smd-res/.test(t)) return smdResArt;
  if (/^smd-cap/.test(t)) return smdCapArt;
  if (/^cap-rad/.test(t)) return elecRadArt;
  if (/^cap-film/.test(t)) return filmBoxArt;
  if (/^crystal-cyl/.test(t)) return crystalCylArt;
  if (/^crystal-32k/.test(t)) return crystalCylArt;
  if (/^crystal-/.test(t)) return crystalHzArt;
  if (/^osc-/.test(t)) return oscSmdArt;
  if (/^inductor-/.test(t)) return radIndArt;
  if (/^mov-/.test(t)) return movArt;
  if (/^thermistor-/.test(t)) return ntcDiscArt;
  if (/^inrush-/.test(t)) return inrushArt;
  if (/^fuse-glass/.test(t)) return glassFuseArt;
  if (/^fuse-holder/.test(t)) return fuseHolderArt;
  if (/^relay-bare/.test(t)) return relayBareArt;
  if (/^pot-/.test(t)) return potArt;
  if (/^idc-/.test(t)) return idcArt;
  if (/^jumper-/.test(t)) return jumperArt;
  if (/^res-net-/.test(t)) return resNetArt;
  if (/^tact-/.test(t)) return tactArt;
  if (/^led-bicolor/.test(t)) return bicolorArt;
  if (/^seven-seg-/.test(t)) return sevenSegArt;
  if (/^header-/.test(t)) return headerFamilyArt;
  if (/^female-/.test(t)) return femaleFamilyArt;
  if (/^ldr-/.test(t)) return ldrArt;
  if (/^temp-probe/.test(t)) return tempProbeArt;
  if (/^banana-plug/.test(t)) return bananaPlugArt;
  if (/^alligator/.test(t)) return alligatorArt;
  if (/^test-hook/.test(t)) return testHookArt;
  if (/^micro-usb/.test(t)) return plugArt("usb");
  if (/^din5/.test(t)) return din5Art;
  if (/^speakon/.test(t)) return speakonArt;
  if (/^antenna-whip/.test(t)) return whipArt;
  if (/^(78l|78m|l78|l79|ams1117|ld1117|lm2596s|lm317|lm338|lm2576)/.test(t)) return to220Art;
  if (/^74([a-z]*\d{2,3}|\d{2,3})$/.test(t) || /^(?:cd|hef|tc|hcf|bu|mc1?)4[05]\d\d$/.test(t) || (DIP_IC.test(t) && !t.endsWith("-module"))) return dipArt;
  if (/^(tip|irf|irl|2n3055)/.test(t)) return to220Art;
  if (/^(2n|bc|bd1|bs1|ztx|mje|hall-|tmp3|mcp9|a314)/.test(t)) return to92Art;
  if (/^zener-/.test(t)) return zenerArt;
  if (/^1n\d/.test(t) || /^bat\d/.test(t) || /^(uf4|her2|sb5)/.test(t)) return doArt("#d8c27a", /^bat/.test(t) ? "#22262d" : "#c8442c");
  if (/^led-/.test(t)) {
    const m = /^led-(?:\d+mm|blink)-(\w+)/.exec(t);
    return ledArt(m ? m[1] : t.includes("rgb") ? "rgb" : "red");
  }
  if (/^screw-term/.test(t)) return screwArt;
  if (/^jst-ec/.test(t)) return plugArt("bullet");
  if (/^(dupont-|jst-(ph|xh)|ffc-)/.test(t)) return stripArt;
  if (/^(banana|rca-)/.test(t)) return plugArt("banana");
  if (/^dc-plug-/.test(t)) return plugArt("barrel");
  if (/^usb-/.test(t)) return plugArt("usb");
  if (/^(xt3|xt6|xt9)/.test(t)) return plugArt("xt");
  if (/^(de9|db25)/.test(t)) return jackArt("dsub");
  if (/^rj(1|4)/.test(t)) return jackArt("rj");
  if (/^xlr-/.test(t)) return jackArt("xlr");
  if (/^solar-/.test(t)) return solarPanelArt;
  if (/^lipo-/.test(t)) return lipoPackArt;
  if (/^(aa-holder|aaa-holder|18650-holder|coin-|v9-clip)/.test(t)) return holderArt;
  if (/^(relay-hk|relay-jqc|reed-relay|relay-4ch|ssr-)/.test(t)) return relayArt;
  if (/^mx-/.test(t)) return mxArt(t === "mx-red" ? "#e8593c" : t === "mx-blue" ? "#3a7bff" : t === "mx-brown" ? "#8a5a2c" : t === "mx-silver" ? "#c0c8d0" : "#2b2f36");
  if (/^(dip-|toggle-|slide-|microswitch|keylock|tilt-mercury|ec11|push-|arcade|key-switch|rotary-)/.test(t)) return switchArt;
  if (/^(nixie-|iv1-|iv2-|iv-3|iv3-|in-1|mm5)/.test(t)) return nixieArt;
  if (/^(lcd-|oled-|sh110|st77|ili9|eink-|nokia|7seg-|dot-matrix|tm1637|max7219|led-bar|ws2812|neopixel)/.test(t)) {
    return screenArt(/oled|sh110/.test(t) ? "#1c2a67" : /eink/.test(t) ? "#e8e8e0" : /lcd|nokia/.test(t) ? "#9ac279" : /st77|ili/.test(t) ? "#5b7cff33" : "#14161a");
  }
  if (/^hlk-pm/.test(t)) return brickArt;
  if (/^(lm2596-module|xl6009-module|mp1584-module)/.test(t)) return buckModuleArt;
  if (/^(vs1838|tsop)/.test(t)) return tsopArt;
  if (/^(us-100|srf05)/.test(t)) return usArt;
  if (/^gp2y0a02/.test(t)) return brkArt("twin", PCB_BLUE);
  if (/^sound-detector/.test(t)) return brkArt("mic", PCB_GREEN);
  if (/^(turbidity|anemometer|pzem-)/.test(t)) return brkArt("term", PCB_GREEN);
  if (/^(ina2|acs712)/.test(t)) return brkArt("term", PCB_NAVY);
  if (/^(tcs3|vcnl)/.test(t)) return brkArt("lens", PCB_GREEN);
  if (/^(sht|bmp|bmi|bmm|lis|lsm|icm|veml|tsl|opt|isl|lm75)/.test(t)) return brkArt("none", PCB_GREEN);
  if (/^(nrf|rfm|sx12|e32|rf433|jdy|at-09|sim8|sim9|a6-|a7$|neo-|atgm|l80|bn-|esp32-|esp-0|hc-0|hc-1|hm-1|wemos|nodemcu|antenna-|rc5|pn5|rdm|myoware|geiger|pms5|mh-z|mx15|tb6|drv8|a498|tmc|l298|vnh2|pca9|dfplayer|pam|max98|tea57|cp21|ch34|ft23|mt36|level-shifter|servo-tester|mcp25|rs485|ne555-module|d1-mini)/.test(t)) {
    return moduleArt(/antenna/.test(t) ? "#3a3f46" : PCB_NAVY);
  }
  if (/^(tt-|n20|n10|n30|310|550|37gb|520|540|775|worm|water-pump|linear|solenoid|electromagnet|heating)/.test(t)) return motorArt;
  if (/^(servo-|mg9|ds32)/.test(t)) return servoArt;
  if (/^fan-/.test(t)) return fanArt;
  if (/^(nema|bldc)/.test(t)) return nemaArt;
  if (/^piezo-/.test(t)) return piezoArt;
  if (/^(spk-|horn-)/.test(t)) return speakerArt;
  return null;
};

const EXACT: Record<string, ArtFn> = {};

export function resolveFamilyArt(type: string): ArtFn | null {
  return EXACT[type] ?? byPrefixArt(type);
}
