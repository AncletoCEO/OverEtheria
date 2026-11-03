# Baseline del primer binario nativo

> 2026-11-03. Build con el toolchain portable (GCC 16.2 + CMake 4.4.5, MinGW).
> Log crudo: `work/run.out` / `work/run.err` (ignorados).

## Build

| Dato | Valor |
|---|---|
| Toolchain | w64devkit GCC 16.2.0, CMake 4.4.5, MinGW Makefiles |
| Flags | `-O0 -fno-inline -fno-stack-protector -g0 -msse4.1`, `-j4` |
| Fuentes | 8.828 `.cpp` de `main` (277,6 MB) + runtime |
| Binario | `work/build-game/sword_etheria.exe` (334.151.523 B) |
| Tiempo | **~2 h 13 min** |
| Dependencias | FFmpeg 7.x (DLLs copiadas desde `ThirdParty/ffmpeg-prefix/.../bin`) |

## Corrida (60 s)

```powershell
$env:PATH="C:\repos\etheria\tools\w64devkit\bin;..."
.\work\build-game\sword_etheria.exe .\work\elf\SLES_537.68
```

| Métrica | Valor |
|---|---|
| `[gs:present]` | 306 líneas (contador hasta #2970) ≈ **3.060 frames** (~51 fps) |
| `[run:tick]` | 28 líneas (tick 120…3360) |
| `activeThreads` | 1 |
| `gp` | **0x0** (se espera `0xA28070`) |
| `pc` | **0x0** |
| `vramNonZero` | **0** |
| `dma` / `gif` / `vif` | 0 / 0 / 0 |
| Crash | no (se mata a los 60 s) |

## Síntomas

```
[gs:present] ... vramNonZero=0/4194304
[run:tick] tick=120 pc=0x0 ra=0x4d5d20 sp=0xfffffdb0 gp=0x0 activeThreads=1 ...
Error: No exact recompiled function for guest PC 0x6e6934 ...
[guest-branch:missing-target] kind=IndirectCall op=JALR source=0x4d5d18 target=0x0 ...
```

## Causas medidas

1. **Truncamiento del CSV en `0x6E6934`.**
   - Nuestro `recomp/functions/main.csv`: `FUN_006e6640` termina en `0x6E6930`.
   - El mapa legado (evidencia) lo extendía a `0x6E6940`; los 16 B que faltan
     contienen la entrada `0x6E6934`.
   - El runtime hace `lookup 0x6e6934=OK` (por un entrypoint promovido), pero al
     ejecutarlo no hay función exacta → falla el dispatch.
   - Fix: `FUN_006e6640` hasta `0x6E6934` + fila `FUN_6e6934` (`0x6E6934..0x6E6940`),
     recompilar y reconstruir.

2. **El override del CRT0 no se ejecuta.**
   - `game_overrides.cpp` registra `entryContinuation4c008c`, que limpia BSS, setea
     `gp=0x00A28070` y `sp=0x01FEE000`, y arma el heap.
   - En el log **no aparece** `CRT0 bootstrap continuation at 0x4c008c executing...`.
   - El `config-main.toml` parchea `0x4C008C` con `0x08130086` (`j 0x4C0218`), saltando
     el punto donde el override debe correr.
   - Consecuencia: `gp=0`, BSS sin limpiar y globals rotas → `pc=0`/`vram=0`.
   - A/B propuesto: quitar el patch de `0x4C008C`, recompilar y comparar el log
     (`gp=0xA28070`, aparición del mensaje del CRT0).

## Próximo paso

1. Corregir el CSV y recompilar `main`.
2. A/B del patch `0x4C008C` (con/sin).
3. Rebuild (los `.cpp` regenerados cambian timestamps: rebuild completo ~2 h).
4. Re-correr 60 s y comparar: `gp`, `pc`, `vramNonZero`, `[gs:present]`.

Si el GP queda bien, el siguiente hito es el menú (fase 2) y los overlays (fase 1).
