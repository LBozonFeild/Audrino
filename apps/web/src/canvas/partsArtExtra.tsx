import type { ReactElement } from "react";
import type { PartDefinition, PartPin } from "@audrino/schema";

/** Art for the second wave of parts (sensors, ICs, modules). Merged into ART in PartGlyph. */

const PCB_BLUE = "#0a74b8";
const PCB_NAVY = "#1d4e89";
const PCB_GREEN = "#1e6f3e";
const PCB_PURPLE = "#5b3f8c";
const PCB_RED = "#a63328";
const PCB_DARK = "#171c26";
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

function Hole({ x, y, r = 0.55 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={GOLD} />
      <circle cx={x} cy={y} r={r * 0.5} fill="#3a3220" />
    </g>
  );
}

function Silk({ x, y, size = 1.4, fill = SILK, children, weight = 600, anchor = "middle" }: { x: number; y: number; size?: number; fill?: string; children: string; weight?: number; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} style={{ fontSize: size, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: weight, pointerEvents: "none" }}>
      {children}
    </text>
  );
}

function Chip({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.4} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <circle cx={x + 1} cy={y + 1} r={0.4} fill="#3a3f46" />
      {label && <Silk x={x + w / 2} y={y + h / 2 + 0.85} size={1.05} fill="#9aa7b4">{label}</Silk>}
    </g>
  );
}

function ScrewBlock({ x, y, w = 4.5, h = 5, label }: { x: number; y: number; w?: number; h?: number; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.4} fill="#2f8f5b" stroke="#1f6b41" strokeWidth={0.3} />
      <circle cx={x + w / 2} cy={y + h / 2} r={h * 0.28} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      {label && <Silk x={x + w / 2} y={y + h - 0.6} size={0.9} fill="#eafff2">{label}</Silk>}
    </g>
  );
}

function TrimPot({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={3.4} height={3.4} rx={0.4} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.2} />
      <circle cx={x + 1.7} cy={y + 1.7} r={0.9} fill={GOLD} stroke="#8a7420" strokeWidth={0.15} />
    </g>
  );
}

/** Bottom-row pads + optional tiny labels. */
function Pads({ pins, label = true }: { pins: PartPin[]; label?: boolean }) {
  return (
    <g>
      {pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          {label && <Silk x={p.x} y={p.y - 2.3} size={0.9}>{p.id}</Silk>}
        </g>
      ))}
    </g>
  );
}

// ---- sensors ------------------------------------------------------------------
const Dht22: ArtFn = (d) => (
  <g>
    <rect x={1.5} y={1} width={13} height={18} rx={0.8} fill="#9fb8d0" stroke="#6f8ca6" strokeWidth={0.3} />
    {[3.2, 5.4, 7.6, 9.8].map((y) => (
      <rect key={y} x={3.4} y={y} width={9.2} height={1} rx={0.4} fill="#5c7388" opacity={0.8} />
    ))}
    <Silk x={8} y={14} size={1.4} fill="#1c2745">AM2302</Silk>
    <Silk x={8} y={16.4} size={1.2} fill="#1c2745">DHT22</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={19} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Bmp280: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={17} height={15.5} rx={0.6} fill={PCB_PURPLE} stroke="#42296b" strokeWidth={0.35} />
    <rect x={4.5} y={3} width={9} height={7.5} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <circle cx={7.5} cy={5.5} r={0.55} fill="#3a3f46" />
    <Silk x={9} y={13.4} size={1.15}>BMP280</Silk>
    <Pads pins={d.pins} />
  </g>
);

function to92(label: string): ArtFn {
  return (d) => (
    <g>
      <path d="M 1.9 9.1 L 1.9 5 A 4.1 4.1 0 0 1 10.1 5 L 10.1 9.1 Z" fill="#1a1c20" stroke="#000" strokeWidth={0.25} />
      <Silk x={6} y={1} size={1.55}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={9.1} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
}

function mqSensor(label: string, ring: string): ArtFn {
  return (d) => (
    <g>
      <circle cx={10} cy={8} r={5.6} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={10} cy={8} r={4.4} fill="none" stroke={ring} strokeWidth={1.1} />
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={7.2 + (i % 4) * 1.9} cy={5.2 + Math.floor(i / 4) * 1.9} r={0.4} fill={METAL_D} opacity={0.8} />
      ))}
      <rect x={4} y={13.5} width={12} height={5.5} rx={0.6} fill="#2b2f36" stroke="#000" strokeWidth={0.25} />
      <Silk x={10} y={17} size={1.3}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={19} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
}

