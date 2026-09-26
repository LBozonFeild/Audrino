/**
 * Ground-aware clustered solver: subcircuits that share no non-zero node are
 * mathematically independent (node 0 is a known), so each becomes its own small
 * MNA system. GPIO writes dirty only their cluster — big multi-block circuits
 * re-solve only what changed. Results are bit-compatible with one monolithic
 * MnaSolver over the same elements (see tests/cluster.test.ts parity).
 */
import { MnaSolver, type Element } from "./mna";

interface Group {
  solver: MnaSolver;
  toLocal: Map<number, number>;
  toGlobal: number[];
  entries: { orig: Element; local: Element }[];
  dirty: boolean;
  hasCap: boolean;
}

export class ClusteredSolver {
  private readonly groups: Group[] = [];
  private readonly byElement = new Map<Element, { g: Group; local: Element }>();
  /** global node voltages (index 0 = ground) */
  v: Float64Array;

  constructor(elements: Element[], nodeCount: number) {
    this.v = new Float64Array(nodeCount);

    /* union elements sharing a non-zero node */
    const parent = new Map<number, number>();
    const find = (x: number): number => {
      const p = parent.get(x) ?? x;
      if (p !== x) {
        const r = find(p);
        parent.set(x, r);
        return r;
      }
      parent.set(x, x);
      return x;
    };
    const union = (a: number, b: number) => parent.set(find(a), find(b));
    const groupKey = new Map<Element, number | string>();
    elements.forEach((e, idx) => {
      const ns = [e.a, e.b].filter((n) => n > 0);
      if (ns.length === 0) {
        groupKey.set(e, `iso:${idx}`); /* both ends on ground: inert, isolated */
        return;
      }
      for (let i = 1; i < ns.length; i++) union(ns[0], ns[i]);
      groupKey.set(e, ns[0]);
    });

    const buckets = new Map<string, Element[]>();
    for (const e of elements) {
      const key0 = groupKey.get(e)!;
      const key = typeof key0 === "number" ? String(find(key0)) : key0;
      const list = buckets.get(key) ?? [];
      list.push(e);
      buckets.set(key, list);
    }

    for (const list of buckets.values()) {
      const toLocal = new Map<number, number>([[0, 0]]);
      const toGlobal = [0];
      const localNode = (n: number): number => {
        if (n === 0) return 0;
        let l = toLocal.get(n);
        if (l === undefined) {
          l = toGlobal.length;
          toLocal.set(n, l);
          toGlobal.push(n);
        }
        return l;
      };
      const entries = list.map((orig) => {
        const local: Element = { ...orig, a: localNode(orig.a), b: localNode(orig.b) } as Element;
        return { orig, local };
      });
      const g: Group = {
        solver: new MnaSolver(entries.map((x) => x.local), toGlobal.length),
        toLocal,
        toGlobal,
        entries,
        dirty: true,
        hasCap: list.some((e) => e.kind === "cap"),
      };
      this.groups.push(g);
      for (const en of entries) this.byElement.set(en.orig, { g, local: en.local });
    }
  }

  get clusterCount(): number {
    return this.groups.length;
  }

  markDirty(e: Element): void {
    const rec = this.byElement.get(e);
    if (rec) rec.g.dirty = true;
  }

  private scatter(g: Group, local: Float64Array): void {
    for (let i = 1; i < g.toGlobal.length; i++) this.v[g.toGlobal[i]] = local[i];
  }

  /** Pull mutable params (ohms/volts/closed/active/…) from the shared originals —
   *  applyPinMode and tests mutate the originals; node ids stay local. */
  private sync(g: Group): void {
    for (const en of g.entries) {
      const a = en.local.a;
      const b = en.local.b;
      Object.assign(en.local, en.orig, { a, b });
    }
  }

  /** DC operating point: capacitors open. Re-solves only dirty clusters. */
  solveDC(): Float64Array {
    for (const g of this.groups) {
      if (!g.dirty) continue;
      this.sync(g);
      this.scatter(g, g.solver.solveDC());
      g.dirty = false;
    }
    return this.v;
  }

  /** t=0 solve with capacitors at their initial (uncharged) state — all clusters. */
  solveInitial(): Float64Array {
    for (const g of this.groups) {
      this.sync(g);
      this.scatter(g, g.solver.solveInitial());
      g.dirty = false;
    }
    return this.v;
  }

  /** Backward-Euler transient step — capacitive clusters (and dirty ones). */
  step(dt: number): Float64Array {
    for (const g of this.groups) {
      if (!g.hasCap && !g.dirty) continue;
      this.sync(g);
      this.scatter(g, g.solver.step(dt));
      g.dirty = false;
    }
    return this.v;
  }

  /** Piecewise-linear diode current (anode → cathode) from the last solve. */
  diodeCurrent(e: Extract<Element, { kind: "diode" }>): number {
    const rec = this.byElement.get(e);
    return rec ? rec.g.solver.diodeCurrent(rec.local as Extract<Element, { kind: "diode" }>) : 0;
  }
}
