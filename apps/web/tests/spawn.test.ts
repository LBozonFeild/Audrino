import { describe, expect, it } from "vitest";
import {
  parseSpawn,
  buildSpawnProject,
  buildSpawnMessages,
  coreCatalogDigest,
  normalizeType,
  resolveSpawnPin,
  type SpawnSpec,
} from "../src/dsl/spawn";

const BLINK_SPEC: SpawnSpec = {
  name: "Blinker",
  board: "uno",
  parts: [
    { ref: "R1", type: "resistor", value: "220" },
    { ref: "LED1", type: "led", value: "red" },
  ],
  connections: [
    ["board1.D13", "R1.1"],
    ["R1.2", "LED1.A"],
    ["LED1.K", "board1:GND"],
  ],
  sketch: "void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}\n",
  bom: ["220Ω resistor", "red LED"],
  wiringSteps: ["D13 → R1.1", "R1.2 → LED anode", "LED cathode → GND"],
  explanation: "Current through the LED makes it glow.",
};

describe("parseSpawn", () => {
  it("accepts bare JSON, fenced json, and prose+brace blobs", () => {
    const bare = parseSpawn(JSON.stringify({ parts: [{ ref: "A", type: "led" }], connections: [["board1.D1", "A.A"]] }));
    expect(bare.ok).toBe(true);
    const fenced = parseSpawn('Here you go:\n```json\n{"parts":[{"ref":"A","type":"led"}],"connections":[["board1.D1","A.A"]]}\n```');
    expect(fenced.ok).toBe(true);
    const blob = parseSpawn('Sure! {"parts":[{"ref":"A","type":"led"}],"connections":[["board1.D1","A.A"]]} hope that helps');
    expect(blob.ok).toBe(true);
    expect(parseSpawn("I cannot design that.").ok).toBe(false);
    expect(parseSpawn('{"name":"x"}').ok).toBe(false); // missing parts/connections
  });
});

describe("buildSpawnProject", () => {
  it("auto-layouts a blink circuit with series-safe nets, wires, code, and build-card meta", () => {
    const r = buildSpawnProject(BLINK_SPEC);
    expect(r.doc).toBeTruthy();
    const doc = r.doc!;
    expect(doc.meta.name).toBe("Blinker");
    expect(doc.boards[0]).toMatchObject({ id: "board1", type: "arduino-uno" });
    expect(doc.components.map((c) => c.id).sort()).toEqual(["LED1", "R1"]);
    const resistor = doc.components.find((c) => c.id === "R1");
    expect(resistor?.props.resistance_ohms).toBe(220);
    const led = doc.components.find((c) => c.id === "LED1");
    expect(led?.props.color).toBe("red");
    // three conductors — series parts never collapse
    expect(doc.nets.length).toBe(3);
    expect(doc.wires.length).toBe(3);
    expect(doc.nets.map((n) => [...n.pins].sort().join("|")).sort()).toContain(
      ["LED1:K", "board1:GND"].sort().join("|"),
    );
    expect(doc.code.files["sketch.ino"]).toContain("digitalWrite(13, HIGH)");
    expect(doc.ai?.bom).toEqual(["220Ω resistor", "red LED"]);
    expect(doc.ai?.wiringSteps?.length).toBe(3);
    // auto-layout keeps parts on the grid
    for (const c of doc.components) {
      expect(c.transform.x).toBeGreaterThanOrEqual(56);
      expect(c.transform.y).toBeGreaterThanOrEqual(180);
    }
  });

  it("degrades unknown types/pins to warnings and drops their wires", () => {
    const r = buildSpawnProject({
      name: "Messy",
      parts: [
        { ref: "X1", type: "wokwi-quantum-flux" },
        { ref: "L1", type: "led" },
        { ref: "L2", type: "led" },
      ],
      connections: [
        ["board1.D13", "X1.flux"],
        ["board1.D12", "L1.A"],
        ["L1.K", "board1.GND"],
        ["board1.no-such-pin", "L2.A"],
      ],
    });
    expect(r.doc).toBeTruthy();
    expect(r.warnings.some((w) => w.includes("wokwi-quantum-flux"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("X1.flux"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("no-such-pin"))).toBe(true);
    expect(r.doc!.nets.length).toBe(2); // the two intact L1 wires survive (separate conductors)
    expect(r.doc!.components.length).toBe(2);
  });

  it("normalizes aliases and resolves pins by id or name", () => {
    expect(normalizeType("Pot")).toBe("potentiometer");
    expect(normalizeType("micro servo")).toBe("sg90-servo");
    expect(normalizeType("RGB_LED")).toBe("rgb-led");
    expect(normalizeType("flux-capacitor")).toBeNull();
    expect(resolveSpawnPin("led", "anode")).toBe("A");
    expect(resolveSpawnPin("led", "K")).toBe("K");
    expect(resolveSpawnPin("hc-sr04", "trig")).toBe("TRIG");
    expect(resolveSpawnPin("resistor", "3")).toBeNull();
  });
});

describe("buildSpawnMessages", () => {
  it("carries the catalog digest, the prompt, and retry errors", () => {
    const digest = coreCatalogDigest();
    expect(digest).toContain("led: A(Anode),K(Cathode)");
    expect(digest).toContain("resistor: 1,2");
    const msgs = buildSpawnMessages("build a buzzer alarm", ["skipped part \"x\""]);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain(digest.split("\n")[0]);
    expect(msgs[0].content).toContain("220–330Ω resistor in series with every LED");
    expect(msgs[1]).toEqual({ role: "user", content: "build a buzzer alarm" });
    expect(msgs[3].content).toContain("skipped part");
  });
});
