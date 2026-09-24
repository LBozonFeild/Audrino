/**
 * MNA circuit solver: DC operating point + backward-Euler transient.
 * Elements: resistor, capacitor (companion model), ideal/Thevenin voltage
 * sources, piecewise-linear diode (LED), switch resistor. Node 0 = ground;
 * a tiny gmin to ground keeps floating nodes solvable.
 */

export type Element =
  | { kind: "res"; a: number; b: number; ohms: number }
  | { kind: "cap"; a: number; b: number; farads: number }
  | { kind: "vsrc"; a: number; b: number; volts: number }
  | { kind: "thev"; a: number; b: number; volts: number; rser: number; active: boolean }
  | { kind: "diode"; a: number; b: number; vf: number; ron: number }
  | { kind: "res_sw"; a: number; b: number; closed: boolean; ohmsClosed: number };

const GMIN = 1e-12;

export class MnaSolver {
  readonly elements: Element[];
  readonly nodeCount: number;
  /** internal series nodes for Thevenin sources start at nodeCount */
  private readonly nTotal: number;
  private readonly vsrcs: number[] = [];
  private readonly caps: number[] = [];
  private capV: Float64Array;
  private A: Float64Array;
  private z: Float64Array;
  /** latest solution (node voltages incl. internal nodes) */
  v: Float64Array;

  constructor(elements: Element[], nodeCount: number) {
    this.elements = elements;
    this.nodeCount = nodeCount;
    let n = nodeCount;
    for (const e of elements) {
      if (e.kind === "vsrc") this.vsrcs.push(this.elements.indexOf(e));
      if (e.kind === "cap") this.caps.push(this.elements.indexOf(e));
      if (e.kind === "thev") {
        (e as unknown as { mid?: number }).mid = n;
        n += 1;
      }
    }
    this.nTotal = n;
    this.capV = new Float64Array(this.caps.length);
    this.v = new Float64Array(this.nTotal);
    const dim = this.nTotal - 1 + this.vsrcCount();
    this.A = new Float64Array(dim * dim);
    this.z = new Float64Array(dim);
  }

  private vsrcCount() {
    let k = 0;
    for (const e of this.elements) if (e.kind === "vsrc" || e.kind === "thev") k++;
    return k;
  }

  /** DC operating point: capacitors open. */
  solveDC(): Float64Array {
    return this.run(null);
  }

  /** t=0 solve with capacitors held at their initial (uncharged) state. */
  solveInitial(): Float64Array {
    return this.run(null, false);
  }

  /** Backward-Euler transient step. */
  step(dt: number): Float64Array {
    return this.run(dt);
  }

  /** Piecewise-linear diode current (anode → cathode) from last solve. */
  diodeCurrent(e: Extract<Element, { kind: "diode" }>): number {
    const vd = this.v[e.a] - this.v[e.b];
    return vd > e.vf ? (vd - e.vf) / e.ron : vd * 1e-12;
  }

  private run(dt: number | null, record = true): Float64Array {
    /* Newton loop for piecewise-linear diodes */
    let guess: Float64Array = this.v.slice();
    for (let iter = 0; iter < 10; iter++) {
      const v = this.stampAndSolve(dt, guess, iter > 0, record);
      let moved = false;
      for (let i = 0; i < v.length; i++) {
        if (Math.abs(v[i] - guess[i]) > 1e-6) moved = true;
      }
      guess = v;
      if (!moved && iter > 0) break;
      if (iter === 0 && !this.elements.some((e) => e.kind === "diode")) break;
    }
    this.v = guess;
    if (record) {
      this.caps.forEach((idx, j) => {
        const e = this.elements[idx] as Extract<Element, { kind: "cap" }>;
        this.capV[j] = this.v[e.a] - this.v[e.b];
      });
    }
    return this.v;
  }

