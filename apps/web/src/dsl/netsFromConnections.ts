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

function rotatedPin(mm: { w: number; h: number }, x: number, y: number, rot: number): [number, number] {
  const r = ((rot % 360) + 360) % 360;
  if (r === 90) return [mm.h - y, x];
  if (r === 180) return [mm.w - x, mm.h - y];
  if (r === 270) return [y, mm.w - x];
  return [x, y];
}

export function pinWorldPos(e: EntityPlace, pinId: string): [number, number] | null {
  const def = partDef(e.type);
  const pin = def?.pins.find((p) => p.id === pinId);
  if (!def || !pin) return null;
  const [rx, ry] = rotatedPin(def.size_mm, pin.x, pin.y, e.transform.rotation_deg ?? 0);
  return [e.transform.x + rx, e.transform.y + ry];
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
