import type { ReactElement } from "react";
import type { PartDefinition, PartPin } from "@audrino/schema";

/** Batch-3 art: sensors (incl. niche). Generic breakout factory + customs. */

const PCB_PURPLE = "#5b3f8c";
const PCB_GREEN = "#1e6f3e";
const PCB_NAVY = "#1d4e89";
const PCB_BLUE = "#0a74b8";
const PCB_RED = "#a63328";
const METAL = "#b8c2cc";
const METAL_D = "#8f9aa6";
const METAL_L = "#d8dee5";
const GOLD = "#c9a227";
const BLACK = "#14161a";
const CHIP = "#0d0f12";
const SILK = "#eef4f9";
const LEAD = "#a8b2bc";
const COPPER = "#c87f2f";

type ArtFn = (d: PartDefinition, values: Record<string, unknown>) => ReactElement;

function Lead({ x1, y1, x2, y2, w = 0.7 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LEAD} strokeWidth={w} strokeLinecap="round" />;
}

function Hole({ x, y, r = 0.5 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={GOLD} />
      <circle cx={x} cy={y} r={r * 0.5} fill="#3a3220" />
    </g>
  );
}

function Silk({ x, y, size = 1.2, fill = SILK, children, anchor = "middle" }: { x: number; y: number; size?: number; fill?: string; children: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} style={{ fontSize: size, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 600, pointerEvents: "none" }}>
      {children}
    </text>
  );
}

function Pads({ pins, label = true }: { pins: PartPin[]; label?: boolean }) {
  return (
    <g>
      {pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          {label && <Silk x={p.x} y={p.y - 2.2} size={0.8}>{p.id}</Silk>}
        </g>
      ))}
    </g>
  );
}

// ---- factories ------------------------------------------------------------------
type BrkExtra = "mic" | "lens" | "can" | "grid" | "none";

function brk(label: string, fill = PCB_PURPLE, extra: BrkExtra = "none", chipText?: string): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    const bw = w - 2;
    const bh = h - 5;
    return (
      <g>
        <rect x={0.5} y={0.5} width={w - 1} height={bh} rx={0.5} fill={fill} stroke="#00000033" strokeWidth={0.3} />
        {extra === "mic" && (
          <g>
            <circle cx={4} cy={bh / 2 + 0.5} r={2.2} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
            {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([dx, dy]) => (
              <circle key={`${dx}`} cx={4 + dx} cy={bh / 2 + 0.5 + dy} r={0.25} fill="#3a3f46" />
            ))}
          </g>
        )}
        {extra === "lens" && (
          <g>
            <rect x={2.5} y={bh / 2 - 2.4} width={3.4} height={4.4} rx={0.5} fill="#0d0f12" />
            <circle cx={4.2} cy={bh / 2 - 0.8} r={0.6} fill="#6d5a8a" opacity={0.6} />
          </g>
        )}
        {extra === "can" && (
          <rect x={2.5} y={bh / 2 - 3} width={6} height={6} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
        )}
        {extra === "grid" && (
          <g>
            <rect x={2} y={bh / 2 - 3.2} width={7} height={6.4} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
            {Array.from({ length: 9 }, (_, i) => (
              <circle key={i} cx={3.2 + (i % 3) * 2.3} cy={bh / 2 - 1.8 + Math.floor(i / 3) * 1.8} r={0.45} fill="#3a3f46" />
            ))}
          </g>
        )}
        <rect x={w > 15 ? 10 : 8} y={bh / 2 - 2.6} width={Math.min(7, w * 0.38)} height={5.2} rx={0.4} fill={CHIP} stroke="#000" strokeWidth={0.15} />
        <Silk x={w / 2 + 2} y={bh - 1} size={1}>{chipText ?? label}</Silk>
        <Pads pins={d.pins} />
      </g>
    );
  };
}

