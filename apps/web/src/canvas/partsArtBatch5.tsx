import type { ReactElement } from "react";
import type { PartDefinition, PartPin } from "@audrino/schema";

/**
 * Batch-5 art: pattern-resolved families (thousands of SKUs → few art rules).
 * Every factory paints the part's real label from the definition.
 */

const LEAD = "#a8b2bc";
const METAL = "#b8c2cc";
const METAL_D = "#8f9aa6";
const METAL_L = "#d8dee5";
const GOLD = "#c9a227";
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
  return (
    <g>
      <rect x={2} y={0.8} width={w - 4} height={h - 1.6} rx={0.8} fill="#171a1f" stroke="#000" strokeWidth={0.3} />
      <path d={`M ${w / 2 - 0.4} 0.8 a 1.6 1.6 0 0 0 -3.2 0`} fill="#0a0c0f" />
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x < w / 2 ? 2 : w - 2} y1={p.y < 1 || p.y > h - 1 ? (p.y < 1 ? 1.4 : h - 1.4) : p.y} x2={p.x} y2={p.y} w={0.5} />
      ))}
      <Silk x={w / 2} y={h / 2 + 1.1} size={Math.min(2.4, 14 / label.length)}>{label}</Silk>
    </g>
  );
};

const to92Art: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <circle cx={w / 2} cy={h / 2 - 1.4} r={w * 0.44} fill="#1c222b" stroke="#000" strokeWidth={0.25} />
      <Silk x={w / 2} y={h / 2 - 0.9} size={Math.min(1, 7 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2.4} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

const to220Art: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.8} y={0.8} width={w - 1.6} height={h * 0.72} rx={0.8} fill="#22262d" stroke="#000" strokeWidth={0.3} />
      <rect x={w / 2 - 2} y={1.6} width={4} height={3} rx={2} fill={METAL_D} />
      <Silk x={w / 2} y={h * 0.5} size={Math.min(2, 20 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h * 0.78} x2={p.x} y2={p.y} w={0.6} />
      ))}
    </g>
  );
};

const doArt = (band: string, body: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <Lead x1={0.5} y1={h / 2} x2={w - 0.5} y2={h / 2} w={0.5} />
      <rect x={w * 0.22} y={h * 0.18} width={w * 0.56} height={h * 0.64} rx={h * 0.3} fill={body} stroke="#000" strokeWidth={0.2} />
      <rect x={w * 0.64} y={h * 0.22} width={w * 0.08} height={h * 0.56} fill={band} />
      <Silk x={w / 2} y={h * 0.12} size={1.1}>{label}</Silk>
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
  red: "#ff2a2a", green: "#28c840", yellow: "#ffd23f", blue: "#3a7bff",
  white: "#f4f6fb", amber: "#ff9f1a", orange: "#ff6a00", ir: "#3a1a4a", rgb: "#c06ae0",
};
const ledArt = (color: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const dome = LED_BODY[color] ?? "#ff2a2a";
  const label = text(d);
  return (
    <g>
      <rect x={w * 0.2} y={h * 0.45} width={w * 0.6} height={h * 0.35} rx={0.6} fill="#d8dee5" opacity={0.5} />
      <circle cx={w / 2} cy={h * 0.38} r={Math.min(w, h) * 0.4} fill={dome} stroke="#00000033" strokeWidth={0.25} />
      <circle cx={w / 2} cy={h * 0.38} r={Math.min(w, h) * 0.22} fill="#ffffff" opacity={0.35} />
      <Silk x={w / 2} y={h * 0.98} size={0.85}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h * 0.75} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const relayArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={0.8} fill="#2b4a8a" stroke="#1c3260" strokeWidth={0.3} />
      <rect x={2.5} y={2.5} width={w - 5} height={h * 0.4} rx={0.5} fill="#1f3868" />
      <Silk x={w / 2} y={h / 2 + 2.5} size={Math.min(1.8, 16 / label.length)}>{label}</Silk>
      {d.pins.map((p) => {
        const bottom = p.y > h / 2;
        return <Hole key={p.id} x={p.x} y={bottom ? p.y - 0.8 : p.y + 0.8} r={0.4} />;
      })}
    </g>
  );
};

const screwArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const n = d.pins.length;
  const seg = (w - 2) / n;
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.8} fill="#1d5c9a" stroke="#0f3a66" strokeWidth={0.3} />
      {d.pins.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={h / 2 - 1.2} r={Math.min(1.8, seg * 0.38)} fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
          <rect x={p.x - 1} y={h / 2 - 1.55} width={2} height={0.7} rx={0.15} fill="#6f7a86" />
          <Hole x={p.x} y={p.y - 0.6} r={0.4} />
        </g>
      ))}
    </g>
  );
};

const holderArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={1.2} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
      <rect x={2} y={2} width={w - 4} height={h - 7} rx={1} fill="#454c58" />
      <Silk x={w / 2} y={h / 2} size={Math.min(2.4, 30 / label.length)} fill={METAL_L}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3} x2={p.x} y2={p.y} w={0.7} />
      ))}
    </g>
  );
};

const moduleArt = (fill = PCB_NAVY): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.5} fill={fill} stroke="#00000033" strokeWidth={0.3} />
      <rect x={w / 2 - Math.min(6, w * 0.25)} y={h / 2 - 4} width={Math.min(12, w * 0.5)} height={4.5} rx={0.4} fill={CHIP} />
      <Silk x={w / 2} y={h - 5.5} size={Math.min(1.8, 20 / label.length)}>{label}</Silk>
      {d.pins.map((p) => {
        const bottom = p.y > h - 2;
        const top = p.y < 2;
        return bottom || top ? (
          <g key={p.id}>
            <Hole x={p.x} y={bottom ? p.y - 1 : p.y + 1} />
          </g>
        ) : (
          <g key={p.id}>
            <Hole x={p.x > w / 2 ? p.x + 0.6 : p.x - 0.6} y={p.y} />
          </g>
        );
      })}
    </g>
  );
};

const screenArt = (screen: string): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 3.5} rx={0.8} fill="#1a1d22" stroke="#000" strokeWidth={0.3} />
      <rect x={w * 0.1} y={h * 0.1} width={w * 0.8} height={h * 0.55} rx={0.5} fill={screen} />
      <Silk x={w / 2} y={h - 5.5} size={Math.min(1.8, 18 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <Hole key={p.id} x={p.x} y={p.y - 0.8} />
      ))}
    </g>
  );
};

const nixieArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={w * 0.15} y={1} width={w * 0.7} height={h * 0.78} rx={w * 0.3} fill="#dfeef7" stroke="#b8c8d8" strokeWidth={0.3} opacity={0.85} />
      <Silk x={w / 2} y={h * 0.45} size={w * 0.5} fill="#ff8866">8</Silk>
      <Silk x={w / 2} y={h * 0.88} size={1}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h * 0.86} x2={p.x} y2={p.y} w={0.4} />
      ))}
    </g>
  );
};

const switchArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const top = d.pins.filter((p) => p.y < h / 2);
  return (
    <g>
      <rect x={0.5} y={1.5} width={w - 1} height={h - 5} rx={0.8} fill="#1d222a" stroke="#000" strokeWidth={0.3} />
      {top.map((p) => (
        <rect key={p.id} x={p.x - 0.8} y={2.2} width={1.6} height={2.6} rx={0.3} fill="#e8593c" />
      ))}
      <Silk x={w / 2} y={h - 5} size={Math.min(1.4, 11 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={p.y < h / 2 ? 4.6 : h - 3.2} x2={p.x} y2={p.y} w={0.5} />
      ))}
    </g>
  );
};

const mxArt = (color: string): ArtFn => (d) => (
  <g>
    <rect x={0.5} y={0.5} width={d.size_mm.w - 1} height={d.size_mm.h - 1} rx={1} fill="#2b2f36" stroke="#000" strokeWidth={0.35} />
    <rect x={d.size_mm.w / 2 - 3.4} y={1.2} width={6.8} height={6.8} rx={0.8} fill={color} stroke="#00000033" strokeWidth={0.25} />
    <rect x={d.size_mm.w / 2 - 2.2} y={2.4} width={4.4} height={4.4} rx={0.5} fill="#ffffff22" />
    {d.pins.map((p) => (
      <Lead key={p.id} x1={p.x} y1={p.y < d.size_mm.h / 2 ? 2 : d.size_mm.h - 2} x2={p.x} y2={p.y} w={0.5} />
    ))}
  </g>
);

