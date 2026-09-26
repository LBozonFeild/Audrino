import type { ReactElement } from "react";
import type { PartDefinition, PartPin } from "@audrino/schema";

/** Batch-4 art: radio/MCU modules, drivers, displays, motors, power. */

const PCB_PURPLE = "#5b3f8c";
const PCB_GREEN = "#1e6f3e";
const PCB_NAVY = "#1d4e89";
const PCB_BLUE = "#0a74b8";
const PCB_YELLOW = "#c2a42a";
const PCB_RED = "#a63328";
const METAL = "#b8c2cc";
const METAL_D = "#8f9aa6";
const METAL_L = "#d8dee5";
const GOLD = "#c9a227";
const BLACK = "#14161a";
const CHIP = "#0d0f12";
const SILK = "#eef4f9";
const LEAD = "#a8b2bc";

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

function Screw({ x, y, r = 2.2 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={x - r * 0.7} y={y - 0.45} width={r * 1.4} height={0.9} rx={0.2} fill="#6f7a86" />
    </g>
  );
}

// ---- factories --------------------------------------------------------------
function espMod(label: string, canW = 9): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    return (
      <g>
        <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
        <rect x={2} y={2} width={canW} height={8} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
        {[3, 5, 7, 9].map((y) => (
          <line key={y} x1={2.6} y1={y} x2={2 + canW - 0.6} y2={y} stroke={METAL_D} strokeWidth={0.3} />
        ))}
        <path
          d={`M ${canW + 4} 3 h ${w - canW - 6} v 2 h -${w - canW - 8} v 2 h ${w - canW - 8} v 2 h -${w - canW - 6}`}
          fill="none"
          stroke={GOLD}
          strokeWidth={0.8}
        />
        <Silk x={w / 2} y={h - 6.5} size={1.1}>{label}</Silk>
        {d.pins.map((p) => {
          const bottom = p.y > h - 2;
          return bottom ? (
            <g key={p.id}>
              <Hole x={p.x} y={p.y - 1} />
              <Silk x={p.x} y={p.y - 2.1} size={0.6}>{p.id}</Silk>
            </g>
          ) : (
            <g key={p.id}>
              <Hole x={p.x} y={p.y} />
            </g>
          );
        })}
      </g>
    );
  };
}

function module(label: string, fill = PCB_BLUE, labelFill = SILK): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    return (
      <g>
        <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={fill} stroke="#00000033" strokeWidth={0.3} />
        <rect x={w / 2 - 4} y={h / 2 - 4.5} width={8} height={5} rx={0.4} fill={CHIP} stroke="#000" strokeWidth={0.15} />
        <Silk x={w / 2} y={h - 5.5} size={1.1} fill={labelFill}>{label}</Silk>
        {d.pins.map((p) => {
          const bottom = p.y > h - 2;
          const top = p.y < 2;
          return bottom || top ? (
            <g key={p.id}>
              <Hole x={p.x} y={bottom ? p.y - 1 : p.y + 1} />
              <Silk x={p.x} y={bottom ? p.y - 2.1 : p.y + 3} size={0.6}>{p.id}</Silk>
            </g>
          ) : (
            <g key={p.id}>
              <Hole x={p.x > w / 2 ? p.x + 1 : p.x - 1} y={p.y} />
              <Silk x={p.x > w / 2 ? p.x + 2.5 : p.x - 2.5} y={p.y + 0.35} size={0.6} anchor={p.x > w / 2 ? "start" : "end"}>{p.id}</Silk>
            </g>
          );
        })}
      </g>
    );
  };
}

function nema(label: string, corner: string): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    return (
      <g>
        <rect x={1} y={1} width={w - 2} height={h - 4} rx={1} fill="#8a929c" stroke="#5f6872" strokeWidth={0.4} />
        <rect x={2.5} y={2.5} width={w - 5} height={h - 7} rx={0.8} fill="#a9b2bc" />
        <circle cx={w / 2} cy={h / 2 - 1.5} r={w * 0.18} fill="#6f7a86" stroke="#5f6872" strokeWidth={0.3} />
        <circle cx={w / 2} cy={h / 2 - 1.5} r={w * 0.08} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={i % 2 === 0 ? 4.5 : w - 4.5} cy={i < 2 ? 4.5 : h - 8} r={1.3} fill={corner} stroke="#5f6872" strokeWidth={0.2} />
        ))}
        <Silk x={w / 2} y={h - 5.5} size={Math.max(0.9, w * 0.05)}>{label}</Silk>
        {d.pins.map((p) => (
          <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
        ))}
      </g>
    );
  };
}

