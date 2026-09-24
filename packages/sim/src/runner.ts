/**
 * Mixed-mode co-simulation: avr8js MCU ↔ MNA network.
 * The MCU's pin directions/levels drive Thevenin sources and pull-ups; solved
 * node voltages feed input pins (digitalRead). Serial bytes timestamp at the
 * UART's baud-accurate emission time.
 */
import { parseFirmware } from "./intelhex";
import { ClusteredSolver } from "./cluster";
import { Mcu, PinState } from "./mcu";
import { applyPinMode, buildNetlist } from "./netlist";
import type { LedState, PinModeState, ProbeSample, RunRequest, SerialLine, SimLiveState, SimResult } from "./types";

const FRAME_MS = 0.25;

function defaultUntil(req: RunRequest): number {
  const marks: number[] = [];
  for (const d of req.serialBy ?? []) marks.push(d.ms);
  for (const p of req.probes ?? []) marks.push(p.atMs);
  return marks.length ? Math.max(...marks) + 150 : 1000;
}

export function serialSatisfied(actual: SerialLine[], by: { ms: number; line: string }[]): boolean {
  if (actual.length < by.length) return false;
  for (let i = 0; i < by.length; i++) {
    if (actual[i].line !== by[i].line) return false;
    if (actual[i].ms > by[i].ms) return false;
  }
  return true;
}

export function runSimulation(
  req: RunRequest,
  hooks?: { onSerial?: (line: SerialLine) => void; onState?: (state: SimLiveState) => void; onTrace?: (s: ProbeSample) => void },
): SimResult {
  const nl = buildNetlist(req);
  const flash = parseFirmware(req.hex);
  const serial: SerialLine[] = [];
  let pending = "";
  let mcuRef: Mcu | null = null;
  const mcu = new Mcu(flash, (b) => {
    const ms = mcuRef ? mcuRef.ms : 0;
    if (b === 10) {
      const entry = { ms, line: pending.replace(/\r$/, "") };
      serial.push(entry);
      hooks?.onSerial?.(entry);
      pending = "";
    } else {
      pending += String.fromCharCode(b);
    }
  });
  mcuRef = mcu;

  const solver = new ClusteredSolver(nl.elements, nl.nodeCount);
  const hasCap = nl.elements.some((e) => e.kind === "cap");
  const until = req.untilMs ?? defaultUntil(req);

  const modes: (PinModeState | null)[] = new Array(20).fill(null);
  let dirty = false;
  const syncModes = () => {
    for (const g of nl.gpio) {
      const st = mcu.pinState(g.pin);
      const mode: PinModeState =
        st === PinState.High ? "high" : st === PinState.Low ? "low" : st === PinState.InputPullUp ? "pullup" : "z";
      if (modes[g.pin] !== mode) {
        applyPinMode(nl, g.pin, mode);
        solver.markDirty(nl.elements[g.thevIdx]);
        solver.markDirty(nl.elements[g.pullIdx]);
        modes[g.pin] = mode;
        dirty = true;
      }
    }
  };

  /* t = 0: capacitors uncharged, DC/rail probes evaluate here */
  syncModes();
  let v = solver.solveInitial();
  dirty = false;
  const probeSamples: ProbeSample[] = [];
  const pendingProbes = (req.probes ?? []).slice().sort((a, b) => a.atMs - b.atMs);
  let probeIdx = 0;
  const sampleProbes = (tMs: number) => {
    while (probeIdx < pendingProbes.length && pendingProbes[probeIdx].atMs <= tMs) {
      const p = pendingProbes[probeIdx++];
      const n = nl.probeNode(p.probe);
      probeSamples.push({ probe: p.probe, atMs: p.atMs, v: n === null ? Number.NaN : v[n] });
    }
  };
  sampleProbes(0);

  /* Continuous trace (scope): fixed-stride samples of the requested probes. */
  const strideMs = (req.trace?.strideMs ?? 0) > 0 ? req.trace!.strideMs : 0.5;
  const traceNodes = (req.trace?.pins ?? []).map((probe) => ({ probe, node: nl.probeNode(probe) }));
  let nextTraceAt = 0;
  const sampleTrace = (tMs: number) => {
    if (traceNodes.length === 0) return;
    while (nextTraceAt <= tMs) {
      for (const tn of traceNodes) {
        hooks?.onTrace?.({ probe: tn.probe, atMs: tMs, v: tn.node === null ? Number.NaN : v[tn.node] });
      }
      nextTraceAt += strideMs;
    }
  };
  sampleTrace(0);

  /* live LED/pin state (change-driven) for the canvas */
  const stateOf = (): SimLiveState => {
    const leds: LedState[] = nl.leds.map((l) => {
      const iA = solver.diodeCurrent(l.diode);
      return { ref: l.ref, lit: iA > 0.0005, iA };
    });
    const pins: Record<string, PinModeState> = {};
    for (const g of nl.gpio) pins[`${g.ref}:${g.pinName}`] = modes[g.pin] ?? "z";
    return { leds, pins };
  };
  let lastStateKey = "";
  const emitState = () => {
    const s = stateOf();
    const key = JSON.stringify([s.pins, s.leds.map((l) => l.lit)]);
    if (key !== lastStateKey) {
      lastStateKey = key;
      hooks?.onState?.(s);
    }
  };
  emitState();

  /* Co-sim coupling: every GPIO register write re-solves the network and feeds
     node voltages back into input pins *before the next instruction*, so a
     digitalWrite→digitalRead pair sees the wired voltage with no race. */
  const refresh = () => {
    syncModes();
    if (dirty) {
      v = hasCap ? solver.step(FRAME_MS / 1000) : solver.solveDC();
      dirty = false;
    }
    for (const g of nl.gpio) {
      const m = modes[g.pin];
      if (m === "z" || m === "pullup") mcu.setExternal(g.pin, v[g.node] > 2.5);
    }
  };
  mcu.onGpioWrite = refresh;

  let t = 0;
  while (t < until) {
    mcu.stepCycles(mcu.cpu.cycles + Math.ceil((FRAME_MS / 1000) * 16_000_000));
    t = mcu.ms;
    if (hasCap && !dirty) {
      v = solver.step(FRAME_MS / 1000);
    } else {
      refresh();
    }
    sampleProbes(t);
    sampleTrace(t);
    emitState();
    if (req.serialBy && serialSatisfied(serial, req.serialBy)) break;
  }

  emitState();
  const { leds, pins } = stateOf();
  return { serial, probes: probeSamples, leds, pins, simMs: t, cycles: mcu.cpu.cycles };
}