function mq(label: string, ring: string): ArtFn {
  return (d) => (
    <g>
      <circle cx={10} cy={8} r={5.6} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={10} cy={8} r={4.4} fill="none" stroke={ring} strokeWidth={1.1} />
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={7.2 + (i % 4) * 1.9} cy={5.2 + Math.floor(i / 4) * 1.9} r={0.4} fill={METAL_D} opacity={0.8} />
      ))}
      <rect x={4} y={13.5} width={12} height={5.5} rx={0.6} fill="#2b2f36" stroke="#000" strokeWidth={0.25} />
      <Silk x={10} y={17} size={1.2}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={19} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
}

// ---- custom sensors ---------------------------------------------------------------
const GeigerTube: ArtFn = (d) => (
  <g>
    <rect x={3} y={1} width={8} height={26} rx={4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
    <rect x={3} y={1} width={8} height={3} rx={1.5} fill={METAL} />
    <rect x={4} y={5} width={2} height={18} rx={1} fill="#9ad0ff" opacity={0.35} />
    <Silk x={7} y={15} size={0.9} fill="#3a3f46">M4011</Silk>
    <Silk x={7} y={17} size={0.8} fill="#3a3f46">GEIGER</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={27} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const PhSensor: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={6} width={w - 1} height={h - 11} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <circle cx={8} cy={3.8} r={3.4} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={8} cy={3.8} r={1.6} fill="#3a3f46" />
      <Silk x={8} y={1.4} size={0.8} fill="#8f9aa6">BNC</Silk>
      <rect x={14} y={7.5} width={5} height={4} rx={0.4} fill={CHIP} />
      <Silk x={w / 2} y={h - 8} size={1.2}>pH METER</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const TdsSensor: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={8} rx={0.5} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
      <Silk x={w / 2} y={5.5} size={1.2}>TDS</Silk>
      {[4, 11, 18].map((x, i) => (
        <rect key={x} x={x + i * 2} y={9} width={3} height={i === 1 ? 13 : 10} rx={0.4} fill={COPPER} stroke="#8a5a1c" strokeWidth={0.2} />
      ))}
      <Pads pins={d.pins} />
    </g>
  );
};

const WaterFlow: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <circle cx={w / 2} cy={10} r={8} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.4} />
      <circle cx={w / 2} cy={10} r={5.5} fill="#8ec3e8" stroke="#5c94b8" strokeWidth={0.3} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={w / 2 + Math.cos(a) * 1.4}
            y1={10 + Math.sin(a) * 1.4}
            x2={w / 2 + Math.cos(a) * 5.2}
            y2={10 + Math.sin(a) * 5.2}
            stroke="#2b5ea8"
            strokeWidth={1.1}
          />
        );
      })}
      <rect x={1} y={8} width={5} height={4} rx={0.5} fill={METAL_D} />
      <rect x={w - 6} y={8} width={5} height={4} rx={0.5} fill={METAL_D} />
      <Silk x={w / 2} y={h - 4.5} size={1}>YF-S201</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const LoadCell: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={3} width={w - 2} height={7} rx={1} fill="#d8a85a" stroke="#a87c32" strokeWidth={0.3} />
      {[4, w - 5].map((x) => (
        <circle key={x} cx={x} cy={6.5} r={1.4} fill="#8a6428" />
      ))}
      <rect x={w / 2 - 5} y={3.6} width={10} height={3} rx={0.4} fill="#c2ccd4" stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w / 2} y={2} size={0.9} fill="#8f9aa6">LOAD CELL</Silk>
      <path d={`M ${w - 4} 10 Q ${w + 2} 13 ${w - 2} 16`} fill="none" stroke="#c22" strokeWidth={0.5} />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={15} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Hx711: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={7} y={2.5} width={7} height={5.5} rx={0.4} fill={CHIP} />
      <Silk x={14} y={3.8} size={1}>HX711</Silk>
      <Silk x={6} y={10.4} size={0.75} fill="#8f9aa6">E+ E− A− A+</Silk>
      {d.pins.map((p) =>
        p.y > h - 2 ? (
          <g key={p.id}>
            <Hole x={p.x} y={p.y - 1} />
            <Silk x={p.x} y={p.y - 2.1} size={0.75}>{p.id}</Silk>
          </g>
        ) : (
          <g key={p.id}>
            <Hole x={p.x + 1} y={p.y} />
            <Silk x={p.x + 3} y={p.y + 0.4} size={0.75} anchor="start">{p.id}</Silk>
          </g>
        ),
      )}
    </g>
  );
};

