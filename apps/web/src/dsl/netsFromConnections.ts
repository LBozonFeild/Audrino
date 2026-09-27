/**
 * Shared conductor builder (used by wokwi import + AI spawn): unions wire
 * ENDPOINT pin keys into nets — series parts never collapse, shared pins (same
 * "ref:pinId" landing twice) merge into one conductor. Wires are straight
 * 2-point chains per net edge.
 */
import type { Net, WireSegment } from "@audrino/schema";
import { partDef } from "@audrino/schema";

export interface EntityPlace {
  id: string;
  type: string;
  transform: { x: number; y: number; rotation_deg?: number };
}

/**
 * Visual scale for non-board components on the canvas (M1 UX: parts read
 * bigger next to the boards without changing the catalog's real mm sizes).
 * Boards keep 1:1 proportions. Art, pin anchors, hit boxes and wire ends all
 * derive from this one number — PartGlyph's render and every pinWorldPos call
 * scale about the part's bbox centre, so wires always land on the pads.
 */
export const COMPONENT_SCALE = 1.5;

/** Board-category parts render at real size; everything else gets the boost. */
export function entityScale(type: string): number {
  return partDef(type)?.category === "board" ? 1 : COMPONENT_SCALE;
}

function rotatedPin(mm: { w: number; h: number }, x: number, y: number, rot: number): [number, number] {
  // Center-rotation convention — must match PartGlyph's render/pinWorldPos
  // (`rotate(rot, w/2, h/2)`), which differs from corner math on non-square parts.
  const r = ((rot % 360) + 360) % 360;
  if (r === 90) return [(mm.w + mm.h) / 2 - y, x + (mm.h - mm.w) / 2];
  if (r === 180) return [mm.w - x, mm.h - y];
  if (r === 270) return [y + (mm.w - mm.h) / 2, (mm.w + mm.h) / 2 - x];
  return [x, y];
}

export function pinWorldPos(e: EntityPlace, pinId: string): [number, number] | null {
  const def = partDef(e.type);
  const pin = def?.pins.find((p) => p.id === pinId);
  if (!def || !pin) return null;
  const [rx0, ry0] = rotatedPin(def.size_mm, pin.x, pin.y, e.transform.rotation_deg ?? 0);
  // Scale about the bbox centre — same transform as PartGlyph's art group.
  const s = entityScale(e.type);
  const cx = def.size_mm.w / 2;
  const cy = def.size_mm.h / 2;
  return [e.transform.x + cx + (rx0 - cx) * s, e.transform.y + cy + (ry0 - cy) * s];
}

/**
 * Re-land saved wire geometry onto current pin positions. Pin coordinates are
 * geometry of OUR catalog — when a pinout is corrected (matching real
 * hardware), old saves still hold the old endpoint coordinates. Nets are
 * topological (ref:pinId), so the circuit itself never breaks; this snaps each
 * wire's endpoints to the nearest current pin of its net and keeps the user's
 * interior waypoints. Every document entry (loadProject) runs it once.
 */
export function relayoutWires(doc: {
  boards: EntityPlace[];
  components: EntityPlace[];
  nets: Net[];
  wires: WireSegment[];
}): void {
  const entities = [...doc.boards, ...doc.components];
  for (const w of doc.wires) {
    const net = doc.nets.find((n) => n.id === w.net);
    if (!net || w.points.length < 2) continue;
    const spots: [number, number][] = [];
    for (const key of net.pins) {
      const i = key.indexOf(":");
      const e = i > 0 ? entities.find((x) => x.id === key.slice(0, i)) : undefined;
      const pos = e && i > 0 ? pinWorldPos(e, key.slice(i + 1)) : null;
      if (pos) spots.push(pos);
    }
    if (spots.length < 2) continue;
    const nearest = (pt: [number, number], banned: number): number => {
      let bi = -1;
      let bd = Infinity;
      spots.forEach((s, i) => {
        if (i === banned) return;
        const dd = (s[0] - pt[0]) ** 2 + (s[1] - pt[1]) ** 2;
        if (dd < bd) {
          bd = dd;
          bi = i;
        }
      });
      return bi;
    };
    const aI = nearest(w.points[0], -1);
    const bI = nearest(w.points[w.points.length - 1], aI);
    if (aI < 0 || bI < 0) continue;
    w.points[0] = [spots[aI][0], spots[aI][1]];
    w.points[w.points.length - 1] = [spots[bI][0], spots[bI][1]];
  }
}

/** pairs = resolved "ref:pinId" endpoints (one entry per wire). */
export function buildNetsAndWires(pairs: [string, string][], entities: EntityPlace[]): { nets: Net[]; wires: WireSegment[] } {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p !== x) {
      const r = find(p);
      parent.set(x, r);
      return r;
    }
    parent.set(x, x);
    return x;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (const [pa, pb] of pairs) {
    union(pa, pb);
  }
  // Internal strips (breadboard columns / rail halves) common every hole that
  // is actually wired: a wire on `bb:a1` and another on `bb:e1` share a node.
  for (const e of entities) {
    const def = partDef(e.type);
    for (const group of def?.bridges ?? []) {
      const present = group.map((pid) => `${e.id}:${pid}`).filter((k) => parent.has(k));
      for (let i = 1; i < present.length; i++) union(present[0], present[i]);
    }
  }

  const groups = new Map<string, string[]>();
  for (const pin of parent.keys()) {
    const root = find(pin);
    const g = groups.get(root) ?? [];
    g.push(pin);
    groups.set(root, g);
  }

  const nets: Net[] = [];
  const wires: WireSegment[] = [];
  let nSeq = 0;
  let wSeq = 0;
  for (const pins of groups.values()) {
    if (pins.length < 2) continue;
    const netId = `net${++nSeq}`;
    nets.push({ id: netId, pins: [...pins].sort() });
    for (let i = 1; i < pins.length; i++) {
      const [refA, pinA] = splitPin(pins[i - 1]);
      const [refB, pinB] = splitPin(pins[i]);
      const eA = entities.find((x) => x.id === refA);
      const eB = entities.find((x) => x.id === refB);
      const a = eA ? pinWorldPos(eA, pinA) : null;
      const b = eB ? pinWorldPos(eB, pinB) : null;
      if (!a || !b) continue;
      wires.push({ id: `w${++wSeq}`, net: netId, points: [a, b] });
    }
  }
  return { nets, wires };
}

function splitPin(key: string): [string, string] {
  const i = key.indexOf(":");
  return [key.slice(0, i), key.slice(i + 1)];
}