// ---- customs ---------------------------------------------------------------
const Rc522: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={2.5} y={2} width={w - 5} height={h - 11} rx={0.8} fill="none" stroke={GOLD} strokeWidth={0.5} />
      <path d={`M 5 4.5 h ${w - 10} v 8 h -${w - 10} z`} fill="none" stroke={GOLD} strokeWidth={0.4} />
      <rect x={w / 2 - 3.5} y={h / 2 - 5.5} width={7} height={5} rx={0.4} fill={CHIP} />
      <Silk x={w / 2} y={h - 6.5} size={1.1}>RC522</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.55}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const Pn532: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_PURPLE} stroke="#42296b" strokeWidth={0.3} />
      <rect x={2.5} y={2} width={w - 5} height={8} rx={0.8} fill="none" stroke={GOLD} strokeWidth={0.5} />
      <rect x={w / 2 - 3} y={h / 2 - 0.5} width={6} height={4.5} rx={0.4} fill={CHIP} />
      <rect x={w - 8} y={h / 2 + 1} width={5} height={2.6} rx={0.3} fill="#2b2f36" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={w - 7.4 + i * 1.5} y={h / 2 + 1.3} width={0.7} height={2} fill={i === 0 ? "#e08030" : METAL_D} />
      ))}
      <Silk x={w / 2} y={h - 5.5} size={1.1}>PN532</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.6}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const D1Mini: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={w / 2 - 4.5} y={1.5} width={9} height={7} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <path d={`M 5 2.2 h 5 v 1.4 h -3.4 v 1.4 h 3.4 v 1.4 h -5`} fill="none" stroke={GOLD} strokeWidth={0.5} />
      <rect x={w / 2 - 4} y={11} width={8} height={8} rx={0.5} fill={CHIP} stroke="#000" strokeWidth={0.15} />
      <rect x={w / 2 - 3} y={h - 6} width={6} height={4} rx={0.4} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w / 2} y={h - 8.5} size={1}>D1 MINI</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x > w / 2 ? p.x + 1 : p.x - 1} y={p.y} />
          <Silk x={p.x > w / 2 ? p.x + 2.3 : p.x - 2.3} y={p.y + 0.4} size={0.12 * 5} anchor={p.x > w / 2 ? "start" : "end"}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const Esp01: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={2} y={h - 11} width={w - 4} height={8} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <path d={`M 3 3 h ${w - 6} v 2 h -${w - 8} v 2 h ${w - 8} v 2 h -${w - 6}`} fill="none" stroke={GOLD} strokeWidth={0.6} />
      <Silk x={w / 2} y={h - 1.5} size={0.9}>ESP-01S</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y} r={0.45} />
        </g>
      ))}
    </g>
  );
};

const Neo6m: ArtFn = (d) => {
    const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={2} y={2} width={w * 0.45} height={h * 0.4} rx={0.8} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
      <circle cx={w - 8} cy={h / 2 - 1} r={3.6} fill="#2b2f36" stroke={METAL_D} strokeWidth={0.2} />
      <rect x={w / 2 + 2} y={h - 9} width={5} height={3.4} rx={0.3} fill={CHIP} />
      <Silk x={w / 2 - 4} y={h - 5.5} size={1.1}>NEO-6M GPS</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.6}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const Mcp2515: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_YELLOW} stroke="#8a7420" strokeWidth={0.3} />
      <rect x={3} y={2.5} width={7} height={6} rx={0.4} fill={CHIP} />
      <rect x={12} y={3} width={5} height={5} rx={0.8} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={14.5} y={2.2} size={0.7} fill="#3a3f46">16M</Silk>
      <Screw x={w - 6} y={4.5} r={2} />
      <Silk x={w / 2} y={h - 5.5} size={1}>MCP2515 CAN</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.55}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const Rs485: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={4} y={3} width={7} height={5.5} rx={0.4} fill={CHIP} />
      <Silk x={7.5} y={2.4} size={0.7}>MAX485</Silk>
      <Screw x={w - 5.5} y={4.5} r={2.1} />
      {d.pins.map((p) =>
        p.x > w / 2 ? (
          <g key={p.id}>
            <Hole x={p.x + 1} y={p.y} />
            <Silk x={p.x + 2.4} y={p.y + 0.35} size={0.65} anchor="start">{p.id}</Silk>
          </g>
        ) : (
          <g key={p.id}>
            <Hole x={p.x} y={p.y - 1} />
            <Silk x={p.x} y={p.y - 2.1} size={0.6}>{p.id}</Silk>
          </g>
        ),
      )}
    </g>
  );
};

