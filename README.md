# OverEtheria

Recompilación nativa para PC de **Sword of Etheria** (*The Sword of Etheria*, PS2 PAL,
`SLES_537.68`), sobre
[`ps2-native-recomp`](https://github.com/exoteric33/ps2-native-recomp). El objetivo es
un runtime nativo portable, sin emulador, que después se pueda llevar a otras consolas.

> **Este repositorio no contiene contenido del juego.** No se distribuyen ISO, BIOS,
> ELF, `.BIN`, `.PSS`, IRX, texturas, C++ generado ni C decompilado. Necesitás tu propia
> copia del juego. El C decompilado es obra derivada y queda sólo en local.

## Estado

**El juego arranca y corre en nativo.** El menú de video, el diálogo de memory card, el
menú principal y la cutscene inicial se ven y responden a input. Todavía no es jugable
de punta a punta: falta explorar las 25 misiones y pulir el runtime.

| Área | Estado |
|---|---|
| Verificación del ISO y extracción del disco | ✅ `scripts/inspect-disc.mjs` |
| Decompilación anotada (metadatos) | ✅ 25 overlays, 4.925 funciones, 98,81 % de cobertura |
| Toolchain portable (`clang 23`, Ninja, CMake, Python) | ✅ en `tools/`, sin admin |
| Recompilador + runtime (`eerecomp`/`vurecomp`) | ✅ `ps2-native-recomp` |
| Generación de C++ del juego | ✅ 337 unidades, ~100 k instrucciones |
| Overlays cargados en runtime (`MWo3`) | ✅ ventana `0x100000` + imagen del menú |
| Menú de selección de video | ✅ ~50 fps |
| Diálogo de memory card | ✅ texto del juego, opciones Yes/No |
| Menú principal | ✅ `Story Mode / Start New` |
| Cutscene inicial | ✅ escena 3D, retrato y diálogo, ~33 fps |
| Gameplay (inicio de misión) | ✅ combate 3D con tutorial `Tap ⬜ for combo attack`, ~48 fps |
| Misión completa | ⏳ pendiente (input, cámara y fin de misión) |
| Port a otras consolas | ⏳ pendiente (backends del runtime) |

Medición completa y parches: [`docs/analysis/07-runtime-nativo.md`](docs/analysis/07-runtime-nativo.md).

## Cómo se construye

### Requisitos

- Windows o Linux, Git, 7-Zip o `bsdtar`.
- Tu copia PAL del juego (`SLES_537.68`, MD5 `b9c5115b77b7f05fbf14a67df8d3f99d`).
- El toolchain portable en `tools/` (ignorado): llvm-mingw UCRT, Ninja, CMake, Python.

### Pasos

```bash
# 1. verificar el disco
node scripts/inspect-disc.mjs "Sword of Etheria.iso" --md5

# 2. clonar la herramienta y aplicar los parches propios
git clone https://github.com/exoteric33/ps2-native-recomp tools/ps2-native-recomp
git -C tools/ps2-native-recomp apply ../../patches/ps2-native-recomp-sword.patch

# 3. compilar herramienta y runtime
cd tools/ps2-native-recomp
bash scripts/setup.sh --native-only

# 4. construir el juego desde el ISO
bash scripts/port.sh sword isos/sword.iso --native-only

# 5. jugar
build/native-sword/ps2run games/sword/disc/SLES_537.68 \
  --disc games/sword/disc.iso --window
```

`games/sword/` (ELF, `disc.iso`, overlays, entradas) y `build/` son locales e ignorados.

## Cómo está armado

```
decomp/     mapa de módulos, símbolos, ABI y reportes (el C decompilado es local)
recomp/     baseline de PS2Recomp (histórico) y mapas de funciones
docs/       análisis, formatos, roadmap y runtime nativo
scripts/    inspección del disco, entradas de overlays, captura de ventana
patches/    parches propios sobre ps2-native-recomp
aspec/      artefactos de cambios spec-driven
work/       artefactos locales (ignorado)
tools/      herramientas externas (ignorado)
```

## Roadmap

1. **Primera misión**: repetir el método de ventana + entradas en el overlay de misión.
2. **Resto de overlays**: 25 módulos `MWo`; registrar cada uno al cargarse.
3. **Persistencia y savestates**: no repetir el arranque en cada corrida.
4. **Upstream**: reportar los parches (ventana sin `PT_LOAD`, cabecera `MWo3`,
   prólogos como semillas) a `ps2-native-recomp`.
5. **Backends portables**: aislar render/audio/input/FS/tiempo y habilitar consolas.
6. **Release**: tags reproducibles, validación de ISO y cero assets.

El desarrollo ocurre en `visual/advance-display-and-main-loop`.

## Legal

- Nuestro código es **MIT** (ver [`LICENSE`](LICENSE)). `ps2-native-recomp` es **MIT**;
  sus componentes de terceros conservan su licencia.
- El repositorio no distribuye contenido del juego. Necesitás el juego y su BIOS.
- La decompilación anotada (símbolos, direcciones, reportes) es metadato; el C
  decompilado y el C++ generado son obra derivada y **no se publican**.
- No abras issues con links a ISO/BIOS, hashes de assets ni archivos con copyright.

## Créditos

- [`exoteric33/ps2-native-recomp`](https://github.com/exoteric33/ps2-native-recomp)
  (recompilador y runtime).
- La decompilación anotada previa de este repo (símbolos, ABI de overlays, mapa de
  módulos) como insumo de diagnóstico.
- Ghidra y
  [ghidra-emotionengine-reloaded](https://github.com/chaoticgd/ghidra-emotionengine-reloaded)
  (soporte R5900).
- [REA](https://github.com/morluto/rea) como referencia de tooling.
- PCSX2 como referencia de comparación (no se copia código).
- llvm-mingw, Ninja, CMake y Python (toolchain portable).

## Historial

El intento previo con PS2Recomp está documentado en
[`docs/analysis/03-intento-anterior.md`](docs/analysis/03-intento-anterior.md) y
[`recomp/baseline.md`](recomp/baseline.md). Se abandonó tras un mes sin imagen: PS2Recomp
no soporta los overlays que son el 29 % del código.
