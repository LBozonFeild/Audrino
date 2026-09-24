/**
 * Firmware images: ELF32 (AVR, produced by zig cc / avr-gcc) and Intel HEX
 * (arduino-cli). Flash = 32 KB as little-endian 16-bit words. Pure TS so the
 * browser bundle stays dependency-free.
 */
export const FLASH_WORDS = 0x4000; /* 32 KB */

/** ELF32 PT_LOAD segments → flash bytes (p_paddr = AVR LMA). */
export function parseElfToFlash(elf: Uint8Array): Uint8Array {
  const dv = new DataView(elf.buffer, elf.byteOffset, elf.byteLength);
  if (elf[0] !== 0x7f || elf[1] !== 0x45 || elf[2] !== 0x4c || elf[3] !== 0x46) throw new Error("not an ELF file");
  const phoff = dv.getUint32(28, true);
  const phentsize = dv.getUint16(42, true);
  const phnum = dv.getUint16(44, true);
  const bytes = new Uint8Array(FLASH_WORDS * 2);
  for (let i = 0; i < phnum; i++) {
    const o = phoff + i * phentsize;
    const pType = dv.getUint32(o, true);
    if (pType !== 1) continue; /* PT_LOAD */
    const pOff = dv.getUint32(o + 4, true);
    const pPaddr = dv.getUint32(o + 12, true);
    const pFilesz = dv.getUint32(o + 16, true);
    for (let k = 0; k < pFilesz; k++) {
      const p = pPaddr + k;
      if (p >= 0 && p < bytes.length) bytes[p] = elf[pOff + k];
    }
  }
  return bytes;
}

function recBytes(line: string): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < line.length; i += 2) out.push(parseInt(line.slice(i, i + 2), 16) | 0);
  return out;
}

export function parseHexToFlash(hex: string): Uint8Array {
  const bytes = new Uint8Array(FLASH_WORDS * 2);
  let upper = 0;
  for (const raw of hex.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith(":")) continue;
    const rec = recBytes(line.slice(1));
    const count = rec[0];
    const addr = (rec[1] << 8) | rec[2];
    const type = rec[3];
    if (type === 0x00) {
      const base = upper + addr;
      for (let i = 0; i < count; i++) {
        const p = base + i;
        if (p >= 0 && p < bytes.length) bytes[p] = rec[4 + i];
      }
    } else if (type === 0x04) {
      upper = ((rec[4] << 8) | rec[5]) << 16;
    } else if (type === 0x01) break;
  }
  return bytes;
}

export function flashBytesToWords(bytes: Uint8Array): Uint16Array {
  const words = new Uint16Array(FLASH_WORDS);
  for (let i = 0; i < FLASH_WORDS; i++) words[i] = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
  return words;
}

/** Intel HEX (canonical interchange) from raw flash bytes. */
export function toIntelHex(bytes: Uint8Array, recordSize = 16): string {
  const lines: string[] = [];
  let last = bytes.length - 1;
  while (last > 0 && bytes[last] === 0) last--;
  const end = Math.min(bytes.length, last + 1);
  const emit = (count: number, addr: number, type: number, data: number[]) => {
    const rec = [count, (addr >> 8) & 0xff, addr & 0xff, type, ...data];
    const sum = rec.reduce((s, v) => s + v, 0) & 0xff;
    const chk = (~sum + 1) & 0xff;
    lines.push(":" + rec.map((v) => v.toString(16).padStart(2, "0").toUpperCase()).join("") + chk.toString(16).padStart(2, "0").toUpperCase());
  };
  let upper = -1;
  for (let a = 0; a < end; a += recordSize) {
    const seg = a >>> 16;
    if (seg !== upper) {
      upper = seg;
      emit(2, 0, 4, [(seg >> 8) & 0xff, seg & 0xff]);
    }
    const n = Math.min(recordSize, end - a);
    emit(n, a & 0xffff, 0, Array.from(bytes.slice(a, a + n)));
  }
  lines.push(":00000001FF");
  return lines.join("\n") + "\n";
}

/** Flash words from either image format. */
export function parseFirmware(src: string | Uint8Array): Uint16Array {
  if (typeof src !== "string") return flashBytesToWords(parseElfToFlash(src));
  if (src.trimStart().startsWith(":")) return flashBytesToWords(parseHexToFlash(src));
  throw new Error("unknown firmware format");
}

export const parseIntelHex = parseHexToFlash;

/** True when word0 is a JMP (2-word) — our reset vector. */
export function isJmpOpcode(word: number): boolean {
  return (word & 0xfe0e) === 0x940c;
}
