# recomp/

Build nativo de Sword of Etheria sobre PS2Recomp.

- `CMakeLists.txt` y `game_main.cpp` derivan del repo legado
  [`AncletoCEO/Sword-Of-Etheria-PC-Recomp`](https://github.com/AncletoCEO/Sword-Of-Etheria-PC-Recomp)
  (MIT), adaptados a este layout.
- Requiere el ISO del usuario, el fork PS2Recomp en `tools/PS2Recomp` y el toolchain
  portable de `tools/` (w64devkit + CMake + Python).
- Genera `work/generated/main`; los overlays se agregan en la fase 1.

```powershell
pwsh -File scripts/build-recomp-tools.ps1
# generar work/generated/main con ps2_recomp
cmake -S recomp -B work/build-game -G "MinGW Makefiles" `
  -DCMAKE_BUILD_TYPE=Release `
  -DCMAKE_MAKE_PROGRAM="C:/repos/etheria/tools/w64devkit/bin/make.exe"
cmake --build work/build-game --target sword_etheria -j4
```
