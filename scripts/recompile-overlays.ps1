# Recompila cada overlay con su base: wrapper ELF -> ps2_recomp -> splitter.
# Genera work/generated/<module>/ y copia el CSV de funciones a recomp/functions/.
#
# Uso: pwsh -File scripts/recompile-overlays.ps1 [-Modules mission01,mission02] [-Force]

param(
  [string[]]$Modules,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$recomp = "$root\work\build-tools\ps2xRecomp\ps2_recomp.exe"
$python = "$root\tools\python\python.exe"

if (-not $Modules) {
  $mods = (node -e "console.log(JSON.stringify(require('./decomp/modules.json').modules))" | ConvertFrom-Json)
  $Modules = $mods |
    Where-Object { $_.name -ne 'mission98.bin' } |
    ForEach-Object { $_.name -replace '\.bin$', '' }
}

New-Item -ItemType Directory -Force "$root\recomp\functions" | Out-Null

foreach ($m in $Modules) {
  $outDir = "$root\work\generated\$m"
  if ((Test-Path $outDir) -and -not $Force) {
    Write-Output "SKIP $m (ya generado)"
    continue
  }

  Write-Output "=== $m ==="
  node scripts/wrap-overlay-elf.mjs --module $m

  $toml = @"
[general]
input = "C:/repos/etheria/work/elf-overlays/$m.elf"
output = "C:/repos/etheria/work/generated/$m"
ghidra_output = "C:/repos/etheria/work/ghidra/${m}_functions.csv"
single_file_output = false
patch_syscalls = false
patch_cop0 = true
patch_cache = true
stubs = []
untracked_stubs = []
skip = []
"@
  Set-Content -Path "work/config-$m.toml" -Value $toml -Encoding utf8

  & $recomp "work/config-$m.toml" *> "work/recomp-$m.log"
  if (-not (Select-String -Path "work/recomp-$m.log" -Pattern 'Recompilation completed successfully' -Quiet)) {
    throw "recomp falló en $m (ver work/recomp-$m.log)"
  }

  & $python tools/legacy-recomp/game/split_monsters.py $outDir | Out-Null
  Copy-Item "work/ghidra/${m}_functions.csv" "recomp/functions/$m.csv" -Force

  $count = (Get-ChildItem $outDir -Filter *.cpp | Measure-Object).Count
  Write-Output "OK $m ($count .cpp)"
}
