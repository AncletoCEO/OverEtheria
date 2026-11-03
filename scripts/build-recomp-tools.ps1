# Compila las herramientas del recompilador (ps2_recomp, ps2_analyzer) con el
# toolchain portable de tools/.
#
# Uso: pwsh -File scripts/build-recomp-tools.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:PATH = "$root\tools\w64devkit\bin;$root\tools\cmake\bin;$env:PATH"
$cmake = "$root\tools\cmake\bin\cmake.exe"
$make = "$root\tools\w64devkit\bin\make.exe"
$build = "$root\work\build-tools"

& $cmake -S "$root\tools\PS2Recomp" -B $build `
  -G "MinGW Makefiles" `
  -DCMAKE_BUILD_TYPE=Release `
  -DCMAKE_MAKE_PROGRAM="$($make -replace '\\', '/')" `
  -DPS2X_BUILD_RUNTIME=OFF `
  -DPS2X_BUILD_TEST=OFF `
  -DPS2X_BUILD_STUDIO=OFF

& $cmake --build $build --target ps2_recomp ps2_analyzer -j 4

Write-Output "OK:"
Write-Output "  $build\ps2xRecomp\ps2_recomp.exe"
Write-Output "  $build\ps2xAnalyzer\ps2_analyzer.exe"
