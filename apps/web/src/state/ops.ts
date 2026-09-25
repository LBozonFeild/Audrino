import type {
  BoardPlacement,
  ComponentPlacement,
  Net,
  Project,
  WireSegment,
} from "@audrino/schema";
import { bridgeMatesOf } from "@audrino/schema";
import { M0_PIN_CATALOG, parsePinRef, partDef, validateProject } from "@audrino/schema";
import { relayoutWires } from "../dsl/netsFromConnections";

/** Clipboard payload (M0-SPEC §4): boards + components + their nets (pins ⊆ copies) + wires. */
export interface Clipboard {
  boards: BoardPlacement[];
  components: ComponentPlacement[];
  nets: Net[];
  wires: WireSegment[];
}

export type OpResult =
  | { doc: Project; createdIds: string[]; error?: undefined }
  | { doc?: undefined; createdIds?: undefined; error: string };

const ok = (doc: Project, createdIds: string[] = []): OpResult => {
  // Every mutation is a validated transaction (PLAN §9.2 invariant, local form).
  const res = validateProject(doc);
  if (!res.ok) {
    return { error: res.errors.map((e) => `${e.code}: ${e.message}`).join("; ") };
  }
  return { doc, createdIds };
};

const fail = (error: string): OpResult => ({ error });

export function collectIds(doc: Project): Set<string> {
  const ids = new Set<string>();
  doc.boards.forEach((b) => ids.add(b.id));
  doc.components.forEach((c) => ids.add(c.id));
  doc.nets.forEach((n) => ids.add(n.id));
  doc.wires.forEach((w) => ids.add(w.id));
  doc.mechanics?.bodies.forEach((b) => ids.add(b.id));
  doc.mechanics?.joints.forEach((j) => ids.add(j.id));
  return ids;
}

