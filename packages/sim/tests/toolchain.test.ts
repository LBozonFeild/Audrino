import { describe, expect, it } from "vitest";
import { detectToolchain, compileSketch } from "../src/toolchain";
import { parseFirmware, isJmpOpcode } from "../src/intelhex";

const BLINK = `void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  digitalWrite(13, HIGH);
  Serial.println("tick-H");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("tick-L");
  delay(500);
}
`;

describe("toolchain", () => {
  it("detects a working AVR toolchain", () => {
    const found = detectToolchain();
    expect(found).not.toBeNull();
    expect(found!.kind).toMatch(/zig|avr-gcc|arduino-cli/);
  });

  it("compiles a blink sketch to an ATmega328P flash image", () => {
    const r = compileSketch({ main: "blink.ino", files: { "blink.ino": BLINK } });
    expect(r.hex.startsWith(":")).toBe(true);
    expect(r.hex.length).toBeGreaterThan(500);
    const flash = parseFirmware(r.hex);
    expect(isJmpOpcode(flash[0])).toBe(true); /* jmp __reset */
  });

  it("caches repeated compiles", () => {
    const src = { main: "blink.ino", files: { "blink.ino": BLINK } };
    compileSketch(src);
    const r = compileSketch(src);
    expect(r.cached).toBe(true);
  });
});