// ---- connectors ---------------------------------------------------------------
const stripArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={h * 0.18} width={w - 1} height={h * 0.5} rx={0.6} fill="#f2f2f2" stroke={METAL_D} strokeWidth={0.3} />
      {d.pins.map((p) => (
        <g key={p.id}>
          <rect x={p.x - 0.9} y={h * 0.24} width={1.8} height={h * 0.38} rx={0.3} fill="#d8c27a" stroke="#8a7420" strokeWidth={0.15} />
          <Hole x={p.x} y={p.y - 0.5} />
        </g>
      ))}
      <Silk x={w / 2} y={h * 0.88} size={0.8}>{label}</Silk>
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
          <rect x={1} y={h * 0.2} width={w - 2} height={h * 0.45} rx={1.2} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
          <rect x={0.5} y={h * 0.3} width={3} height={h * 0.25} rx={0.8} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
        </g>
      )}
      {kind === "usb" && (
        <g>
          <rect x={1} y={h * 0.12} width={w - 2} height={h * 0.5} rx={0.8} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
          <rect x={2.5} y={h * 0.24} width={w - 5} height={h * 0.26} rx={0.4} fill="#e8eef4" />
        </g>
      )}
      {kind === "xt" && (
        <g>
          <rect x={1} y={h * 0.15} width={w - 2} height={h * 0.55} rx={1} fill="#f2b733" stroke="#8a7420" strokeWidth={0.35} />
          {d.pins.map((p) => (
            <circle key={p.id} cx={p.x} cy={h * 0.42} r={Math.min(1.3, w * 0.1)} fill="#3a3f46" />
          ))}
        </g>
      )}
      {kind === "banana" && (
        <g>
          <circle cx={w / 2} cy={h * 0.4} r={Math.min(w, h) * 0.34} fill="#2b2f36" stroke="#000" strokeWidth={0.3} />
          <circle cx={w / 2} cy={h * 0.4} r={Math.min(w, h) * 0.16} fill={METAL} />
        </g>
      )}
      {kind === "bullet" && (
        <g>
          <rect x={w * 0.2} y={h * 0.15} width={w * 0.6} height={h * 0.55} rx={w * 0.3} fill="#f2b733" stroke="#8a7420" strokeWidth={0.3} />
        </g>
      )}
      <Silk x={w / 2} y={h * 0.92} size={0.8}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h * 0.68} x2={p.x} y2={p.y} w={0.55} />
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
          <rect x={1} y={h * 0.15} width={w - 2} height={h * 0.55} rx={1} fill="#8a6a9c" stroke="#5c4470" strokeWidth={0.3} />
          <rect x={w * 0.12} y={h * 0.25} width={w * 0.76} height={h * 0.35} rx={0.8} fill="#3a2a4a" />
          {d.pins.map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y < h / 2 ? h * 0.34 : h * 0.52} r={0.5} fill={GOLD} />
          ))}
        </g>
      )}
      {kind === "rj" && (
        <g>
          <rect x={1} y={h * 0.12} width={w - 2} height={h * 0.55} rx={0.8} fill="#cfd8e3" stroke={METAL_D} strokeWidth={0.3} />
          <rect x={w * 0.18} y={h * 0.28} width={w * 0.64} height={h * 0.28} rx={0.4} fill="#2b2f36" />
          {d.pins.map((p) => (
            <rect key={p.id} x={p.x - 0.35} y={h * 0.52} width={0.7} height={1.4} fill={GOLD} />
          ))}
        </g>
      )}
      {kind === "xlr" && (
        <g>
          <circle cx={w / 2} cy={h * 0.38} r={Math.min(w, h) * 0.34} fill={METAL} stroke={METAL_D} strokeWidth={0.35} />
          {d.pins.map((p, i) => (
            <circle key={p.id} cx={w / 2 + (i - 1) * 2.2} cy={h * 0.38 + (i === 1 ? -1.4 : 1)} r={0.8} fill="#3a3f46" />
          ))}
        </g>
      )}
      <Silk x={w / 2} y={h * 0.92} size={0.85}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h * 0.72} x2={p.x} y2={p.y} w={0.5} />
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
      <rect x={w * 0.18} y={h * 0.12} width={w * 0.64} height={h * 0.6} rx={1.2} fill="#14161a" stroke="#000" strokeWidth={0.25} />
      <circle cx={w / 2} cy={h * 0.35} r={Math.min(w, h) * 0.16} fill="#3a2a4a" />
      <Silk x={w / 2} y={h * 0.86} size={0.7}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h * 0.72} x2={p.x} y2={p.y} w={0.45} />
      ))}
    </g>
  );
};

