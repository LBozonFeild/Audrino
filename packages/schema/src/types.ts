// Audrino Project DSL v2 — canonical types (PLAN §5.1, §5.3).
// Units: mm for geometry (x/y/z, size_mm), *_deg for angles, *_ohms etc. per §5.3.
// Canvas coordinates are millimeters.

export const DSL_VERSION = 2 as const;

export interface Transform {
  x: number;
  y: number;
  z?: number;
  rotation_deg?: number;
}

export interface BoardPlacement {
  id: string;
  type: string;
  transform: Transform;
}

export interface ComponentPlacement {
  id: string;
  type: string;
  props: Record<string, unknown>;
  transform: Transform;
}

/** Logical electrical connectivity. Pins serialize as "componentId:pinId". */
export interface Net {
  id: string;
  pins: string[];
}

/** Visual routing only — every segment belongs to exactly one net. */
export interface WireSegment {
  id: string;
  net: string;
  /** Polyline points in canvas mm. Orthogonal routing arrives in M2. */
  points: [number, number][];
}

export type BodyShape = "box" | "cylinder" | "wheel" | "polygon";

export interface Body {
  id: string;
  shape: BodyShape;
  size_mm: { w: number; h: number };
  material?: { color?: string };
  transform: Transform;
}

export type JointType = "fixed" | "revolute" | "prismatic";

export interface Joint {
  id: string;
  type: JointType;
  /** "componentId:anchorId" or a body id. */
  parent: string;
  /** A body id. */
  child: string;
  axis?: string;
  limits?: { min_deg: number; max_deg: number };
  driver?: { kind: string; ref: string };
}

export interface Mechanics {
  bodies: Body[];
  joints: Joint[];
}

export interface BuildLibrary {
  name: string;
  version: string;
}

export interface BuildConfig {
  fqbn: string;
  core: string;
  libraries: BuildLibrary[];
}

export interface SimConfig {
  /** Presentation pacing only — the emulator runs on CPU time (PLAN §7.1). */
  render_fps: number;
  defaults?: Record<string, number>;
}

export interface AiMeta {
  prompt?: string;
  explanation?: string;
  bom?: string[];
  wiringSteps?: string[];
}

export interface ProjectMeta {
  name: string;
  dslVersion: number;
  boardId: string;
}

export interface Project {
  meta: ProjectMeta;
  boards: BoardPlacement[];
  components: ComponentPlacement[];
  nets: Net[];
  wires: WireSegment[];
  mechanics?: Mechanics;
  code: { main: string; files: Record<string, string> };
  build: BuildConfig;
  sim: SimConfig;
  ai?: AiMeta;
}

/** Structured pin reference — the serialized form is "componentId:pinId" (PLAN §5.4). */
export interface PinRef {
  componentId: string;
  pinId: string;
}

/** Lightweight derived manifest for search/gallery/AI/cache (PLAN §5.5). */
export interface ProjectManifest {
  project_id: string;
  revision_id: string;
  boards: string[];
  component_types: string[];
  libraries: string[];
  /** Content-addressed artifact identity — "" until the compile pipeline fills it. */
  build_hash: string;
  dsl_version: number;
}
