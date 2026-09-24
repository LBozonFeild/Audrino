# M1 — Simulation core + live Run (spec)

Status: **implemented** (`packages/sim`, `apps/web/src/sim`). Acceptance: `SIM_GOLDENS`
(`packages/schema/tests/golden/simFixtures.ts`) pass on the engine, and the editor's
Run button executes the project's real firmware on its circuit.

## Pipeline

```
.ino/.cpp ──▶ toolchain.ts ──▶ Intel HEX ──▶ avr8js CPU (ATmega328P @ 16 MHz)
                 │                                 │  GPIO write-hooks ──┐
   micro-core (core/: Arduino API at register level)                     ▼
                                                     MNA solver ◀── netlist.ts
                                                        │  node volts feed input pins
                                                        ▼
                                     Serial (UART0, baud-accurate) + LED/pin state
```

## Toolchain (auto-detect order)

1. `arduino-cli` + `arduino:avr` core (official firmware path)
2. `avr-gcc`/`avr-g++`
3. `zig cc` — `$AUDRINO_ZIG`, `zig` on PATH, `python3 -m ziglang` (PyPI `ziglang` wheel
   bundles clang with the AVR backend)

Zig/clang link line (M1 contract, do not regress):
`--target=avr-freestanding-eabi -mmcu=atmega328p -mcpu=atmega328p` (both flags —
`-mmcu` alone silently keeps the avr1 baseline), one-shot compile+link of
`core/crt0.c core/core.cpp sketch…` with `-T core/atmega328p.ld -Wl,--gc-sections
-Wl,-e,__vectors`. The flash image is parsed straight from ELF PT_LOAD
(`p_paddr` = AVR LMA) — `zig objcopy` cannot emit ihex in 0.16. An empty-image
guard fails the compile loudly (gc-sections once ate an entry-less image silently).

`core/atmega328p.ld` defines `__data_load_start/__data_start/__data_end/
__bss_start/__bss_end` with the **location counter** (`ADDR(.data)` is the section
base and silently collapses the copy loop to zero iterations). `.rodata` shares the
copied RAM block: clang-avr's generic `const char*` is SRAM-mapped and dereferenced
with `LD`; `crt0.c` copies flash→RAM with `LPM`.

## Micro-core (core/)

`pinMode/digitalWrite/digitalRead/analogRead*, millis/micros/delay/delayMicroseconds,
Serial (print/println/write, 8N1 via polled UDRE)` over ATmega328P registers
(PORTB/C/D 0x23–0x2B, UART0 0xC0–0xC6, Timer0 overflow polled by `micros()`).
`setup()/loop()` are `extern "C"` (core.cpp calls them with C linkage).
`analogRead` is a bounded stub until M2 wires `AVRADC`.

## Runner (co-simulation)

- `MnaSolver`: DC + backward-Euler transient + PWL diode (LED) Newton loop,
  gmin = 1e-12. t=0 `solveInitial` holds capacitors at their initial (shorted)
  state; `solveDC` opens them.
- Netlist: board GND pins and anything wired to them = node 0; 5V/3V3 ideal
  sources; GPIO = 25 Ω Thevenin + 20 k pull-up switched by pin mode. Builtin pin
  lists (UNO 25-pin subset, R/C 1–2, LED A/K) work without schema install.
- Coupling: writes to DDRB/C/D or PORTB/C/D fire a solve + input-pin feed **before
  the next instruction** (digitalWrite→digitalRead is race-free). Capacitive nets
  step at 0.25 ms frames.
- Serial bytes timestamp at baud-accurate emission time (`cpu.cycles / 16 MHz`).
- Bounds: `stepCycles` refuses to spin on a halted CPU; `untilMs` caps every run.

## Golden semantics (contract)

`expect.serial[{ms,line}]` = **deadlines**: line *i* must arrive in order with
`sim_ms ≤ ms_i` (the sketch's `delay()` accumulation is the intended reading).
`expect.analog[{probe,at_ms,v,tol_v}]` = `component:pin` node voltage; `at_ms: 0`
evaluates the t=0 solve (board 5V is an ideal 5.00 V ⇒ the 1k/1k divider is exactly
2.5 V within gmin).

## UI (Run button)

`POST /api/sim/compile` (vite middleware, node-side toolchain) → `simWorker.ts`
(browser-side engine, streamed serial lines) → `SimProvider` store → Serial panel
(timestamps), Stop/⟳ Reset in the topbar, LED glow overlay in `PartGlyph`
(`partRef`). Tests inject a fake runner via `__setSimRunner`.

## Limits (by design, M2+)

No ADC/SPI/I²C/EEPROM peripherals yet (AVRADC etc. exist in avr8js and wire in M2);
serial TX *to* the board lands in M2; one board per run; LED/pin glow updates at
run end; initialized globals work (LPM→RAM copy), `__flash`/PROGMEM reads do not.
