// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { relayoutWires } from "../src/dsl/netsFromConnections";

// Saved designs must survive pinout corrections: nets stay topological
// ("ref:pinId"), only the drawn geometry re-lands onto current pin coords.
describe("relayoutWires", () => {
  const doc = () => ({
    boards: [
      {
        id: "u1",
        type: "arduino-uno",
        transform: { x: 0, y: 0, rotation_deg: 0 },
      },
    ],
    components: [],
    nets: [{ id: "n1", pins: ["u1:D13", "u1:A0"] }],
    wires: [
      {
        id: "w1",
        net: "n1",
        points: [
          [900, 800],
          [500, 500],
        ] as [number, number][],
      },
    ],
  });

  it("snaps wire endpoints onto the net's current pins, keeping waypoints", () => {
    const d = doc();
    d.wires[0].points = [
      [900, 800],
      [123, 456],
      [700, 600],
    ];
    relayoutWires(d as never);
    // endpoints now sit exactly on D13 (32.66, 2.6) and A0 (50.8, 51.5)
    const ends = [d.wires[0].points[0], d.wires[0].points[2]];
    const expected = [
      [32.66, 2.6],
      [50.8, 51.5],
    ];
    for (const e of expected) {
      expect(ends.some(([x, y]) => Math.abs(x - e[0]) < 0.01 && Math.abs(y - e[1]) < 0.01)).toBe(true);
    }
    // the user's interior waypoint survives
    expect(d.wires[0].points[1]).toEqual([123, 456]);
  });

  it("leaves already-correct wires alone", () => {
    const d = doc();
    d.wires[0].points = [
      [32.66, 2.6],
      [50.8, 51.5],
    ];
    relayoutWires(d as never);
    expect(Math.abs(d.wires[0].points[0][0] - 32.66)).toBeLessThan(0.01);
    expect(Math.abs(d.wires[0].points[0][1] - 2.6)).toBeLessThan(0.01);
    expect(Math.abs(d.wires[0].points[1][0] - 50.8)).toBeLessThan(0.01);
    expect(Math.abs(d.wires[0].points[1][1] - 51.5)).toBeLessThan(0.01);
  });

  it("skips wires whose net cannot resolve two pins", () => {
    const d = {
      boards: [],
      components: [],
      nets: [{ id: "n1", pins: ["ghost:A"] }],
      wires: [
        {
          id: "w1",
          net: "n1",
          points: [
            [1, 1],
            [2, 2],
          ] as [number, number][],
        },
      ],
    };
    relayoutWires(d as never);
    expect(d.wires[0].points).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });
});
