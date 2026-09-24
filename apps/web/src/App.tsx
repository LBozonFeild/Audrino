import { useCallback, useEffect, useRef, useState } from "react";
import { AiPanel } from "./ai/AiPanel";
import { Canvas } from "./canvas/Canvas";
import { CodePanel } from "./editor/CodePanel";
import { InspectPanel } from "./inspect/InspectPanel";
import { LearnPanel } from "./learn/LearnPanel";
import { ScopePanel } from "./scope/ScopePanel";
import { Palette } from "./palette/Palette";
import { SerialPanel } from "./serial/SerialPanel";
import { docLooksTrivial, loadAutosave, scheduleAutosave } from "./dsl/autosave";
import { decodeShare, tokenFromHash } from "./dsl/share";
import { useEditorStore } from "./state/store";
import type { Tab } from "./state/store";
import { Topbar } from "./topbar/Topbar";

const TABS: { id: Tab; label: string }[] = [
  { id: "code", label: "Code" },
  { id: "serial", label: "Serial" },
  { id: "scope", label: "Scope" },
  { id: "ai", label: "AI ✨" },
  { id: "learn", label: "Learn" },
  { id: "inspect", label: "Inspect" },
];

export function App() {
  const activeTab = useEditorStore((s) => s.ui.activeTab);
  const setTab = useEditorStore((s) => s.setTab);
  const [pendingPlace, setPendingPlace] = useState<{ kind: "board" | "component"; type: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const doc = useEditorStore((s) => s.doc);

  // Autosave every edit; on boot restore autosave first, then any share link.
  useEffect(() => {
    scheduleAutosave(() => useEditorStore.getState().doc);
  }, [doc]);
  useEffect(() => {
    void (async () => {
      const saved = loadAutosave();
      if (saved && !docLooksTrivial(saved)) {
        useEditorStore.getState().loadProject(saved);
        notify("Restored unsaved work from this browser");
        return;
      }
      const token = tokenFromHash(window.location.hash);
      if (token) {
        const shared = await decodeShare(token);
        if (shared) {
          useEditorStore.getState().loadProject(shared);
          notify("Loaded shared project — Save it to keep it");
        } else notify("Share link is damaged or too old");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC clears the placement ghost.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingPlace(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Global shortcuts (M0-SPEC §6.5).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inText =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          (typeof t.closest === "function" && t.closest(".monaco-editor")));
      if (inText) return;
      const store = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        store.redo();
      } else if (mod && key === "c") {
        e.preventDefault();
        const msg = store.copy();
        if (msg) notify(msg);
      } else if (mod && key === "v") {
        e.preventDefault();
        const msg = store.paste();
        if (msg) notify(msg);
      } else if (mod && key === "d") {
        e.preventDefault();
        const msg = store.duplicate();
        if (msg) notify(msg);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const msg = store.deleteSelection();
        if (msg) notify(msg);
      } else if (e.key === "Escape") {
        store.select([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notify]);

  return (
    <div className="app-shell">
      <Topbar notify={notify} />
      <div className="main-row">
        <Palette
          onPick={(kind, type) =>
            setPendingPlace((prev) =>
              prev && prev.kind === kind && prev.type === type ? null : { kind, type },
            )
          }
        />
        <Canvas pendingPlace={pendingPlace} clearPending={() => setPendingPlace(null)} notify={notify} />
        <aside className="right-panel">
          <div className="tab-bar">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={activeTab === t.id ? "tab-active" : ""}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeTab === "code" && <CodePanel />}
          {activeTab === "serial" && <SerialPanel />}
          {activeTab === "scope" && <ScopePanel notify={notify} />}
          {activeTab === "ai" && <AiPanel notify={notify} />}
          {activeTab === "learn" && <LearnPanel notify={notify} />}
          {activeTab === "inspect" && <InspectPanel />}
        </aside>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