const Sct013: ArtFn = (d) => {
  const { w } = d.size_mm;
  return (
    <g>
      <circle cx={w / 2} cy={11} r={8.4} fill="#23262b" stroke="#000" strokeWidth={0.4} />
      <circle cx={w / 2} cy={11} r={5} fill="#14161a" stroke={METAL_D} strokeWidth={0.3} />
      <rect x={w / 2 - 1.6} y={2} width={3.2} height={3.5} rx={0.4} fill="#454c58" />
      <Silk x={w / 2} y={21} size={1}>SCT-013</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={22} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Zmpt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={1.5} width={w - 3} height={h - 6} rx={0.5} fill="#2b4a8a" stroke="#1c3260" strokeWidth={0.3} />
      <rect x={3} y={3} width={w - 6} height={h - 9} rx={0.4} fill="#3a5fa8" />
      <Silk x={w / 2} y={h / 2 - 1} size={1}>ZMPT101B</Silk>
      <Silk x={w / 2} y={h / 2 + 1.4} size={0.8}>V-TRANS</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 4} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const VoltageSensor: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={3} y={2} width={3} height={7} rx={1.2} fill="#d2b48c" />
      {[3.4, 4.2, 5].map((x) => <line key={x} x1={x} y1={2.5} x2={x} y2={8.5} stroke="#c22" strokeWidth={0.5} />)}
      <rect x={8} y={2} width={3} height={7} rx={1.2} fill="#d2b48c" />
      <Silk x={w / 2} y={h - 6.5} size={1}>25V MAX</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const MhZ19: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 5} rx={0.8} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={8} cy={h / 2 - 2} r={3.6} fill="#454c58" stroke={METAL_D} strokeWidth={0.25} />
      <circle cx={16} cy={h / 2 - 2} r={3.6} fill="#454c58" stroke={METAL_D} strokeWidth={0.25} />
      <Silk x={w / 2} y={h - 7} size={1.1} fill="#3a3f46">MH-Z19 CO₂</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Pms5003: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 5} rx={0.8} fill="#e8eef4" stroke={METAL_D} strokeWidth={0.3} />
      <rect x={2.5} y={2.5} width={12} height={8} rx={0.5} fill="#cfd8e3" />
      {Array.from({ length: 5 }, (_, i) => (
        <line key={i} x1={3.5} y1={3.5 + i * 1.6} x2={13.5} y2={3.5 + i * 1.6} stroke="#9aa7b4" strokeWidth={0.4} />
      ))}
      <rect x={w - 9} y={3} width={6} height={7} rx={0.5} fill="#5c6572" />
      <Silk x={w / 2} y={h - 6.5} size={1.1} fill="#3a3f46">PMS5003</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Gp2y1010: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={2} y={1} width={w - 4} height={h - 5} rx={1} fill="#cfd8e3" stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2 - 2} r={2.2} fill="#14161a" />
      <rect x={3.5} y={h / 2 - 4} width={2.6} height={3} rx={0.4} fill="#3a2a4a" />
      <Silk x={w / 2} y={h - 6.5} size={0.85} fill="#3a3f46">GP2Y1010</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const JsnSr04t: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <circle cx={w / 2} cy={9} r={7.5} fill={METAL} stroke={METAL_D} strokeWidth={0.35} />
      <circle cx={w / 2} cy={9} r={5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.25} />
      <circle cx={w / 2} cy={9} r={3} fill="#6f7a86" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={w / 2 + Math.cos(a) * 4} cy={9 + Math.sin(a) * 4} r={0.3} fill="#3a3f46" />;
      })}
      <rect x={w / 2 - 4} y={15.5} width={8} height={3} rx={0.5} fill="#2b3a67" />
      <Silk x={w / 2} y={h - 4} size={0.9}>JSN-SR04T</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const TfLuna: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={1.5} width={w - 3} height={h - 5} rx={0.8} fill="#e8eef4" stroke={METAL_D} strokeWidth={0.3} />
      <rect x={3.5} y={3.5} width={4.5} height={5} rx={0.6} fill="#14161a" />
      <circle cx={5.75} cy={5.5} r={1.2} fill="#3a6ea5" opacity={0.7} />
      <rect x={10} y={4} width={w - 14} height={4} rx={0.4} fill={CHIP} />
      <Silk x={w / 2} y={h - 6.5} size={0.95} fill="#3a3f46">TF-LUNA</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Gp2y0a21: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={1} width={w - 3} height={h - 5} rx={1.2} fill="#cfd8e3" stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={5.5} cy={h / 2 - 2} r={2.4} fill="#14161a" />
      <circle cx={11} cy={h / 2 - 2} r={1.7} fill="#221a2e" />
      <Silk x={w / 2} y={h - 6.5} size={0.8} fill="#3a3f46">GP2Y0A21</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Mlx90640: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_RED} stroke="#7c241b" strokeWidth={0.3} />
      <rect x={3.5} y={2.5} width={w - 7} height={h - 10} rx={1} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
      <rect x={5.5} y={4} width={w - 11} height={h - 13} rx={0.6} fill="#14161a" />
      <Silk x={w / 2} y={h - 6.5} size={0.9}>MLX90640</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Amg8833: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_PURPLE} stroke="#42296b" strokeWidth={0.3} />
      <rect x={3} y={2} width={8} height={6.5} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={3.9 + (i % 4) * 1.7} y={2.9 + Math.floor(i / 4) * 2.4} width={1.2} height={1.7} fill="#3a2a4a" />
      ))}
      <Silk x={w / 2} y={h - 6.5} size={0.9}>AMG8833</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Ld2410: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
      {[
        [5, 3.5],
        [13, 3.5],
        [5, 9],
        [13, 9],
      ].map(([x, y]) => (
        <rect key={`${x}`} x={x} y={y} width={6} height={4} rx={0.3} fill={GOLD} stroke="#8a7420" strokeWidth={0.15} />
      ))}
      <Silk x={w / 2} y={h - 6.5} size={1}>LD2410 mmWave</Silk>
      <Pads pins={d.pins} />
    </g>
  );
};

