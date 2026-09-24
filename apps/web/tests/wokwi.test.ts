import { describe, expect, it } from "vitest";
import { importWokwiDiagram, exportWokwi } from "../src/dsl/wokwi";
import type { Project } from "@audrino/schema";

const BLINK = {
  version: 1,
  parts: [
    { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0, attrs: {} },
    { type: "wokwi-led", id: "led1", top: -20, left: 80, attrs: { color: "red" } },
    { type: "wokwi-resistor", id: "r1", top: 40, left: 80, attrs: { value: "220" } },
    { type: "wokwi-pushbutton", id: "pb1", top: 100, left: 40, attrs: {} },
    { type: "wokwi-servo", id: "srv1", top: 140, left: 120, attrs: {} },
    { type: "wokwi-quantum-flux", id: "q1", top: 0, left: 200, attrs: {} },
  ],
  connections: [
    ["uno:13", "led1:A", "green", []],
    ["led1:K", "r1:1", "black", []],
    ["r1:2", "uno:GND.1", "black", []],
    ["uno:5V", "srv1:V+", "red", []],
    ["srv1:GND", "uno:GND.2", "black", []],
    ["srv1:PWM", "uno:9", "green", []],
    ["pb1:1.l", "uno:2", "green", []],
    ["pb1:2.l", "uno:4", "green", []],
    ["q1:flux", "uno:4", "blue", []],
  ],
};

describe("wokwi diagram.json interop", () => {
  it("imports parts, wires, and per-wire nets with name-based pin mapping", () => {
    const r = importWokwiDiagram(JSON.stringify(BLINK));
    expect(r.doc).toBeTruthy();
    const doc = r.doc as Project;
    expect(doc.boards.map((b) => b.type)).toEqual(["arduino-uno"]);
    const types = doc.components.map((c) => c.type).sort();
    expect(types).toEqual(["led", "pushbutton", "resistor", "sg90-servo"]);
    expect(r.warnings.some((w) => w.includes("wokwi-quantum-flux"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("q1:flux"))).toBe(true);

    // one net per conductor: series parts must NOT collapse, shared pins must merge
    // (wokwi GND.1/GND.2 are the same board rail — both map to our single GND pin)
    const nets = doc.nets.map((n) => [...n.pins].sort().join("|")).sort();
    expect(nets).toContain(["led1:K", "r1:1"].sort().join("|"));
    expect(nets).toContain(["r1:2", "srv1:GND", "uno:GND"].sort().join("|"));
    const d13net = doc.nets.find((n) => n.pins.includes("uno:D13"));
    expect(d13net?.pins).toEqual(["led1:A", "uno:D13"]); // A lives on its own conductor

    // resistor value parsed, servo pins mapped V+→VCC, pushbutton 4 legs collapse to 2 pins
    const r1 = doc.components.find((c) => c.id === "r1");
    expect((r1?.props as { resistance_ohms: number }).resistance_ohms).toBe(220);
    const srv = doc.nets.filter((n) => n.pins.some((p) => p.startsWith("srv1:")));
    expect(srv.flatMap((n) => n.pins)).toEqual(expect.arrayContaining(["srv1:VCC", "srv1:GND", "srv1:PWM"]));
    const pb = doc.nets.filter((n) => n.pins.some((p) => p.startsWith("pb1:")));
    expect(pb.flatMap((n) => n.pins)).toEqual(expect.arrayContaining(["pb1:1", "pb1:2"]));

    // wires: one straight segment per net edge (3-pin GND net chains 2 segments)
    expect(doc.wires.length).toBe(8);
  });

  it("round-trips through export (structure preserved, ids remapped)", () => {
    const imported = (importWokwiDiagram(JSON.stringify(BLINK)).doc as Project);
    const { diagram, skipped } = exportWokwi(imported);
    expect(skipped.length).toBe(0);
    const parts = (diagram as { parts: { type: string }[] }).parts;
    expect(parts.map((p) => p.type).sort()).toEqual(
      ["wokwi-arduino-uno", "wokwi-led", "wokwi-pushbutton", "wokwi-resistor", "wokwi-servo"].sort(),
    );
    const again = importWokwiDiagram(diagram as never);
    expect(again.doc).toBeTruthy();
    const netKeys = (d: Project) => d.nets.map((n) => [...n.pins].sort().join("|")).sort();
    // same connectivity shape after remap (pin ids preserved per type)
    expect(netKeys(again.doc as Project).length).toBe(netKeys(imported).length);
  });

  it("reports unmapped exports and rejects garbage input", () => {
    const doc = importWokwiDiagram(JSON.stringify(BLINK)).doc as Project;
    doc.components.push({ id: "mystery", type: "ne555", props: {}, transform: { x: 10, y: 10 } });
    const { skipped } = exportWokwi(doc);
    expect(skipped).toContain("mystery (ne555)");
    expect(importWokwiDiagram("{not json").error).toBe("not valid JSON");
    expect(importWokwiDiagram("{}").error).toBe("missing parts[]");
  });
});
