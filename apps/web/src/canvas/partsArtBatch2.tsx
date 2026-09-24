import type { ReactElement } from "react";
import type { PartDefinition, PartPin } from "@audrino/schema";

/** Batch-2 art: ICs, discretes, passives, connectors, switches. Heavy factory use. */

const METAL = "#b8c2cc";
const METAL_D = "#8f9aa6";
const METAL_L = "#d8dee5";
const GOLD = "#c9a227";
const BLACK = "#14161a";
const CHIP = "#0d0f12";
const SILK = "#eef4f9";
const LEAD = "#a8b2bc";
const PCB_NAVY = "#1d4e89";

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

function Silk({ x, y, size = 1.3, fill = SILK, children, weight = 600, anchor = "middle" }: { x: number; y: number; size?: number; fill?: string; children: string; weight?: number; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} style={{ fontSize: size, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: weight, pointerEvents: "none" }}>
      {children}
    </text>
  );
}

function ScrewBlock({ x, y, w = 5, h = 5, label }: { x: number; y: number; w?: number; h?: number; label?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.4} fill="#2f8f5b" stroke="#1f6b41" strokeWidth={0.3} />
      <circle cx={x + w / 2} cy={y + h / 2} r={h * 0.28} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      {label && <Silk x={x + w / 2} y={y + h - 0.6} size={0.85} fill="#eafff2">{label}</Silk>}
    </g>
  );
}

function Strip({ pts, vertical }: { pts: PartPin[]; vertical?: boolean }) {
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const v = vertical ?? Math.max(...ys) - Math.min(...ys) > Math.max(...xs) - Math.min(...xs);
  const x = Math.min(...xs) - 1.3;
  const y = Math.min(...ys) - 1.3;
  const w = (v ? 0 : Math.max(...xs) - Math.min(...xs)) + 2.6;
  const h = (v ? Math.max(...ys) - Math.min(...ys) : 0) + 2.6;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.5} fill="#16181d" stroke="#0b0d10" strokeWidth={0.25} />
      {pts.map((p) => (
        <Hole key={p.id} x={p.x} y={p.y} />
      ))}
    </g>
  );
}

// ---- factories ---------------------------------------------------------------
function dip(label: string, big = false): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    return (
      <g>
        <rect x={2.5} y={1.8} width={w - 5} height={h - 3.6} rx={0.5} fill={CHIP} stroke="#000" strokeWidth={0.25} />
        <path d={`M ${w / 2 - 1.3} 1.8 A 1.3 1.3 0 0 0 ${w / 2 + 1.3} 1.8 Z`} fill="#3a3f46" />
        <circle cx={3.6} cy={3} r={0.45} fill="#3a3f46" />
        {d.pins.map((p) => (
          <Lead key={p.id} x1={p.x < w / 2 ? 2.5 : w - 2.5} y1={p.y} x2={p.x} y2={p.y} w={0.55} />
        ))}
        <Silk x={w / 2} y={h / 2 + (big ? 0.7 : 0.8)} size={big ? 1.15 : 1.5}>{label}</Silk>
      </g>
    );
  };
}