function uniqueId(base: string, used: Set<string>): string {
  const root = base.replace(/[^A-Za-z0-9_-]/g, "") || "item";
  if (!used.has(root)) return root;
  let n = 1;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

function defaultProps(type: string): Record<string, unknown> {
  return structuredClone(partDef(type)?.defaultProps ?? {});
}

/* World bounds (mm). The viewport shows 720×540 and pans/zooms across the world. */
const CANVAS_W = 4096;
const CANVAS_H = 3072;

/** Clamp a top-left so the part stays on the workplane. */
const clampXY = (x: number, y: number, w: number, h: number): [number, number] => [
  Math.min(Math.max(x, 0), Math.max(0, CANVAS_W - w)),
  Math.min(Math.max(y, 0), Math.max(0, CANVAS_H - h)),
];

const shift = (t: { x: number; y: number }, dx: number, dy: number) => ({
  ...t,
  x: t.x + dx,
  y: t.y + dy,
});

const pinComponentId = (pin: string): string | null => parsePinRef(pin)?.componentId ?? null;

// --- ops ---------------------------------------------------------------------

export function place(
  doc: Project,
  kind: "board" | "component",
  type: string,
  x: number,
  y: number,
): OpResult {
  const ids = collectIds(doc);
  const id = uniqueId(type, ids);
  const size = partDef(type)?.size_mm ?? { w: 0, h: 0 };
  [x, y] = clampXY(x, y, size.w, size.h);
  if (kind === "board") {
    const board: BoardPlacement = { id, type, transform: { x, y } };
    return ok(
      {
        ...doc,
        boards: [...doc.boards, board],
        meta: doc.meta.boardId ? doc.meta : { ...doc.meta, boardId: id },
      },
      [id],
    );
  }
  const component: ComponentPlacement = {
    id,
    type,
    props: defaultProps(type),
    transform: { x, y },
  };
  return ok({ ...doc, components: [...doc.components, component] }, [id]);
}

/**
 * Rotate the selection in 90° steps around each part's bbox center (the art
 * and pin math already spin around that center). Wire endpoints re-land on the
 * new pin positions — wires are visual-only; nets are topological.
 */
export function rotate(doc: Project, ids: string[], delta = 90): OpResult {
  if (ids.length === 0) return fail("nothing selected");
  const sel = new Set(ids);
  const spin = <T extends { id: string; transform: { x: number; y: number; rotation_deg?: number } }>(e: T): T =>
    sel.has(e.id)
      ? {
          ...e,
          transform: {
            ...e.transform,
            rotation_deg: ((((e.transform.rotation_deg ?? 0) + delta) % 360) + 360) % 360,
          },
        }
      : e;
  const next: Project = {
    ...doc,
    boards: doc.boards.map(spin),
    components: doc.components.map(spin),
    wires: doc.wires.map((w) => ({ ...w, points: w.points.map((p) => [p[0], p[1]] as [number, number]) })),
  };
  relayoutWires(next);
  return ok(next);
}

/** Content bounding box (rotation-aware) for fit-to-content; null when empty. */
export function docBBox(doc: Project): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const acc = (e: { type: string; transform: { x: number; y: number; rotation_deg?: number } }) => {
    const s = partDef(e.type)?.size_mm ?? { w: 0, h: 0 };
    const turned = (((e.transform.rotation_deg ?? 0) % 180) + 180) % 180 !== 0;
    const bw = turned ? s.h : s.w;
    const bh = turned ? s.w : s.h;
    minX = Math.min(minX, e.transform.x);
    minY = Math.min(minY, e.transform.y);
    maxX = Math.max(maxX, e.transform.x + bw);
    maxY = Math.max(maxY, e.transform.y + bh);
  };
  doc.boards.forEach(acc);
  doc.components.forEach(acc);
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

export function move(doc: Project, ids: string[], dx: number, dy: number): OpResult {
  if (ids.length === 0) return fail("nothing selected");
  if (dx === 0 && dy === 0) return ok(doc);
  const moving = new Set(ids);

  // Uniform clamped delta so relative layout and wire anchors stay in sync.
  let loX = -Infinity, hiX = Infinity, loY = -Infinity, hiY = Infinity;
  const bound = (e: { type?: string; size_mm?: { w: number; h: number }; transform: { x: number; y: number; rotation_deg?: number } }) => {
    const s = e.size_mm ?? (e.type ? partDef(e.type)?.size_mm : undefined) ?? { w: 0, h: 0 };
    const turned = (((e.transform.rotation_deg ?? 0) % 180) + 180) % 180 !== 0;
    const bw = turned ? s.h : s.w;
    const bh = turned ? s.w : s.h;
    loX = Math.max(loX, -e.transform.x);
    hiX = Math.min(hiX, CANVAS_W - bw - e.transform.x);
    loY = Math.max(loY, -e.transform.y);
    hiY = Math.min(hiY, CANVAS_H - bh - e.transform.y);
  };
  doc.boards.forEach((b) => moving.has(b.id) && bound(b));
  doc.components.forEach((c) => moving.has(c.id) && bound(c));
  doc.mechanics?.bodies.forEach((b) => moving.has(b.id) && bound(b));
  if (loX > -Infinity) {
    dx = Math.min(Math.max(dx, loX), Math.max(hiX, loX));
    dy = Math.min(Math.max(dy, loY), Math.max(hiY, loY));
    if (dx === 0 && dy === 0) return ok(doc);
  }

  const boards = doc.boards.map((b) => (moving.has(b.id) ? { ...b, transform: shift(b.transform, dx, dy) } : b));
  const components = doc.components.map((c) =>
    moving.has(c.id) ? { ...c, transform: shift(c.transform, dx, dy) } : c,
  );

  // Wires of touched nets travel with their parts (M0 approximation).
  const movedNets = new Set(
    doc.nets
      .filter((n) => n.pins.some((p) => {
        const owner = pinComponentId(p);
        return owner !== null && moving.has(owner);
      }))
      .map((n) => n.id),
  );
  const wires = doc.wires.map((w) =>
    movedNets.has(w.net)
      ? { ...w, points: w.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) }
      : w,
  );

  const next: Project = { ...doc, boards, components, wires };
  if (doc.mechanics) {
    next.mechanics = {
      bodies: doc.mechanics.bodies.map((b) =>
        moving.has(b.id) ? { ...b, transform: shift(b.transform, dx, dy) } : b,
      ),
      joints: doc.mechanics.joints,
    };
  }
  return ok(next);
}

