import type { Project, ProjectManifest } from "@audrino/schema";
import { deriveManifest, validateProject } from "@audrino/schema";
import blink from "@audrino/schema/fixtures/blink.json";
import servoArm from "@audrino/schema/fixtures/servo-arm.json";
import trafficLight from "@audrino/schema/fixtures/traffic-light.json";

export type FixtureId = "blink" | "traffic-light" | "servo-arm";

const FIXTURES: Record<FixtureId, unknown> = {
  blink,
  "traffic-light": trafficLight,
  "servo-arm": servoArm,
};

/** Load a fixture through the validateProject gate; never returns invalid docs. */
export function loadFixture(id: FixtureId): Project {
  const raw = FIXTURES[id];
  const res = validateProject(raw);
  if (!res.ok) {
    throw new Error(`fixture "${id}" is invalid: ${res.errors.map((e) => e.message).join("; ")}`);
  }
  return structuredClone(raw) as Project;
}

/** Mock AI matcher (M0-SPEC §4): keyword → fixture, default blink. */
export function matchFixture(prompt: string): FixtureId {
  const s = prompt.toLowerCase();
  if (s.includes("traffic")) return "traffic-light";
  if (s.includes("servo") || s.includes("arm")) return "servo-arm";
  return "blink";
}

export function manifestOf(project: Project, projectId = "local", revisionId = "rev-0"): ProjectManifest {
  return deriveManifest(project, { projectId, revisionId });
}

export function createEmptyProject(): Project {
  const doc: Project = {
    meta: { name: "Untitled", dslVersion: 2, boardId: "" },
    boards: [],
    components: [],
    nets: [],
    wires: [],
    code: {
      main: "sketch.ino",
      files: { "sketch.ino": "void setup() {\n}\n\nvoid loop() {\n}\n" },
    },
    build: { fqbn: "arduino:avr:uno", core: "arduino:avr@1.8.6", libraries: [] },
    sim: { render_fps: 60 },
  };
  const res = validateProject(doc);
  if (!res.ok) throw new Error("empty project scaffold invalid — fix createEmptyProject");
  return doc;
}
