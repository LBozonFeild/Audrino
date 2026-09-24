import { DSL_VERSION } from "./types";
import type { Project } from "./types";
import { parsePinRef } from "./pinref";
import { M0_PIN_CATALOG } from "./parts";

// Pin catalog: full PartDefinition tables live in ./parts (43 real pinouts).
// Still a stub vs M1's packages/parts — do not import from outside this package.

// Bare physical-quantity keys that must use §5.3 suffixes (inv10).
const BARE_UNIT_KEYS = new Set([
  "distance",
  "resistance",
  "angle",
  "voltage",
  "current",
  "size",
  "width",
  "height",
  "depth",
  "time",
  "delay",
  "period",
  "frequency",
  "temperature",
  "humidity",
  "pressure",
  "rpm",
  "capacitance",
  "inductance",
  "power",
  "rotation",
]);

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface ValidatorOptions {
  /**
   * Allowed `#include` headers for invariant 9 (e.g. new Set(["Servo.h"])).
   * When omitted, invariant 9 is skipped (M0 fixtures carry no registry).
   */
  allowedIncludes?: Set<string> | string[];
}

function err(code: string, message: string, path?: string): ValidationError {
  return path ? { code, message, path } : { code, message };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Validate a project against PLAN §5.4 invariants 1–8 and 10, plus 9 when a
 * registry is provided. Never throws on malformed input — errors are data.
 */
export function validateProject(doc: unknown, opts: ValidatorOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];
  if (!isRecord(doc)) return { ok: false, errors: [err("STRUCT", "project must be an object")] };
  const p = doc as unknown as Partial<Project>;

  // --- structural preconditions -------------------------------------------
  if (!isRecord(p.meta) || p.meta.dslVersion !== DSL_VERSION) {
    errors.push(err("DSL_VERSION", `meta.dslVersion must be ${DSL_VERSION}`, "meta.dslVersion"));
  }
  const boards = Array.isArray(p.boards) ? p.boards : [];
  const components = Array.isArray(p.components) ? p.components : [];
  const nets = Array.isArray(p.nets) ? p.nets : [];
  const wires = Array.isArray(p.wires) ? p.wires : [];
  if (!Array.isArray(p.boards)) errors.push(err("STRUCT", "boards must be an array", "boards"));
  if (!Array.isArray(p.components)) errors.push(err("STRUCT", "components must be an array", "components"));
  if (!Array.isArray(p.nets)) errors.push(err("STRUCT", "nets must be an array", "nets"));
  if (!Array.isArray(p.wires)) errors.push(err("STRUCT", "wires must be an array", "wires"));
  if (!isRecord(p.code) || typeof p.code.main !== "string" || !isRecord(p.code.files)) {
    errors.push(err("STRUCT", "code.main/files malformed", "code"));
  }
  if (!isRecord(p.build) || typeof p.build.fqbn !== "string") {
    errors.push(err("STRUCT", "build.fqbn missing", "build"));
  }
  if (!isRecord(p.sim) || typeof p.sim.render_fps !== "number") {
    errors.push(err("STRUCT", "sim.render_fps missing", "sim"));
  }
  const bodies = p.mechanics && Array.isArray(p.mechanics.bodies) ? p.mechanics.bodies : [];
  const joints = p.mechanics && Array.isArray(p.mechanics.joints) ? p.mechanics.joints : [];
  if (p.mechanics !== undefined && (!Array.isArray(p.mechanics.bodies) || !Array.isArray(p.mechanics.joints))) {
    errors.push(err("STRUCT", "mechanics.bodies/joints must be arrays", "mechanics"));
  }

  // --- inv4: global id uniqueness -------------------------------------------
  const seen = new Map<string, string>();
  const claim = (id: unknown, where: string) => {
    if (typeof id !== "string" || !id) {
      errors.push(err("STRUCT", `missing id`, where));
      return;
    }
    const prev = seen.get(id);
    if (prev) errors.push(err("DUP_ID", `id "${id}" already used by ${prev}`, where));
    else seen.set(id, where);
  };
  boards.forEach((b, i) => claim(b.id, `boards[${i}]`));
  components.forEach((c, i) => claim(c.id, `components[${i}]`));
  nets.forEach((n, i) => claim(n.id, `nets[${i}]`));
  wires.forEach((w, i) => claim(w.id, `wires[${i}]`));
  bodies.forEach((b, i) => claim(b.id, `mechanics.bodies[${i}]`));
  joints.forEach((j, i) => claim(j.id, `mechanics.joints[${i}]`));

  // --- placement table: id -> { kind, type } ----------------------------------
  const placements = new Map<string, { kind: "board" | "component" | "body"; type: string }>();
  boards.forEach((b) => {
    if (typeof b.id === "string") placements.set(b.id, { kind: "board", type: b.type });
  });
  components.forEach((c) => {
    if (typeof c.id === "string") placements.set(c.id, { kind: "component", type: c.type });
  });
  bodies.forEach((b) => {
    if (typeof b.id === "string") placements.set(b.id, { kind: "body", type: b.shape });
  });

  // --- inv1 + inv3 + inv5 + inv6: nets -----------------------------------------
  const pinToNet = new Map<string, string>();
  const netIds = new Set(nets.map((n) => n.id));
  nets.forEach((net, ni) => {
    const path = `nets[${ni}] (${net.id})`;
    if (!Array.isArray(net.pins)) {
      errors.push(err("STRUCT", "net.pins must be an array", path));
      return;
    }
    if (net.pins.length < 2) {
      errors.push(err("NET_TOO_SMALL", `net "${net.id}" connects ${net.pins.length} pin(s); need ≥ 2`, path));
    }
    const local = new Set<string>();
    net.pins.forEach((pin) => {
      if (local.has(pin)) {
        errors.push(err("NET_DUP_PIN", `net "${net.id}" contains pin "${pin}" twice`, path)); // inv3
      }
      local.add(pin);
      const owner = pinToNet.get(pin);
      if (owner && owner !== net.id) {
        errors.push(err("PIN_MULTI_NET", `pin "${pin}" is in nets "${owner}" and "${net.id}"`, path)); // inv1
      } else if (!owner) {
        pinToNet.set(pin, net.id);
      }
      const ref = parsePinRef(pin);
      if (!ref) {
        errors.push(err("PIN_FORMAT", `malformed pin reference "${pin}" (want "id:pin")`, path));
        return;
      }
      const target = placements.get(ref.componentId);
      if (!target || target.kind === "body") {
        errors.push(err("DANGLING_REF", `"${pin}" references missing component/board "${ref.componentId}"`, path)); // inv6
        return;
      }
      const catalog = M0_PIN_CATALOG[target.type];
      if (!catalog) {
        errors.push(err("UNKNOWN_TYPE", `unknown ${target.kind} type "${target.type}"`, path));
        return;
      }
      if (!catalog.includes(ref.pinId)) {
        errors.push(err("UNKNOWN_PIN", `"${pin}" — ${target.type} has no pin "${ref.pinId}"`, path)); // inv5
      }
    });
  });

  // --- inv2: wires resolve to exactly one net -----------------------------------
  wires.forEach((w, wi) => {
    const path = `wires[${wi}] (${w.id})`;
    if (typeof w.net !== "string" || !netIds.has(w.net)) {
      errors.push(err("WIRE_NO_NET", `wire "${w.id}" points at missing net "${w.net}"`, path));
    }
    if (!Array.isArray(w.points) || w.points.length < 2 || !w.points.every(isPoint)) {
      errors.push(err("BAD_POINTS", `wire "${w.id}" needs ≥ 2 [x, y] points`, path));
    }
  });

  // --- inv7 + inv8: joints -------------------------------------------------------
  // Graph edges parent-body -> child-body (external "comp:anchor" parents are roots).
  const edges = new Map<string, string[]>();
  joints.forEach((j, ji) => {
    const path = `mechanics.joints[${ji}] (${j.id})`;
    if (typeof j.child !== "string" || !bodies.some((b) => b.id === j.child)) {
      errors.push(err("DANGLING_REF", `joint "${j.id}" child "${j.child}" is not a body`, path));
    }
    if (typeof j.parent === "string" && !j.parent.includes(":") && !bodies.some((b) => b.id === j.parent)) {
      errors.push(err("DANGLING_REF", `joint "${j.id}" parent body "${j.parent}" missing`, path));
    } else if (typeof j.parent === "string" && j.parent.includes(":")) {
      const ref = parsePinRef(j.parent);
      if (!ref || !placements.has(ref.componentId)) {
        errors.push(err("DANGLING_REF", `joint "${j.id}" parent "${j.parent}" resolves nowhere`, path));
      }
    }
    if (typeof j.parent === "string" && !j.parent.includes(":") && typeof j.child === "string") {
      const list = edges.get(j.parent) ?? [];
      list.push(j.child);
      edges.set(j.parent, list);
    } else if (typeof j.parent === "string" && typeof j.child === "string" && j.parent === j.child) {
      // degenerate self-loop via identical spelled ref
      const list = edges.get(j.parent) ?? [];
      list.push(j.child);
      edges.set(j.parent, list);
    }
    if (j.driver !== undefined) {
      if (typeof j.driver.ref !== "string" || !placements.has(j.driver.ref)) {
        errors.push(err("JOINT_DRIVER", `joint "${j.id}" driver ref "${j.driver?.ref}" missing`, path)); // inv8
      }
    }
  });
  // Cycle detection (DFS with colors) over body graph.
  const color = new Map<string, number>();
  const visit = (node: string, stack: string[]): string[] | null => {
    color.set(node, 1);
    for (const next of edges.get(node) ?? []) {
      if (color.get(next) === 1) return [...stack, node, next];
      if (!color.get(next)) {
        const hit = visit(next, [...stack, node]);
        if (hit) return hit;
      }
    }
    color.set(node, 2);
    return null;
  };
  for (const node of edges.keys()) {
    if (!color.get(node)) {
      const cycle = visit(node, []);
      if (cycle) {
        errors.push(err("JOINT_CYCLE", `attachment cycle: ${cycle.join(" → ")}`, "mechanics.joints")); // inv7
        break;
      }
    }
  }

  // --- inv10: §5.3 suffix units ----------------------------------------------------
  components.forEach((c, i) => {
    if (isRecord(c.props)) {
      for (const key of Object.keys(c.props)) {
        if (BARE_UNIT_KEYS.has(key)) {
          errors.push(
            err("BARE_UNIT", `components[${i}].props.${key} must use a §5.3 suffix (e.g. ${key}_mm)`, `components[${i}].props`),
          );
        }
      }
    }
    const t = c.transform as unknown as Record<string, unknown> | undefined;
    if (isRecord(t)) {
      if (typeof t.x !== "number" || typeof t.y !== "number") {
        errors.push(err("STRUCT", "transform needs numeric x/y (mm)", `components[${i}].transform`));
      }
      if ("rotation" in t) errors.push(err("BARE_UNIT", 'use rotation_deg, not rotation', `components[${i}].transform`));
    }
  });
  boards.forEach((b, i) => {
    const t = b.transform as unknown as Record<string, unknown> | undefined;
    if (!isRecord(t) || typeof t.x !== "number" || typeof t.y !== "number") {
      errors.push(err("STRUCT", "transform needs numeric x/y (mm)", `boards[${i}].transform`));
    } else if ("rotation" in t) {
      errors.push(err("BARE_UNIT", "use rotation_deg, not rotation", `boards[${i}].transform`));
    }
  });
  bodies.forEach((b, i) => {
    const rec = b as unknown as Record<string, unknown>;
    if ("size" in rec) errors.push(err("BARE_UNIT", "use size_mm, not size", `mechanics.bodies[${i}]`));
  });

  // --- inv9: includes vs registry (skipped without a registry) ---------------------
  if (opts.allowedIncludes !== undefined) {
    const allowed = opts.allowedIncludes instanceof Set ? opts.allowedIncludes : new Set(opts.allowedIncludes);
    const files = isRecord(p.code) && isRecord(p.code.files) ? (p.code.files as Record<string, unknown>) : {};
    for (const [name, content] of Object.entries(files)) {
      if (typeof content !== "string") continue;
      for (const match of content.matchAll(/#include\s*[<"]([^>"]+)[>"]/g)) {
        const header = match[1];
        if (!allowed.has(header)) {
          errors.push(err("UNKNOWN_INCLUDE", `"${header}" is not in the approved registry`, `code.files.${name}`));
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function isPoint(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number";
}
