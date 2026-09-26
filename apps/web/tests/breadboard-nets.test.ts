/**
 * Breadboard strip semantics: wires landing on any holes of one tie-point
 * column (or rail half) are ONE conductor — in import/spawn, live editing,
 * and the sim export alike.
 */
import { describe, expect, it } from "vitest";
import { buildNetsAndWires, type EntityPlace } from "../src/dsl/netsFromConnections";
import { connect, type OpResult } from "../src/state/ops";
import { mergeNetsByBridges } from "../src/sim/projectCircuit";
import { normalizeType } from "../src/dsl/spawn";
import { createEmptyProject } from "../src/dsl/load";
import type { Project } from "@audrino/schema";

const entities: EntityPlace[] = [
  { id: "board1", type: "arduino-uno", transform: { x: 0, y: 0 } },
  { id: "bb", type: "breadboard-400", transform: { x: 200, y: 0 } },
];

function docWithBB(nets: Project["nets"]): Project {
  return {
    ...createEmptyProject(),
    boards: [{ id: "board1", type: "arduino-uno", transform: { x: 0, y: 0 } }],
    components: [{ id: "bb", type: "breadboard-400", props: {}, transform: { x: 200, y: 0 } }],
    nets,
    wires: [],
  };
}

describe("buildNetsAndWires + breadboard bridges", () => {
  it("merges two wires that land on one column strip into a single net", () => {
    const { nets, wires } = buildNetsAndWires(
      [
        ["board1:D13", "bb:a1"],
        ["bb:e1", "bb:b3"], // e1 shares column 1 with a1; b3 is column 3
      ],
      entities,
    );
    expect(nets.length).toBe(1);
    expect([...nets[0]!.pins].sort()).toEqual(["bb:a1", "bb:b3", "bb:e1", "board1:D13"]);
    expect(wires.length).toBe(3); // chain over 4 pins (pins−1), strip pins ordered along the walk
  });

  it("keeps separate columns separate", () => {
    const { nets } = buildNetsAndWires(
      [
        ["board1:D13", "bb:a1"],
        ["board1:D12", "bb:a2"],
      ],
      entities,
    );
    expect(nets.length).toBe(2);
  });
});

describe("live editing (connect) + sim export respect strips", () => {
  it("connect() merges nets through a column strip and relabels wires", () => {
    let doc = docWithBB([]);
    const r1 = connect(doc, "board1:D13", "bb:a1", [
      [0, 0],
      [1, 1],
    ]);
    expect("error" in r1).toBe(false);
    doc = (r1 as { doc: Project }).doc;
    const r2 = connect(doc, "bb:e1", "board1:GND", [
      [2, 2],
      [3, 3],
    ]);
    expect("error" in r2).toBe(false);
    doc = (r2 as { doc: Project }).doc;
    expect(doc.nets.length).toBe(1);
    expect([...doc.nets[0]!.pins].sort()).toEqual(["bb:a1", "bb:e1", "board1:D13", "board1:GND"]);
    expect(new Set(doc.wires.map((w) => w.net)).size).toBe(1); // both wires on the merged net
  });

  it("mergeNetsByBridges repairs split-strip nets before sim", () => {
    const doc = docWithBB([
      { id: "net-a", pins: ["board1:D13", "bb:a1"] },
      { id: "net-b", pins: ["bb:e1", "board1:GND"] },
    ]);
    const merged = mergeNetsByBridges(doc);
    expect(merged.length).toBe(1);
    expect([...merged[0]!.pins].sort()).toEqual(["bb:a1", "bb:e1", "board1:D13", "board1:GND"]);
  });

  it("spawn aliases resolve the three sizes", () => {
    expect(normalizeType("breadboard")).toBe("breadboard-400");
    expect(normalizeType("mini breadboard")).toBe("breadboard-170");
    expect(normalizeType("half-breadboard")).toBe("breadboard-400");
    expect(normalizeType("full breadboard")).toBe("breadboard-830");
  });
});