const UsbSerial: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={2} width={w - 1} height={h - 6} rx={0.5} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
      <rect x={-0.5} y={3.5} width={6} height={3.5} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
      <rect x={5} y={3.2} width={7} height={5.5} rx={0.4} fill={CHIP} />
      <rect x={13} y={4} width={3} height={2.4} rx={0.3} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
      <Silk x={w / 2} y={h - 4.5} size={0.95}>{d.label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.7}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const A4988: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 2} rx={0.5} fill={PCB_RED} stroke="#7c241b" strokeWidth={0.3} />
      <rect x={3.5} y={4} width={w - 7} height={8} rx={0.4} fill={CHIP} stroke="#000" strokeWidth={0.15} />
      <rect x={4} y={14} width={3.2} height={3.2} rx={0.5} fill="#2b2f36" />
      <line x1={5.6} y1={14} x2={5.6} y2={12} stroke={METAL_D} strokeWidth={0.5} />
      <Silk x={w / 2} y={16.2} size={1}>{d.label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x > w / 2 ? p.x - 1 : p.x + 1} y={p.y} />
          <Silk x={p.x > w / 2 ? p.x - 2.4 : p.x + 2.4} y={p.y + 0.3} size={0.5} anchor={p.x > w / 2 ? "end" : "start"}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const DfPlayer: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={2} y={2} width={8} height={7} rx={0.3} fill={CHIP} />
      <rect x={w - 12} y={2} width={10} height={7} rx={0.4} fill="#2b2f36" stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w - 7} y={1.6} size={0.6}>TF</Silk>
      <Silk x={w / 2} y={h - 5.5} size={1}>DFPlayer</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.55}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const Lcd2004: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.5} fill="#1c5c3e" stroke="#0f3a26" strokeWidth={0.3} />
      <rect x={3} y={2.5} width={w - 6} height={h - 9} rx={0.4} fill="#9ac279" stroke="#6f9456" strokeWidth={0.25} />
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 20 }, (_, c) => (
          <rect key={`${r}-${c}`} x={4.2 + c * (w - 9.5) / 20} y={3.8 + r * ((h - 11) / 4)} width={(w - 9.5) / 20 - 0.35} height={2.4} fill="#7fa862" opacity={0.7} />
        )),
      )}
      <Silk x={w / 2} y={h - 4.2} size={1}>LCD 20x4</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2} size={0.5}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const NixieTube: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={2.5} y={2} width={w - 5} height={h - 8} rx={w * 0.35} fill="#dfeef7" stroke="#b8c8d8" strokeWidth={0.35} opacity={0.85} />
      <rect x={4.5} y={5} width={w - 9} height={h - 14} rx={1} fill="#c8543c" opacity={0.75} />
      <Silk x={w / 2} y={h / 2 + 1.5} size={7} fill="#ff8866">8</Silk>
      <rect x={w / 2 - 3} y={h - 6.5} width={6} height={2.5} rx={0.4} fill={METAL_D} />
      <Silk x={w / 2} y={h - 8.5} size={0.75} fill="#5c6572">IN-14</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 4.5} x2={p.x} y2={p.y} w={0.4} />
      ))}
    </g>
  );
};

const NeoStick: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <rect x={3 + i * (w - 8) / 8} y={2.2} width={(w - 8) / 8 - 1} height={(w - 8) / 8 - 1} rx={0.3} fill={CHIP} />
          <rect x={3.8 + i * (w - 8) / 8} y={3} width={(w - 8) / 8 - 2.6} height={(w - 8) / 8 - 2.6} fill="#8a2a2a" />
          <circle cx={3 + i * (w - 8) / 8 + ((w - 8) / 8 - 1) / 2} cy={2.2 + ((w - 8) / 8 - 1) / 2} r={0.5} fill="#ffd28a" />
        </g>
      ))}
      <Silk x={w - 6} y={h - 5} size={0.8}>WS2812 x8</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.7}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const LedBar: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.5} fill="#14161a" stroke="#000" strokeWidth={0.3} />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={1.6 + i * (w - 3) / 10} y={2.4} width={(w - 3) / 10 - 0.8} height={(h - 5) / 2} rx={0.3} fill={i < 3 ? "#c8442c" : i < 6 ? "#c8a42c" : "#3c9a4c"} opacity={i < 5 ? 0.95 : 0.4} />
      ))}
      <Silk x={w / 2} y={h - 2.2} size={0.8}>BARGRAPH 10</Silk>
      {d.pins.map((p) => (
        <Hole key={p.id} x={p.x} y={p.y} r={0.4} />
      ))}
    </g>
  );
};