const Vl53l0x: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={13} height={11.5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <rect x={3.5} y={2.5} width={3.2} height={4} rx={0.5} fill="#0d0f12" />
    <rect x={8} y={3} width={2.6} height={3} rx={0.4} fill="#1a1420" stroke="#3a3f46" strokeWidth={0.15} />
    <circle cx={4.6} cy={3.8} r={0.5} fill="#6d5a8a" opacity={0.6} />
    <Silk x={7} y={9.6} size={1}>VL53L0X</Silk>
    <Pads pins={d.pins} />
  </g>
);

const SoundSensor: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={19} height={13.5} rx={0.5} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
    <circle cx={5} cy={6} r={2.9} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    {Array.from({ length: 6 }, (_, i) => (
      <circle key={i} cx={3.8 + (i % 3) * 1.2} cy={4.8 + Math.floor(i / 3) * 1.2} r={0.28} fill="#3a3f46" />
    ))}
    <TrimPot x={14.5} y={2.5} />
    <Chip x={9} y={7.5} w={4} h={3} />
    <Silk x={7} y={12.4} size={1}>MIC · KY-037</Silk>
    <Pads pins={d.pins} />
  </g>
);

const WaterLevel: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={29} height={8} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <Silk x={15} y={5.5} size={1.4}>WATER LEVEL</Silk>
    {[4, 11, 18].map((x, i) => (
      <rect key={x} x={x + i * 2} y={8.5} width={3} height={i === 1 ? 11.5 : 9.5} rx={0.4} fill={COPPER} stroke="#8a5a1c" strokeWidth={0.2} />
    ))}
    <Pads pins={d.pins} />
  </g>
);

const SoilMoisture: ArtFn = (d) => (
  <g>
    <rect x={2} y={0.5} width={26} height={7} rx={0.5} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
    <TrimPot x={20} y={1.8} />
    <Chip x={12} y={2} w={4} h={3.5} />
    <Silk x={5.5} y={5} size={1.1}>SOIL</Silk>
    <rect x={9} y={7.5} width={2.8} height={16} rx={1} fill={COPPER} stroke="#8a5a1c" strokeWidth={0.2} />
    <rect x={18.2} y={7.5} width={2.8} height={16} rx={1} fill={COPPER} stroke="#8a5a1c" strokeWidth={0.2} />
    {d.pins.map((p) => (
      <g key={p.id}>
        <Hole x={p.x} y={p.y + 1} />
        <Silk x={p.x} y={p.y + 3.2} size={0.9}>{p.id}</Silk>
      </g>
    ))}
  </g>
);

const RainSensor: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={31} height={6} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <Silk x={16} y={4.4} size={1.3}>RAIN</Silk>
    {[3, 9, 15, 21, 27].map((x) => (
      <rect key={x} x={x} y={6.5} width={1.6} height={5} fill={COPPER} />
    ))}
    {[6, 12, 18, 24].map((x) => (
      <rect key={`b${x}`} x={x} y={11.5} width={1.6} height={4.5} fill={COPPER} />
    ))}
    <Pads pins={d.pins} />
  </g>
);

const FlameSensor: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={17} height={11.5} rx={0.5} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
    <circle cx={4.5} cy={5.5} r={2.4} fill="#3a1f24" stroke="#000" strokeWidth={0.25} />
    <circle cx={3.8} cy={4.8} r={0.7} fill="#8a4450" opacity={0.6} />
    <TrimPot x={12} y={2.2} />
    <Chip x={8} y={6.5} w={3.5} h={3} />
    <Silk x={7} y={10.5} size={1}>FLAME · KY-026</Silk>
    <Pads pins={d.pins} />
  </g>
);

