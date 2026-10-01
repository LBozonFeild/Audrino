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
const GOLD_D = "#8a7420";

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

function Qfn({ x, y, w, h, label, pads = 8 }: { x: number; y: number; w: number; h: number; label?: string; pads?: number }) {
  return (
    <g>
      {Array.from({ length: Math.floor(pads / 2) }, (_, i) => (
        <g key={i}>
          <rect x={x + 0.6 + (i * (w - 1.2)) / (pads / 2 - 1)} y={y - 0.5} width={0.5} height={0.6} fill={METAL_D} />
          <rect x={x + 0.6 + (i * (w - 1.2)) / (pads / 2 - 1)} y={y + h - 0.1} width={0.5} height={0.6} fill={METAL_D} />
        </g>
      ))}
      <rect x={x} y={y} width={w} height={h} rx={0.3} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <circle cx={x + 0.8} cy={y + 0.8} r={0.35} fill="#3a4149" />
      {label ? <Silk x={x + w / 2} y={y + h / 2 + 0.4} size={Math.min(1, w / 8)} fill="#9aa4ae">{label}</Silk> : null}
    </g>
  );
}

function Tact({ x, y, w = 4, h = 4 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.3} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
      <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.32} fill="#0d0f12" />
    </g>
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
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.7} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
      {/* etched square-spiral antenna */}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={2 + i * 1.15} y={1.8 + i * 1.15} width={w - 4 - i * 2.3} height={11.5 - i * 2.3} rx={0.8} fill="none" stroke={GOLD} strokeWidth={0.55} opacity={0.95} />
      ))}
      <line x1={w / 2} y1={13.3} x2={w / 2} y2={14.6} stroke={GOLD} strokeWidth={0.55} />
      <Qfn x={w / 2 - 3} y={14.6} w={6} h={5} label="MFRC522" pads={8} />
      <rect x={2.4} y={15.4} width={2.2} height={1.4} rx={0.2} fill={METAL} stroke={METAL_D} strokeWidth={0.15} />
      <Silk x={w - 2} y={17.6} size={0.7} anchor="end">RC522</Silk>
      <PinMarks d={d} ls={0.5} />
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
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.8} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={w / 2 - 3.6} y={0.3} width={7.2} height={3.6} rx={0.7} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={w / 2 - 2.6} y={1.1} width={5.2} height={2} rx={0.4} fill="#2b3138" />
      {/* PCB meander antenna of the ESP-12F */}
      <path d={`M 6 10 V 5.6 H 8 V 8.4 H 10 V 5.6 H 12 V 8.4 H 14 V 5.6 H 16 V 8.4 H 18 V 5.6 H ${w - 6} V 10`} fill="none" stroke={GOLD} strokeWidth={0.5} />
      <rect x={w / 2 - 2} y={6.2} width={4} height={3} rx={0.3} fill={CHIP} />
      <rect x={4.6} y={10.6} width={w - 9.2} height={15} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <Silk x={w / 2} y={18.6} size={1.1} fill="#4a545e">ESP-12F</Silk>
      <rect x={w / 2 - 2} y={26.2} width={4} height={3} rx={0.3} fill={CHIP} />
      <Tact x={2.4} y={27.4} w={3.2} h={3.2} />
      <Silk x={w / 2} y={32.6} size={0.9}>D1 MINI</Silk>
      <PinMarks d={d} ls={0.5} />
    </g>
  );
};

const Esp01: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.6} fill="#1b1e24" stroke="#000" strokeWidth={0.3} />
      <rect x={1.1} y={1.1} width={w - 2.2} height={6} rx={0.4} fill="#101216" stroke="#000" strokeWidth={0.2} />
      {d.pins.map((p) => (
        <rect key={p.id} x={p.x - 0.4} y={p.y - 0.4} width={0.8} height={0.8} fill={GOLD} />
      ))}
      <rect x={5} y={8.2} width={6} height={5.4} rx={0.3} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <circle cx={6} cy={9.2} r={0.35} fill="#3a4149" />
      <rect x={11.6} y={9} width={2.4} height={1.5} rx={0.2} fill={METAL} stroke={METAL_D} strokeWidth={0.15} />
      <path d="M 2.4 17.2 V 13.4 H 4.6 V 15.8 H 6.8 V 13.4 H 9 V 15.8 H 11.2 V 13.4 H 13.4 V 17.2" fill="none" stroke={GOLD} strokeWidth={0.55} />
    </g>
  );
};

