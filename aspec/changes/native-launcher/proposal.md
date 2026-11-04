# Proposal: Launcher y primera experiencia de uso

## Problem

Hoy el juego nativo se arranca a mano: hay que compilar el runtime, construir el juego
desde el ISO, pasar `--memcard`, `--quick-dir`, `--pal/--ntsc`, exportar `PS2_SCALE` y
editar `keys.ini` en una carpeta que el usuario no conoce. Nada de eso es aceptable
para una primera versión que otra persona pueda usar, y no hay forma de verificar en
CI que el ejecutable que se distribuye arranca.

Además faltan dos comprobaciones de comportamiento que el usuario pidió: **60 Hz**
(NTSC) y **los cinco idiomas** del juego.

## Proposed change

Un **launcher de escritorio** (`launcher/`, C++20 + SDL2 + Dear ImGui) que:

1. En el primer arranque pide el **ISO**, lo valida (ISO 9660 + `SYSTEM.CNF` con
   `SLES_537.68`) y **prepara el juego** con `scripts/prepare-game.ps1|sh` (parche del
   runtime, `setup.sh`, `port.sh`), mostrando el registro.
2. Expone **video** (resolución interna 1×/2×/3×, pantalla completa, 16:9, PAL 50 Hz o
   NTSC 60 Hz), **controles** (tabla de 26 acciones con captura de tecla, escrita en
   `keys.ini`) y **guardado** (ruta de la memory card, abrir carpeta, restablecer).
3. Lanza `ps2run` con los argumentos y el entorno correctos y permite detenerlo.
4. Guarda todo en una carpeta de datos portable junto al ejecutable (o en
   `%APPDATA%`/`~/.local/share` si no se puede escribir).

Y **CI** (GitHub Actions) que compila la variante de consola del launcher en Windows y
Linux, corre pruebas de humo (`--version`, `--data-dir`) y falla si se versiona
contenido del juego.

## Scope

**In of scope**

- Launcher, configuración y lanzamiento del juego.
- Scripts de preparación multiplataforma y su registro.
- CI de build + guardas de contenido.
- Verificación documentada de 60 Hz y de los cinco idiomas.

**Out of scope**

- Distribuir ISO, BIOS o binarios compilados del juego.
- Un file browser propio para Linux (se usa `zenity` si está).
- Empaquetado/instalador por plataforma.
- Cambios al runtime de `ps2-native-recomp` (viven en `patches/`).

## Risks

- **Preparar el juego requiere toolchain**: el launcher no puede compilar por sí solo.
  *Mitigación*: detecta si `ps2run.exe` ya existe y muestra el registro del script.
- **El guardado depende del tutorial**: el juego no permite guardar hasta terminarlo.
  *Mitigación*: se valida que la tarjeta se detecta y que `Load Game` aparece; el
  guardado real queda como gate manual posterior.
- **CI sin ISO**: no se puede construir el juego en CI.
  *Mitigación*: CI compila el launcher y valida que no haya contenido del juego; el
  build del juego se prueba localmente con el ISO del usuario.

## Decisions

### launcher-owns-first-run

- **memory_key**: `launcher-owns-first-run`
- **Elección**: el launcher pide el ISO, lo valida y orquesta la preparación; no hay
  pasos manuales de build para el usuario final.
- **Descartado**: documentar comandos y dejar que el usuario los ejecute.
- **Justificación**: es la diferencia entre un repo de investigación y algo que otra
  persona puede usar; además permite que CI valide el ejecutable distribuido.
- **Refs**: `launcher/README.md`, `scripts/prepare-game.ps1`.
- **Estado**: aceptada (2026-11-03).

### settings-in-launcher

- **memory_key**: `settings-in-launcher`
- **Elección**: resolución, pantalla completa, formato de video y controles se editan
  en el launcher y se traducen a `PS2_SCALE`, argumentos de `ps2run` y `keys.ini`.
- **Descartado**: inventar un formato propio que el runtime ignore.
- **Justificación**: el runtime ya tiene esas opciones y su propio quick menu (F1); el
  launcher escribe exactamente lo que el runtime lee.
- **Refs**: `docs/analysis/07-runtime-nativo.md`, `launcher/src/config.cpp`.
- **Estado**: aceptada (2026-11-03).
