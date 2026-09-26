import { useMemo, useState } from "react";
import { partDef } from "@audrino/schema";
import { useEditorStore } from "../state/store";
import { nearestSample, useTraceStore, type TSample } from "../sim/traceStore";

const W = 640;
const LANE_D = 54;
const LANE_A = 86;
const AXIS = 26;
const PAD_L = 8;

/** Step-wave path for a digital lane (level > 2.5 V = high). */
export function digitalPath(samples: TSample[], xOf: (t: number) => number, yHigh: number, yLow: number): string {
  if (samples.length === 0) return "";
  const y = (v: number) => (v > 2.5 ? yHigh : yLow);
  let d = `M ${xOf(samples[0].t).toFixed(1)} ${y(samples[0].v)}`;
  for (let i = 1; i < samples.length; i++) {
    const yPrev = y(samples[i - 1].v);
    d += ` L ${xOf(samples[i].t).toFixed(1)} ${yPrev}`;
    d += ` L ${xOf(samples[i].t).toFixed(1)} ${y(samples[i].v)}`;
  }
  return d;
}

/** Polyline points for an analog lane (0–5 V mapped into [yBottom, yTop]). */
export function analogPoints(samples: TSample[], xOf: (t: number) => number, yTop: number, yBottom: number): string {
  const yFor = (v: number) => yBottom - (Math.max(0, Math.min(5, v)) / 5) * (yBottom - yTop);
  return samples.map((s) => `${xOf(s.t).toFixed(1)},${yFor(s.v).toFixed(1)}`).join(" ");
}

/** Scope + logic analyzer over the live-simulation trace. */
export function ScopePanel(props: { notify: (msg: string) => void }) {
  const channels = useTraceStore((s) => s.channels);
  const samples = useTraceStore((s) => s.samples);
  const doc = useEditorStore((s) => s.doc);
  const [pick, setPick] = useState("");
  const [kind, setKind] = useState<"digital" | "analog">("digital");
  const [hoverT, setHoverT] = useState<number | null>(null);

  const pinOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    for (const e of [...doc.boards, ...doc.components]) {
      const def = partDef(e.type);
      for (const p of def?.pins ?? []) {
        out.push({ value: `${e.id}:${p.id}`, label: `${e.id} · ${p.name || p.id}` });
      }
    }
    return out;
  }, [doc]);

  const tMax = Math.max(1, ...channels.map((c) => samples[c.pin]?.[samples[c.pin].length - 1]?.t ?? 0));
  const xOf = (t: number) => PAD_L + (t / tMax) * (W - PAD_L - 8);
  let y = 8;
  const lanes = channels.map((c) => {
    const h = c.kind === "digital" ? LANE_D : LANE_A;
    const lane = { c, y, h, yHigh: y + 12, yLow: y + h - 12, yTop: y + 10, yBottom: y + h - 10 };
    y += h + 8;
    return lane;
  });
  const H = y + AXIS;

  const add = () => {
    if (!pick) return;
    if (channels.length >= 8) {
      props.notify("8 channels is the limit — remove one first");
      return;
    }
    useTraceStore.getState().addChannel(pick, kind);
    props.notify(`Probe added: ${pick} (${kind}) — press ▶ Simulate to record`);
    setPick("");
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / (rect.width || 1);
    setHoverT(Math.max(0, Math.min(tMax, frac * tMax)));
  };

  return (
    <div className="tab-body">
      <style>{`
        .scope-lane-label { font-size: 10px; opacity: .85; }
        .scope-grid { stroke: rgba(255,255,255,.08); }
        .scope-readout { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; }
      `}</style>
      <div className="row">
        <select style={{ flex: 1 }} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Add probe — pick a pin…</option>
          {pinOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as "digital" | "analog")} title="Lane type">
          <option value="digital">D</option>
          <option value="analog">A</option>
        </select>
        <button className="primary" onClick={add} disabled={!pick}>
          Add
        </button>
      </div>

      {channels.length === 0 && (
        <div className="dim">
          No probes yet. Add one (a board pin like <span className="mono">board1:D13</span>), press ▶ Simulate, and
          watch the signal here — digital lanes as square waves, analog as voltages over time.
        </div>
      )}

      {channels.length > 0 && (
        <>
          <svg
            className="scope-svg"
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", background: "rgba(0,0,0,.25)", borderRadius: 6 }}
            onMouseMove={onMove}
            onMouseLeave={() => setHoverT(null)}
          >
            {lanes.map((l) => (
              <g key={l.c.pin}>
                <rect x={0} y={l.y} width={W} height={l.h} fill="rgba(255,255,255,.02)" rx={4} />
                {l.c.kind === "analog" &&
                  [0, 2.5, 5].map((v) => {
                    const yy = l.yBottom - (v / 5) * (l.yBottom - l.yTop);
                    return (
                      <g key={v}>
                        <line className="scope-grid" x1={PAD_L} y1={yy} x2={W - 8} y2={yy} />
                        <text className="scope-lane-label" x={2} y={yy - 2} fill={l.c.color}>
                          {v}V
                        </text>
                      </g>
                    );
                  })}
                {l.c.kind === "digital" ? (
                  <path d={digitalPath(samples[l.c.pin] ?? [], xOf, l.yHigh, l.yLow)} fill="none" stroke={l.c.color} strokeWidth={2} />
                ) : (
                  <polyline points={analogPoints(samples[l.c.pin] ?? [], xOf, l.yTop, l.yBottom)} fill="none" stroke={l.c.color} strokeWidth={1.6} />
                )}
                <text className="scope-lane-label" x={W - 84} y={l.y + 12} fill={l.c.color}>
                  {l.c.label} ({l.c.kind === "digital" ? "D" : "A"})
                </text>
              </g>
            ))}
            <line className="scope-grid" x1={PAD_L} y1={H - AXIS + 4} x2={W - 8} y2={H - AXIS + 4} />
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <text key={f} className="scope-lane-label" x={xOf(tMax * f) - 8} y={H - 8} fill="rgba(255,255,255,.5)">
                {(tMax * f).toFixed(0)}ms
              </text>
            ))}
            {hoverT !== null && (
              <line x1={xOf(hoverT)} y1={0} x2={xOf(hoverT)} y2={H - AXIS + 4} stroke="rgba(255,255,255,.35)" strokeDasharray="3 3" />
            )}
          </svg>
          <div className="row scope-readout" style={{ flexWrap: "wrap" }}>
            <span className="dim">{hoverT === null ? "hover the trace for a cursor" : `t = ${hoverT.toFixed(2)} ms`}</span>
            {hoverT !== null &&
              channels.map((c) => {
                const s = nearestSample(samples[c.pin], hoverT);
                return (
                  <span key={c.pin} style={{ color: c.color }}>
                    {c.label}: {s ? `${s.v.toFixed(2)}V` : "—"}
                  </span>
                );
              })}
          </div>
          <div className="row">
            <button
              onClick={() => {
                useTraceStore.getState().clearSamples();
                props.notify("Trace cleared");
              }}
            >
              Clear trace
            </button>
            {channels.map((c) => (
              <span key={c.pin} className="badge" style={{ borderColor: c.color }}>
                {c.label}{" "}
                <button
                  onClick={() => useTraceStore.getState().removeChannel(c.pin)}
                  title="Remove probe"
                  style={{ border: "none", background: "none", padding: 0, marginLeft: 4 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
