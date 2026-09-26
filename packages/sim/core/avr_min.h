/* Minimal ATmega328P register map + Arduino-compatible API (no avr-libc).
 * Data-space addresses — avr8js models the same map. Polled timer/UART only,
 * so no interrupt vector plumbing is required for M1. */
#pragma once
#include <stdint.h>
#include <stddef.h>

#define _MM8(a) (*(volatile uint8_t *)(a))
#define _MM16(a) (*(volatile uint16_t *)(a))

#define PINB _MM8(0x23)
#define DDRB _MM8(0x24)
#define PORTB _MM8(0x25)
#define PINC _MM8(0x26)
#define DDRC _MM8(0x27)
#define PORTC _MM8(0x28)
#define PIND _MM8(0x29)
#define DDRD _MM8(0x2A)
#define PORTD _MM8(0x2B)

#define TIFR0 _MM8(0x35)
#define TCCR0A _MM8(0x44)
#define TCCR0B _MM8(0x45)
#define TCNT0 _MM8(0x46)
#define OCR0A _MM8(0x47)
#define OCR0B _MM8(0x48)

#define TCCR1A _MM8(0x80)
#define TCCR1B _MM8(0x81)
#define TCNT1 _MM16(0x84)
#define ICR1 _MM16(0x86)
#define OCR1A _MM16(0x88)
#define OCR1B _MM16(0x8A)

#define TCCR2A _MM8(0xB0)
#define TCCR2B _MM8(0xB1)
#define TCNT2 _MM8(0xB2)
#define OCR2A _MM8(0xB3)
#define OCR2B _MM8(0xB4)

#define ADMUX _MM8(0x7C)
#define ADCSRA _MM8(0x7A)
#define ADCL _MM8(0x78)
#define ADCH _MM8(0x79)
#define DIDR0 _MM8(0x7E)

#define UCSR0A _MM8(0xC0)
#define UCSR0B _MM8(0xC1)
#define UCSR0C _MM8(0xC2)
#define UBRR0L _MM8(0xC4)
#define UBRR0H _MM8(0xC5)
#define UDR0 _MM8(0xC6)

#define SREG _MM8(0x3F)

#define WDTOVRF0 0
#define UDRE0 5
#define TXC0 6
#define RXC0 7
#define TXEN0 3
#define RXEN0 4
#define UCSZ00 1
#define ADEN0 7
#define ADSC0 6

static inline void sei(void) { __asm__ volatile("sei" ::: "memory"); }
static inline void cli(void) { __asm__ volatile("cli" ::: "memory"); }