function to92(label: string): ArtFn {
  return (d) => (
    <g>
      <path d="M 2.6 8.5 L 2.6 5 A 3.4 3.4 0 0 1 9.4 5 L 9.4 8.5 Z" fill="#1a1c20" stroke="#000" strokeWidth={0.25} />
      <Silk x={6} y={1.8} size={1.15}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={8.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
}

function to220(label: string): ArtFn {
  return (d) => (
    <g>
      <rect x={2} y={0.5} width={8} height={5.5} rx={0.4} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={6} cy={3.2} r={1.15} fill="#5c6572" stroke={METAL_D} strokeWidth={0.2} />
      <rect x={2} y={6} width={8} height={6} rx={0.4} fill="#17181c" stroke="#000" strokeWidth={0.25} />
      <Silk x={6} y={9.8} size={1.3}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={12} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
}

function axial(band: string, glass = false, secondBand?: string): ArtFn {
  return () => (
    <g>
      <Lead x1={0} y1={3} x2={5} y2={3} w={0.75} />
      <Lead x1={11} y1={3} x2={16} y2={3} w={0.75} />
      {glass ? (
        <g>
          <rect x={5} y={1.3} width={6} height={3.4} rx={1.6} fill="#c22" stroke="#8a1c1c" strokeWidth={0.2} opacity={0.9} />
          <rect x={5.4} y={1.6} width={4.6} height={0.8} rx={0.4} fill="#fff" opacity={0.3} />
        </g>
      ) : (
        <g>
          <rect x={5} y={1.4} width={6} height={3.2} rx={0.9} fill="#17181c" stroke="#000" strokeWidth={0.2} />
          <rect x={5.5} y={1.7} width={4.4} height={0.6} rx={0.3} fill="#fff" opacity={0.18} />
        </g>
      )}
      <rect x={9.2} y={1.3} width={1} height={3.4} fill={band} />
      {secondBand && <rect x={10.6} y={1.3} width={0.8} height={3.4} fill={secondBand} />}
    </g>
  );
}

function termScrews(): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    return (
      <g>
        <rect x={0.4} y={h * 0.15} width={w - 0.8} height={h * 0.55} rx={0.5} fill="#2f8f5b" stroke="#1f6b41" strokeWidth={0.3} />
        {d.pins.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={h * 0.42} r={1.4} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
            <line x1={p.x - 0.8} y1={h * 0.42} x2={p.x + 0.8} y2={h * 0.42} stroke={METAL_D} strokeWidth={0.3} />
            <Lead x1={p.x} y1={h * 0.7} x2={p.x} y2={p.y} />
          </g>
        ))}
      </g>
    );
  };
}

function headerPins(): ArtFn {
  return (d) => {
    const { h } = d.size_mm;
    return (
      <g>
        <Strip pts={d.pins.map((p) => ({ ...p, y: p.y - (p.y > h / 2 ? 1.6 : -1.6) }))} />
      </g>
    );
  };
}

function dipSwitchN(n: number): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    return (
      <g>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={0.5} fill="#f2f0e8" stroke="#c9c5b4" strokeWidth={0.3} />
        {Array.from({ length: n }, (_, i) => {
          const sw = (w - 2.5) / n;
          return (
            <g key={i}>
              <rect x={1.8 + i * sw} y={1.8} width={sw - 0.6} height={h - 3.6} rx={0.3} fill="#5c6572" />
              <rect x={2.05 + i * sw} y={i % 3 === 0 ? 1.95 : h / 2 - 0.2} width={sw - 1.1} height={1.7} rx={0.3} fill="#f2f0e8" />
            </g>
          );
        })}
        <Silk x={1.6} y={0.7} size={0.8} fill="#8f8a78" anchor="start">ON</Silk>
        {d.pins.map((p) => (
          <Lead key={p.id} x1={p.x} y1={p.y < h / 2 ? 1 : h - 1} x2={p.x} y2={p.y} />
        ))}
      </g>
    );
  };
}

function keyPad(rows: number, cols: number, labels: string[]): ArtFn {
  return (d) => {
    const { w, h } = d.size_mm;
    const btnW = (w - 4) / cols - 1;
    const btnH = (h - 8) / rows - 1;
    return (
      <g>
        <rect x={0.5} y={0.5} width={w - 1} height={h - 5} rx={1} fill="#2b2f36" stroke="#000" strokeWidth={0.35} />
        {labels.map((lb, i) => {
          const x = 2 + (i % cols) * (btnW + 1);
          const y = 2 + Math.floor(i / cols) * (btnH + 1);
          return (
            <g key={lb}>
              <rect x={x} y={y} width={btnW} height={btnH} rx={0.8} fill="#454c58" stroke="#5c6572" strokeWidth={0.3} />
              <Silk x={x + btnW / 2} y={y + btnH * 0.65} size={Math.min(2, btnH * 0.45)}>{lb}</Silk>
            </g>
          );
        })}
        {d.pins.map((p) => (
          <Lead key={p.id} x1={p.x} y1={h - 4.5} x2={p.x} y2={p.y} w={0.55} />
        ))}
      </g>
    );
  };
}