const TouchTtp223: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={13} height={9.5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <circle cx={7} cy={4.5} r={2.7} fill={GOLD} stroke="#8a7420" strokeWidth={0.25} />
    <circle cx={6.3} cy={3.8} r={0.7} fill="#e8d98a" opacity={0.6} />
    <Silk x={12} y={8.8} size={0.9} anchor="end">TTP223</Silk>
    <Pads pins={d.pins} />
  </g>
);

const HallA3144 = to92("A3144");

const Acs712: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={21} height={15.5} rx={0.5} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
    <ScrewBlock x={0.5} y={2.2} label="I+" />
    <ScrewBlock x={0.5} y={8.6} label="I−" />
    <Chip x={8} y={4} w={8} h={6} label="712" />
    <Silk x={15} y={13} size={1.1}>ACS712 · 5A</Silk>
    <Pads pins={d.pins.slice(2)} />
  </g>
);

const Mlx90614: ArtFn = (d) => (
  <g>
    <rect x={3.5} y={8} width={7} height={4} rx={0.5} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.2} />
    <circle cx={7} cy={5.5} r={4.6} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <circle cx={7} cy={5.5} r={3.4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    <circle cx={5.5} cy={4.6} r={1.15} fill="#14161a" />
    <circle cx={8.8} cy={4.6} r={0.7} fill="#2b3a4a" />
    <Silk x={7} y={7} size={0.9} fill="#3a3f46">MLX</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={11.5} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const PulseSensor: ArtFn = (d) => (
  <g>
    <circle cx={8} cy={8} r={6.8} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.35} />
    <circle cx={8} cy={7.5} r={2.4} fill="#7a1f24" stroke="#000" strokeWidth={0.2} />
    <circle cx={5.4} cy={5.4} r={0.8} fill="#c22" />
    <Silk x={8} y={12} size={1.1}>PULSE</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={14.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

// ---- input extras ----------------------------------------------------------------
const LimitSwitch: ArtFn = (d) => (
  <g>
    <rect x={2} y={5} width={11} height={9} rx={0.6} fill="#e8eef4" stroke={METAL_D} strokeWidth={0.3} />
    <rect x={2} y={5} width={11} height={2} rx={0.5} fill={METAL_L} />
    <path d="M 12 5.5 Q 8 1 4.6 2.6" fill="none" stroke={METAL} strokeWidth={0.9} strokeLinecap="round" />
    <circle cx={4.2} cy={2.8} r={1.4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.25} />
    <circle cx={4.2} cy={2.8} r={0.45} fill={METAL_D} />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={14} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const ReedSwitch: ArtFn = () => (
  <g>
    <Lead x1={0} y1={3} x2={2} y2={3} w={0.6} />
    <Lead x1={12} y1={3} x2={14} y2={3} w={0.6} />
    <rect x={2} y={1.5} width={10} height={3} rx={1.5} fill="#dfe9f0" stroke="#b8c2cc" strokeWidth={0.25} opacity={0.9} />
    <rect x={2.6} y={2.4} width={3} height={0.5} fill={METAL_D} />
    <rect x={8.4} y={2.4} width={3} height={0.5} fill={METAL_D} />
  </g>
);

const DipSwitch4: ArtFn = (d) => (
  <g>
    <rect x={1} y={1} width={14} height={6} rx={0.5} fill="#f2f0e8" stroke="#c9c5b4" strokeWidth={0.3} />
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <rect x={2 + i * 3.1} y={1.8} width={2.5} height={4.4} rx={0.3} fill="#5c6572" />
        <rect x={2.2 + i * 3.1} y={i % 2 === 0 ? 1.9 : 3.6} width={2.1} height={1.7} rx={0.3} fill="#f2f0e8" />
      </g>
    ))}
    <Silk x={1.6} y={0.7} size={0.8} fill="#8f8a78" anchor="start">ON</Silk>
    {[...d.pins].map((p) => (
      <Lead key={p.id} x1={p.x} y1={p.y < 4 ? 1 : 7} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const IrRemote: ArtFn = () => (
  <g>
    <rect x={1} y={1} width={12} height={28} rx={1.5} fill="#23262b" stroke="#000" strokeWidth={0.35} />
    <circle cx={7} cy={2.8} r={1.2} fill="#3a2a4a" stroke="#000" strokeWidth={0.2} />
    <circle cx={6.6} cy={2.5} r={0.4} fill="#8a74b0" opacity={0.7} />
    {Array.from({ length: 15 }, (_, i) => {
      const x = 2.6 + (i % 3) * 3.2;
      const y = 6 + Math.floor(i / 3) * 3.6;
      return <rect key={i} x={x} y={y} width={2.4} height={2.4} rx={0.5} fill={i === 0 ? "#c22" : "#454c58"} />;
    })}
    <Silk x={7} y={26.5} size={1.1} fill="#8f9aa6">IR</Silk>
    <Lead x1={5} y1={29} x2={5} y2={30} />
    <Lead x1={9} y1={29} x2={9} y2={30} />
  </g>
);

// ---- display extras -----------------------------------------------------------------
const Max7219Matrix: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={31} height={31} rx={0.6} fill={PCB_RED} stroke="#7c241b" strokeWidth={0.35} />
    <rect x={2} y={2} width={28} height={28} fill={BLACK} stroke="#000" strokeWidth={0.3} />
    {Array.from({ length: 64 }, (_, i) => {
      const cx = 4.2 + (i % 8) * 3.35;
      const cy = 4.2 + Math.floor(i / 8) * 3.35;
      const lit = [11, 18, 20, 27, 34, 35, 36, 37, 42, 50].includes(i);
      return <rect key={i} x={cx - 0.85} y={cy - 0.85} width={1.7} height={1.7} rx={0.3} fill={lit ? "#f04a3a" : "#5a1512"} />;
    })}
    <Silk x={16} y={31} size={1.1}>MAX7219</Silk>
    <Pads pins={d.pins} label={false} />
  </g>
);

const Tm1637: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={23} height={13.5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <rect x={1.5} y={1} width={21} height={8} rx={0.4} fill={BLACK} stroke="#000" strokeWidth={0.25} />
    {[0, 1, 2, 3].map((dg) => {
      const x = 3 + dg * 5;
      return (
        <g key={dg} opacity={0.85}>
          <rect x={x} y={1.8} width={3.4} height={0.7} rx={0.3} fill="#d43b2e" />
          <rect x={x} y={4.6} width={3.4} height={0.7} rx={0.3} fill="#d43b2e" />
          <rect x={x} y={7.3} width={3.4} height={0.7} rx={0.3} fill="#d43b2e" />
          <rect x={x - 0.4} y={2.1} width={0.7} height={2.8} rx={0.3} fill="#d43b2e" />
          <rect x={x + 3.1} y={2.1} width={0.7} height={2.8} rx={0.3} fill="#d43b2e" />
          <rect x={x - 0.4} y={4.9} width={0.7} height={2.8} rx={0.3} fill="#d43b2e" />
          <rect x={x + 3.1} y={4.9} width={0.7} height={2.8} rx={0.3} fill="#d43b2e" />
        </g>
      );
    })}
    <circle cx={20} cy={4} r={0.45} fill="#d43b2e" />
    <circle cx={20} cy={6} r={0.45} fill="#d43b2e" />
    <Silk x={12} y={11.6} size={1}>TM1637</Silk>
    <Pads pins={d.pins} />
  </g>
);

const NeoPixelRing8: ArtFn = (d) => {
  const R = 8.4;
  return (
    <g>
      <circle cx={12} cy={11} r={R} fill="none" stroke={PCB_GREEN} strokeWidth={3.4} />
      <circle cx={12} cy={11} r={R} fill="none" stroke="#14522d" strokeWidth={3.4} opacity={0.35} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const x = 12 + Math.cos(a) * R;
        const y = 11 + Math.sin(a) * R;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`}>
            <rect x={-1.6} y={-1.2} width={3.2} height={2.4} rx={0.35} fill="#e8e8e6" stroke="#b8bcc0" strokeWidth={0.15} />
            <circle cx={0} cy={0} r={0.6} fill={i % 3 === 0 ? "#f04a3a" : i % 3 === 1 ? "#3ac05a" : "#3a7af0"} opacity={0.85} />
          </g>
        );
      })}
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1.6} />
          <Silk x={p.x} y={p.y - 3} size={0.85}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const SevenSegment: ArtFn = (d) => {
  const seg = "#d43b2e";
  return (
    <g>
      <rect x={2} y={2} width={14} height={22} rx={0.8} fill={BLACK} stroke="#000" strokeWidth={0.3} />
      <rect x={5} y={3.5} width={8} height={1.6} rx={0.7} fill={seg} />
      <rect x={5} y={11.2} width={8} height={1.6} rx={0.7} fill={seg} />
      <rect x={5} y={19.4} width={8} height={1.6} rx={0.7} fill={seg} />
      <rect x={3.6} y={4} width={1.5} height={8} rx={0.7} fill={seg} />
      <rect x={3.6} y={11.8} width={1.5} height={8} rx={0.7} fill={seg} />
      <rect x={12.9} y={4} width={1.5} height={8} rx={0.7} fill={seg} />
      <rect x={12.9} y={11.8} width={1.5} height={8} rx={0.7} fill={seg} />
      <circle cx={15} cy={21} r={0.85} fill="#5a1512" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={p.y < 10 ? 2 : 24} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

// ---- output extras ---------------------------------------------------------------------
const VibrationMotor: ArtFn = (d) => (
  <g>
    <circle cx={7} cy={5.5} r={4.4} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <path d="M 7 1.6 A 3.9 3.9 0 0 1 7 9.4 Z" fill={METAL_D} />
    <circle cx={7} cy={5.5} r={0.6} fill="#6f7a86" />
    <Silk x={7} y={11} size={1}>3V</Silk>
    <Lead x1={5} y1={9.8} x2={5} y2={12} />
    <Lead x1={9} y1={9.8} x2={9} y2={12} />
  </g>
);

// ---- ICs ---------------------------------------------------------------------------------
function dip(label: string, big = false): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    const bw = w - 3.2;
    const bh = h - 2.2;
    return (
      <g>
        <rect x={1.6} y={1.1} width={bw} height={bh} rx={0.5} fill={CHIP} stroke="#000" strokeWidth={0.25} />
        <path d={`M ${w / 2 - 1.7} 1.1 A 1.7 1.7 0 0 0 ${w / 2 + 1.7} 1.1 Z`} fill="#3a3f46" />
        <circle cx={2.7} cy={2.3} r={0.5} fill="#3a3f46" />
        {d.pins.map((p) => (
          <Lead key={p.id} x1={p.x < w / 2 ? 1.6 : w - 1.6} y1={p.y} x2={p.x} y2={p.y} w={0.55} />
        ))}
        <Silk x={w / 2} y={h / 2 + (big ? 0.8 : 0.7)} size={big ? 1.65 : 2}>{label}</Silk>
      </g>
    );
  };
}

// ---- modules & power --------------------------------------------------------------------
const BuckLm2596: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={29} height={19} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <rect x={11} y={4} width={10} height={9} rx={0.5} fill="#4a5568" stroke="#2b2f36" strokeWidth={0.25} />
    <Silk x={16} y={9.5} size={1.5} fill="#d7dee9">330</Silk>
    <Chip x={3.5} y={8} w={5} h={5} />
    <TrimPot x={23.5} y={3.5} />
    <Silk x={15} y={17.5} size={1.2}>LM2596 BUCK</Silk>
    <ScrewBlock x={0.5} y={3.2} label="IN+" />
    <ScrewBlock x={0.5} y={11.2} label="IN−" />
    <ScrewBlock x={25} y={8.5} label="OUT" />
    {d.pins.filter((p) => p.x > 20).map((p) => (
      <Lead key={p.id} x1={29.2} y1={p.y} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Tp4056: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={17} height={11} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <rect x={0.5} y={3.6} width={3.2} height={4.8} rx={0.4} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
    <Chip x={5.5} y={3.8} w={5} h={4.5} label="4056" />
    <circle cx={13} cy={3.5} r={0.45} fill="#c22" />
    <circle cx={13} cy={6.5} r={0.4} fill="#3c6" />
    <Silk x={9} y={10.2} size={0.9}>LI-ION CHARGER</Silk>
    {d.pins.map((p) => (
      <g key={p.id}>
        <rect x={p.x < 9 ? 2.5 : 14.2} y={p.y - 1.2} width={2.2} height={2.4} rx={0.3} fill={GOLD} stroke="#8a7420" strokeWidth={0.15} />
        <Lead x1={p.x < 9 ? 2.5 : 16.4} y1={p.y} x2={p.x} y2={p.y} w={0.5} />
      </g>
    ))}
  </g>
);

const Nrf24l01: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={15} height={23} rx={0.5} fill={PCB_DARK} stroke="#0b0d10" strokeWidth={0.3} />
    <path d="M 3 3 L 6.5 3 L 6.5 5.5 L 9.5 5.5 L 9.5 3 L 13 3 L 13 8" fill="none" stroke={GOLD} strokeWidth={0.5} />
    <Chip x={3} y={9.5} w={8} h={7} label="nRF24" />
    <Silk x={8} y={19.5} size={0.9} fill="#8f9aa6">L01+</Silk>
    <Pads pins={d.pins} label={false} />
  </g>
);

const Hc05: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={34} height={15} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <rect x={2} y={1.8} width={17} height={12.4} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <Silk x={10.5} y={9} size={1.5} fill="#3a3f46">HC-05</Silk>
    <path d="M 21 4 L 24 4 L 24 6.5 L 27 6.5 L 27 4 L 30 4 L 30 9" fill="none" stroke={GOLD} strokeWidth={0.5} />
    <circle cx={22} cy={11.5} r={0.5} fill="#3c6" />
    <Pads pins={d.pins} />
  </g>
);

const SdModule: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={23} height={21} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <rect x={2.5} y={2} width={19} height={8.5} rx={0.6} fill="#5c6572" stroke={METAL_D} strokeWidth={0.25} />
    <rect x={17} y={3.5} width={6.5} height={5.5} rx={0.4} fill="#2b2f36" stroke="#000" strokeWidth={0.2} />
    <Silk x={10} y={7.5} size={1.1} fill="#d7dee9">MICRO SD</Silk>
    <Chip x={4} y={13} w={5} h={4.5} />
    <TrimPot x={13} y={13.5} />
    <Pads pins={d.pins} />
  </g>
);

const Ds3231: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={21} height={27} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
    <circle cx={11} cy={8} r={5.4} fill="#1a1c20" stroke="#000" strokeWidth={0.3} />
    <circle cx={11} cy={8} r={4} fill="#c2ccd4" stroke={METAL_D} strokeWidth={0.25} />
    <Silk x={11} y={8.8} size={1.4} fill="#5c6572">2032</Silk>
    <Chip x={3} y={16} w={6} h={5} label="3231" />
    <rect x={11} y={17} width={5.5} height={3} rx={1.2} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
    <Silk x={11} y={24} size={1}>DS3231 RTC</Silk>
    <Pads pins={d.pins} />
  </g>
);

const Battery2aa: ArtFn = (d) => (
  <g>
    <rect x={1} y={1} width={22} height={13} rx={0.8} fill={BLACK} stroke="#000" strokeWidth={0.3} />
    {[3, 8.2].map((y) => (
      <g key={y}>
        <rect x={2.5} y={y} width={19} height={4.2} rx={2.1} fill="#c2ccd4" stroke={METAL_D} strokeWidth={0.2} />
        <rect x={2.5} y={y} width={3.5} height={4.2} rx={1.5} fill="#3a7a4a" />
        <circle cx={21.8} cy={y + 2.1} r={0.7} fill={METAL_L} />
      </g>
    ))}
    <Silk x={12} y={7.5} size={1}>AA ×2</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={14} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Battery18650: ArtFn = (d) => (
  <g>
    <rect x={2} y={3} width={32} height={10} rx={5} fill="#2b5ea8" stroke="#224a82" strokeWidth={0.3} />
    <rect x={4} y={4.5} width={12} height={2} rx={1} fill="#fff" opacity={0.2} />
    <rect x={34} y={5.8} width={2.4} height={4.4} rx={1} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
    <Silk x={22} y={9.3} size={1.5}>18650</Silk>
    <Silk x={33} y={5} size={1.2} fill="#d7dee9">+</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={13} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const SolarPanel: ArtFn = (d) => (
  <g>
    <rect x={0.5} y={0.5} width={29} height={21} rx={0.6} fill="#1c2733" stroke="#000" strokeWidth={0.3} />
    {Array.from({ length: 6 }, (_, i) => {
      const x = 1.6 + (i % 3) * 9.2;
      const y = 1.6 + Math.floor(i / 3) * 9.2;
      return (
        <g key={i}>
          <rect x={x} y={y} width={8.4} height={8.4} rx={0.3} fill="#16375f" stroke="#0d2440" strokeWidth={0.2} />
          <line x1={x + 2.8} y1={y + 0.4} x2={x + 2.8} y2={y + 8} stroke="#8fa8c4" strokeWidth={0.35} opacity={0.7} />
          <line x1={x + 5.6} y1={y + 0.4} x2={x + 5.6} y2={y + 8} stroke="#8fa8c4" strokeWidth={0.35} opacity={0.7} />
        </g>
      );
    })}
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={21.5} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const PanelPot: ArtFn = (d) => (
  <g>
    <rect x={3} y={9} width={10} height={5} rx={0.5} fill="#454c58" stroke="#000" strokeWidth={0.25} />
    <circle cx={8} cy={7.5} r={3.4} fill={METAL_D} stroke="#6f7a86" strokeWidth={0.25} />
    <circle cx={8} cy={7.5} r={5.4} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
    {Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return (
        <line key={i} x1={8 + Math.cos(a) * 4.9} y1={7.5 + Math.sin(a) * 4.9} x2={8 + Math.cos(a) * 5.4} y2={7.5 + Math.sin(a) * 5.4} stroke="#5c6572" strokeWidth={0.3} />
      );
    })}
    <line x1={8} y1={7.5} x2={8} y2={2.8} stroke="#e8eef4" strokeWidth={0.5} strokeLinecap="round" />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={14} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Crystal16mhz: ArtFn = () => (
  <g>
    <Lead x1={0} y1={5} x2={3.4} y2={4.6} w={0.6} />
    <Lead x1={14} y1={5} x2={10.6} y2={4.6} w={0.6} />
    <rect x={3} y={1.6} width={8} height={5} rx={2.4} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <rect x={3.8} y={2.2} width={5.5} height={1.1} rx={0.5} fill="#fff" opacity={0.3} />
    <Silk x={7} y={5.4} size={0.9} fill="#3a3f46">16M</Silk>
  </g>
);

export const EXTRA_ART: Record<string, ArtFn> = {
  dht22: Dht22,
  bmp280: Bmp280,
  lm35: to92("LM35"),
  ds18b20: to92("DS18B20"),
  "mq-2": mqSensor("MQ-2", "#e0a030"),
  "mq-135": mqSensor("MQ-135", "#4a9fd8"),
  vl53l0x: Vl53l0x,
  "sound-sensor": SoundSensor,
  "water-level": WaterLevel,
  "soil-moisture": SoilMoisture,
  "rain-sensor": RainSensor,
  "flame-sensor": FlameSensor,
  "touch-ttp223": TouchTtp223,
  "hall-a3144": HallA3144,
  acs712: Acs712,
  mlx90614: Mlx90614,
  "pulse-sensor": PulseSensor,
  "limit-switch": LimitSwitch,
  "reed-switch": ReedSwitch,
  "dip-switch-4": DipSwitch4,
  "ir-remote": IrRemote,
  "max7219-matrix": Max7219Matrix,
  tm1637: Tm1637,
  "neopixel-ring8": NeoPixelRing8,
  "seven-segment": SevenSegment,
  "vibration-motor": VibrationMotor,
  ne555: dip("NE555"),
  "74hc595": dip("74HC595"),
  uln2003: dip("ULN2003"),
  "opto-4n35": dip("4N35"),
  "atmega328p-dip": dip("ATMEGA328P", true),
  "lm2596-buck": BuckLm2596,
  tp4056: Tp4056,
  nrf24l01: Nrf24l01,
  "hc-05": Hc05,
  "sd-module": SdModule,
  "ds3231-rtc": Ds3231,
  "battery-2xaa": Battery2aa,
  "battery-18650": Battery18650,
  "solar-panel": SolarPanel,
  "panel-pot": PanelPot,
  "crystal-16mhz": Crystal16mhz,
};
