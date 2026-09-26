import { useEffect, useRef, useState } from "react";
import type { Project } from "@audrino/schema";
import { exportWokwi, importWokwiDiagram } from "../dsl/wokwi";
import { encodeShare, shareUrl } from "../dsl/share";
import { useEditorStore } from "../state/store";
import { useViewStore } from "../canvas/viewStore";
import { docBBox } from "../state/ops";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function download(name: string, text: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Share & interchange: snapshot link, project JSON, wokwi diagram.json in/out. */
export function SharePopover(props: { notify: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [diagramText, setDiagramText] = useState("");
  const [sketchText, setSketchText] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const doc = (): Project => useEditorStore.getState().doc;

  const shareLink = async () => {
    const token = await encodeShare(doc());
    if (!token) {
      props.notify("Project too large for a URL — copied JSON instead");
      await copyText(JSON.stringify(doc(), null, 2));
      return;
    }
    await copyText(shareUrl(token));
    props.notify("Share link copied — it carries the whole project");
  };

  const shareJson = async () => {
    await copyText(JSON.stringify(doc(), null, 2));
    props.notify("Project JSON copied to clipboard");
  };

  const exportDiagram = () => {
    const { diagram, skipped } = exportWokwi(doc());
    download("diagram.json", JSON.stringify(diagram, null, 2));
    const sketch = doc().code.files[doc().code.main] ?? "";
    void copyText(sketch);
    props.notify(
      `diagram.json downloaded · sketch copied${skipped.length ? ` · skipped ${skipped.length} unmapped part(s)` : ""}`,
    );
  };

  const doImport = () => {
    const r = importWokwiDiagram(diagramText, {
      sketch: sketchText.trim() ? sketchText : undefined,
    });
    if (!r.doc) {
      props.notify(`Import failed: ${r.error ?? "unknown error"}`);
      return;
    }
    const feedback = useEditorStore.getState().loadProject(r.doc);
    if (feedback !== null) {
      props.notify(`Import failed: ${feedback}`);
      return;
    }
    useViewStore.getState().fitContent(docBBox(useEditorStore.getState().doc));
    setOpen(false);
    setImportOpen(false);
    setDiagramText("");
    setSketchText("");
    props.notify(
      r.warnings.length ? `Imported with ${r.warnings.length} warning(s): ${r.warnings[0]}` : "Wokwi diagram imported — Ctrl+Z reverts",
    );
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    void file.text().then(setDiagramText);
  };

  return (
    <div className="theme-picker" ref={box}>
      <button className="theme-btn" onClick={() => setOpen(!open)} title="Share & interchange">
        Share <span className="chev">▾</span>
      </button>
      {open && (
        <div className="theme-pop" style={{ width: 320 }}>
          <div className="theme-pop-head">Share &amp; interchange</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
            <button className="primary" onClick={shareLink}>
              🔗 Copy share link
            </button>
            <div className="dim">The link carries the whole project (compressed) — no account needed.</div>
            <button onClick={shareJson}>Copy project JSON</button>
            <button onClick={exportDiagram}>⤓ Download wokwi diagram.json</button>
            <button onClick={() => setImportOpen(!importOpen)}>⤒ Import wokwi diagram.json</button>
            {importOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <textarea
                  rows={4}
                  placeholder="…or paste diagram.json here"
                  value={diagramText}
                  onChange={(e) => setDiagramText(e.target.value)}
                />
                <textarea
                  rows={3}
                  placeholder="optional sketch.ino to bring along"
                  value={sketchText}
                  onChange={(e) => setSketchText(e.target.value)}
                />
                <button className="primary" onClick={doImport} disabled={!diagramText.trim()}>
                  Import
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