// ---- one-off parts ------------------------------------------------------------
const BridgeRect: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={2} width={w - 2} height={h - 5} rx={1} fill="#17181c" stroke="#000" strokeWidth={0.3} />
      <circle cx={3.6} cy={h - 4.8} r={0.8} fill="#3a3f46" />
      <Silk x={w / 2} y={h / 2 - 0.2} size={1.4}>BRIDGE</Silk>
      <Silk x={w / 2} y={h / 2 + 1.8} size={1}>~  +  −  ~</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Varistor: ArtFn = (d) => (
  <g>
    <circle cx={5} cy={5.5} r={4.2} fill="#2b4a8a" stroke="#1c3260" strokeWidth={0.3} />
    <rect x={1.2} y={2.6} width={7.6} height={1.6} rx={0.4} fill="#dfe6ee" opacity={0.7} />
    <Silk x={5} y={6.6} size={0.9}>471K</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={9.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const PtcResettable: ArtFn = (d) => (
  <g>
    <path d="M 3 2 Q 7 0.5 11 2 L 11 8 Q 7 10 3 8 Z" fill="#2b7a4a" stroke="#1f5c36" strokeWidth={0.3} />
    <Silk x={7} y={6} size={0.9} fill="#d7ffe8">PPTC</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={8.5} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const FuseGlass: ArtFn = () => (
  <g>
    <Lead x1={0} y1={3} x2={5} y2={3} w={0.8} />
    <Lead x1={11} y1={3} x2={16} y2={3} w={0.8} />
    <rect x={4.6} y={1} width={6.8} height={4} rx={0.6} fill="#dfe9f0" stroke="#b8c2cc" strokeWidth={0.25} opacity={0.9} />
    <line x1={5.4} y1={3} x2={10.6} y2={3} stroke={METAL_D} strokeWidth={0.4} />
    <rect x={4.6} y={1} width={1.4} height={4} rx={0.4} fill={METAL} />
    <rect x={10} y={1} width={1.4} height={4} rx={0.4} fill={METAL} />
  </g>
);

const FuseHolder: ArtFn = (d) => (
  <g>
    <rect x={1} y={1} width={12} height={6} rx={1} fill="#23262b" stroke="#000" strokeWidth={0.3} />
    <rect x={3} y={2.4} width={8} height={3.2} rx={1.4} fill="#3a3f46" />
    <Silk x={7} y={0.8} size={0.9} fill="#8f9aa6">FUSE</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={7} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Shunt: ArtFn = (d) => (
  <g>
    <rect x={1} y={1.5} width={16} height={4} rx={0.8} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
    <circle cx={3.5} cy={3.5} r={1} fill="#5c6572" />
    <circle cx={14.5} cy={3.5} r={1} fill="#5c6572" />
    <Silk x={9} y={7.4} size={0.9} fill="#8f9aa6">SHUNT</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={5.5} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const FilmBox: ArtFn = (d) => (
  <g>
    <rect x={1.5} y={1} width={7} height={9} rx={0.5} fill="#e8c84a" stroke="#b9a13e" strokeWidth={0.3} />
    <rect x={2.2} y={1.8} width={2} height={1.2} fill="#fff" opacity={0.3} />
    <Silk x={5} y={7} size={0.8} fill="#4a3b10">µF</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={10} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const SuperCap: ArtFn = (d) => (
  <g>
    <rect x={2} y={1} width={6} height={11} rx={0.8} fill="#1d3a5f" stroke="#12263f" strokeWidth={0.3} />
    <rect x={2} y={1} width={6} height={1.6} rx={0.4} fill={METAL} />
    <Silk x={5} y={7.5} size={0.9}>5.5V</Silk>
    <Silk x={5} y={9.2} size={0.8}>0.5F</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={12} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Toroid: ArtFn = (d) => (
  <g>
    <circle cx={7} cy={6} r={4.6} fill="#2a3b2a" stroke="#152015" strokeWidth={0.3} />
    <circle cx={7} cy={6} r={2.1} fill="#152015" />
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return (
        <line
          key={i}
          x1={7 + Math.cos(a) * 2.3}
          y1={6 + Math.sin(a) * 2.3}
          x2={7 + Math.cos(a) * 4.5}
          y2={6 + Math.sin(a) * 4.5}
          stroke="#c87f2f"
          strokeWidth={0.7}
        />
      );
    })}
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={10.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const CmChoke: ArtFn = (d) => (
  <g>
    <circle cx={8} cy={5.5} r={4.2} fill="#333a42" stroke="#14161a" strokeWidth={0.3} />
    <circle cx={8} cy={5.5} r={1.7} fill="#14161a" />
    <rect x={2.5} y={3.2} width={3} height={4.4} rx={0.8} fill="#c87f2f" />
    <rect x={9.5} y={3.2} width={3} height={4.4} rx={0.8} fill="#c87f2f" />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={9.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const TransformerEi: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 5} rx={0.8} fill="#3a3f46" stroke="#000" strokeWidth={0.3} />
      <rect x={3} y={3} width={5} height={h - 9} fill="#23262b" stroke="#14161a" strokeWidth={0.2} />
      <rect x={w - 8} y={3} width={5} height={h - 9} fill="#23262b" stroke="#14161a" strokeWidth={0.2} />
      <rect x={w / 2 - 3} y={2.5} width={6} height={h - 8} fill="#5c6572" stroke="#3a3f46" strokeWidth={0.2} />
      <Silk x={w / 2} y={h / 2} size={1.2}>EI</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const probeArt = (label: string): ArtFn => (d) => (
  <g>
    <rect x={3.5} y={1} width={5} height={10} rx={2.2} fill="#23262b" stroke="#000" strokeWidth={0.3} />
    <rect x={4.2} y={1.4} width={1.4} height={3} rx={0.5} fill="#fff" opacity={0.15} />
    <Silk x={6} y={7.6} size={0.8}>{label}</Silk>
    <Lead x1={4.5} y1={11} x2={3.5} y2={16} />
    <Lead x1={7.5} y1={11} x2={8.5} y2={16} />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={14} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Thermocouple: ArtFn = (d) => (
  <g>
    <circle cx={7} cy={3} r={1.6} fill="#8f9aa6" stroke={METAL_D} strokeWidth={0.25} />
    <path d="M 6 4.5 Q 3 9 3.5 13" fill="none" stroke="#c22" strokeWidth={0.6} />
    <path d="M 8 4.5 Q 11 9 10.5 13" fill="none" stroke="#26c" strokeWidth={0.6} />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={13} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const SipResistor: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.4} fill="#17181c" stroke="#000" strokeWidth={0.25} />
      <rect x={w - 2.2} y={1.5} width={1.2} height={2} rx={0.3} fill="#3a3f46" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <Silk x={w / 2} y={h / 2 + 0.2} size={0.9}>SIP</Silk>
    </g>
  );
};

const SlidePot: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1.5} width={w - 2} height={h - 5} rx={0.5} fill="#454c58" stroke="#000" strokeWidth={0.3} />
      <rect x={3} y={h / 2 - 1.4} width={w - 6} height={1.6} rx={0.8} fill="#14161a" />
      <rect x={w / 2 - 2} y={h / 2 - 3.2} width={4} height={5.4} rx={0.7} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w / 2} y={2.8} size={0.9} fill="#8f9aa6">10K</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Crystal32k: ArtFn = (d) => (
  <g>
    <rect x={2} y={1} width={4} height={4} rx={1.8} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <Silk x={4} y={6.8} size={0.7} fill="#8f9aa6">32k</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={5} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const Resonator: ArtFn = (d) => (
  <g>
    <rect x={1} y={1} width={6} height={4} rx={0.6} fill="#c9a06a" stroke="#8a6a3a" strokeWidth={0.25} />
    <Silk x={4} y={3.8} size={0.7} fill="#4a3b10">16M</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={5} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const FlexSensor: ArtFn = (d) => (
  <g>
    <rect x={1.5} y={1} width={3} height={20} rx={1.2} fill="#d8c89a" stroke="#b0a06a" strokeWidth={0.25} />
    <polyline points="2.3,3 3.8,5 2.3,7 3.8,9 2.3,11 3.8,13 2.3,15 3.8,17" fill="none" stroke="#5c5648" strokeWidth={0.35} />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={21} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const FsrForce: ArtFn = (d) => (
  <g>
    <circle cx={8} cy={7} r={5.6} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
    <circle cx={8} cy={7} r={3.4} fill="#3a3f46" />
    <circle cx={8} cy={7} r={1.4} fill="#14161a" />
    <Silk x={8} y={7.5} size={0.9} fill="#8f9aa6">FSR</Silk>
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={12.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const UsbPlug: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={2} width={w - 2} height={h - 6} rx={0.7} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={2.4} y={3.4} width={w - 4.8} height={h - 8.8} rx={0.4} fill="#5c6572" />
      <rect x={3.4} y={h / 2 - 1} width={w - 6.8} height={2} fill="#d7c27a" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} />
      ))}
      <Silk x={w / 2} y={1.2} size={0.9} fill="#8f9aa6">USB-A</Silk>
    </g>
  );
};

const UsbSocket: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={0.5} y={1.5} width={w - 1} height={h - 5.5} rx={0.6} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={2} y={3} width={w - 4} height={h - 8.5} rx={0.4} fill="#14161a" />
      <rect x={3} y={h / 2 - 1} width={w - 6} height={2} fill="#d7c27a" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.2} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const UsbC: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1.5} width={w - 2} height={h - 5} rx={2.4} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <rect x={2.4} y={2.8} width={w - 4.8} height={h - 7.6} rx={1.4} fill="#14161a" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.2} x2={p.x} y2={p.y} />
      ))}
      <Silk x={w / 2} y={1} size={0.8} fill="#8f9aa6">USB-C</Silk>
    </g>
  );
};

