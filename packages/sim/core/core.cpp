/* Micro Arduino core: register-level, polled timer + UART (M1).
 * Timer0 free-runs at clk/64 (1.024 ms overflow, Arduino-accurate). */
#include "Arduino.h"

extern "C" void __audrino_init(void);

SerialT Serial;

struct PinReg { volatile uint8_t *pin, *ddr, *port; uint8_t bit; };

static const PinReg PINS[] = {
  { &PIND, &DDRD, &PORTD, 0 }, { &PIND, &DDRD, &PORTD, 1 },
  { &PIND, &DDRD, &PORTD, 2 }, { &PIND, &DDRD, &PORTD, 3 },
  { &PIND, &DDRD, &PORTD, 4 }, { &PIND, &DDRD, &PORTD, 5 },
  { &PIND, &DDRD, &PORTD, 6 }, { &PIND, &DDRD, &PORTD, 7 },
  { &PINB, &DDRB, &PORTB, 0 }, { &PINB, &DDRB, &PORTB, 1 },
  { &PINB, &DDRB, &PORTB, 2 }, { &PINB, &DDRB, &PORTB, 3 },
  { &PINB, &DDRB, &PORTB, 4 }, { &PINB, &DDRB, &PORTB, 5 },
  { &PINC, &DDRC, &PORTC, 0 }, { &PINC, &DDRC, &PORTC, 1 },
  { &PINC, &DDRC, &PORTC, 2 }, { &PINC, &DDRC, &PORTC, 3 },
  { &PINC, &DDRC, &PORTC, 4 }, { &PINC, &DDRC, &PORTC, 5 },
};

static volatile unsigned long timer0_overflow_count = 0;
static volatile uint8_t timer0_snapshot = 0;

static void timer0_tick(void) {
  if (TIFR0 & (1 << WDTOVRF0)) {
    TIFR0 = (1 << WDTOVRF0); /* write-1-to-clear */
    timer0_overflow_count++;
    timer0_snapshot = TCNT0;
  }
}

unsigned long micros(void) {
  unsigned long ovf;
  uint8_t t;
  do {
    ovf = timer0_overflow_count;
    t = TCNT0;
    timer0_tick();
  } while (ovf != timer0_overflow_count);
  return ovf * 1024UL + (unsigned long)t * 4UL;
}

unsigned long millis(void) { return micros() / 1000UL; }

void delay(unsigned long ms) {
  unsigned long start = micros();
  while (ms > 0) {
    timer0_tick();
    if (micros() - start >= 1000UL) { ms--; start += 1000UL; }
  }
}

void delayMicroseconds(unsigned int us) {
  unsigned long start = micros();
  while (micros() - start < (unsigned long)us) timer0_tick();
}

void pinMode(uint8_t pin, uint8_t mode) {
  if (pin >= 20) return;
  const PinReg &p = PINS[pin];
  if (mode == OUTPUT) {
    *p.ddr |= (1 << p.bit);
  } else {
    *p.ddr &= ~(1 << p.bit);
    if (mode == INPUT_PULLUP) *p.port |= (1 << p.bit);
    else *p.port &= ~(1 << p.bit);
  }
}

void digitalWrite(uint8_t pin, uint8_t val) {
  if (pin >= 20) return;
  const PinReg &p = PINS[pin];
  if (val) *p.port |= (1 << p.bit);
  else *p.port &= ~(1 << p.bit);
}

int digitalRead(uint8_t pin) {
  if (pin >= 20) return LOW;
  const PinReg &p = PINS[pin];
  return (*p.pin & (1 << p.bit)) ? HIGH : LOW;
}

void analogWrite(uint8_t pin, int val) {
  /* M1: PWM collapses to digital levels; timer PWM lands in M2. */
  pinMode(pin, OUTPUT);
  digitalWrite(pin, val >= 128 ? HIGH : LOW);
}

int analogRead(uint8_t pin) {
  uint8_t ch = (pin >= 14 && pin <= 19) ? (uint8_t)(pin - 14) : (uint8_t)(pin & 7);
  ADMUX = (1 << 6) | ch;            /* AVcc ref */
  ADCSRA = (1 << ADEN0) | 0x07;     /* enable, clk/128 */
  ADCSRA |= (1 << ADSC0);
  for (long i = 0; i < 20000 && (ADCSRA & (1 << ADSC0)); i++) timer0_tick(); /* bounded: M1 has no ADC model */
  return (ADCL | (ADCH << 8));
}

long map(long x, long in_min, long in_max, long out_min, long out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

void SerialT::begin(unsigned long baud) {
  (void)baud;
  uint16_t ubrr = 103; /* 16 MHz / 9600 */
  UBRR0H = (uint8_t)(ubrr >> 8);
  UBRR0L = (uint8_t)ubrr;
  UCSR0A = 0;
  UCSR0B = (1 << TXEN0) | (1 << RXEN0);
  UCSR0C = (3 << UCSZ00);
}
void SerialT::end() { UCSR0B = 0; }
int SerialT::available() { return (UCSR0A & (1 << RXC0)) ? 1 : 0; }
int SerialT::read() { return (UCSR0A & (1 << RXC0)) ? UDR0 : -1; }
void SerialT::flush() {}
size_t SerialT::write(uint8_t b) {
  while (!(UCSR0A & (1 << UDRE0))) timer0_tick();
  UDR0 = b;
  return 1;
}
void SerialT::print(const char *s) { while (*s) write((uint8_t)*s++); }
void SerialT::print(char c) { write((uint8_t)c); }
void SerialT::print(int v) { print((long)v); }
void SerialT::print(unsigned int v) { print((unsigned long)v); }
void SerialT::print(long v) {
  char buf[12];
  int i = 0;
  bool neg = v < 0;
  unsigned long u = neg ? (unsigned long)(-v) : (unsigned long)v;
  do { buf[i++] = (char)('0' + u % 10); u /= 10; } while (u);
  if (neg) buf[i++] = '-';
  while (i) write((uint8_t)buf[--i]);
}
void SerialT::print(unsigned long v) {
  char buf[12];
  int i = 0;
  do { buf[i++] = (char)('0' + v % 10); v /= 10; } while (v);
  while (i) write((uint8_t)buf[--i]);
}
void SerialT::print(double v) {
  print((long)v);
  write('.');
  double frac = v - (double)(long)v;
  if (frac < 0) frac = -frac;
  for (int d = 0; d < 2; d++) {
    frac *= 10;
    write((uint8_t)('0' + (int)frac % 10));
  }
}
void SerialT::println() { write('\r'); write('\n'); }
void SerialT::println(const char *s) { print(s); println(); }
void SerialT::println(char c) { print(c); println(); }
void SerialT::println(int v) { print(v); println(); }
void SerialT::println(unsigned int v) { print(v); println(); }
void SerialT::println(long v) { print(v); println(); }
void SerialT::println(unsigned long v) { print(v); println(); }
void SerialT::println(double v) { print(v); println(); }

extern "C" void setup(void);
extern "C" void loop(void);

extern "C" int main(void) {
  TCCR0A = 0;
  TCCR0B = 0x03; /* clk/64 free-run */
  __audrino_init();
  setup();
  for (;;) loop();
  return 0;
}
