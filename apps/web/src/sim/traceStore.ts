/**
 * Scope/trace store — per-channel ring buffers of {t, v} samples streamed from
 * the sim's fixed-stride onTrace hook. Channels (probes) persist in localStorage
 * so a lesson's probe setup survives reloads; samples reset every run.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const TRACE_COLORS = ["#4fc3f7", "#ffb74d", "#81c784", "#e57373", "#ba68c8", "#fff176", "#4dd0e1", "#f06292"];
export const RING_CAP = 6000;

export interface TraceChannel {
  pin: string; // "ref:pinId"
  kind: "digital" | "analog";
  color: string;
  label: string;
}

export interface TSample {
  t: number;
  v: number;
}

interface TraceState {
  channels: TraceChannel[];
  samples: Record<string, TSample[]>;
  addChannel(pin: string, kind?: "digital" | "analog"): void;
  removeChannel(pin: string): void;
  setKind(pin: string, kind: "digital" | "analog"): void;
  clearSamples(): void;
  append(probe: string, t: number, v: number): void;
  reset(): void;
}

export const useTraceStore = create<TraceState>()(
  persist(
    (set) => ({
      channels: [],
      samples: {},

      addChannel: (pin, kind = "digital") =>
        set((s) => {
          if (s.channels.some((c) => c.pin === pin)) return s;
          const color = TRACE_COLORS[s.channels.length % TRACE_COLORS.length];
          return { channels: [...s.channels, { pin, kind, color, label: pin }] };
        }),
      removeChannel: (pin) =>
        set((s) => {
          const samples = { ...s.samples };
          delete samples[pin];
          return { channels: s.channels.filter((c) => c.pin !== pin), samples };
        }),
      setKind: (pin, kind) =>
        set((s) => ({ channels: s.channels.map((c) => (c.pin === pin ? { ...c, kind } : c)) })),
      clearSamples: () => set({ samples: {} }),
      append: (probe, t, v) =>
        set((s) => {
          if (!s.channels.some((c) => c.pin === probe)) return s;
          const prev = s.samples[probe] ?? [];
          const next = prev.length >= RING_CAP ? [...prev.slice(prev.length - RING_CAP + 1), { t, v }] : [...prev, { t, v }];
          return { samples: { ...s.samples, [probe]: next } };
        }),
      reset: () => set({ channels: [], samples: {} }),
    }),
    {
      name: "audrino-trace-v1",
      partialize: (s) => ({ channels: s.channels }),
    },
  ),
);

/** Nearest sample at/before time t (scope cursor). */
export function nearestSample(samples: TSample[] | undefined, t: number): TSample | null {
  if (!samples || samples.length === 0) return null;
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = samples[lo];
  const b = samples[Math.min(lo + 1, samples.length - 1)];
  return Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a;
}
