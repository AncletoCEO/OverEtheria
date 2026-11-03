# 03 — El intento anterior (referencia)

> Repo: `tools/legacy-recomp/` — `AncletoCEO/Sword-Of-Etheria-PC-Recomp`
> (MIT) + fork del runtime `tools/PS2Recomp/` (GPLv3).
> 171 commits, 2026-09-24 → 2026-10-19. **No se hereda su historia git.**

## Arquitectura que usó

```
ISO ──bsdtar/7z──► SLES_537.68 ──ps2_recomp──► ~18.000 .cpp ──CMake──► sword_etheria
                                          ▲
                    ghidra_functions.csv ─┘  (20.434 funciones, input de build)
```

- `game/`: `CMakeLists.txt`, `game_main.cpp`, `split_monsters.py` (parte los `.cpp`
  gigantes), `validate_csv.py`, `generate_functions_csv.py`, parches y notas.
- `aspec/changes/reach-main-menu/`: `decisions.md` (104 KB de evidencia por ronda),
  `HANDOFF.md`, `tasks.md`, `specs/scene-phase/`.
- El runtime específico del juego está en **`game_overrides.cpp` del fork**
  (~309 KB, 250 hooks `replaceFunction`/`bindAddressEntry`, 47 flags `SWORD_*`).
- CI (`.github/workflows/release.yml`): clona el fork en el commit
  `7364cc6`, compila las tools en Linux y Windows y empaqueta.

## Qué logró (medido)

- Arranque completo: lee assets del CD, inicializa GS/VIF1/VU1, corre el bucle de
  frames y el scheduler de 3 hilos.
- El pipeline gráfico quedó **verificado byte a byte contra PCSX2** (display, GIF,
  VIF1-UNPACK, VU1, XGKICK, geometría y color).
- Llegó al **menú lógico**: tareas, loader y grafo de escena coinciden con el
  savestate real del menú (Task#4, 6 assets en `state=3`, draw tree, capa 2D).
- El 2D se **encola** (`FUN_006e58b8` ×394) y los sprites llegan al GS
  (`gs:kick`, `prim=6`, `tme=1`).
- Fix real del pad: la tabla de stubs de `libpad` estaba corrida una función; al
  corregirla, la fase avanzó al menú.
- Estado del gestor de texturas (`0xA887B8`) **byte-idéntico** al real salvo 3 palabras.

## Dónde se trabó (lead vigente)

La pantalla queda negra con `rgbNZ=0` y `aNZ=640×448` (un quad alpha sin color).
La cadena medida:

1. El juego entra al menú y dibuja sprites **texturizados**.
2. Los draws piden `PSMT8 64×64` en `TBP0=10240`, `CBP=10268`, `TCC=1`.
3. Nuestro run **sube** 5 imágenes `PSMCT32` chicas a esa página, pero **nunca**
   sube el **atlas PSMT8** (`0x282000–0x294000`) ni su CLUT.
4. El pase de subida es de **arranque** (`FUN_00512ab0` se entra una vez) y su
   bucle sobre el gestor ejecutó **una sola vez**: en ese instante la cola tenía
   **un** asset listo.
5. El gestor está *idle* y es idéntico al real; la diferencia está en **la lista de
   6 objetos de UI** (`centinela 0xA88874`), vacía en nuestro run y **nunca escrita**
   (verificado con watchpoint `mprotect`, que sí ve `FAST_WRITE32`).

Hipótesis vigentes: **timing/readiness del loader** en el pase único, o una función
que arma/enlaza esos 6 objetos y que no se ejecuta. El siguiente paso documentado
era trazar la entrada de las funciones del cluster `0x6d6290…0x6db0d0`.

## Ya refutado (no volver a recorrer)

Del `HANDOFF.md` §6 y `decisions.md`:

| Hipótesis | Evidencia del descarte |
|---|---|
| Audio/SPU2 como bloqueo | El spin sale solo; el mezclador corre; el hilo 1 no vive ahí |
| RTC/tiempo | `sceCdReadClock` = hora del host; VBlank a 60 Hz |
| Replies RPC del kernel | HLE con reply real → sin efecto |
| Datos de `SD.BIN` | Servir el archivo real → sin efecto |
| Flags de SIF-init | Sembrarlos → sin efecto |
| `0xA2A9C0` = tabla a hardcodear | Es el pool de paquetes SIF del juego; síntoma |
| `sema 8` desbalanceado | Balanceado (handshake por frame) |
| `0x4d3730` como gate | Restaurar su cuerpo rompe el main thread |
| OS anfitrión (Linux/Windows) | El gate es lógica guest |
| Decomp a mano como atajo | El recomp ya es una decomp; falta la capa de plataforma |
| Watchpoint en `Store32` | El generado usa `FAST_WRITE32`: no pasa por ahí |
| `qwc=0` = sin geometría | El juego usa modo cadena por `TADR`; la geometría sí llega |
| "Falta el atlas porque el GS está roto" | La página y el CLUT subidos son **byte-idénticos** al real |

## Trampas de medición (aprendidas a golpes)

1. **Un log vacío puede ser falta de `flush`**, no ausencia de evento.
2. **Los contadores con rate-limit no son distribuciones** (`n<=25`, `%600`).
3. **`replaceFunction` sobre una dirección interna es inerte**: el generado cae con
   `goto` y no consulta la tabla.
4. **`pc=0`** en un hilo puede ser "invocación del scheduler terminada", no muerte.
5. **El heap del recomp está corrido `+0x150`**: comparar por contenido, no por
   dirección.
6. **El dump de VRAM/GS puede tener header** (`GS.bin` = 425 B + 4 MB + 84 B).
7. **Medir contra el savestate antes de encadenar deducciones** (cayeron 6
   hipótesis por no hacerlo).

## Qué se reutiliza de este intento

> ⚠️ **Su CSV no es un baseline (2026-11-03).** `ghidra_functions.csv` tiene 20.434
> filas y 10.057 solapamientos, producto del generador/splitter del recomp. Su 96,5 %
> de cobertura es artificial: el export fresco de Ghidra cubre el 14,47 % de `main`.
> Se conserva solo como **referencia histórica**; el mapa de funciones se construye en
> este proyecto (ver `decomp/analysis/main-coverage.md`).

- `game/validate_csv.py` y `game/generate_functions_csv.py` como **referencia** de
  criterios (referencias reales, no cercanía a epílogos), no como pipeline a heredar.
- `game/split_monsters.py` (obligatorio tras cada `ps2_recomp`).
- `aspec/changes/.../ghidra_functions.csv` (20.434 filas) solo como **referencia
  histórica**: no se adopta como baseline (10.057 solapamientos; 96,5 % artificial).
- Scripts de PCSX2/PINE (`pcsx2_state.py`, `pine_state_gpr.py`) — requieren port a
  Windows (PINE por TCP).
- El `game_overrides.cpp` del fork (los 250 hooks) como **mapa de conocimiento**,
  no como base limpia.
- Las notas de formato: `game/tyosd-573-hle.md`, `game/iop-preload.md`.

## Qué falta en esta máquina

- `work/` (~13 GB): ELF extraído, 18k `.cpp`, binario de 382 MB, savestates y dumps.
- Los savestates de referencia (el proyecto de Ghidra ya se regeneró en
  `work/ghidra/SoE`).
- Toolchain (ver `05`).

Es decir: la **documentación y el conocimiento** sobrevivieron; los artefactos de
build **no**. La fase 1 es reconstruirlos.