const Neo6m: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.8} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      {/* ceramic patch antenna */}
      <rect x={2.2} y={1.8} width={14.5} height={14.5} rx={0.5} fill="#d9d6cb" stroke="#aaa79b" strokeWidth={0.35} />
      <rect x={4} y={3.6} width={10.9} height={10.9} fill="none" stroke="#c2bfb2" strokeWidth={0.4} />
            {/* shielded receiver can */}
      <rect x={18.6} y={2.4} width={15} height={11.4} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
      <Silk x={26.1} y={8.8} size={1.3} fill="#3a4149">NEO-6M</Silk>
      <circle cx={21.6} cy={17} r={2.1} fill={METAL_L} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={21.6} cy={17} r={1.2} fill="#8f9aa6" />
      <rect x={26} y={15.6} width={4.4} height={3} rx={0.3} fill={CHIP} />
      <Silk x={28.2} y={20.2} size={0.6}>GPS</Silk>
      <PinMarks d={d} ls={0.6} />
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
  const drv = d.type === "drv8825" ? "DRV8825" : "A4988";
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.7} fill={PCB_RED} stroke="#6d1f18" strokeWidth={0.3} />
      <rect x={w / 2 - 3.2} y={2.6} width={6.4} height={6.4} rx={0.3} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <circle cx={w / 2 - 2.2} cy={3.6} r={0.4} fill="#3a4149" />
      <Silk x={w / 2} y={7} size={0.8}>{drv}</Silk>
      {/* trim potentiometer with cross slot */}
      <rect x={w / 2 - 2.1} y={11.4} width={4.2} height={4.2} rx={0.4} fill="#cfd6dc" stroke="#8f9aa6" strokeWidth={0.25} />
      <circle cx={w / 2} cy={13.5} r={1.3} fill="#aeb6bd" stroke="#7c8792" strokeWidth={0.2} />
      <line x1={w / 2 - 1} y1={13.5} x2={w / 2 + 1} y2={13.5} stroke="#5c6570" strokeWidth={0.35} />
      <line x1={w / 2} y1={12.5} x2={w / 2} y2={14.5} stroke="#5c6570" strokeWidth={0.35} />
      <rect x={2.2} y={3} width={1.8} height={1} rx={0.2} fill="#8a6d3b" />
      <rect x={2.2} y={5} width={1.8} height={1} rx={0.2} fill="#8a6d3b" />
      <rect x={w - 4} y={3} width={1.8} height={1} rx={0.2} fill="#8a6d3b" />
      <Silk x={w / 2} y={18.2} size={0.7}>{`${drv} carrier`}</Silk>
      <PinMarks d={d} ls={0.45} />
    </g>
  );
};

const DfPlayer: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.7} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={0.2} y={2.6} width={9.4} height={10} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={0.2} y={2.6} width={9.4} height={2} fill="#8f9aa6" />
      <line x1={1.4} y1={7.6} x2={8.4} y2={7.6} stroke="#6f7a86" strokeWidth={0.4} />
      <Silk x={4.9} y={11.4} size={0.6} fill="#4a545e">microSD</Silk>
      <rect x={11.6} y={4} width={6} height={5} rx={0.3} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <Silk x={14.6} y={10.6} size={0.7}>DFPlayer Mini</Silk>
      <rect x={12} y={11.6} width={2} height={1.2} rx={0.2} fill={METAL} stroke={METAL_D} strokeWidth={0.15} />
      <PinMarks d={d} ls={0.5} />
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


// ---- accurate display-module helpers -----------------------------------------
/** Pin holes + silk labels placed inboard of the frozen pad positions. */
function PinMarks({ d, ls = 0.6 }: { d: PartDefinition; ls?: number }) {
  const { w, h } = d.size_mm;
  return (
    <g>
      {d.pins.map((p) => {
        const bottom = p.y > h - 2;
        const top = p.y < 2;
        return bottom || top ? (
          <g key={p.id}>
            <Hole x={p.x} y={bottom ? p.y - 1 : p.y + 1} r={0.5} />
            <Silk x={p.x} y={bottom ? p.y - 1.9 : p.y + 2.7} size={ls}>{p.id}</Silk>
          </g>
        ) : (
          <g key={p.id}>
            <Hole x={p.x > w / 2 ? p.x - 1 : p.x + 1} y={p.y} r={0.5} />
            <Silk x={p.x > w / 2 ? p.x - 2 : p.x + 2} y={p.y + 0.35} size={ls} anchor={p.x > w / 2 ? "end" : "start"}>{p.id}</Silk>
          </g>
        );
      })}
    </g>
  );
}