export function remove(doc: Project, ids: string[]): OpResult {
  if (ids.length === 0) return fail("nothing selected");
  const gone = new Set(ids);

  const boards = doc.boards.filter((b) => !gone.has(b.id));
  const components = doc.components.filter((c) => !gone.has(c.id));

  // Mechanic attachments die with their driver/anchor parts (inv7/inv8 stay true).
  let bodies = doc.mechanics ? [...doc.mechanics.bodies] : [];
  let joints = doc.mechanics ? [...doc.mechanics.joints] : [];
  if (doc.mechanics) {
    const keepJoint = (j: (typeof joints)[number]): boolean => {
      if (gone.has(j.child) || gone.has(j.parent)) return false;
      const parentComp = j.parent.includes(":") ? pinComponentId(j.parent) : null;
      if (parentComp && gone.has(parentComp)) return false;
      if (j.driver && gone.has(j.driver.ref)) return false;
      return true;
    };
    const droppedChildIds = new Set(joints.filter((j) => !keepJoint(j)).map((j) => j.child));
    joints = joints.filter(keepJoint);
    const referenced = new Set<string>();
    joints.forEach((j) => {
      referenced.add(j.child);
      if (!j.parent.includes(":")) referenced.add(j.parent);
    });
    bodies = bodies.filter((b) => !gone.has(b.id) && (!droppedChildIds.has(b.id) || referenced.has(b.id)));
  }

  // Strip dead pins; prune nets that fall below 2 members (NET_TOO_SMALL).
  const nets: Net[] = [];
  for (const n of doc.nets) {
    const pins = n.pins.filter((p) => {
      const owner = pinComponentId(p);
      return owner !== null && !gone.has(owner);
    });
    if (pins.length >= 2) nets.push({ ...n, pins });
  }
  const liveNets = new Set(nets.map((n) => n.id));
  const wires = doc.wires.filter((w) => liveNets.has(w.net));

  const next: Project = { ...doc, boards, components, nets, wires };
  if (doc.mechanics) next.mechanics = { bodies, joints };
  return ok(next);
}

export function disconnect(doc: Project, pin: string): OpResult {
  const nets: Net[] = [];
  for (const n of doc.nets) {
    if (!n.pins.includes(pin)) {
      nets.push(n);
      continue;
    }
    const pins = n.pins.filter((p) => p !== pin);
    if (pins.length >= 2) nets.push({ ...n, pins });
  }
  const live = new Set(nets.map((n) => n.id));
  return ok({ ...doc, nets, wires: doc.wires.filter((w) => live.has(w.net)) });
}

export function connect(
  doc: Project,
  a: string,
  b: string,
  points: [number, number][],
): OpResult {
  if (a === b) return fail("a pin cannot connect to itself");
  if (points.length < 2) return fail("wire needs ≥ 2 points");

  for (const pin of [a, b]) {
    const ref = parsePinRef(pin);
    if (!ref) return fail(`malformed pin "${pin}"`);
    const entity = [...doc.boards, ...doc.components].find((e) => e.id === ref.componentId);
    if (!entity) return fail(`no part "${ref.componentId}"`);
    const catalog = M0_PIN_CATALOG[entity.type];
    if (!catalog || !catalog.includes(ref.pinId)) {
      return fail(`${entity.type} has no pin "${ref.pinId}"`);
    }
  }

  const ids = collectIds(doc);
  // A pin's electrical node includes its part's internal strips (breadboard
  // columns / rails): wires landing on any hole of a strip share one net.
  const nodeKeys = (pin: string): string[] => {
    const ref = parsePinRef(pin);
    if (!ref) return [pin];
    const entity = [...doc.boards, ...doc.components].find((e) => e.id === ref.componentId);
    const mates = entity ? bridgeMatesOf(entity.type, ref.pinId) : [];
    return mates.length > 0 ? mates.map((m) => `${ref.componentId}:${m}`) : [pin];
  };
  const netsTouching = (pin: string): Net[] => {
    const keys = new Set(nodeKeys(pin));
    return doc.nets.filter((n) => n.pins.some((p) => keys.has(p)));
  };
  const involved = [...netsTouching(a), ...netsTouching(b)];
  const seen = new Set<string>();
  const mergeList = involved.filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)));

  let nets: Net[];
  let relabelFrom: string | null = null;
  let netId: string;
  const keepBoth = (n: Net): Net => ({
    ...n,
    pins: [...n.pins, ...[a, b].filter((p) => !n.pins.includes(p))],
  });
  if (mergeList.length === 0) {
    netId = uniqueId("net", ids);
    nets = [...doc.nets, { id: netId, pins: [a, b] }];
  } else {
    // Absorb every touched net into the first (bridge strips can reach several).
    const keeper = mergeList[0]!;
    netId = keeper.id;
    relabelFrom = mergeList.length > 1 ? mergeList.slice(1).map((n) => n.id).join("|") : null;
    const drop = new Set(mergeList.slice(1).map((n) => n.id));
    nets = doc.nets
      .filter((n) => !drop.has(n.id))
      .map((n) => (n.id === keeper.id ? keepBoth({ ...n, pins: [...n.pins, ...mergeList.slice(1).flatMap((m) => m.pins.filter((p) => !keeper.pins.includes(p)))] }) : n));
  }

  const relabelSet = new Set((relabelFrom ?? "").split("|").filter(Boolean));
  const existing = doc.wires.map((w) => (relabelSet.has(w.net) ? { ...w, net: netId } : w));
  const wire: WireSegment = { id: uniqueId("wire", ids), net: netId, points };
  return ok({ ...doc, nets, wires: [...existing, wire] });
}

