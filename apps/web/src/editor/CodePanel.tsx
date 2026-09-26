import { useEffect, useRef, useState } from "react";

/** Match Monaco to the active app theme. */
function monacoTheme(): string {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bench-bg").trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(bg);
  if (!m) return "vs-dark";
  const n = parseInt(m[1], 16);
  const lum = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 100 ? "vs-dark" : "vs";
}
import Editor, { type OnMount } from "@monaco-editor/react";
import { validateProject } from "@audrino/schema";
import { useEditorStore } from "../state/store";
import type { CodeEditorProps, CodeMarker } from "./CodeEditor";

/** Monaco-backed implementation of the CodeEditor contract. */
function MonacoAdapter(props: CodeEditorProps & { monacoTheme: string }) {
  const markersRef = useRef<((m: CodeMarker[]) => void) | null>(null);
  const pushMarkers = (monacoMarkers: CodeMarker[]) => markersRef.current?.(monacoMarkers);

  const handleMount: OnMount = (editor, monaco) => {
    const applyMarkers = (markers: CodeMarker[]) => {
      const model = editor.getModel();
      if (!model) return;
      monaco.editor.setModelMarkers(
        model,
        "audrino",
        markers.map((m) => ({
          startLineNumber: m.startLine,
          startColumn: m.startColumn,
          endLineNumber: m.endLine,
          endColumn: m.endColumn,
          message: m.message,
          severity: m.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        })),
      );
    };
    markersRef.current = applyMarkers;
    applyMarkers(props.markers);
  };

  useEffect(() => {
    pushMarkers(props.markers);
  }, [props.markers]);

  return (
    <div className="monaco-host">
      <Editor
        language={props.language ?? "cpp"}
        theme={props.monacoTheme}
        value={props.value}
        onChange={(v) => props.onChange(v ?? "")}
        onMount={handleMount}
        loading={<div className="dim" style={{ padding: 8 }}>Loading editor…</div>}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}

export function CodePanel() {
  const doc = useEditorStore((s) => s.doc);
  const setCode = useEditorStore((s) => s.setCode);

  const fileNames = Object.keys(doc.code.files);
  const [activeFile, setActiveFile] = useState(doc.code.main);
  const [mTheme, setMTheme] = useState(monacoTheme);
  const value = doc.code.files[activeFile] ?? "";
  const [draft, setDraft] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const fileRef = useRef(activeFile);
  fileRef.current = activeFile;

  // Follow theme switches while mounted.
  useEffect(() => {
    const onTheme = () => setMTheme(monacoTheme());
    window.addEventListener("audrino-theme", onTheme);
    return () => window.removeEventListener("audrino-theme", onTheme);
  }, []);

  // External changes (undo/redo, spawn) refresh the draft.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Never lose a debounced edit when the tab unmounts.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      useEditorStore.getState().setCode(fileRef.current, draftRef.current);
    },
    [],
  );

  const flush = (file: string, content: string) => {
    window.clearTimeout(timer.current);
    setCode(file, content);
  };

  const onChange = (next: string) => {
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCode(activeFile, next), 600);
  };

  const switchFile = (name: string) => {
    if (name === activeFile) return;
    flush(activeFile, draftRef.current);
    setActiveFile(name);
  };

  const markers: CodeMarker[] = validateProject(doc).errors
    .filter((e) => e.path === `code.files.${activeFile}`)
    .map((e) => ({
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
      message: `${e.code}: ${e.message}`,
      severity: "error" as const,
    }));

  return (
    <div className="tab-body">
      <div className="file-tabs">
        {fileNames.map((name) => (
          <button
            key={name}
            className={name === activeFile ? "tool-active" : ""}
            onClick={() => switchFile(name)}
          >
            {name}
          </button>
        ))}
        <span className="dim" style={{ marginLeft: "auto", alignSelf: "center" }}>
          main: {doc.code.main}
        </span>
      </div>
      <MonacoAdapter value={draft} markers={markers} onChange={onChange} language="cpp" monacoTheme={mTheme} />
    </div>
  );
}