/** Black glass panel: bezel, polariser, active area and raking sheen. */
function Glass({ x, y, w, h, active = "#0a1120", tint }: { x: number; y: number; w: number; h: number; active?: string; tint?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.7} fill="#08090c" stroke="#000" strokeWidth={0.35} />
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={0.5} fill="none" stroke="#3a4149" strokeWidth={0.25} opacity={0.7} />
      <rect x={x + 2} y={y + 1.8} width={w - 4} height={h - 3.6} rx={0.3} fill={active} />
      {tint ? <rect x={x + 2} y={y + 1.8} width={w - 4} height={h - 3.6} rx={0.3} fill={tint} opacity={0.25} /> : null}
                </g>
  );
}

/** One seven-segment digit, segment polygons (not a font glyph). */
function Seg7({ x, y, w, h, on = "#d92b2b", off = "#4a1212", dp = true }: { x: number; y: number; w: number; h: number; on?: string; off?: string; dp?: boolean }) {
  const t = Math.max(0.5, w * 0.18);
  const seg = (d: string, lit: boolean) => <path d={d} fill={lit ? on : off} opacity={lit ? 1 : 0.55} />;
  const hw = w / 2, hh = h / 2;
  const H = (yy: number) => `M ${x + t * 0.7} ${yy} L ${x + t * 1.2} ${yy - t * 0.5} L ${x + w - t * 1.2} ${yy - t * 0.5} L ${x + w - t * 0.7} ${yy} L ${x + w - t * 1.2} ${yy + t * 0.5} L ${x + t * 1.2} ${yy + t * 0.5} Z`;
  const V = (xx: number, y0: number) => `M ${xx} ${y0 + t * 0.7} L ${xx - t * 0.5} ${y0 + t * 1.2} L ${xx - t * 0.5} ${y0 + hh - t * 1.2} L ${xx} ${y0 + hh - t * 0.7} L ${xx + t * 0.5} ${y0 + hh - t * 1.2} L ${xx + t * 0.5} ${y0 + t * 1.2} Z`;
  return (
    <g>
      {seg(H(y + t * 0.6), true)}{seg(H(y + hh), true)}{seg(H(y + h - t * 0.6), true)}
      {seg(V(x + t * 0.6, y), true)}{seg(V(x + w - t * 0.6, y), true)}
      {seg(V(x + t * 0.6, y + hh), true)}{seg(V(x + w - t * 0.6, y + hh), true)}
      {dp ? <circle cx={x + w + t * 0.9} cy={y + h - t * 0.6} r={t * 0.55} fill={off} opacity={0.6} /> : null}
    </g>
  );
}

/** Black male header plastic with gold pins along a row. */
function HeaderStrip({ x, y, n, pitch, vert = false }: { x: number; y: number; n: number; pitch: number; vert?: boolean }) {
  const len = n * pitch;
  return vert ? (
    <g>
      <rect x={x - 1} y={y - pitch / 2} width={2} height={len} rx={0.3} fill="#17181c" stroke="#000" strokeWidth={0.2} />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x - 0.35} y={y + i * pitch - 0.35} width={0.7} height={0.7} fill={GOLD} />
      ))}
    </g>
  ) : (
    <g>
      <rect x={x - pitch / 2} y={y - 1} width={len} height={2} rx={0.3} fill="#17181c" stroke="#000" strokeWidth={0.2} />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * pitch - 0.35} y={y - 0.35} width={0.7} height={0.7} fill={GOLD} />
      ))}
    </g>
  );
}

