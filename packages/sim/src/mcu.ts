/**
 * avr8js MCU wrapper: ATmega328P @ 16 MHz with GPIO ports B/C/D, timers 0-2
 * (millis timebase) and UART0 (Serial). Polled peripherals only (micro-core).
 */
import {
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  CPU,
  PinState,
  avrInstruction,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from "avr8js";

export const F_CPU = 16_000_000;
export { PinState };

export class Mcu {
  readonly cpu: CPU;
  private readonly ports: { B: AVRIOPort; C: AVRIOPort; D: AVRIOPort };
  private readonly onByte: ((b: number) => void) | undefined;
  /** Fired after an instruction that wrote DDRB/C/D or PORTB/C/D (co-sim sync point). */
  onGpioWrite: (() => void) | undefined;
  private gpioDirty = false;

  constructor(flash: Uint16Array, onByte?: (b: number) => void) {
    this.onByte = onByte;
    this.cpu = new CPU(flash, 0x800);
    new AVRTimer(this.cpu, timer0Config);
    new AVRTimer(this.cpu, timer1Config);
    new AVRTimer(this.cpu, timer2Config);
    this.ports = {
      B: new AVRIOPort(this.cpu, portBConfig),
      C: new AVRIOPort(this.cpu, portCConfig),
      D: new AVRIOPort(this.cpu, portDConfig),
    };
    const usart = new AVRUSART(this.cpu, usart0Config, F_CPU);
    usart.onByteTransmit = (v: number) => this.onByte?.(v);
    /* DDRB/C/D + PORTB/C/D writes mark the analog world dirty */
    for (const addr of [0x24, 0x25, 0x27, 0x28, 0x2a, 0x2b]) {
      const prev = this.cpu.writeHooks[addr] as ((v: number, o: number, a: number, m: number) => boolean) | undefined;
      this.cpu.writeHooks[addr] = (value: number, old: number, a: number, mask: number): boolean => {
        this.gpioDirty = true;
        return prev ? prev(value, old, a, mask) : false;
      };
    }
  }

  get ms(): number {
    return (this.cpu.cycles / F_CPU) * 1000;
  }

  stepCycles(targetCycles: number): void {
    /* avr8js: avrInstruction() = one instruction; tick() = due clock events (UART/timers). */
    let guard = (targetCycles - this.cpu.cycles) * 8 + 16;
    while (this.cpu.cycles < targetCycles && guard-- > 0) {
      const before = this.cpu.cycles;
      avrInstruction(this.cpu);
      this.cpu.tick();
      if (this.gpioDirty) {
        this.gpioDirty = false;
        this.onGpioWrite?.(); /* wire feedback lands before the next instruction */
      }
      if (this.cpu.cycles <= before) break; /* halted CPU must not hang the sim */
    }
  }

  stepMs(ms: number): void {
    this.stepCycles(this.cpu.cycles + Math.ceil((ms * F_CPU) / 1000));
  }

  private locate(pin: number): { port: AVRIOPort; bit: number } | null {
    if (pin >= 0 && pin <= 7) return { port: this.ports.D, bit: pin };
    if (pin >= 8 && pin <= 13) return { port: this.ports.B, bit: pin - 8 };
    if (pin >= 14 && pin <= 19) return { port: this.ports.C, bit: pin - 14 };
    return null;
  }

  pinState(pin: number): PinState {
    const loc = this.locate(pin);
    return loc ? loc.port.pinState(loc.bit) : PinState.Input;
  }

  /** Drive an external voltage onto a pin line (for digitalRead). */
  setExternal(pin: number, high: boolean): void {
    const loc = this.locate(pin);
    if (loc) loc.port.setPin(loc.bit, high);
  }
}
