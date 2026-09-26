/* Reset + vectors + libc-less init (C with inline asm — one TU language, one ISA). */
#include <stdint.h>

extern char __bss_start[], __bss_end[], __data_start[], __data_end[], __data_load_start[];

__attribute__((naked, section(".vectors"), used)) void __vectors(void) {
  __asm__ volatile(
    "jmp __reset\n\t"
    "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t"
    "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t"
    "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t"
    "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t"
    "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t"
    "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t" "jmp __bad\n\t"
    "jmp __bad\n\t");
}

__attribute__((naked, section(".init9"), used)) void __reset(void) {
  __asm__ volatile(
    "clr r1\n\t"
    "out 0x3f, r1\n\t"             /* SREG = 0 */
    "ldi r28, 0xFF\n\t"            /* SPL: 0x8FF = top of 2K RAM */
    "ldi r29, 0x08\n\t"            /* SPH */
    "out 0x3e, r29\n\t"
    "out 0x3d, r28\n\t"
    "call __init_c\n\t"
    "1: rjmp 1b\n\t");
}

void __init_c(void) {
  for (char *p = __bss_start; p < __bss_end; ++p) *p = 0;
  /* .data copy: flash (LMA) → RAM must use LPM (Z ptr walks flash). */
  register const char *s __asm__("r30") = __data_load_start;
  register char *d __asm__("r26") = __data_start;
  register const char *e __asm__("r24") = __data_end;
  __asm__ volatile(
    "1: cp r26, r24\n\t"
    "cpc r27, r25\n\t"
    "breq 2f\n\t"
    "lpm r0, Z+\n\t"
    "st X+, r0\n\t"
    "rjmp 1b\n\t"
    "2:"
    : "+z"(s), "+x"(d)
    : "r"(e)
    : "r0", "memory");
  extern int main(void);
  main();
}

__attribute__((naked, used)) void __bad(void) { __asm__ volatile("jmp __bad"); }

void __audrino_init(void) {}
