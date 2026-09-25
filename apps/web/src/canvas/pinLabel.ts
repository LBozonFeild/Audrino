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
