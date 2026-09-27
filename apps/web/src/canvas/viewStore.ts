/** Canvas viewport (pan/zoom). Kept out of the editor store so panning never
 *  invalidates doc/selection renders; tests drive it directly. */
import { create } from "zustand";

export interface View {
  x: number;
  y: number;
  k: number;
}

export const DEFAULT_K = 4;
export const VIEW_W = 720;
export const VIEW_H = 540;
const MIN_K = 0.15;
const MAX_K = 8;

/** Stage centre: the middle of the default frame (where the empty-state hint
 *  sits). The workspace opens centred here — never pinned to the top-left
 *  corner — so a fresh session always starts on the middle of the workplane. */
const STAGE_CX = VIEW_W / 2;
const STAGE_CY = VIEW_H / 2;
const centredView = (k: number): View => ({
  x: STAGE_CX - VIEW_W / (2 * k),
  y: STAGE_CY - VIEW_H / (2 * k),
  k,
});

interface ViewState {
  view: View;
  setView(view: View): void;
  /** Zoom keeping world point (wx, wy) fixed on screen. */
  zoomAt(wx: number, wy: number, factor: number): void;
  resetView(): void;
  panBy(dx: number, dy: number): void;
  fitContent(bbox: { minX: number; minY: number; maxX: number; maxY: number } | null): void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  view: centredView(DEFAULT_K), // open on the centre of the workplane at a comfortable zoom
  setView: (view) => set({ view: { ...view, k: Math.min(MAX_K, Math.max(MIN_K, view.k)) } }),
  zoomAt: (wx, wy, factor) => {
    const { x, y, k } = get().view;
    const k2 = Math.min(MAX_K, Math.max(MIN_K, k * factor));
    if (k2 === k) return;
    set({ view: { x: wx - ((wx - x) * k) / k2, y: wy - ((wy - y) * k) / k2, k: k2 } });
  },
  panBy: (dx, dy) => set((s) => ({ view: { ...s.view, x: s.view.x + dx, y: s.view.y + dy } })),
  fitContent: (bbox) => {
    // Frame the circuit like Tinkercad: pad it, clamp zoom, center it.
    if (!bbox || bbox.maxX <= bbox.minX || bbox.maxY <= bbox.minY) {
      get().resetView();
      return;
    }
    const pad = 16;
    const bw = bbox.maxX - bbox.minX + pad * 2;
    const bh = bbox.maxY - bbox.minY + pad * 2;
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(VIEW_W / bw, VIEW_H / bh)));
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    set({ view: { k, x: cx - VIEW_W / (2 * k), y: cy - VIEW_H / (2 * k) } });
  },
  resetView: () => set({ view: centredView(DEFAULT_K) }),
}));