const Myoware: ArtFn = (d) => {
  const { w, h } = d.size_mm;
    return (
    <g>
      <circle cx={w / 2} cy={8} r={7} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.35} />
      <rect x={w / 2 - 3} y={5} width={6} height={5} rx={0.4} fill={CHIP} />
      {[-5.5, 0, 5.5].map((dx) => (
        <rect key={dx} x={w / 2 + dx - 1.2} y={12.5} width={2.4} height={2} rx={0.3} fill={METAL} />
      ))}
      <Silk x={w / 2} y={8.5} size={0.9}>EMG</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={14} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const BallTilt: ArtFn = (d) => (
  <g>
    <rect x={1.5} y={1} width={5} height={6} rx={1.6} fill="#dfe9f0" stroke="#b8c2cc" strokeWidth={0.25} opacity={0.9} />
    <circle cx={4} cy={5.4} r={1.3} fill={METAL_D} />
    <rect x={2.2} y={2} width={0.8} height={2.5} fill={METAL_D} />
    <rect x={5} y={2} width={0.8} height={2.5} fill={METAL_D} />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={7} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const CapacitiveSoil: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={2} y={0.5} width={w - 4} height={7} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={7} y={1.8} width={5} height={4} rx={0.4} fill={CHIP} />
      <Silk x={20} y={5} size={1}>CAP-SOIL</Silk>
      {[5, 10, 15, 20, 25].map((x) => (
        <rect key={x} x={x} y={8} width={1.6} height={9} fill={COPPER} opacity={0.85} />
      ))}
      {[7.5, 12.5, 17.5, 22.5].map((x) => (
        <rect key={`b${x}`} x={x} y={12} width={1.6} height={5} fill={COPPER} opacity={0.6} />
      ))}
      <Pads pins={d.pins} />
    </g>
  );
};