const BarrelJack: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 5} rx={0.8} fill={BLACK} stroke="#000" strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2 - 1.5} r={2.4} fill="#2b2f36" stroke="#000" strokeWidth={0.25} />
      <circle cx={w / 2} cy={h / 2 - 1.5} r={1} fill="#050506" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const AudioJack: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={1.5} width={w - 3} height={h - 5} rx={0.6} fill="#23262b" stroke="#000" strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2 - 1.2} r={2.2} fill="#050506" stroke={METAL_D} strokeWidth={0.25} />
      <circle cx={w / 2} cy={h / 2 - 1.2} r={1.1} fill="#000" />
      <Silk x={w / 2} y={1} size={0.8} fill="#8f9aa6">3.5mm</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.2} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Jst2: ArtFn = (d) => (
  <g>
    <rect x={1} y={1} width={6} height={4.5} rx={0.5} fill="#f2f0e8" stroke="#c9c5b4" strokeWidth={0.25} />
    <rect x={2} y={2} width={4} height={1.6} rx={0.3} fill="#14161a" />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={5.2} x2={p.x} y2={p.y} />
    ))}
    <Silk x={4} y={0.8} size={0.7} fill="#8f8a78">PH-2</Silk>
  </g>
);

const ServoConn: ArtFn = (d) => (
  <g>
    <rect x={1} y={0.5} width={10} height={4} rx={0.5} fill="#14161a" stroke="#000" strokeWidth={0.25} />
    {["#6b4a2e", "#c0392b", "#e67e22"].map((c, i) => (
      <rect key={c} x={1.8 + i * 3} y={1.2} width={2.2} height={2.6} rx={0.3} fill={c} opacity={0.8} />
    ))}
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={4.2} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const SlideSwitch: ArtFn = (d) => (
  <g>
    <rect x={1} y={1.5} width={10} height={5} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
    <rect x={3.5} y={2.2} width={3.5} height={3.6} rx={0.4} fill="#23262b" />
    <rect x={6.5} y={2.6} width={2.2} height={2.8} rx={0.4} fill={METAL_L} />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={6.4} x2={p.x} y2={p.y} />
    ))}
  </g>
);

