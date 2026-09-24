/** Shared simulation types (M1). */
export interface SketchSource {
  main: string;
  files: Record<string, string>;
}

export interface SimComponentSpec {
  ref: string;
  type: string;
  props?: Record<string, unknown>;
}

export interface CircuitSpec {
  components: SimComponentSpec[];
  /** Fixture-style links: [fromRef, fromPin, toRef, toPin] */
  wires?: [string, string, string, string][];
  /** Project-doc-style nets: groups of "ref:pin" */
  nets?: { pins: string[] }[];
}

export type PinModeState = "low" | "high" | "z" | "pullup";

export interface SerialLine {
  ms: number;
  line: string;
}

export interface ProbeSample {
  probe: string;
  atMs: number;
  v: number;
}

export interface LedState {
  ref: string;
  lit: boolean;
  iA: number;
}

export interface SerialDeadline {
  ms: number;
  line: string;
}

export interface RunRequest extends CircuitSpec {
  hex: string;
  /** Sim end time; default = last deadline/probe + 200 ms, else 1000 ms. */
  untilMs?: number;
  /** Golden-style checkpoints: each line must arrive by its ms. */
  serialBy?: SerialDeadline[];
  probes?: { probe: string; atMs: number }[];
}

export interface SimLiveState {
  leds: LedState[];
  pins: Record<string, PinModeState>;
}

export interface SimResult extends SimLiveState {
  serial: SerialLine[];
  probes: ProbeSample[];
  simMs: number;
  cycles: number;
}
