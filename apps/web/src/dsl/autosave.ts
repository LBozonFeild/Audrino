/**
 * Local autosave — the working project survives reloads/crashes with no account.
 * Stored in this browser only; `New project` clears it deliberately.
 */
import type { Project } from "@audrino/schema";
import { validateProject } from "@audrino/schema";

const KEY = "audrino-autosave-v1";
let timer: number | undefined;

export function scheduleAutosave(getDoc: () => Project, delayMs = 800): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(getDoc()));
      // Let the chrome (topbar save chip) know a snapshot just landed.
      window.dispatchEvent(new Event("audrino-saved"));
    } catch {
      /* quota full — autosave best-effort */
    }
  }, delayMs);
}

export function loadAutosave(): Project | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as Project;
    return validateProject(doc).ok ? doc : null;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  window.clearTimeout(timer);
  localStorage.removeItem(KEY);
}

/** An untouched scaffold is not worth a "restored" toast. */
export function docLooksTrivial(doc: Project): boolean {
  return (
    doc.boards.length === 0 &&
    doc.components.length === 0 &&
    doc.nets.length === 0 &&
    doc.wires.length === 0 &&
    Object.values(doc.code.files).every((f) => !/\S/.test(f.replace(/void (setup|loop)\s*\(\s*\)\s*\{\s*\}/g, "")))
  );
}