const ArcadeButton: ArtFn = (d) => {
  const { w } = d.size_mm;
  return (
    <g>
      <circle cx={w / 2} cy={w / 2 - 1} r={w * 0.42} fill="#c22" stroke="#8a1c1c" strokeWidth={0.4} />
      <circle cx={w / 2} cy={w / 2 - 1} r={w * 0.3} fill="#e0353b" />
      <path d={`M ${w / 2 - 5} ${w / 2 - 5} A 6 6 0 0 1 ${w / 2} ${w / 2 - 6}`} stroke="#fff" strokeWidth={0.6} opacity={0.35} fill="none" />
      <rect x={w / 2 - 8} y={w - 6.5} width={16} height={3} rx={0.4} fill={METAL_D} />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={w - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const EstopButton: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={w / 2 - 8} y={h - 9} width={16} height={4} rx={1} fill="#e8b33a" stroke="#b08420" strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2 - 4} r={6.4} fill="#c22" stroke="#8a1c1c" strokeWidth={0.4} />
      <circle cx={w / 2} cy={h / 2 - 4} r={4.6} fill="#e0353b" />
      <Silk x={w / 2} y={h / 2 - 3} size={1.3} fill="#fff">STOP</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 4.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const KeySwitch: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={2} y={2} width={w - 4} height={h - 6} rx={1} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2 - 3} r={3.4} fill="#3a3f46" stroke="#14161a" strokeWidth={0.3} />
      <rect x={w / 2 - 0.6} y={h / 2 - 5.4} width={1.2} height={4.8} fill="#14161a" />
      <g transform={`rotate(35 ${w / 2} ${h / 2 - 3})`}>
        <rect x={w / 2 - 0.5} y={h / 2 - 3} width={1} height={7} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
        <circle cx={w / 2} cy={h / 2 + 4.2} r={1.6} fill={METAL_L} stroke={METAL_D} strokeWidth={0.15} />
      </g>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

const Push12: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <rect x={1.5} y={1.5} width={w - 3} height={h - 3} rx={1} fill="#9aa7b4" stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2} r={w * 0.3} fill="#1a1c20" stroke="#000" strokeWidth={0.3} />
      <circle cx={w / 2} cy={h / 2} r={w * 0.18} fill="#2b2f36" />
      <Lead x1={0} y1={h / 2} x2={1.5} y2={h / 2} w={0.8} />
      <Lead x1={w - 1.5} y1={h / 2} x2={w} y2={h / 2} w={0.8} />
    </g>
  );
};

