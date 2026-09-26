/**
 * Sketch → ATmega328P machine code. Auto toolchain (in order):
 *   1. $AUDRINO_ZIG (e.g. "python3 -m ziglang")
 *   2. `zig` on PATH
 *   3. `python3 -m ziglang` (PyPI ziglang wheel — bundles clang with AVR)
 *   4. `avr-gcc`/`avr-g++` on PATH
 *   5. `arduino-cli` with the arduino:avr core
 * The micro-core (core/) implements the Arduino API at register level.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseElfToFlash, toIntelHex } from "./intelhex";
import type { SketchSource } from "./types";

function coreDir(): string {
  const cands = [
    process.env["AUDRINO_CORE_DIR"],
    join(dirname(fileURLToPath(import.meta.url)), "..", "core"),
    join(process.cwd(), "packages/sim/core"),
    join(process.cwd(), "../../packages/sim/core"),
  ].filter((c): c is string => !!c);
  for (const c of cands) if (existsSync(join(c, "core.cpp"))) return c;
  throw new Error(`micro-core directory not found (tried: ${cands.join(", ")})`);
}
const CORE_DIR = coreDir();

export interface CompileResult {
  hex: string;
  kind: "zig" | "avr-gcc" | "arduino-cli";
  ms: number;
  cached: boolean;
}

export type ToolchainKind = CompileResult["kind"];

export interface Toolchain {
  kind: ToolchainKind;
  prefix: string[];
}

function tryRun(cmd: string[], timeout = 20000): string | null {
  try {
    return execFileSync(cmd[0], [...cmd.slice(1)], { timeout, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

export function detectToolchain(): Toolchain | null {
  const zigCandidates: string[][] = [];
  const env = process.env["AUDRINO_ZIG"];
  if (env) zigCandidates.push(env.trim().split(/\s+/));
  zigCandidates.push(["zig"], ["python3", "-m", "ziglang"], ["python", "-m", "ziglang"]);
  for (const c of zigCandidates) {
    const out = tryRun([...c, "version"]);
    if (out && /^\d+\./.test(out.trim())) return { kind: "zig", prefix: c };
  }
  if (tryRun(["avr-gcc", "--version"])) return { kind: "avr-gcc", prefix: [] };
  if (tryRun(["arduino-cli", "version"])) return { kind: "arduino-cli", prefix: [] };
  return null;
}

const FN_RE = /^([A-Za-z_][\w:<>,\s\*&]*?)\s+([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*\{/gm;

function autoPrototypes(src: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of src.matchAll(FN_RE)) {
    const name = m[2];
    if (seen.has(name) || name === "if" || name === "for" || name === "while" || name === "switch") continue;
    seen.add(name);
    out.push(`${m[1].trim()} ${name}(${m[3].trim()});`);
  }
  return out.join("\n");
}

function wrapIno(files: Record<string, string>, main: string): string {
  const order = [main, ...Object.keys(files).filter((f) => f !== main).sort()];
  const body = order.filter((f) => f.endsWith(".ino")).map((f) => files[f]).join("\n");
  const proto = autoPrototypes(body);
  return `#include "Arduino.h"\nextern "C" void setup(void);\nextern "C" void loop(void);\n${proto}\n${body}\n`;
}

function cacheDir(): string {
  const d = process.env["AUDRINO_SIM_CACHE"] ?? join(CORE_DIR, "..", ".cache", "sim");
  mkdirSync(d, { recursive: true });
  return d;
}

function coreSources(): string[] {
  return ["crt0.c", "core.cpp", "Arduino.h", "avr_min.h", "atmega328p.ld"].map((f) => readFileSync(join(CORE_DIR, f), "utf8"));
}

export function compileSketch(sketch: SketchSource): CompileResult {
  const tc = detectToolchain();
  if (!tc) throw new Error("No AVR toolchain found (tried AUDRINO_ZIG, zig, python3 -m ziglang, avr-gcc, arduino-cli)");
  const started = Date.now();
  const hash = createHash("sha256")
    .update(tc.kind)
    .update(JSON.stringify(sketch))
    .update(coreSources().join("\u0000"))
    .digest("hex")
    .slice(0, 16);
  const dir = join(cacheDir(), hash);
  const hexPath = join(dir, "out.hex");
  if (existsSync(hexPath)) return { hex: readFileSync(hexPath, "utf8"), kind: tc.kind, ms: Date.now() - started, cached: true };
  mkdirSync(dir, { recursive: true });

  const inoNames = Object.keys(sketch.files).filter((f) => f.endsWith(".ino"));
  const cpps = Object.keys(sketch.files).filter((f) => f.endsWith(".cpp") || f.endsWith(".c"));
  const mains = sketch.main.endsWith(".ino") ? [sketch.main] : [];
  const sketchCpp = join(dir, "sketch.cpp");
  writeFileSync(sketchCpp, wrapIno({ ...sketch.files, ...(mains.length ? {} : {}) }, sketch.main));
  const extra: string[] = [];
  for (const f of cpps) {
    const p = join(dir, f.replace(/[^\w.]/g, "_"));
    writeFileSync(p, sketch.files[f]);
    extra.push(p);
  }
  void inoNames;

  const elf = join(dir, "out.elf");
  if (tc.kind === "zig" || tc.kind === "avr-gcc") {
    /* One-shot compile+link: zig's driver merges LLVM-ARV's per-TU layout
       markers (__data_start & co); linking separately-built .o files collides. */
    const driver = tc.kind === "zig" ? [...tc.prefix, "cc"] : ["avr-gcc"];
    const target = tc.kind === "zig" ? ["--target=avr-freestanding-eabi", "-mmcu=atmega328p", "-mcpu=atmega328p"] : ["-mmcu=atmega328p"];
    const common = [...target, "-Os", "-ffunction-sections", "-fdata-sections", "-fno-exceptions", "-fno-rtti", "-fno-threadsafe-statics", "-nostdlib", "-Wl,--gc-sections", "-Wl,-e,__vectors", `-T${join(CORE_DIR, "atmega328p.ld")}`, `-I${CORE_DIR}`];
    execFileSync(driver[0], [...driver.slice(1), ...common, join(CORE_DIR, "crt0.c"), join(CORE_DIR, "core.cpp"), sketchCpp, ...extra, "-o", elf], { timeout: 120000 });
    /* zig objcopy cannot emit ihex in 0.16 — parse PT_LOAD (p_paddr = flash LMA) ourselves */
    const flash = parseElfToFlash(new Uint8Array(readFileSync(elf)));
    let codeBytes = 0;
    for (let i = 0; i < flash.length; i += 2) if (flash[i] || flash[i + 1]) codeBytes += 2;
    if (codeBytes < 128) throw new Error(`link produced an empty image (${codeBytes} bytes) — gc-sections dropped everything?`);
    writeFileSync(hexPath, toIntelHex(flash));
  } else {
    /* arduino-cli: real Arduino core (sketch folder layout) */
    const sketchDir = join(dir, "sketch");
    mkdirSync(sketchDir, { recursive: true });
    for (const [name, text] of Object.entries(sketch.files)) writeFileSync(join(sketchDir, name), text);
    execFileSync("arduino-cli", ["compile", "--fqbn", "arduino:avr:uno", "--output-dir", dir, sketchDir], { timeout: 300000, stdio: ["ignore", "pipe", "pipe"] });
    const produced = join(dir, "sketch.ino.hex");
    if (!existsSync(produced)) throw new Error("arduino-cli did not produce sketch.ino.hex");
    writeFileSync(hexPath, readFileSync(produced, "utf8"));
  }
  return { hex: readFileSync(hexPath, "utf8"), kind: tc.kind, ms: Date.now() - started, cached: false };
}
