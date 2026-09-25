/**
 * Pin label rule for always-visible canvas labels: real boards print short
 * silk names ("0", "Vin", "GND", "A3") — prefer the pin's human name when it
 * is short, else fall back to the pin id. Also used by tests.
 */
export function pinLabel(id: string, name: string): string {
  const n = (name ?? "").trim();
  if (n.length > 0 && n.length <= 5) return n;
  return id;
}

/** Visible socket size and click-target size for canvas pads, in mm.
 *  The catalog's minimum pin pitch is 2.54 mm (breadboards/headers), so the
 *  hit box stays strictly under the pitch — neighbors never overlap. */
export const PIN_PAD_S = 1.9;
export const PIN_HIT_S = 2.4;

/** Tinkercad-style part name label: "R1 · 220Ω" / "LED1 · red". */
export function partNameLabel(ref: string, values: Record<string, unknown>): string {
  const v = values ?? {};
  const r = v.resistance_ohms;
  if (typeof r === "number" && r > 0) {
    const ohm = r >= 1e6 ? `${+(r / 1e6).toFixed(1)}MΩ` : r >= 1000 ? `${+(r / 1000).toFixed(1)}kΩ` : `${r}Ω`;
    return `${ref} · ${ohm}`;
  }
  const c = v.capacitance_f;
  if (typeof c === "number" && c > 0) {
    const farad = c >= 1e-6 ? `${+(c * 1e6).toFixed(1)}µF` : `${+(c * 1e9).toFixed(0)}nF`;
    return `${ref} · ${farad}`;
  }
  if (typeof v.color === "string" && v.color) return `${ref} · ${v.color}`;
  if (typeof v.value === "string" && v.value) return `${ref} · ${v.value}`;
  return ref;
}
