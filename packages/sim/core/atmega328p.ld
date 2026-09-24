/* ATmega328P layout for ld.lld (zig cc / clang-avr) and avr-gcc alike:
   flash VMA 0, RAM VMA 0x800. Generic (const char*) pointers are SRAM-mapped
   and dereferenced with LD, so .rodata lives at its RAM VMA and is copied from
   flash LMA by core/crt0.c together with .data. Symbols required by crt0.c are
   defined here (the implicit lld layout defines none). KEEP .init* + ENTRY so
   --gc-sections cannot eat the reset chain. */
OUTPUT_ARCH(avr:5)
ENTRY(__vectors)
MEMORY
{
  FLASH (rx)  : ORIGIN = 0,    LENGTH = 32K
  RAM (rwx)   : ORIGIN = 0x800, LENGTH = 2K
}
SECTIONS
{
  .text :
  {
    KEEP(*(.vectors))
    *(.init*)
    *(.progmem*)
    *(.text*)
    . = ALIGN(2);
  } > FLASH
  .data : AT (ADDR(.text) + SIZEOF(.text))
  {
    __data_load_start = LOADADDR(.data);
    __data_start = .;
    *(.rodata*)
    *(.data*)
    . = ALIGN(2);
    __data_end = .;
  } > RAM
  .bss (NOLOAD) :
  {
    . = ALIGN(2);
    __bss_start = .;
    *(.bss*)
    *(COMMON)
    . = ALIGN(2);
    __bss_end = .;
  } > RAM
}
