/**
 * Share = snapshot link (PLAN §11.4). The project JSON is deflate-raw–compressed
 * and carried entirely in the URL fragment — portable, offline, server-free.
 * Plain base64url fallback covers browsers without CompressionStream.
 */
import type { Project } from "@audrino/schema";
import { validateProject } from "@audrino/schema";

/** Stay under practical address-bar / history limits. */
export const MAX_TOKEN = 30_000;

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function pipe(codec: "deflate-raw" | "inflate-raw", bytes: Uint8Array): Promise<Uint8Array | null> {
  const Ctor = (globalThis as unknown as Record<string, unknown>)[codec === "deflate-raw" ? "CompressionStream" : "DecompressionStream"];
  if (typeof Ctor !== "function") return null;
  try {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new (Ctor as new (f: string) => TransformStream)(codec === "deflate-raw" ? "deflate-raw" : "deflate-raw"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/** `v1z.<b64url(deflate-raw)>` or `v1p.<b64url(utf8)>`; null when the token would blow the URL budget. */
export async function encodeShare(doc: Project): Promise<string | null> {
  const json = new TextEncoder().encode(JSON.stringify(doc));
  const z = await pipe("deflate-raw", json);
  const token = z ? `v1z.${b64urlEncode(z)}` : `v1p.${b64urlEncode(json)}`;
  return token.length > MAX_TOKEN ? null : token;
}

export async function decodeShare(token: string): Promise<Project | null> {
  const m = /^v1([zp])\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const raw = b64urlDecode(m[2]);
  if (!raw) return null;
  let jsonBytes: Uint8Array | null = null;
  if (m[1] === "z") jsonBytes = await pipe("inflate-raw", raw);
  else jsonBytes = raw;
  if (!jsonBytes) return null;
  try {
    const doc = JSON.parse(new TextDecoder().decode(jsonBytes)) as Project;
    return validateProject(doc).ok ? doc : null;
  } catch {
    return null;
  }
}

export function shareUrl(token: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#p=${token}`;
}

/** Pull a share token out of a location hash (`#p=v1…`). */
export function tokenFromHash(hash: string): string | null {
  const m = /^#p=(v1[zp]\.[A-Za-z0-9_-]+)$/.exec(hash);
  return m ? m[1] : null;
}