  private stampAndSolve(dt: number | null, guess: Float64Array, settled: boolean, record: boolean): Float64Array {
    const nU = this.nTotal - 1; /* node 0 = ground */
    const nV = this.vsrcCount();
    const dim = nU + nV;
    const A = this.A;
    const z = this.z;
    A.fill(0);
    z.fill(0);

    const stampConductance = (a: number, b: number, conduct: number) => {
      if (a > 0) A[(a - 1) * dim + (a - 1)] += conduct;
      if (b > 0) A[(b - 1) * dim + (b - 1)] += conduct;
      if (a > 0 && b > 0) {
        A[(a - 1) * dim + (b - 1)] -= conduct;
        A[(b - 1) * dim + (a - 1)] -= conduct;
      }
    };
    const stampCurrent = (a: number, b: number, amps: number) => {
      /* current source b → a */
      if (a > 0) z[a - 1] += amps;
      if (b > 0) z[b - 1] -= amps;
    };

    /* gmin to ground on every node */
    for (let i = 1; i < this.nTotal; i++) stampConductance(i, 0, GMIN);

    let vs = 0;
    for (const e of this.elements) {
      switch (e.kind) {
        case "res":
          stampConductance(e.a, e.b, 1 / e.ohms);
          break;
        case "res_sw":
          if (e.closed) stampConductance(e.a, e.b, 1 / e.ohmsClosed);
          break;
        case "cap": {
          if (dt && dt > 0) {
            const geq = e.farads / dt;
            const j = this.caps.indexOf(this.elements.indexOf(e));
            stampConductance(e.a, e.b, geq);
            stampCurrent(e.a, e.b, geq * this.capV[j]);
          } else if (!record) {
            /* solveInitial: uncharged cap = short (its held voltage) */
            stampConductance(e.a, e.b, 1e6);
          }
          break;
        }
        case "vsrc":
        case "thev": {
          const mid = e.kind === "thev" ? (e as unknown as { mid: number }).mid : e.a;
          if (e.kind === "thev") {
            if (!e.active) {
              vs += 1;
              break;
            }
            stampConductance(e.a, mid, 1 / e.rser);
          }
          const row = nU + vs;
          const kp = mid;
          const kn = e.b;
          if (kp > 0) {
            A[row * dim + (kp - 1)] += 1;
            A[(kp - 1) * dim + row] += 1;
          }
          if (kn > 0) {
            A[row * dim + (kn - 1)] -= 1;
            A[(kn - 1) * dim + row] -= 1;
          }
          z[row] += e.volts;
          vs += 1;
          break;
        }
        case "diode": {
          const vd = settled || guess.length ? guess[e.a] - guess[e.b] : 0;
          if (vd > e.vf) {
            const geq = 1 / e.ron;
            stampConductance(e.a, e.b, geq);
            stampCurrent(e.a, e.b, e.vf / e.ron);
          } else {
            stampConductance(e.a, e.b, 1e-12);
          }
          break;
        }
      }
    }

    const x = gaussian(A, z, dim);
    const v = new Float64Array(this.nTotal);
    for (let i = 1; i < this.nTotal; i++) v[i] = x[i - 1];
    return v;
  }
}

function gaussian(A: Float64Array, z: Float64Array, n: number): Float64Array {
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = Math.abs(A[col * n + col]);
    for (let r = col + 1; r < n; r++) {
      const m = Math.abs(A[r * n + col]);
      if (m > best) {
        best = m;
        piv = r;
      }
    }
    if (best < 1e-18) continue; /* singular row — gmin usually prevents this */
    if (piv !== col) {
      for (let c = 0; c < n; c++) {
        const t = A[col * n + c];
        A[col * n + c] = A[piv * n + c];
        A[piv * n + c] = t;
      }
      const tz = z[col];
      z[col] = z[piv];
      z[piv] = tz;
    }
    const d = A[col * n + col];
    for (let r = col + 1; r < n; r++) {
      const f = A[r * n + col] / d;
      if (f === 0) continue;
      for (let c = col; c < n; c++) A[r * n + c] -= f * A[col * n + c];
      z[r] -= f * z[col];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = z[r];
    for (let c = r + 1; c < n; c++) s -= A[r * n + c] * x[c];
    const d = A[r * n + r];
    x[r] = Math.abs(d) < 1e-18 ? 0 : s / d;
  }
  return x;
}