const SevenSeg4: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.5} fill="#14161a" stroke="#000" strokeWidth={0.3} />
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i} opacity={0.92}>
          <rect x={2.5 + i * (w - 4) / 4} y={2.8} width={(w - 4) / 4 - 1.5} height={h - 7} rx={0.6} fill="#1c1f24" stroke="#2b2f36" strokeWidth={0.15} />
          <Silk x={2.5 + i * (w - 4) / 4 + ((w - 4) / 4 - 1.5) / 2} y={h / 2 + 2.5} size={h * 0.42} fill="#e03030">{String(8)}</Silk>
        </g>
      ))}
      {d.pins.map((p) => {
        const bottom = p.y > h / 2;
        return (
          <g key={p.id}>
            <Hole x={p.x} y={bottom ? p.y - 1 : p.y + 1} r={0.45} />
            <Silk x={p.x} y={bottom ? p.y - 2 : p.y + 2.8} size={0.5}>{p.id}</Silk>
          </g>
        );
      })}
    </g>
  );
};

const DotMatrix: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.5} fill="#14161a" stroke="#000" strokeWidth={0.3} />
      {Array.from({ length: 64 }, (_, i) => (
        <circle key={i} cx={2.4 + (i % 8) * ((w - 4) / 8)} cy={2.4 + Math.floor(i / 8) * ((h - 4) / 8)} r={0.55} fill={(i % 8 + Math.floor(i / 8)) % 3 === 0 ? "#e03030" : "#5c1a1a"} />
      ))}
      {d.pins.map((p) => {
        const bottom = p.y > h / 2;
        return (
          <g key={p.id}>
            <Hole x={p.x} y={bottom ? p.y - 1 : p.y + 1} r={0.4} />
            <Silk x={p.x} y={bottom ? p.y - 1.9 : p.y + 2.6} size={0.45}>{p.id}</Silk>
          </g>
        );
      })}
    </g>
  );
};

