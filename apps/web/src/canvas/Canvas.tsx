import { useEffect, useRef, useState } from "react";
import type { Transform } from "@audrino/schema";
import { M0_PIN_CATALOG, parsePinRef, partDef } from "@audrino/schema";
import { useEditorStore } from "../state/store";
import type { Tool } from "../state/store";
import { PartGlyph, partSize, pinWorldPos } from "./PartGlyph";
import { memo } from "react";
import { useSimStore } from "../sim/SimProvider";
import { useViewStore, VIEW_W, VIEW_H } from "./viewStore";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "inspect", label: "Inspect" },
  { id: "wire", label: "Wire" },
  { id: "delete", label: "Delete" },
];

const snap = (v: number) => Math.round(v / 5) * 5;

/** Tinkercad-style jumper colors — deterministic per net (PLAN §11: net identity). */
const WIRE_COLORS = [
  "#ff5252", "#ff9f1a", "#ffd23f", "#2ec84f", "#22b8cf",
  "#4d8dff", "#9b59b6", "#ff6b9d", "#f2f4f8", "#c2885a",
  "#b2e24a", "#8fd3f4",
];

function netHash(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function netColor(id: string): string {
  return WIRE_COLORS[netHash(id) % WIRE_COLORS.length];
}

/** Stable bow direction per net so sibling jumpers arc the same way. */
function netBow(id: string): number {
  return netHash(id) % 2 === 0 ? 1 : -1;
}

/** Jumper path: gentle sag on point-to-point wires, soft corners otherwise. */
function wirePath(points: [number, number][], bow: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) {
    const [x1, y1] = points[0];
    const [x2, y2] = points[1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const sag = Math.min(18, dist * 0.22) * bow;
    const cx = (x1 + x2) / 2 + (-dy / dist) * sag;
    const cy = (y1 + y2) / 2 + (dx / dist) * sag;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q ${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = points[points.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}

interface DragState {
  ids: string[];
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
}

function wireVisible(w: { points: [number, number][] }, r: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return w.points.some((p) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1);
}

const WireRow = memo(function WireRow(props: {
  w: { id: string; net: string; points: [number, number][] };
  hot: boolean;
  onHover: (net: string | null) => void;
}) {
  const w = props.w;
  const color = netColor(w.net);
  const d = wirePath(w.points, netBow(w.net));
  const a = w.points[0];
  const b = w.points[w.points.length - 1];
  return (
    <g
      className={`wire-group${props.hot ? " hot" : ""}`}
      onPointerEnter={() => props.onHover(w.net)}
      onPointerLeave={() => props.onHover(null)}
    >
      <path className="wire-casing" d={d} />
      <path className="wire-main" d={d} stroke={color} />
      {a && <circle className="wire-end" cx={a[0]} cy={a[1]} r={2.7} fill={color} />}
      {b && <circle className="wire-end" cx={b[0]} cy={b[1]} r={2.7} fill={color} />}
    </g>
  );
});

export function Canvas(props: {
  pendingPlace: { kind: "board" | "component"; type: string } | null;
  clearPending: () => void;
  notify: (msg: string) => void;
}) {
  const doc = useEditorStore((s) => s.doc);
  const simPins = useSimStore((s) => s.pins);
  const view = useViewStore((s) => s.view);
  const selection = useEditorStore((s) => s.selection);
  const tool = useEditorStore((s) => s.tool);
  const place = useEditorStore((s) => s.place);
  const move = useEditorStore((s) => s.move);
  const removeIds = useEditorStore((s) => s.removeIds);
  const connect = useEditorStore((s) => s.connect);
  const select = useEditorStore((s) => s.select);
  const setTool = useEditorStore((s) => s.setTool);
  const setTab = useEditorStore((s) => s.setTab);

  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [wireFrom, setWireFrom] = useState<string | null>(null);
  const [hoverNet, setHoverNet] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pan, setPan] = useState<{ last: [number, number] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ESC cancels the ghost wire (M0-SPEC §5).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWireFrom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entities = [...doc.boards.map((b) => ({ ...b, isBoard: true })), ...doc.components.map((c) => ({ ...c, isBoard: false }))];
  const entityById = new Map(entities.map((e) => [e.id, e]));

  const toSvg = (e: { clientX: number; clientY: number; currentTarget: Element }): [number, number] => {
    const el = e.currentTarget as SVGGraphicsElement;
    const svg = (el.ownerSVGElement ?? el) as SVGSVGElement;
    const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
    if (ctm) {
      // Correct under preserveAspectRatio letterboxing and any zoom.
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      return [pt.x, pt.y];
    }
    const rect = svg.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * 720, ((e.clientY - rect.top) / rect.height) * 540];
  };

  const pinPos = (pin: string): [number, number] | null => {
    const ref = parsePinRef(pin);
    if (!ref) return null;
    const entity = entityById.get(ref.componentId);
    if (!entity) return null;
    return pinWorldPos(entity, ref.pinId);
  };

  const vis = {
    x0: view.x - 90,
    y0: view.y - 90,
    x1: view.x + VIEW_W / view.k + 90,
    y1: view.y + VIEW_H / view.k + 90,
  };
  const partVisible = (e: { transform: { x: number; y: number }; type: string }) => {
    const s = partSize(e.type);
    const m = Math.max(s.w, s.h); /* rotation-safe bound */
    return e.transform.x + m >= vis.x0 && e.transform.x - m <= vis.x1 && e.transform.y + m >= vis.y0 && e.transform.y - m <= vis.y1;
  };

  const ghostPos: [number, number] = [snap(cursor[0]), snap(cursor[1])];
  const wireFromPos = wireFrom ? pinPos(wireFrom) : null;

  const onBackgroundClick = () => {
    if (props.pendingPlace) {
      const [x, y] = ghostPos;
      const msg = place(props.pendingPlace.kind, props.pendingPlace.type, x, y);
      if (msg) props.notify(msg);
      props.clearPending();
    } else {
      select([]);
    }
  };

  const onPartPointerDown = (e: React.PointerEvent, id: string) => {
    if (tool !== "select" || e.shiftKey) return;
    e.stopPropagation();
    const [x, y] = toSvg(e);
    const ids = selection.includes(id) ? selection : [id];
    select(ids);
    // Keep receiving move/up even if the pointer leaves the SVG mid-drag.
    const svgEl = svgRef.current;
    if (svgEl && typeof svgEl.setPointerCapture === "function") {
      try {
        svgEl.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic/unsupported pointer ids */
      }
    }
    setDrag({ ids, startX: x, startY: y, dx: 0, dy: 0, moved: false });
  };

  const onPartClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (props.pendingPlace) return;
    if (tool === "inspect") {
      select([id]);
      setTab("inspect");
    } else if (tool === "delete") {
      const msg = removeIds([id]);
      if (msg) props.notify(msg);
    } else if (tool === "select") {
      if (e.shiftKey) {
        // Shift-click toggles group membership (copy/paste/duplicate pairs).
        select(selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]);
      } else if (!selection.includes(id) || selection.length === 1) {
        select([id]);
      }
    }
  };

  const onPartDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    select([id]);
    setTab("inspect");
  };

  const onPinClick = (e: React.MouseEvent, pin: string) => {
    e.stopPropagation();
    if (tool !== "wire" || props.pendingPlace) return;
    if (!wireFrom) {
      setWireFrom(pin);
      return;
    }
    const a = pinPos(wireFrom);
    const b = pinPos(pin);
    if (!a || !b) return;
    const msg = connect(wireFrom, pin, [a, b]);
    if (msg) props.notify(msg);
    setWireFrom(null);
  };

  const empty = entities.length === 0 && (doc.mechanics?.bodies.length ?? 0) === 0;

  return (
    <div className="canvas-wrap">
      <div className="tool-strip">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={tool === t.id ? "tool-active" : ""}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="hint">
          {props.pendingPlace
            ? `click canvas to place ${props.pendingPlace.type} · ESC clears`
            : tool === "wire" && wireFrom
              ? "click a second pin · ESC cancels"
              : "drag to move · wheel zooms · middle-drag pans · double-click inspects"}
        </span>
      </div>

      <svg
        ref={svgRef}
        className="canvas-svg"
        viewBox={`${view.x} ${view.y} ${VIEW_W / view.k} ${VIEW_H / view.k}`}
        onPointerMove={(e) => {
          if (pan) {
            const p = toSvg(e);
            useViewStore.getState().panBy(pan.last[0] - p[0], pan.last[1] - p[1]);
            setPan({ last: p });
          }
          const p = toSvg(e);
          setCursor(p);
          if (drag) {
            setDrag({
              ...drag,
              dx: p[0] - drag.startX,
              dy: p[1] - drag.startY,
              moved: true,
            });
          }
        }}
        onPointerUp={() => {
          setPan(null);
          if (drag && (drag.dx !== 0 || drag.dy !== 0)) {
            const msg = move(drag.ids, snap(drag.dx), snap(drag.dy));
            if (msg) props.notify(msg);
          }
          setDrag(null);
        }}
        onWheel={(e) => {
          const p = toSvg(e);
          useViewStore.getState().zoomAt(p[0], p[1], Math.exp(-e.deltaY * 0.0018));
        }}
        onPointerDown={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            setPan({ last: toSvg(e) });
          }
        }}
        onPointerCancel={() => {
          setDrag(null);
          setPan(null);
        }}
        onClick={onBackgroundClick}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--bench-bg-grid)" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={4096} height={3072} fill="var(--bench-canvas)" />
        <rect x={0} y={0} width={4096} height={3072} fill="url(#grid)" />

        {/* wires below parts — jumper style: casing + insulation + pin ferrules */}
        {doc.wires.filter((w) => wireVisible(w, vis)).map((w) => (
          <WireRow key={w.id} w={w} hot={hoverNet === w.net} onHover={setHoverNet} />
        ))}

        {/* mechanics bodies (view-only in M0; welding lands M2) */}
        {(doc.mechanics?.bodies ?? []).filter((b) => partVisible({ transform: b.transform, type: "resistor" })).map((b) => {
          const { w, h } = { w: b.size_mm.w, h: b.size_mm.h };
          const t = b.transform;
          return (
            <g key={b.id}>
              <rect className="body-shape" x={t.x} y={t.y} width={w} height={h} rx={2} />
              <text className="canvas-hint" x={t.x + 4} y={t.y - 4} style={{ fontSize: 8 }}>
                {b.id}
              </text>
            </g>
          );
        })}

        {entities.filter(partVisible).map((e) => {
          const dragging = drag?.ids.includes(e.id) ?? false;
          const t: Transform = dragging
            ? { ...e.transform, x: e.transform.x + snap(drag!.dx), y: e.transform.y + snap(drag!.dy) }
            : e.transform;
          const pins = M0_PIN_CATALOG[e.type] ?? [];
          return (
            <g key={e.id}>
              <g
                onClick={(ev) => onPartClick(ev, e.id)}
                onDoubleClick={(ev) => onPartDoubleClick(ev, e.id)}
                onPointerDown={(ev) => onPartPointerDown(ev, e.id)}
              >
                <PartGlyph
                  type={e.type}
                  transform={t}
                  board={e.isBoard}
                  selected={selection.includes(e.id)}
                  partRef={e.id}
                  values={(e as { props?: Record<string, unknown> }).props}
                />
              </g>
              {pins.map((pinId) => {
                if (view.k < 0.55) return null; /* pin LOD */
                const world = pinWorldPos({ type: e.type, transform: t }, pinId);
                if (!world) return null;
                const pin = `${e.id}:${pinId}`;
                const isWireLive = wireFrom === pin;
                const netId = doc.nets.find((n) => n.pins.includes(pin))?.id ?? null;
                const hot = hoverNet !== null && netId === hoverNet;
                const pinName = partDef(e.type)?.pins.find((p) => p.id === pinId)?.name ?? pinId;
                const simState = simPins[pin];
                const stClass = simState ? ` st-${simState}` : "";
                return (
                  <circle
                    key={pin}
                    className={`pin-dot${stClass}${hot ? " hot" : ""}${isWireLive ? " wire-live" : ""}`}
                    cx={world[0]}
                    cy={world[1]}
                    r={tool === "wire" ? 3 : 2.2}
                    onClick={(ev) => onPinClick(ev, pin)}
                  >
                    <title>{`${pinId}${pinName !== pinId ? " · " + pinName : ""}${netId ? " → " + netId : ""}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}

        {/* placement ghost — the real part, translucent */}
        {props.pendingPlace && (
          <g opacity={0.7} style={{ pointerEvents: "none" }}>
            <rect
              className="ghost-rect"
              x={ghostPos[0] - 1}
              y={ghostPos[1] - 1}
              width={partSize(props.pendingPlace.type).w + 2}
              height={partSize(props.pendingPlace.type).h + 2}
              rx={2.5}
            />
            <PartGlyph
              type={props.pendingPlace.type}
              transform={{ x: ghostPos[0], y: ghostPos[1] }}
              board={props.pendingPlace.kind === "board"}
              values={partDef(props.pendingPlace.type)?.defaultProps ?? {}}
            />
          </g>
        )}

        {/* wire ghost */}
        {wireFrom && wireFromPos && (
          <line
            className="ghost-wire"
            x1={wireFromPos[0]}
            y1={wireFromPos[1]}
            x2={cursor[0]}
            y2={cursor[1]}
          />
        )}

        {empty && (
          <text className="canvas-hint" x={360} y={270} textAnchor="middle">
            Pick a part from the palette — or spawn a build in the AI ✨ tab.
          </text>
        )}
      </svg>
    </div>
  );
}