export function copyOf(doc: Project, ids: string[]): Clipboard | null {
  const sel = new Set(ids);
  const boards = doc.boards.filter((b) => sel.has(b.id));
  const components = doc.components.filter((c) => sel.has(c.id));
  if (components.length === 0 && boards.length === 0) return null;

  const inSelection = (p: string) => {
    const owner = pinComponentId(p);
    return owner !== null && sel.has(owner);
  };
  const nets: Net[] = [];
  for (const n of doc.nets) {
    const pins = n.pins.filter(inSelection);
    if (pins.length >= 2) nets.push({ id: n.id, pins });
  }
  const kept = new Set(nets.map((n) => n.id));
  const wires: WireSegment[] = doc.wires
    .filter((x) => kept.has(x.net))
    .map((x) => ({ ...x, points: x.points.map(([px, py]) => [px, py] as [number, number]) }));
  return { boards, components, nets, wires };
}

export function paste(doc: Project, clip: Clipboard, seq: number): OpResult {
  if (clip.components.length === 0 && clip.boards.length === 0) return fail("clipboard is empty");
  const suffix = `-copy-${seq}`;
  const idMap = new Map<string, string>();
  for (const b of clip.boards) idMap.set(b.id, `${b.id}${suffix}`);
  for (const c of clip.components) idMap.set(c.id, `${c.id}${suffix}`);

  const boards: BoardPlacement[] = clip.boards.map((b) => ({
    ...b,
    id: idMap.get(b.id)!,
    transform: shift(b.transform, 20, 20),
  }));
  const components: ComponentPlacement[] = clip.components.map((c) => ({
    ...c,
    id: idMap.get(c.id)!,
    transform: shift(c.transform, 20, 20),
  }));
  const nets: Net[] = clip.nets.map((n) => ({
    ...n,
    id: `${n.id}${suffix}`,
    pins: n.pins.map((p) => {
      const ref = parsePinRef(p);
      return ref && idMap.has(ref.componentId) ? `${idMap.get(ref.componentId)}:${ref.pinId}` : p;
    }),
  }));
  const wires: WireSegment[] = clip.wires.map((x) => ({
    ...x,
    id: `${x.id}${suffix}`,
    net: `${x.net}${suffix}`,
    points: x.points.map(([px, py]) => [px + 20, py + 20] as [number, number]),
  }));

  return ok(
    {
      ...doc,
      boards: [...doc.boards, ...boards],
      components: [...doc.components, ...components],
      nets: [...doc.nets, ...nets],
      wires: [...doc.wires, ...wires],
    },
    [...boards.map((b) => b.id), ...components.map((c) => c.id)],
  );
}

export function duplicate(doc: Project, ids: string[], seq: number): OpResult {
  const clip = copyOf(doc, ids);
  if (!clip) return fail("nothing selected to duplicate");
  return paste(doc, clip, seq);
}

export function setCodeFile(doc: Project, name: string, content: string): OpResult {
  if (!(name in doc.code.files)) return fail(`no file "${name}"`);
  return ok({ ...doc, code: { ...doc.code, files: { ...doc.code.files, [name]: content } } });
}

export function replaceAll(_doc: Project, next: Project): OpResult {
  return ok(structuredClone(next));
}
