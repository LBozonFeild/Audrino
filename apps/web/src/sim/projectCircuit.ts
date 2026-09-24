/** Project (schema DSL) → @audrino/sim CircuitSpec. Electrical connectivity =
 *  nets (pin groups); wires are the visual polylines. */
import type { Project } from "@audrino/schema";
import type { CircuitSpec } from "@audrino/sim";

export function projectToCircuit(doc: Project): CircuitSpec {
  return {
    components: [
      ...doc.boards.map((b) => ({ ref: b.id, type: b.type })),
      ...doc.components.map((c) => ({ ref: c.id, type: c.type, props: c.props })),
    ],
    nets: doc.nets.map((n) => ({ pins: n.pins })),
  };
}