export const BATCH3_ART: Record<string, ArtFn> = {
  // MQ gas family
  "mq-3": mq("MQ-3", "#8a4450"),
  "mq-4": mq("MQ-4", "#3a7a4a"),
  "mq-5": mq("MQ-5", "#c9a227"),
  "mq-6": mq("MQ-6", "#e08030"),
  "mq-7": mq("MQ-7", "#4a6fd8"),
  "mq-8": mq("MQ-8", "#b8bcc0"),
  "mq-9": mq("MQ-9", "#8a74b0"),
  "mq-131": mq("MQ-131", "#3ab8a8"),
  // environmental breakouts
  sht31: brk("SHT31"),
  bme280: brk("BME280"),
  bme680: brk("BME680"),
  bmp180: brk("BMP180", PCB_BLUE),
  si7021: brk("Si7021", PCB_BLUE),
  aht20: brk("AHT20", PCB_BLUE),
  // light / color / uv
  bh1750: brk("BH1750", PCB_BLUE, "lens"),
  tsl2561: brk("TSL2561", PCB_PURPLE, "lens"),
  "apds-9960": brk("APDS-9960", PCB_PURPLE, "lens"),
  tcs34725: brk("TCS34725", PCB_PURPLE, "lens"),
  "guva-s12sd": brk("GUVA-S12SD", PCB_NAVY, "lens"),
  // sound
  max9814: brk("MAX9814", PCB_NAVY, "mic"),
  max4466: brk("MAX4466", PCB_NAVY, "mic"),
  inmp441: brk("INMP441", PCB_GREEN, "mic"),
  // motion / magnetic
  mpu9250: brk("MPU-9250", PCB_PURPLE),
  adxl345: brk("ADXL345", PCB_BLUE),
  hmc5883l: brk("HMC5883L", PCB_GREEN),
  qmc5883: brk("QMC5883", PCB_BLUE),
  bno055: brk("BNO055", PCB_PURPLE),
  // air quality
  ccs811: brk("CCS811", PCB_NAVY),
  gp2y1010: Gp2y1010,
  pms5003: Pms5003,
  "mh-z19": MhZ19,
  // distance
  "vl53l1x": brk("VL53L1X", PCB_NAVY, "lens"),
  "jsn-sr04t": JsnSr04t,
  "gp2y0a21": Gp2y0a21,
  "tf-luna": TfLuna,
  // biomedical / niche
  geiger: GeigerTube,
  "ph-sensor": PhSensor,
  "tds-sensor": TdsSensor,
  "yf-s201": WaterFlow,
  "load-cell": LoadCell,
  hx711: Hx711,
  as5600: brk("AS5600", PCB_NAVY, "can"),
  mpr121: brk("MPR121", PCB_PURPLE),
  "sct-013": Sct013,
  zmpt101b: Zmpt,
  "voltage-sensor": VoltageSensor,
  max30102: brk("MAX30102", PCB_NAVY, "lens"),
  amg8833: Amg8833,
  mlx90640: Mlx90640,
  ld2410: Ld2410,
  myoware: Myoware,
  "sw-420": brk("SW-420", PCB_BLUE, "can"),
  am312: brk("AM312", PCB_NAVY, "lens"),
  "ball-tilt": BallTilt,
  "cap-soil": CapacitiveSoil,
};