const brkArt = (extra: "none" | "lens" | "twin" | "mic" | "term" = "none", fill = PCB_NAVY): ArtFn => (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  const bw = w - 1;
  const bh = h - 4;
  return (
    <g>
      <rect x={0.5} y={0.5} width={bw} height={bh} rx={0.5} fill={fill} stroke="#00000033" strokeWidth={0.3} />
      {extra === "lens" && (
        <g>
          <rect x={2} y={2} width={4} height={4.5} rx={0.6} fill="#0d0f12" />
          <circle cx={4} cy={3.8} r={0.8} fill="#6d5a8a" opacity={0.6} />
        </g>
      )}
      {extra === "twin" && (
        <g>
          <circle cx={3.5} cy={bh / 2} r={1.8} fill="#14161a" />
          <circle cx={8} cy={bh / 2} r={1.3} fill="#221a2e" />
        </g>
      )}
      {extra === "mic" && (
        <circle cx={3.6} cy={bh / 2} r={1.8} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      )}
      {extra === "term" && (
        <g>
          <rect x={2} y={2} width={5} height={4} rx={0.6} fill="#1d5c9a" stroke="#0f3a66" strokeWidth={0.2} />
          <circle cx={4.5} cy={4} r={1.2} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
        </g>
      )}
      <rect x={extra === "none" ? w / 2 - 3.2 : 9} y={bh / 2 - 2.2} width={6.5} height={4.4} rx={0.4} fill={CHIP} stroke="#000" strokeWidth={0.15} />
      <Silk x={w / 2} y={bh - 1.2} size={Math.min(1.5, 18 / label.length)}>{label}</Silk>
      {d.pins.map((p) => {
        const bottom = p.y > h - 2;
        return bottom ? (
          <g key={p.id}>
            <Hole x={p.x} y={p.y - 1} />
          </g>
        ) : (
          <g key={p.id}>
            <Hole x={p.x > w / 2 ? p.x + 1 : p.x - 1} y={p.y} />
          </g>
        );
      })}
    </g>
  );
};

const usArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <circle cx={w * 0.3} cy={h * 0.35} r={Math.min(w, h) * 0.2} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <circle cx={w * 0.7} cy={h * 0.35} r={Math.min(w, h) * 0.2} fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
      <Silk x={w / 2} y={h - 5.5} size={Math.min(1.5, 16 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y - 1} />
        </g>
      ))}
    </g>
  );
};

const brickArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 5} rx={1} fill="#e8eef4" stroke={METAL_D} strokeWidth={0.35} />
      <rect x={2.5} y={2.5} width={w - 5} height={h - 8} rx={0.6} fill="#f8fafc" />
      <Silk x={w / 2} y={h / 2} size={Math.min(2, 22 / label.length)} fill="#3a3f46">{label}</Silk>
      {d.pins.map((p) => (
        <g key={p.id}>
          <Hole x={p.x} y={p.y < h / 2 ? p.y + 0.8 : p.y - 0.8} />
        </g>
      ))}
    </g>
  );
};

const buckModuleArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={0.5} y={0.5} width={w - 1} height={h - 4} rx={0.5} fill={PCB_BLUE} stroke="#075a92" strokeWidth={0.3} />
      <rect x={3} y={h / 2 - 3.5} width={5.5} height={5} rx={0.6} fill="#2b2f36" />
      <rect x={10} y={h / 2 - 3} width={3.5} height={3.5} rx={0.5} fill="#3a3f46" />
      <line x1={11.75} y1={h / 2 - 3} x2={11.75} y2={h / 2 - 4.4} stroke={METAL_D} strokeWidth={0.5} />
      <rect x={15} y={h / 2 - 2.5} width={4} height={3} rx={0.3} fill={CHIP} />
      <Silk x={w / 2} y={h - 5.5} size={Math.min(1.6, 18 / label.length)}>{label}</Silk>
      {d.pins.map((p) => {
        const bottom = p.y > h - 2;
        return (
          <g key={p.id}>
            <Hole x={p.x} y={bottom ? p.y - 1 : p.y + 1} />
          </g>
        );
      })}
    </g>
  );
};

