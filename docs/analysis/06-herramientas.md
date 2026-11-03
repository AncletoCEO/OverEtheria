# 06 — Herramientas

Pins en [`../../tools.lock.toml`](../../tools.lock.toml).

## Resumen

| Herramienta | Pin | Licencia | Rol | Veredicto |
|---|---|---|---|---|
| **PS2Recomp (fork)** | `7364cc6` | GPL-3.0 | recompilador + runtime | ✅ imprescindible; **no soporta overlays** |
| **Ghidra 12.x** | — | Apache-2.0 | decompilador | ✅ herramienta principal de decomp |
| **PCSX2 2.9.153** | — | GPL-3.0 | referencia real | ✅ para savestates/A-B; no copiar código |
| **REA 6.8.0** | `6be6596` | MIT | MCP de RE | ❌ no puede con este ELF hoy; útil para el lado PC |
| **Legacy recomp** | `6e49d96` | MIT / GPL-3.0 | intento anterior | ✅ referencia de conocimiento |
| Node.js | 26.13 | — | scripts propios | ✅ |
| 7-Zip | — | LGPL | extraer ISO | ✅ |

## PS2Recomp (fork `AncletoCEO/Ps2Recomp-of-etheria`)

- Traduce MIPS R5900 → C++ con runtime propio (memoria, scheduler, syscalls,
  GS/VIF1/VU1, IOP con IRX).
- Es el que produjo el intento anterior; el `game_overrides.cpp` del fork contiene
  ~250 hooks específicos del juego.
- **Limitaciones medidas**: rendimiento pobre en VU/GS, hardware parcial, sin SPU2
  y **sin soporte de overlays** (el `ps2xRecomp` compila un ELF a la vez con una
  única tabla de funciones).
- Extensión necesaria (fase 3): recompilar cada `MWo` con su base y registrar su
  tabla por módulo, más un loader `SIMB`/`MWo`.

## Ghidra

- Versión probada por el proyecto previo: **12.1.4** (requiere JDK 21).
- El repo legado trae `ExportPS2FunctionsHeadless.java` y el CSV resultante
  (20.434 funciones).
- Ghidra carga el ELF como MIPS LE 32 genérico; **no decodifica MMI/R5900** con
  precisión. El código escalar se decompila bien; el código MMI (matemática vectorial,
  VU0 macro) sale feo. Para el motor de juego alcanza; para los paths de VU hay que
  leer asm.
- El CSV es un **input de build** y hay que auditarlo por overlay (hoy cubre solo
  `main`).

## PCSX2

- 2.9.153 (dev) en `tools/pcsx2/`. Solo referencia: ejecutar el juego real, sacar
  savestates y comparar RAM/VRAM/registros.
- **Licencia GPL-3.0**: no copiar código de PCSX2 al repo MIT. Se puede leer para
  entender comportamiento (p. ej. SIO2 del pad) y reimplementar.
- PINE: en Linux socket UNIX; en Windows **TCP**. Los scripts del repo legado hay
  que portarlos.
- Savestates `.p2s`: ZIP con zstd → `bsdtar`.

## REA (por qué no, hoy)

REA es un MCP muy bueno, pero su capa de admisión rechaza este target:

1. **Windows**: el lane de Ghidra es *P0* y solo admite **PE nativo y 6502**.
   Textual: *"Windows Ghidra P0 does not admit MIPS targets"*
   (`docs/ghidra-mips.md`).
2. **MIPS genérico** (Linux/macOS): admite ELF32 `ET_EXEC`/`ET_REL` con `o32` y
   `EF_MIPS_ARCH_32R2`, **sin flags machine-specific ni ASE**.
3. Nuestro ELF tiene `e_flags = 0x20924000`: `EF_MIPS_MACH_5900` + `ARCH_3`.
   Queda fuera por dos motivos.

Conclusión: **no construir el plan sobre REA**. Se guarda en `tools/rea` porque
sirve para el lado PC (binarios PE, JS/Electron, .NET) y por si más adelante se
levanta WSL + un Ghidra que admita R5900.

## Frontera de licencias

| Componente | Licencia | Consecuencia |
|---|---|---|
| Este repo (docs/scripts) | MIT | se puede publicar |
| Fork del runtime | GPL-3.0 | el binario que lo enlaza queda GPL; fuente en el fork |
| PCSX2 | GPL-3.0 | solo referencia; no copiar código |
| REA | MIT | se puede usar como herramienta |
| Ghidra | Apache-2.0 | OK |
| Juego (ISO/ELF/assets) | propietario | nunca se distribuye |