// ---- accurate display renderers ----------------------------------------------
const St7735: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4.5} rx={0.8} fill={PCB_RED} stroke="#6d1f18" strokeWidth={0.35} />
      {[[2.6, 2.6], [w - 2.6, 2.6]].map(([x, y]) => (
        <g key={`${x}`}>
          <circle cx={x} cy={y} r={1.1} fill="#0d0f12" />
          <circle cx={x} cy={y} r={1.1} fill="none" stroke={METAL_D} strokeWidth={0.35} />
        </g>
      ))}
      <Glass x={2.2} y={1.6} w={w - 4.4} h={h - 10} active="#0b0d12" tint="#20304d" />
      <Silk x={w / 2} y={h - 5.2} size={0.9}>1.8" TFT 128x160</Silk>
      <PinMarks d={d} ls={0.55} />
    </g>
  );
};

const Ili9341: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4.5} rx={0.8} fill={PCB_RED} stroke="#6d1f18" strokeWidth={0.35} />
      {[[2.8, 2.8], [w - 2.8, 2.8], [2.8, h - 7.4], [w - 2.8, h - 7.4]].map(([x, y]) => (
        <g key={`${x},${y}`}>
          <circle cx={x} cy={y} r={1.2} fill="#0d0f12" />
          <circle cx={x} cy={y} r={1.2} fill="none" stroke={METAL_D} strokeWidth={0.35} />
        </g>
      ))}
      <Glass x={3} y={2} w={w - 6} h={h - 11.5} active="#0a0c11" tint="#26364f" />
      <Silk x={w / 2} y={h - 5.4} size={1}>ILI9341 2.4" TFT</Silk>
      <PinMarks d={d} ls={0.55} />
    </g>
  );
};

const Eink29: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4.5} rx={0.8} fill={PCB_RED} stroke="#6d1f18" strokeWidth={0.35} />
      {/* e-paper film: matte paper-white with FPC tail into the driver side */}
      <rect x={2.4} y={1.4} width={w - 4.8} height={h - 9.4} rx={0.4} fill="#e9e7df" stroke="#b9b5a8" strokeWidth={0.3} />
            <rect x={3.4} y={2.4} width={w - 6.8} height={h - 11.4} fill="none" stroke="#cfccc0" strokeWidth={0.25} />
      <rect x={w / 2 - 6} y={h - 9.2} width={12} height={1.4} rx={0.3} fill="#8a6d3b" opacity={0.85} />
      <rect x={w / 2 - 4.4} y={h - 8.4} width={8.8} height={1.5} rx={0.3} fill="#17181c" />
      {[[2.6, h - 6.6], [w - 2.6, h - 6.6]].map(([x, y]) => (
        <g key={`${x}`}>
          <circle cx={x} cy={y} r={1} fill="#0d0f12" />
          <circle cx={x} cy={y} r={1} fill="none" stroke={METAL_D} strokeWidth={0.3} />
        </g>
      ))}
      <Silk x={w / 2} y={h - 5.2} size={0.85}>2.9" e-Paper</Silk>
      <PinMarks d={d} ls={0.55} />
    </g>
  );
};

const Tm1637: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.6} rx={0.7} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={1.6} y={1.4} width={w - 3.2} height={h - 7} rx={0.5} fill="#101216" stroke="#000" strokeWidth={0.3} />
      {Array.from({ length: 4 }, (_, i) => (
        <Seg7 key={i} x={2.6 + i * (w - 5.2) / 4} y={2.3} w={(w - 5.2) / 4 - 1} h={h - 9} />
      ))}
      <PinMarks d={d} ls={0.55} />
    </g>
  );
};


