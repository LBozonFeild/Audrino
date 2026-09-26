import { describe, expect, it } from "vitest";
import { deriveManifest } from "../src/manifest";
import { formatPinRef, parsePinRef } from "../src/pinref";
import type { Project } from "../src/types";
import { validateProject } from "../src/validator";
import blink from "../fixtures/blink.json";
import servoArm from "../fixtures/servo-arm.json";
import trafficLight from "../fixtures/traffic-light.json";

const clone = <T>(v: T): T => structuredClone(v);
const codes = (p: unknown, opts?: { allowedIncludes?: Set<string> }) =>
  validateProject(p, opts).errors.map((e) => e.code);

// --- golden fixtures ---------------------------------------------------------

describe("fixtures", () => {
  it("accepts blink.json", () => {
    expect(validateProject(blink).errors).toEqual([]);
  });
  it("accepts traffic-light.json", () => {
    expect(validateProject(trafficLight).errors).toEqual([]);
  });
  it("accepts servo-arm.json", () => {
    expect(validateProject(servoArm).errors).toEqual([]);
  });
});

// --- one crafted failure per §5.4 invariant ------------------------------------

describe("invariants", () => {
  it("rejects a pin in two nets (inv1)", () => {
    const p = clone(blink) as unknown as Project;
    p.nets[1].pins.push("board1:D13");
    expect(codes(p)).toContain("PIN_MULTI_NET");
  });

  it("rejects a wire pointing at a missing net (inv2)", () => {
    const p = clone(blink) as unknown as Project;
    p.wires[0].net = "net-nope";
    expect(codes(p)).toContain("WIRE_NO_NET");
  });

  it("rejects a duplicated pin inside one net (inv3)", () => {
    const p = clone(blink) as unknown as Project;
    p.nets[0].pins.push("r1:1");
    expect(codes(p)).toContain("NET_DUP_PIN");
  });

  it("rejects duplicate component ids (inv4)", () => {
    const p = clone(blink) as unknown as Project;
    p.components[1].id = "r1";
    expect(codes(p)).toContain("DUP_ID");
  });

  it("rejects an unknown pin (inv5)", () => {
    const p = clone(blink) as unknown as Project;
    p.nets[0].pins = ["board1:D99", "r1:1"];
    expect(codes(p)).toContain("UNKNOWN_PIN");
  });

  it("rejects a dangling component reference (inv6)", () => {
    const p = clone(blink) as unknown as Project;
    p.nets[0].pins = ["ghost:D13", "r1:1"];
    expect(codes(p)).toContain("DANGLING_REF");
  });

  it("rejects a joint self-cycle (inv7)", () => {
    const p = clone(servoArm) as unknown as Project;
    p.mechanics!.joints[0].parent = "arm1";
    expect(codes(p)).toContain("JOINT_CYCLE");
  });

  it("rejects a joint driver pointing nowhere (inv8)", () => {
    const p = clone(servoArm) as unknown as Project;
    p.mechanics!.joints[0].driver = { kind: "servo", ref: "servoX" };
    expect(codes(p)).toContain("JOINT_DRIVER");
  });

  it("rejects unregistered includes when a registry is passed (inv9)", () => {
    expect(codes(servoArm, { allowedIncludes: new Set(["Arduino.h"]) })).toContain("UNKNOWN_INCLUDE");
    expect(codes(servoArm, { allowedIncludes: new Set(["Arduino.h", "Servo.h"]) })).toEqual([]);
  });

  it("skips invariant 9 without a registry", () => {
    expect(validateProject(servoArm).errors).toEqual([]);
  });

  it("rejects bare unit quantities (inv10)", () => {
    const p = clone(blink) as unknown as Project;
    (p.components[0].props as Record<string, unknown>).resistance = 220;
    expect(codes(p)).toContain("BARE_UNIT");
  });
});

// --- helpers -------------------------------------------------------------------

describe("pinref", () => {
  it("round-trips component:pin", () => {
    expect(parsePinRef("board1:D13")).toEqual({ componentId: "board1", pinId: "D13" });
    expect(formatPinRef({ componentId: "r1", pinId: "1" })).toBe("r1:1");
    expect(parsePinRef("nope")).toBeNull();
    expect(parsePinRef("a:")).toBeNull();
  });
});

describe("manifest", () => {
  it("derives a §5.5 manifest from blink", () => {
    const m = deriveManifest(blink as unknown as Project, { projectId: "p1", revisionId: "r1" });
    expect(m).toEqual({
      project_id: "p1",
      revision_id: "r1",
      boards: ["arduino-uno"],
      component_types: ["led", "resistor"],
      libraries: [],
      build_hash: "",
      dsl_version: 2,
    });
  });
});