const RotarySwitch: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  return (
    <g>
      <circle cx={w / 2} cy={h / 2 - 3} r={6.4} fill="#333a42" stroke="#000" strokeWidth={0.35} />
      <circle cx={w / 2} cy={h / 2 - 3} r={3.2} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
      <line x1={w / 2} y1={h / 2 - 3} x2={w / 2 + 2.4} y2={h / 2 - 6.4} stroke="#14161a" strokeWidth={0.5} />
      <Silk x={w / 2} y={h / 2 + 5} size={1}>1P6T</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} />
      ))}
    </g>
  );
};

export const BATCH2_ART: Record<string, ArtFn> = {
  // analog / power ICs
  ua741: dip("UA741"),
  lm358: dip("LM358"),
  lm393: dip("LM393"),
  lm339: dip("LM339"),
  lm324: dip("LM324"),
  tl072: dip("TL072"),
  tl084: dip("TL084"),
  ca3140: dip("CA3140"),
  op07: dip("OP07"),
  ne556: dip("NE556"),
  icm7555: dip("ICM7555"),
  max232: dip("MAX232"),
  max485: dip("MAX485"),
  sp3485: dip("SP3485"),
  tja1050: dip("TJA1050"),
  mcp3008: dip("MCP3008"),
  mcp4922: dip("MCP4922"),
  dac0808: dip("DAC0808"),
  lm386: dip("LM386"),
  tda2030: dip("TDA2030"),
  pt2399: dip("PT2399"),
  xr2206: dip("XR2206"),
  icl7107: dip("ICL7107", true),
  tl494: dip("TL494"),
  sg3525: dip("SG3525"),
  uc3842: dip("UC3842"),
  max6675: dip("MAX6675"),
  // system / memory
  pcf8574: dip("PCF8574"),
  mcp23017: dip("MCP23017", true),
  ds1307: dip("DS1307"),
  at89c51: dip("AT89C51", true),
  attiny85: dip("ATtiny85"),
  attiny13: dip("ATtiny13"),
  pic16f877a: dip("PIC16F877A", true),
  "24c02": dip("24C02"),
  "24c256": dip("24C256"),
  w25q16: dip("W25Q16"),
  "62256": dip("62256", true),
  uln2803: dip("ULN2803", true),
  l293d: dip("L293D"),
  // cmos 4000
  cd4011: dip("CD4011"),
  cd4017: dip("CD4017"),
  cd4026: dip("CD4026"),
  cd4040: dip("CD4040"),
  cd4051: dip("CD4051"),
  cd4066: dip("CD4066"),
  cd4069: dip("CD4069"),
  cd4070: dip("CD4070"),
  cd4094: dip("CD4094"),
  cd4511: dip("CD4511"),
  // 74HC logic
  "74hc00": dip("74HC00"),
  "74hc02": dip("74HC02"),
  "74hc04": dip("74HC04"),
  "74hc08": dip("74HC08"),
  "74hc14": dip("74HC14"),
  "74hc32": dip("74HC32"),
  "74hc86": dip("74HC86"),
  "74hc138": dip("74HC138"),
  "74hc139": dip("74HC139"),
  "74hc151": dip("74HC151"),
  "74hc157": dip("74HC157"),
  "74hc161": dip("74HC161"),
  "74hc164": dip("74HC164"),
  "74hc165": dip("74HC165"),
  "74hc193": dip("74HC193"),
  "74hc238": dip("74HC238"),
  "74hc244": dip("74HC244"),
  "74hc245": dip("74HC245"),
  "74hc273": dip("74HC273", true),
  "74hc373": dip("74HC373", true),
  "74hc374": dip("74HC374", true),
  "74hc393": dip("74HC393"),
  "74hc4020": dip("74HC4020"),
  "74hc573": dip("74HC573", true),
  // transistors / regs / triacs
  "2n2222": to92("2N2222"),
  "2n3904": to92("2N3904"),
  "2n3906": to92("2N3906"),
  bc547: to92("BC547"),
  bc557: to92("BC557"),
  bc337: to92("BC337"),
  bd139: to220("BD139"),
  bd140: to220("BD140"),
  tip31c: to220("TIP31C"),
  tip41c: to220("TIP41C"),
  irf540n: to220("IRF540N"),
  irfz44n: to220("IRFZ44N"),
  irf3205: to220("IRF3205"),
  irf9540n: to220("IRF9540N"),
  bta16: to220("BTA16"),
  tyn612: to220("TYN612"),
  lm317: to220("LM317"),
  lm338: to220("LM338"),
  l78l05: to92("78L05"),
  tl431: to92("TL431"),
  "7809": to220("7809"),
  "7812": to220("7812"),
  // diodes / protection
  "1n4007": axial("#d8d8d8"),
  "1n4148": axial("#d8d8d8", true),
  "1n5819": axial("#d8d8d8", false, "#26c"),
  bat85: axial("#d8d8d8", true, "#26c"),
  "zener-5v1": axial("#26c", true),
  sb560: axial("#d8d8d8", false, "#26c"),
  "bridge-kbu608": BridgeRect,
  "bridge-w10": BridgeRect,
  varistor: Varistor,
  "ptc-resettable": PtcResettable,
  "fuse-glass": FuseGlass,
  "fuse-holder": FuseHolder,
  "shunt-resistor": Shunt,
  // passives
  "cap-film-box": FilmBox,
  "supercap-5v5": SuperCap,
  "toroid-inductor": Toroid,
  "common-mode-choke": CmChoke,
  "transformer-ei": TransformerEi,
  "ntc-probe": probeArt("NTC"),
  pt100: probeArt("PT100"),
  "thermocouple-k": Thermocouple,
  "resistor-sip": SipResistor,
  "slide-pot": SlidePot,
  "crystal-32k": Crystal32k,
  "resonator-16mhz": Resonator,
  "flex-sensor": FlexSensor,
  "fsr-force": FsrForce,
  // connectors
  "usb-a-plug": UsbPlug,
  "usb-a-socket": UsbSocket,
  "usb-c-socket": UsbC,
  "barrel-jack": BarrelJack,
  "audio-jack": AudioJack,
  "terminal-2": termScrews(),
  "terminal-3": termScrews(),
  "header-1x4": headerPins(),
  "header-1x8": headerPins(),
  "jst-2": Jst2,
  "servo-conn": ServoConn,
  // switches
  "slide-switch": SlideSwitch,
  "arcade-button": ArcadeButton,
  "estop-button": EstopButton,
  "key-switch": KeySwitch,
  "push-12mm": Push12,
  "dip-8": dipSwitchN(8),
  "keypad-3x4": keyPad(4, 3, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]),
  "rotary-12pos": RotarySwitch,
};
