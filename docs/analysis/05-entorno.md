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

## Faltante

| Herramienta | Para qué |
|---|---|
| Python 3 | `build_release.py`, `split_monsters.py`, scripts de PCSX2 |
| CMake 3.20+ | compilar PS2Recomp y el juego |
| Compilador C++20 | MSVC o GCC |
| WSL2 | replicar el entorno Linux del intento previo (no instalado) |
| JDK 21 + Ghidra 12.x | decompilación |
| GitHub CLI | crear el repo definitivo (opcional) |

## Opciones de toolchain

| Opción | Pros | Contras |
|---|---|---|
| **A. WSL2 + Ubuntu** | replica el build del intento previo y del CI; `bsdtar`, `Unix Makefiles`, scripts POSIX, PINE por UNIX socket | instalar WSL2 (admin + reboot), ~10-20 GB, RAM dividida |
| **B. Windows nativo (MSVC)** | un solo entorno; el CI ya compila en Windows | `build_release.py`/`sync_work.py` son POSIX; PINE por TCP; diferencias de toolchain |
| **C. CI (GitHub Actions)** | no ensucia la máquina | el build del juego (18k archivos, link de ~1,5 GB) no entra cómodo en Actions |

Recomendación: **A** por fidelidad con el trabajo previo, o **B** si preferís no
instalar WSL. Decisión diferida (2026-11-03): primero repo y docs.

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

- [ ] Instalar el toolchain elegido.
- [ ] Extraer `SLES_537.68` y `OL.BIN` a `work/`.
- [ ] Compilar `ps2_recomp` + `ps2_analyzer` del fork pineado.
- [ ] Generar los 18k `.cpp` y correr `split_monsters.py`.
- [ ] Compilar el juego y correr 60 s.
- [ ] Registrar en `docs/` los tiempos, flags y problemas del entorno.
