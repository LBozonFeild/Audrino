/** Project (schema DSL) → @audrino/sim CircuitSpec. Electrical connectivity =
 *  nets (pin groups); wires are the visual polylines. Nets are reconciled
 *  through part-internal strips (breadboard columns / rail halves) first, so
 *  wires landing on different holes of one strip simulate as one node. */
import type { Net, Project } from "@audrino/schema";
import { bridgeMatesOf } from "@audrino/schema";
import type { CircuitSpec } from "@audrino/sim";

export function mergeNetsByBridges(doc: Project): Net[] {
  const typeOf = new Map<string, string>([
    ...doc.boards.map((b) => [b.id, b.type] as const),
    ...doc.components.map((c) => [c.id, c.type] as const),
  ]);
  // union nets that share any bridge strip
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
  const nets = doc.nets.map((n) => ({ ...n, pins: [...n.pins] }));
  for (const n of nets) parent.set(n.id, n.id);
  const netOfPin = new Map<string, string>();
  for (const n of nets) for (const p of n.pins) netOfPin.set(p, n.id);
  for (const [pin, netId] of netOfPin) {
    const [ref, pinId] = pin.split(":");
    const mates = bridgeMatesOf(typeOf.get(ref!) ?? "", pinId ?? "");
    for (const m of mates) {
      const other = netOfPin.get(`${ref}:${m}`);
      if (other && other !== netId) parent.set(find(other), find(netId));
    }
  }
  const byRoot = new Map<string, Net>();
  for (const n of nets) {
    const r = find(n.id);
    const acc = byRoot.get(r);
    if (!acc) {
      byRoot.set(r, { ...n });
    } else {
      acc.pins = [...acc.pins, ...n.pins.filter((p) => !acc.pins.includes(p))];
    }
  }
  return [...byRoot.values()];
}

export function projectToCircuit(doc: Project): CircuitSpec {
  return {
    components: [
      ...doc.boards.map((b) => ({ ref: b.id, type: b.type })),
      ...doc.components.map((c) => ({ ref: c.id, type: c.type, props: c.props })),
    ],
    nets: mergeNetsByBridges(doc).map((n) => ({ pins: n.pins })),
  };
}
