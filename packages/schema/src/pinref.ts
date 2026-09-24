import type { PinRef } from "./types";

/**
 * Parse "componentId:pinId". Splits on the LAST colon so component ids
 * containing ":" keep working. Returns null when malformed.
 */
export function parsePinRef(ref: string): PinRef | null {
  if (typeof ref !== "string") return null;
  const at = ref.lastIndexOf(":");
  if (at <= 0 || at === ref.length - 1) return null;
  const componentId = ref.slice(0, at);
  const pinId = ref.slice(at + 1);
  if (!componentId || !pinId) return null;
  return { componentId, pinId };
}

export function formatPinRef(ref: PinRef): string {
  return `${ref.componentId}:${ref.pinId}`;
}
