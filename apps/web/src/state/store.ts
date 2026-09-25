import { relayoutWires } from "../dsl/netsFromConnections";
import type { Project } from "@audrino/schema";
import { create } from "zustand";
import { createEmptyProject } from "../dsl/load";
import * as ops from "./ops";
import type { Clipboard, OpResult } from "./ops";

export type Tool = "select" | "inspect" | "wire" | "delete";
export type Tab = "code" | "serial" | "scope" | "ai" | "learn" | "inspect";

const HISTORY_CAP = 100;

interface EditorStore {
  doc: Project;
  selection: string[];
  tool: Tool;
  history: { past: Project[]; future: Project[] };
  clipboard: Clipboard | null;
  copySeq: number;
  ui: { activeTab: Tab };

  setTool(tool: Tool): void;
  setTab(activeTab: Tab): void;
  select(ids: string[]): void;

  /** Commit a validated op: returns a feedback string (error/notice) or null. */
  commit(result: OpResult): string | null;
  place(kind: "board" | "component", type: string, x: number, y: number): string | null;
  move(ids: string[], dx: number, dy: number): string | null;
  removeIds(ids: string[]): string | null;
  deleteSelection(): string | null;
  connect(a: string, b: string, points: [number, number][]): string | null;
  setCode(name: string, content: string): string | null;
  loadProject(next: Project): string | null;

  copy(): string | null;
  paste(): string | null;
  duplicate(): string | null;

  undo(): void;
  redo(): void;
}

export const useEditorStore = create<EditorStore>()((set, get) => {
  /** Push snapshot, apply doc, clear redo — the one place history changes. */
  const apply = (prevDoc: Project, doc: Project): void => {
    set((s) => ({
      doc,
      history: {
        past: [...s.history.past, prevDoc].slice(-HISTORY_CAP),
        future: [],
      },
    }));
  };

  const commit = (result: OpResult): string | null => {
    if (result.error !== undefined) return result.error;
    if (result.doc === get().doc) return null; // identity no-op: no history entry
    apply(get().doc, result.doc);
    return null;
  };

  return {
    doc: createEmptyProject(),
    selection: [],
    tool: "select",
    history: { past: [], future: [] },
    clipboard: null,
    copySeq: 0,
    ui: { activeTab: "ai" },

    setTool: (tool) => set({ tool }),
    setTab: (activeTab) => set((s) => ({ ui: { ...s.ui, activeTab } })),
    select: (selection) => set({ selection }),

    commit,
    place: (kind, type, x, y) => {
      const r = ops.place(get().doc, kind, type, x, y);
      const feedback = commit(r);
      if (feedback === null && r.doc) set({ selection: r.createdIds });
      return feedback;
    },
    move: (ids, dx, dy) => commit(ops.move(get().doc, ids, dx, dy)),
    removeIds: (ids) => {
      const feedback = commit(ops.remove(get().doc, ids));
      if (feedback === null) set({ selection: [] });
      return feedback;
    },
    deleteSelection: () => get().removeIds(get().selection),
    connect: (a, b, points) => commit(ops.connect(get().doc, a, b, points)),
    setCode: (name, content) => commit(ops.setCodeFile(get().doc, name, content)),
    loadProject: (raw) => {
      // Saved designs must survive pinout corrections: re-land wire geometry
      // on the current pins (nets are topological — nothing electrical moves).
      const next = structuredClone(raw);
      relayoutWires(next);
      const feedback = commit(ops.replaceAll(get().doc, next));
      if (feedback === null) set({ selection: [] });
      return feedback;
    },

    copy: () => {
      const clip = ops.copyOf(get().doc, get().selection);
      if (!clip) return "nothing selected";
      set({ clipboard: clip });
      return `copied ${clip.components.length + clip.boards.length} part(s)`;
    },
    paste: () => {
      const { doc, clipboard, copySeq } = get();
      if (!clipboard) return "clipboard is empty";
      const seq = copySeq + 1;
      const r = ops.paste(doc, clipboard, seq);
      const feedback = commit(r);
      if (feedback === null && r.doc) {
        set({ selection: r.createdIds, copySeq: seq });
        return `pasted ${r.createdIds.length} part(s)`;
      }
      return feedback;
    },
    duplicate: () => {
      const { doc, selection, copySeq } = get();
      const seq = copySeq + 1;
      const r = ops.duplicate(doc, selection, seq);
      const feedback = commit(r);
      if (feedback === null && r.doc) {
        set({ selection: r.createdIds, copySeq: seq });
        return `duplicated ${r.createdIds.length} part(s)`;
      }
      return feedback;
    },

    undo: () =>
      set((s) => {
        const { past, future } = s.history;
        if (past.length === 0) return s;
        const doc = past[past.length - 1];
        const live = ops.collectIds(doc);
        return {
          doc,
          selection: s.selection.filter((id) => live.has(id)),
          history: { past: past.slice(0, -1), future: [s.doc, ...future] },
        };
      }),
    redo: () =>
      set((s) => {
        const { past, future } = s.history;
        if (future.length === 0) return s;
        const doc = future[0];
        const live = ops.collectIds(doc);
        return {
          doc,
          selection: s.selection.filter((id) => live.has(id)),
          history: { past: [...past, s.doc].slice(-HISTORY_CAP), future: future.slice(1) },
        };
      }),
  };
});
