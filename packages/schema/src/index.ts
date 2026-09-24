export { DSL_VERSION } from "./types";
export type {
  Body,
  BodyShape,
  BoardPlacement,
  BuildConfig,
  BuildLibrary,
  ComponentPlacement,
  Joint,
  JointType,
  Mechanics,
  Net,
  PinRef,
  Project,
  ProjectManifest,
  ProjectMeta,
  AiMeta,
  SimConfig,
  Transform,
  WireSegment,
} from "./types";
export { parsePinRef, formatPinRef } from "./pinref";
export { validateProject } from "./validator";
export { bridgeMatesOf, M0_PIN_CATALOG, PART_DEFINITIONS, partDef } from "./parts";
export type { PartCategory, PartDefinition, PartPin } from "./parts";
export type { ValidationError, ValidationResult, ValidatorOptions } from "./validator";
export { deriveManifest } from "./manifest";
