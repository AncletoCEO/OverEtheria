# OverEtheria

Native PC recompilation of **Sword of Etheria** (*The Sword of Etheria*, PS2 PAL,
`SLES_537.68`), built on [PS2Recomp](https://github.com/ran-j/PS2Recomp). The goal is a
portable native runtime that can be ported to other platforms without an emulator.

> **This repository contains no game content.** No ISO, BIOS, ELF, `.BIN`, `.PSS`, IRX,
> textures, or decompiled game code is distributed. You must own the game and provide
> your own disc image. The decompiled C is derivative work and stays local.

## Status

**Work in progress — not playable yet.** The static recompilation builds and the game's
C++ is generated, but overlay support and the menu fix are still pending.

| Area | Status |
|---|---|
| ISO verification and disc extraction | ✅ `scripts/inspect-disc.mjs` |
| Annotated decompilation (metadata) | ✅ 25 overlays, 4,925 functions, 98.81 % coverage |
| Recompiler/runtime toolchain | ✅ portable MinGW, `ps2_recomp` + `ps2_analyzer` build |
| C++ generation (`main` + overlays) | ✅ 8,828 files for `main`, 24 overlays |
| CSV gate (`validate_csv.py`) | ✅ 24/24 modules, 0 SHADOW / 0 MIDFUNC |
| First native binary | 🚧 build in progress |
| Overlay loader + overlay bank | ⬜ pending |
| Menu visible | ⬜ pending (startup texture atlas/CLUT) |
| First playable mission | ⬜ pending |
| Portable backends (render/audio/input/FS) | ⬜ pending |
| Console targets | ⬜ pending |

## What works

- Deterministic extraction of the 25 `MWo` overlays from `OL.BIN`.
- Annotated decompilation metadata: module map, symbols, ABI, per-module reports.
- Portable build of the recompiler tools with **w64devkit GCC 16.2 + CMake 4.4.5**,
  no admin required.
- Function maps for `main` and every overlay, validated before recompiling.
- Synthetic ELF wrapper so each overlay can be recompiled at its load address
  (`0x100000` / `0x154000`).

## Known issues / pending

- **Overlays are 29 % of the code** (2.35 MB of text) and PS2Recomp has no overlay
  support yet. The runtime needs a loader (`SIMB`/`MWo`), an overlay bank and dispatch.
- **The menu is black**: the single startup texture-upload pass sees one asset instead
  of six and never uploads the PSMT8 atlas/CLUT.
- **No platform backend yet**: the core still emulates PS2 hardware (GS/VU1/DMA/IOP).
- **No byte-match decompilation**: it requires MWCCPS2 2.4.x (proprietary); the
  decompilation is annotated, not matching.

## Building

### Requirements

- Windows or Linux, Git, 7-Zip or `bsdtar`.
- Your own PAL copy of the game (`SLES_537.68`, MD5
  `b9c5115b77b7f05fbf14a67df8d3f99d`).
- The portable toolchain in `tools/` (ignored): w64devkit, CMake, Python, Zig, Ghidra.

### Quick start

```powershell
# 1. verify the disc
node scripts/inspect-disc.mjs "Sword of Etheria.iso" --md5

# 2. build the recompiler tools
pwsh -File scripts/build-recomp-tools.ps1

# 3. generate the C++ (main + overlays)
& work\build-tools\ps2xRecomp\ps2_recomp.exe work\config-main.toml
pwsh -File scripts/recompile-overlays.ps1

# 4. build the game
cmake -S recomp -B work/build-game -G "MinGW Makefiles" `
  -DCMAKE_BUILD_TYPE=Release `
  -DCMAKE_MAKE_PROGRAM="C:/repos/etheria/tools/w64devkit/bin/make.exe"
cmake --build work/build-game --target sword_etheria -j4
```

The full build is long (thousands of generated translation units). See
[`docs/analysis/05-entorno.md`](docs/analysis/05-entorno.md) for the toolchain details
and [`docs/roadmap.md`](docs/roadmap.md) for the milestones.

## Repository layout

```
decomp/     module map, symbols, ABI and reports (decompiled C is local-only)
recomp/     CMake, game_main.cpp and per-module function maps
docs/       analysis, formats and roadmap
scripts/    disc inspector, extractor, Ghidra/decomp/recomp tooling
aspec/      spec-driven change artifacts
work/       build artifacts (ignored)
tools/      external tools (ignored)
```

## Roadmap

1. **Build**: produce the first native binary and capture the baseline logs.
2. **Overlays**: `SIMB`/`MWo` loader, overlay bank, `main ↔ overlay` dispatch.
3. **Menu**: close the texture-atlas/loader gap and present a real menu frame.
4. **First mission**: input, camera and timing.
5. **Portable backends**: isolate render/audio/input/FS/time for Windows/Linux and
   then console targets.
6. **Release**: reproducible tags, ISO validation and no game assets.

Main development happens on the `visual/advance-display-and-main-loop` branch, the
continuation of the earlier recompilation attempt.

## Legal

- Our code is **MIT** (see [`LICENSE`](LICENSE)). The PS2Recomp fork used as the
  runtime is **GPLv3**; binaries linking it are covered by that license.
- The repository does not distribute game content. You must own the game and its BIOS.
- The annotated decompilation (symbols, addresses, reports) is metadata; the generated
  decompiled C is derivative work and is **not** published.
- Do not open issues with ISO/BIOS links, hashes of assets, or copyrighted files.

## Credits

- [PS2Recomp](https://github.com/ran-j/PS2Recomp) and the
  [AncletoCEO fork](https://github.com/AncletoCEO/Ps2Recomp-of-etheria) (runtime).
- Ghidra and
  [ghidra-emotionengine-reloaded](https://github.com/chaoticgd/ghidra-emotionengine-reloaded)
  (R5900 support).
- [REA](https://github.com/morluto/rea) (reverse-engineering tooling reference).
- PCSX2 (reference emulator for savestates and A/B; no code copied).
- w64devkit, Zig, CMake and Python (portable toolchain).