// ---- accurate module renderers (sweep 2) --------------------------------------
const Relay2ch: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const term = d.pins.filter((p) => p.y < 2);
  const sig = d.pins.filter((p) => p.y > h - 2);
  return (
    <g>
      <rect x={0.5} y={4.6} width={w - 1} height={h - 5.1} rx={0.7} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      {/* screw terminal block along the top edge */}
      <rect x={1.6} y={0.4} width={w - 3.2} height={5} rx={0.4} fill="#1d5c9a" stroke="#0f3a66" strokeWidth={0.3} />
      {term.map((p, i) => (
        <g key={p.id}>
          {i > 0 ? <line x1={1.6 + (i * (w - 3.2)) / term.length} y1={0.4} x2={1.6 + (i * (w - 3.2)) / term.length} y2={5.4} stroke="#0f3a66" strokeWidth={0.3} /> : null}
          <circle cx={p.x} cy={2.9} r={1.15} fill={METAL_L} stroke={METAL_D} strokeWidth={0.25} />
          <line x1={p.x - 0.8} y1={2.9} x2={p.x + 0.8} y2={2.9} stroke="#5c6570" strokeWidth={0.4} />
          <rect x={p.x - 1} y={0.5} width={2} height={1.1} fill="#0a1a2e" />
        </g>
      ))}
      {/* two songle-style relay boxes */}
      {[3.4, 17.6].map((x) => (
        <g key={x}>
          <rect x={x} y={6.6} width={12} height={9.4} rx={0.5} fill="#2450a4" stroke="#16336b" strokeWidth={0.3} />
                    <Silk x={x + 6} y={11} size={1} fill="#dfe8f4">SRD-05VDC</Silk>
          <Silk x={x + 6} y={13.4} size={0.8} fill="#a8bcda">SL-C</Silk>
        </g>
      ))}
      <rect x={7} y={17} width={3} height={2.2} rx={0.3} fill={CHIP} />
      <rect x={21} y={17} width={3} height={2.2} rx={0.3} fill={CHIP} />
      {sig.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} r={0.5} />
          <Silk x={p.x} y={p.y - 2} size={0.55}>{p.id}</Silk>
        </g>
      ))}
    </g>
  );
};

const ServoTester: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.6} rx={0.7} fill={PCB_GREEN} stroke="#14522d" strokeWidth={0.3} />
      {[1.6, 11.6, 21.6].map((x) => (
        <g key={x}>
          <rect x={x} y={1.4} width={9} height={2.6} rx={0.3} fill="#17181c" stroke="#000" strokeWidth={0.2} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x + 1.5 + i * 3 - 0.4} y={2.3} width={0.8} height={0.8} fill={GOLD} />
          ))}
        </g>
      ))}
      <rect x={12} y={6.4} width={7} height={4.4} rx={0.3} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <Silk x={15.5} y={9.2} size={0.7}>SVO TESTER</Silk>
      <Tact x={3} y={6.6} w={3} h={3} />
      <rect x={8} y={7} width={1.4} height={0.9} rx={0.2} fill="#d43b2e" />
      <rect x={8} y={8.6} width={1.4} height={0.9} rx={0.2} fill="#3bd465" />
      <PinMarks d={d} ls={0.55} />
    </g>
  );
};

const Tb6612: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.7} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      <rect x={w / 2 - 3} y={h / 2 - 3.4} width={6} height={6} rx={0.3} fill={CHIP} stroke="#000" strokeWidth={0.2} />
      <circle cx={w / 2 - 2} cy={h / 2 - 2.4} r={0.35} fill="#3a4149" />
      <Silk x={w / 2} y={h / 2 + 0.4} size={0.75}>TB6612FNG</Silk>
      {[[3, 2.4], [3, 4.6], [w - 4.8, 2.4], [w - 4.8, 4.6], [3, h - 4], [w - 4.8, h - 4]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={1.8} height={1} rx={0.2} fill="#8a6d3b" />
      ))}
      <PinMarks d={d} ls={0.45} />
    </g>
  );
};

const Sim800l: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.7} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={1.8} y={1.8} width={12.4} height={11.4} rx={0.5} fill="url(#matSteel)" stroke="#5c6570" strokeWidth={0.3} />
      <Silk x={8} y={8} size={1.2} fill="#3a4149">SIM800L</Silk>
      <path d={`M ${w - 7.4} 10 V 3 H ${w - 5.4} V 6.4 H ${w - 3.4} V 3 H ${w - 1.4} V 10`} fill="none" stroke={GOLD} strokeWidth={0.55} />
      <circle cx={17.4} cy={11.4} r={1} fill={GOLD} stroke={GOLD_D} strokeWidth={0.25} />
      <circle cx={17.4} cy={11.4} r={0.4} fill="#f2f6fa" />
      <rect x={3} y={14.4} width={3.4} height={2.2} rx={0.2} fill={CHIP} />
      <Silk x={w / 2} y={h - 5.2} size={0.8}>SIM800L GSM</Silk>
      <PinMarks d={d} ls={0.6} />
    </g>
  );
};

const SevenSeg4: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.6} fill="#15171b" stroke="#000" strokeWidth={0.3} />
      <rect x={1.4} y={1.4} width={w - 2.8} height={h - 4.6} rx={0.4} fill="#1d1012" stroke="#000" strokeWidth={0.25} />
      {Array.from({ length: 4 }, (_, i) => (
        <Seg7 key={i} x={2.4 + i * (w - 4.4) / 4} y={2.4} w={(w - 4.4) / 4 - 1.4} h={h - 6.6} on="#e03434" off="#571616" />
      ))}
            <PinMarks d={d} ls={0.5} />
    </g>
  );
};

