/**
 * AI assistant settings + repair-loop UI state. Keys live in this browser's
 * localStorage only (never the server) and can be wiped with forgetKeys().
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiProvider } from "../server/ai-proxy";
import type { DoctorResult } from "./aiClient";

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  ollama: "qwen2.5-coder:7b",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  "openai-compatible": "",
};

/** Providers that need a user key (proxied through the app server). */
export const CLOUD_PROVIDERS: readonly AiProvider[] = ["openai", "anthropic", "openai-compatible"];

export interface AiState {
  provider: AiProvider;
  models: Record<AiProvider, string>;
  keys: Partial<Record<AiProvider, string>>;
  baseUrl: string;
  ollamaUrl: string;
  ollamaViaServer: boolean;
  autoRun: boolean;

  symptom: string;
  attachSnapshot: boolean;
  lastError: string | null;
  errorKind: "compile" | "runtime" | "behavior" | null;

  busy: boolean;
  elapsedMs: number;
  attempt: number;
  diagnosis: string;
  notes: string[];
  proposed: string | null;
  doctor: DoctorResult | null;

  setProvider(p: AiProvider): void;
  setModel(p: AiProvider, m: string): void;
  setKey(p: AiProvider, k: string): void;
  setBaseUrl(u: string): void;
  setOllamaUrl(u: string): void;
  setOllamaViaServer(v: boolean): void;
  setAutoRun(v: boolean): void;
  setSymptom(s: string): void;
  setAttachSnapshot(v: boolean): void;
  captureError(message: string | null, kind: "compile" | "runtime" | "behavior"): void;
  beginRequest(): void;
  tick(deltaMs: number): void;
  finishRequest(): void;
  propose(fix: { diagnosis: string; sketch: string; notes: string[] }): void;
  reject(): void;
  markApplied(): void;
  setDoctor(d: DoctorResult | null): void;
  forgetKeys(): void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      provider: "ollama",
      models: { ...DEFAULT_MODELS },
      keys: {},
      baseUrl: "",
      ollamaUrl: "http://127.0.0.1:11434",
      ollamaViaServer: false,
      autoRun: true,

      symptom: "",
      attachSnapshot: true,
      lastError: null,
      errorKind: null,

      busy: false,
      elapsedMs: 0,
      attempt: 0,
      diagnosis: "",
      notes: [],
      proposed: null,
      doctor: null,

      setProvider: (provider) => set({ provider, doctor: null }),
      setModel: (p, m) => set((s) => ({ models: { ...s.models, [p]: m } })),
      setKey: (p, k) => set((s) => ({ keys: { ...s.keys, [p]: k } })),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setOllamaViaServer: (ollamaViaServer) => set({ ollamaViaServer }),
      setAutoRun: (autoRun) => set({ autoRun }),
      setSymptom: (symptom) => set({ symptom }),
      setAttachSnapshot: (attachSnapshot) => set({ attachSnapshot }),
      captureError: (message, kind) => set({ lastError: message, errorKind: message ? kind : null, attempt: 0, proposed: null, diagnosis: "", notes: [] }),
      beginRequest: () => set((s) => ({ busy: true, elapsedMs: 0, attempt: s.attempt + 1 })),
      tick: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),
      finishRequest: () => set({ busy: false }),
      propose: (fix) => set({ diagnosis: fix.diagnosis, notes: fix.notes, proposed: fix.sketch }),
      reject: () => set({ proposed: null, diagnosis: "", notes: [] }),
      markApplied: () => set({ proposed: null }),
      setDoctor: (doctor) => set({ doctor }),
      forgetKeys: () => set({ keys: {} }),
    }),
    {
      name: "audrino-ai-settings",
      partialize: (s) => ({
        provider: s.provider,
        models: s.models,
        keys: s.keys,
        baseUrl: s.baseUrl,
        ollamaUrl: s.ollamaUrl,
        ollamaViaServer: s.ollamaViaServer,
        autoRun: s.autoRun,
        attachSnapshot: s.attachSnapshot,
      }),
    },
  ),
);