// ---- motors / mechs --------------------------------------------------------------
const motorArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={1} y={1} width={w - 2} height={h - 4.5} rx={Math.min(2, w * 0.15)} fill="#b8bcc2" stroke="#7c848e" strokeWidth={0.35} />
      <rect x={w / 2 - 1.2} y={0.2} width={2.4} height={3} rx={0.5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w / 2} y={h / 2 + 0.5} size={Math.min(1.6, 14 / label.length)} fill="#2b2f36">{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} w={0.6} />
      ))}
    </g>
  );
};

const servoArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const label = text(d);
  return (
    <g>
      <rect x={2} y={3} width={w - 4} height={h - 6.5} rx={1} fill="#1c2a67" stroke="#0f1740" strokeWidth={0.35} />
      <rect x={w / 2 - 2.5} y={1} width={5} height={3.5} rx={0.5} fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
      <circle cx={w / 2} cy={3.2} r={1.5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
      <Silk x={w / 2} y={h / 2 + 1.5} size={Math.min(1.6, 14 / label.length)} fill="#dfe5ff">{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 3.5} x2={p.x} y2={p.y} w={0.6} />
      ))}
    </g>
  );
};

const fanArt: ArtFn = (d) => {
  const { w, h } = d.size_mm;
  const cx = w / 2;
  const cy = (h - 2) / 2 + 0.5;
  const label = text(d);
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
      <Silk x={cx} y={h - 4.5} size={Math.min(1.4, 12 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2} x2={p.x} y2={p.y} w={0.55} />
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
  const cy = (h - 2) / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.42} fill="#2b2f36" stroke="#000" strokeWidth={0.35} />
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.22} fill="#454c58" />
      <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.08} fill="#14161a" />
      <Silk x={cx} y={h - 1.5} size={Math.min(1.2, 10 / label.length)}>{label}</Silk>
      {d.pins.map((p) => (
        <Lead key={p.id} x1={p.x} y1={h - 2.5} x2={p.x} y2={p.y} w={0.55} />
      ))}
    </g>
  );
};

// ---- pattern resolver ------------------------------------------------------------
const DIP_IC = /^(24c|m25|25aa|27c|6\d{3}|4n\d|pc817|tlp|moc|uln|mc14|mc3|ir21|tc44|lm[0-9]|tlc|se5|opa|ne5|lt1|ad6|ina1|ad8|ca3|ua7|tl0|tl4|icl|sg3|uc3|pt2|xr2|dac|lf3|max\d|tda\d|da[cs]\d)[\w-]*$/;

const byPrefixArt = (type: string): ArtFn | null => {
  const t = type.toLowerCase();
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
  if (/^screw-terminal-/.test(t)) return screwArt;
  if (/^jst-ec/.test(t)) return plugArt("bullet");
  if (/^(dupont-|jst-(ph|xh)|ffc-)/.test(t)) return stripArt;
  if (/^(banana|rca-)/.test(t)) return plugArt("banana");
  if (/^dc-plug-/.test(t)) return plugArt("barrel");
  if (/^usb-/.test(t)) return plugArt("usb");
  if (/^(xt3|xt6)/.test(t)) return plugArt("xt");
  if (/^(de9|db25)/.test(t)) return jackArt("dsub");
  if (/^rj(1|4)/.test(t)) return jackArt("rj");
  if (/^xlr-/.test(t)) return jackArt("xlr");
  if (/^(aa-holder|aaa-holder|18650-holder|coin-2450|v9-clip|lipo-|solar-)/.test(t)) return holderArt;
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
  if (/^(tt-|n20|n10|n30|37gb|520|540|775|worm|water-pump|linear|solenoid|electromagnet|heating)/.test(t)) return motorArt;
  if (/^(servo-|mg9|ds32)/.test(t)) return servoArt;
  if (/^fan-/.test(t)) return fanArt;
  if (/^(nema|bldc)/.test(t)) return nemaArt;
  if (/^(spk-|piezo-disc|horn-)/.test(t)) return speakerArt;
  return null;
};

const EXACT: Record<string, ArtFn> = {};

export function resolveFamilyArt(type: string): ArtFn | null {
  return EXACT[type] ?? byPrefixArt(type);
}