const DotMatrix: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const gx = (w - 5) / 7;
  const gy = (h - 5) / 7;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.7} fill={PCB_RED} stroke="#6d1f18" strokeWidth={0.3} />
      <rect x={1.8} y={1.8} width={w - 3.6} height={h - 3.6} rx={0.5} fill="#141519" stroke="#000" strokeWidth={0.3} />
      {Array.from({ length: 64 }, (_, i) => {
        const cx = 2.5 + (i % 8) * gx;
        const cy = 2.5 + Math.floor(i / 8) * gy;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={0.85} fill="#5c1a1a" />
            <circle cx={cx} cy={cy} r={0.85} fill="none" stroke="#3a0f0f" strokeWidth={0.2} />
                      </g>
        );
      })}
      <PinMarks d={d} ls={0.45} />
    </g>
  );
};

const Nokia5110: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.8} fill={PCB_NAVY} stroke="#163a66" strokeWidth={0.3} />
      {[[2.4, 2.4], [w - 2.4, 2.4], [2.4, h - 6.4], [w - 2.4, h - 6.4]].map(([x, y]) => (
        <g key={`${x},${y}`}>
          <circle cx={x} cy={y} r={1} fill="#0d0f12" />
          <circle cx={x} cy={y} r={1} fill="none" stroke={METAL_D} strokeWidth={0.3} />
        </g>
      ))}
      {/* stainless bezel, polariser frame, grey-green STN glass */}
      <rect x={4.2} y={1.8} width={w - 8.4} height={h - 10.6} rx={0.5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.35} />
      <rect x={5.2} y={2.8} width={w - 10.4} height={h - 12.6} rx={0.3} fill="#22262b" />
      <rect x={6} y={3.6} width={w - 12} height={h - 14.2} rx={0.2} fill="#9fae93" />
      {Array.from({ length: 6 }, (_, r) => (
        <line key={r} x1={6} y1={3.6 + (r + 1) * (h - 14.2) / 7} x2={w - 6} y2={3.6 + (r + 1) * (h - 14.2) / 7} stroke="#87977c" strokeWidth={0.18} opacity={0.7} />
      ))}
            <Silk x={w / 2} y={h - 5.4} size={0.9}>NOKIA 5110 LCD</Silk>
      <PinMarks d={d} ls={0.55} />
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
      <rect x={2} y={4} width={w - 4} height={h - 8} rx={1.5} fill="#d9a520" stroke="#a87c14" strokeWidth={0.35} />
      <rect x={2} y={4} width={6} height={h - 8} rx={1} fill="#b8891a" />
      <rect x={w - 8} y={4} width={6} height={h - 8} rx={1} fill="#b8891a" />
      <rect x={w / 2 - 1.2} y={0.5} width={2.4} height={4} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <rect x={w / 2 - 3} y={h - 4.5} width={6} height={2.4} rx={0.4} fill="#c8543c" />
      <Silk x={w / 2} y={h / 2 + 1.8} size={1.2} fill="#5c4a12">TT MOTOR</Silk>
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
  sim800l: Sim800l,
  "neo-6m": Neo6m,
  // wire / power modules
  "mcp2515-can": Mcp2515,
  "rs485-module": Rs485,
  cp2102: UsbSerial,
  ch340g: UsbSerial,
  "level-shifter": LevelShifter,
  mt3608: Mt3608,
  "servo-tester": ServoTester,
  // audio
  "dfplayer-mini": DfPlayer,
  pam8403: module("PAM8403", PCB_BLUE),
  max98357: module("MAX98357", PCB_PURPLE),
  tea5767: module("TEA5767", PCB_BLUE),
  // motor drivers / relays
  a4988: A4988,
  drv8825: A4988,
  tb6612: Tb6612,
  mx1508: module("MX1508", PCB_BLUE),
  "relay-2ch": Relay2ch,
  // displays
  "st7735-tft": St7735,
  "ili9341-tft": Ili9341,
  "eink-29": Eink29,
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
  "usb-5v": Usb5v,
};