const Nokia5110: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={3} y={2} width={w - 6} height={h - 10} rx={0.4} fill="#9ac279" stroke="#6f9456" strokeWidth={0.2} />
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => (
          <rect key={`${r}-${c}`} x={4.2 + c * (w - 10) / 8} y={3 + r * (h - 12) / 5} width={(w - 10) / 8 - 0.5} height={(h - 12) / 5 - 0.5} fill="#7fa862" opacity={0.6} />
        )),
      )}
      <Silk x={w / 2} y={h - 5.5} size={1}>5110 LCD</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.55}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const NeoRing16: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 2) / 2 + 0.5;
  const r = Math.min(w, h) * 0.42;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={PCB_NAVY} strokeWidth={4.5} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
        return (
          <g key={i}>
            <rect x={cx + Math.cos(a) * r - 1.2} y={cy + Math.sin(a) * r - 1.2} width={2.4} height={2.4} rx={0.25} fill={CHIP} />
            <circle cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={0.55} fill="#8a2a2a" />
          </g>
        );
      })}
      <Silk x={cx} y={cy + 1} size={1.2}>RING16</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y} r={0.4} />
          <Silk x={p.x} y={p.y + 2} size={0.55}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const TtMotor: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={2} y={4} width={w - 4} height={h - 8} rx={1.5} fill="#f2f2f2" stroke={METAL_D} strokeWidth={0.35} />
      <rect x={2} y={4} width={6} height={h - 8} rx={1} fill="#2b5ea8" />
      <rect x={w - 8} y={4} width={6} height={h - 8} rx={1} fill="#2b5ea8" />
      <rect x={w / 2 - 1.2} y={0.5} width={2.4} height={4} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <rect x={w / 2 - 3} y={h - 4.5} width={6} height={2.4} rx={0.4} fill="#c8543c" />
      <Silk x={w / 2} y={h / 2 + 1.8} size={1.2} fill="#3a3f46">TT MOTOR</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Bldc: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <circle cx={w / 2} cy={(h - 2) / 2 + 0.5} r={Math.min(w, h) * 0.44} fill="#8a929c" stroke="#5f6872" strokeWidth={0.4} />
      <circle cx={w / 2} cy={(h - 2) / 2 + 0.5} r={Math.min(w, h) * 0.3} fill="#c2ccd4" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={w / 2 + Math.cos(a) * Math.min(w, h) * 0.37} cy={(h - 2) / 2 + 0.5 + Math.sin(a) * Math.min(w, h) * 0.37} r={0.7} fill="#5f6872" />;
      })}
      <circle cx={w / 2} cy={(h - 2) / 2 + 0.5} r={2.4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
      <Silk x={w / 2} y={h - 4} size={1}>BLDC</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Servo: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={2} y={3} width={w - 4} height={h - 7} rx={1} fill="#1c2a67" stroke="#0f1740" strokeWidth={0.35} />
      <rect x={w / 2 - 2.5} y={1} width={5} height={3.5} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <circle cx={w / 2} cy={3.2} r={1.4} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
      <rect x={2.5} y={h - 6} width={4} height={2.5} fill="#2b3a87" />
      <rect x={w - 6.5} y={h - 6} width={4} height={2.5} fill="#2b3a87" />
      <Silk x={w / 2} y={h / 2 + 1.6} size={1.2} fill="#dfe5ff">{d.label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Solenoid: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={2.5} width={w - 3} height={h - 7} rx={1.2} fill={METAL} stroke={METAL_D} strokeWidth={0.35} />
      {Array.from({ length: 7 }, (_, i) => (
        <line key={i} x1={3 + i * (w - 7) / 7} y1={3.5} x2={3 + i * (w - 7) / 7} y2={h - 5.5} stroke="#c87f2f" strokeWidth={1.1} />
      ))}
      <rect x={w / 2 - 2} y={0.5} width={4} height={2.5} rx={0.6} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w / 2} y={h - 4.5} size={0.9}>{d.label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Peltier: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 4} rx={0.6} fill="#e8eef4" stroke={METAL_D} strokeWidth={0.35} />
      <rect x={2.2} y={2.2} width={w - 4.4} height={h - 6.4} rx={0.4} fill="#cfd8e3" stroke={METAL_D} strokeWidth={0.2} />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={3.4 + (i % 4) * ((w - 7) / 4)} y={3.4 + Math.floor(i / 4) * ((h - 8.5) / 4)} width={(w - 7) / 4 - 1} height={(h - 8.5) / 4 - 1} fill="#8a6a3a" />
      ))}
      <Silk x={w / 2} y={h - 3.2} size={0.9} fill="#3a3f46">TEC1</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Fan5v: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 2) / 2 + 0.5;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 3} rx={1} fill="#2b2f36" stroke="#000" strokeWidth={0.4} />
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.38} fill="#454c58" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} Q ${cx + Math.cos(a) * 5 - 1} ${cy + Math.sin(a) * 5 - 1} ${cx + Math.cos(a + 0.7) * 7} ${cy + Math.sin(a + 0.7) * 7}`}
            fill="none"
            stroke="#6f7a86"
            strokeWidth={1.4}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={1.8} fill="#14161a" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const LipoPack: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 4} rx={1} fill="#2b2f36" stroke="#000" strokeWidth={0.35} />
      <rect x={2.4} y={2.4} width={w - 4.8} height={h - 6.8} rx={0.7} fill="#3a3f46" />
      <Silk x={w / 2} y={h / 2} size={1.2}>LiPo 2S</Silk>
      <Silk x={w / 2} y={h / 2 + 2.4} size={0.85} fill="#8f9aa6">7.4V</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Usb5v: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={1} width={w - 3} height={4.5} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={2.6} y={2} width={w - 5.2} height={2.5} fill="#e8eef4" />
      <rect x={3} y={5.5} width={w - 6} height={h - 9} rx={0.5} fill="#2b2f36" />
      <Silk x={w / 2} y={h - 6.5} size={0.9}>USB 5V</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 4} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const LevelShifter: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.5} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={w / 2 - 3.5} y={h / 2 - 3.5} width={7} height={5} rx={0.4} fill={CHIP} />
      <Silk x={w / 2} y={h / 2 + 3.5} size={0.75}>TXS0108</Silk>
      {d.pins.map((p) => {
        const bottom = p.y > h - 2;
        return bottom ? (
          <g key={p.id}>
            <Hole x={p.x} y={p.y - 1} />
            <Silk x={p.x} y={p.y - 2.1} size={0.6}>{p.id}</Silk>
          </g>
        ) : (
          <g key={p.id}>
            <Hole x={p.x > w / 2 ? p.x + 1 : p.x - 1} y={p.y} />
            <Silk x={p.x > w / 2 ? p.x + 2.2 : p.x - 2.2} y={p.y + 0.3} size={0.55} anchor={p.x > w / 2 ? "start" : "end"}>{p.id}</Silk>
          </g>
        );
      })}
    </g>
  );
};

const Mt3608: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.5} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={3} y={3} width={5} height={4} rx={0.4} fill={CHIP} />
      <rect x={10} y={2.5} width={4} height={3.5} rx={0.6} fill="#3a3f46" />
      <rect x={16} y={3} width={3.5} height={3.5} rx={0.5} fill="#2b2f36" />
      <line x1={17.75} y1={3} x2={17.75} y2={1.5} stroke={METAL_D} strokeWidth={0.5} />
      <Silk x={w / 2} y={h - 4.5} size={0.9}>MT3608 BOOST</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
          <Silk x={p.x} y={p.y - 2.1} size={0.6}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

export const BATCH4_ART: Record<string, ArtFn> = {
  // radio / MCU modules
  rc522: Rc522,
  pn532: Pn532,
  rdm6300: module("RDM6300", PCB_GREEN),
  "esp-01s": Esp01,
  "esp-12f": espMod("ESP-12F"),
  "wemos-d1-mini": D1Mini,
  "hc-06": espMod("HC-06", 7),
  "hm-10": espMod("HM-10 BLE", 7),
  "hc-12": espMod("HC-12", 8),
  "sx1278-lora": espMod("SX1278 LoRa", 11),
  sim800l: espMod("SIM800L", 8),
  "neo-6m": Neo6m,
  // wire / power modules
  "mcp2515-can": Mcp2515,
  "rs485-module": Rs485,
  cp2102: UsbSerial,
  ch340g: UsbSerial,
  "level-shifter": LevelShifter,
  mt3608: Mt3608,
  "servo-tester": module("SERVO TEST", PCB_GREEN),
  // audio
  "dfplayer-mini": DfPlayer,
  pam8403: module("PAM8403", PCB_BLUE),
  max98357: module("MAX98357", PCB_PURPLE),
  tea5767: module("TEA5767", PCB_BLUE),
  // motor drivers / relays
  a4988: A4988,
  drv8825: A4988,
  tb6612: module("TB6612FNG", PCB_NAVY),
  mx1508: module("MX1508", PCB_BLUE),
  "relay-2ch": module("RELAY 2CH", PCB_BLUE),
  // displays
  "st7735-tft": module("ST7735 TFT", PCB_RED),
  "ili9341-tft": module("ILI9341", PCB_RED),
  "eink-29": module("E-INK 2.9", PCB_NAVY),
  "nixie-in14": NixieTube,
  "neopixel-stick8": NeoStick,
  "ws2812-matrix8": DotMatrix,
  "led-bar-10": LedBar,
  "7seg-4digit": SevenSeg4,
  "dot-matrix-8x8": DotMatrix,
  "nokia-5110": Nokia5110,
  "lcd-2004": Lcd2004,
  "neopixel-ring16": NeoRing16,
  // motors / mechanics
  "tt-gearmotor": TtMotor,
  "n20-gearmotor": TtMotor,
  bldc: Bldc,
  nema17: nema("NEMA 17", "#3a3f46"),
  nema23: nema("NEMA 23", "#3a3f46"),
  mg90s: Servo,
  ds3218: Servo,
  "linear-actuator": Solenoid,
  "solenoid-valve": Solenoid,
  "solenoid-lock": Solenoid,
  peltier: Peltier,
  "fan-5v": Fan5v,
  "water-pump": TtMotor,
  electromagnet: Solenoid,
  // power
  "lipo-2s": LipoPack,
  "usb-5v": Usb5v,
};
