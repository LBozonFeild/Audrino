/** Canvas viewport (pan/zoom). Kept out of the editor store so panning never
 *  invalidates doc/selection renders; tests drive it directly. */
import { create } from "zustand";

export interface View {
  x: number;
  y: number;
  k: number;
}

export const DEFAULT_K = 5;
export const VIEW_W = 720;
export const VIEW_H = 540;
const MIN_K = 0.15;
const MAX_K = 8;

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
  view: { x: 0, y: 0, k: DEFAULT_K }, // default zoom: components read huge
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
  resetView: () => set({ view: { x: 0, y: 0, k: DEFAULT_K } }),
}));
