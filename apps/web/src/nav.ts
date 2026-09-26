/**
 * Hash-based routing (no server config — everything lives in the URL fragment,
 * which keeps share links `#p=…` working alongside `#/editor`).
 *
 * - `""` / `#` / `#/`        → home (new project, continue, login)
 * - `#/editor`               → the workbench editor
 * - `#p=v1…`                 → share link: opens the editor with that snapshot
 */
import type { Project } from "@audrino/schema";

export type Route = "home" | "editor";

export function routeFromHash(hash: string): Route {
  if (hash.startsWith("#p=")) return "editor"; // share snapshot links
  if (hash.startsWith("#/editor")) return "editor";
  return "home";
}

/** Doc the home page hands to the editor so boot doesn't re-restore autosave. */
let pendingOpen: Project | null = null;

export function openInEditor(doc: Project): void {
  pendingOpen = doc;
  if (routeFromHash(window.location.hash) === "editor") {
    window.dispatchEvent(new Event("hashchange"));
  } else {
    window.location.hash = "#/editor";
  }
}

/** Consume the hand-off exactly once (editor boot effect). */
export function takePendingOpen(): Project | null {
  const doc = pendingOpen;
  pendingOpen = null;
  return doc;
}

export function goHome(): void {
  window.location.hash = "#/";
}
