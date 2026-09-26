/* Arduino-compatible API surface for the audrino micro-core. */
#pragma once
#include "avr_min.h"

#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define LSBFIRST 0
#define MSBFIRST 1

#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19
#define LED_BUILTIN 13

typedef bool boolean;
typedef uint8_t byte;

void pinMode(uint8_t pin, uint8_t mode);
void digitalWrite(uint8_t pin, uint8_t val);
int digitalRead(uint8_t pin);
void analogWrite(uint8_t pin, int val);
int analogRead(uint8_t pin);
void delay(unsigned long ms);
void delayMicroseconds(unsigned int us);
unsigned long millis(void);
unsigned long micros(void);
long map(long x, long in_min, long in_max, long out_min, long out_max);

#define min(a, b) ((a) < (b) ? (a) : (b))
#define max(a, b) ((a) > (b) ? (a) : (b))
#define constrain(x, lo, hi) ((x) < (lo) ? (lo) : ((x) > (hi) ? (hi) : (x)))
#define bit(n) (1UL << (n))

struct SerialT {
  void begin(unsigned long baud);
  void end();
  int available();
  int read();
  void flush();
  void print(const char *s);
  void print(char c);
  void print(int v);
  void print(unsigned int v);
  void print(long v);
  void print(unsigned long v);
  void print(double v);
  void println();
  void println(const char *s);
  void println(char c);
  void println(int v);
  void println(unsigned int v);
  void println(long v);
  void println(unsigned long v);
  void println(double v);
  size_t write(uint8_t b);
};

extern SerialT Serial;
