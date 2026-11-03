# 05 — Entorno de build

## La máquina

| Dato | Valor |
|---|---|
| CPU | Intel Core i5-8350U (4 núcleos / 8 hilos, 1,7 GHz base) |
| RAM | 15,8 GB |
| Disco C: | 138,8 GB libres |
| SO | Windows (win32) |

## Instalado

| Herramienta | Estado |
|---|---|
| Git | 2.56.0 ✔ |
| Node.js | 26.13.0 ✔ |
| bsdtar (`tar.exe`) | ✔ (libarchive; lee ISO9660) |
| 7-Zip | ✔ en `C:\Program Files\7-Zip\7z.exe` (no está en `PATH`) |
| PowerShell | ✔ |
| **JDK** | Temurin **21.0.13+9** en `tools/jdk` ✔ |
| **Ghidra** | **12.1.4** en `tools/ghidra` ✔ |
| **Procesador R5900** | extensión *ghidra-emotionengine-reloaded* **v2.1.39** en `tools/ghidra/Ghidra/Processors/R5900` ✔ |
| **Ensamblador MIPS** | Zig **0.15.1** (`zig cc -target mipsel-freestanding`) en `tools/zig` ✔ |
| **C++20 / MinGW** | w64devkit **GCC 16.2.0** + GNU Make 4.4.1 en `tools/w64devkit` ✔ |
| **CMake** | **4.4.5** en `tools/cmake` ✔ |
| **Python** | **3.12.10** (embebido) en `tools/python` ✔ |

## Toolchain de decompilación (instalado 2026-11-03)

Todo vive en `tools/` (ignorado por git); los pins están en `tools.lock.toml`.

```powershell
$env:JAVA_HOME = "C:\repos\etheria\tools\jdk"
& tools\ghidra\support\analyzeHeadless.bat        # ayuda / versión

& tools\zig\zig.exe cc -target mipsel-freestanding -c entrada.s -o salida.o
& tools\zig\zig.exe objcopy -O binary salida.o salida.bin
```

- **Ghidra 12.1.4** (no 12.2): 12.2 exige JDK 25; 12.1.4 es la versión del intento
  previo y la verificada por REA, y corre con JDK 21.
- **R5900**: el lenguaje `r5900:LE:32:default` viene de la extensión
  *ghidra-emotionengine-reloaded* v2.1.39 (MMI, `sd`/`ld`/`sq`, VU0 macro). Se instaló
  como módulo de procesador (`Ghidra/Processors/R5900`), se completó su
  `Module.manifest` (el zip lo trae vacío) y se compiló `r5900.sla` con
  `support/sleigh.bat`. Sin esto, Ghidra decodifica mal los prólogos y la cobertura
  cae de 61,7 % a 14,5 %.
- **Zig** se usa como ensamblador MIPS (clang/LLVM embebido): portable, sin admin y
  verificado con `addiu`/`jr`/`nop` (`01 00 02 24 08 00 E0 03 00 00 00 00`).

## Toolchain de recompilación (portable, 2026-11-03)

Elegido **sin admin**: la shell no está elevada y WSL2/MSVC requieren UAC (y WSL2,
reboot). Todo vive en `tools/` y los pins en `tools.lock.toml`.

| Herramienta | Ruta | Versión |
|---|---|---|
| C/C++ | `tools/w64devkit/bin/g++.exe` | GCC 16.2.0 |
| Make | `tools/w64devkit/bin/make.exe` | GNU Make 4.4.1 |
| CMake | `tools/cmake/bin/cmake.exe` | 4.4.5 |
| Python | `tools/python/python.exe` | 3.12.10 (embebido) |

```powershell
& tools\w64devkit\bin\g++.exe --version
& tools\cmake\bin\cmake.exe --version
& tools\python\python.exe --version

# CMake con Make de MinGW
& tools\cmake\bin\cmake.exe -S <src> -B <build> -G "MinGW Makefiles" `
  -DCMAKE_MAKE_PROGRAM="C:/repos/etheria/tools/w64devkit/bin/make.exe" `
  -DCMAKE_C_COMPILER="C:/repos/etheria/tools/w64devkit/bin/gcc.exe" `
  -DCMAKE_CXX_COMPILER="C:/repos/etheria/tools/w64devkit/bin/g++.exe"
```

- **No es el path documentado** (MSVC en Windows, GCC en Linux): puede requerir ajustes
  de CMake, flags o FFmpeg. Si aparece fricción, WSL2/MSVC quedan como alternativa.
- w64devkit incluye `busybox`, `sh`, `make`, `objcopy`, `windres`; alcanza para los
  scripts POSIX sin MSYS2.
- El Python embebido no trae `pip`; `build_release.py` solo usa la stdlib.

## Faltante

| Herramienta | Para qué |
|---|---|
| WSL2 | replicar el entorno Linux del intento previo (no instalado) |
| GitHub CLI | crear el repo definitivo (opcional) |

## Opciones de toolchain

| Opción | Pros | Contras |
|---|---|---|
| **A. WSL2 + Ubuntu** | replica el build del intento previo y del CI; `bsdtar`, `Unix Makefiles`, scripts POSIX, PINE por UNIX socket | instalar WSL2 (admin + reboot), ~10-20 GB, RAM dividida |
| **B. Windows nativo (MSVC)** | un solo entorno; el CI ya compila en Windows | `build_release.py`/`sync_work.py` son POSIX; PINE por TCP; diferencias de toolchain |
| **C. CI (GitHub Actions)** | no ensucia la máquina | el build del juego (18k archivos, link de ~1,5 GB) no entra cómodo en Actions |
| **D. Portable (w64devkit)** | sin admin; GCC/GNU Make/busybox + CMake/Python en `tools/` | no es el path documentado; puede requerir ajustes de CMake/FFmpeg |

Recomendación original: **A** por fidelidad, o **B** si no querés WSL. **Elegido
(2026-11-03): D**, porque la shell no está elevada; A/B quedan como fallback si
aparece fricción.

## Estimaciones del build

Datos del intento previo:

- `ps2_recomp` genera **~18.000 `.cpp`** (18.311 contados en su momento).
- El binario final pesa **~382 MB**; el link intermedio, ~1,5 GB.
- `work/` completo: **~13 GB**.
- Build con **`-j4`**; más paralelismo provoca OOM (`cc1plus`).
- Ninja se traba con 18k archivos → **Unix Makefiles**.
- Primera compilación: **horas** (estimado 6-12 h en este CPU; overnight).

Disco: entra holgado en los 138 GB libres.

## Notas de portabilidad

- `build_release.py` asume `bsdtar`/`7z`, `Unix Makefiles` y paths POSIX.
- `game/sync_work.py` usa symlinks: no funciona igual en Windows nativo.
- Los scripts de PCSX2 (`pcsx2_state.py`, `pine_state_gpr.py`) usan el socket UNIX
  de PINE en Linux; en Windows PINE es **TCP** (puerto por defecto 28011).
- Los savestates `.p2s` son ZIP con **zstd**: se abren con `bsdtar`, no con `unzip`.

## Checklist de la fase 1

- [x] Instalar el toolchain elegido (portable: w64devkit + CMake + Python).
- [ ] Extraer `SLES_537.68` y `OL.BIN` a `work/`.
- [ ] Compilar `ps2_recomp` + `ps2_analyzer` del fork pineado.
- [ ] Generar los 18k `.cpp` y correr `split_monsters.py`.
- [ ] Compilar el juego y correr 60 s.
- [ ] Registrar en `docs/` los tiempos, flags y problemas del entorno.
