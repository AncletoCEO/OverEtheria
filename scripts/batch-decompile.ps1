# Orquestador de decompilación por lote.
# Para cada módulo: descubre funciones, las decompila con Ghidra R5900, genera símbolos,
# reporte y gate, y commitea el módulo de forma atómica.
#
# Uso: pwsh -File scripts/batch-decompile.ps1 [-Force]

param([switch]$Force)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:JAVA_HOME = Join-Path $root 'tools\jdk'
$ghidra = Join-Path $root 'tools\ghidra\support\analyzeHeadless.bat'
$scriptPath = Join-Path $root 'scripts\ghidra'

$mods = (node -e "console.log(JSON.stringify(require('./decomp/modules.json').modules))" | ConvertFrom-Json)

$order = @(
  'mission01', 'mission02', 'mission07', 'mission10', 'mission19', 'mission11',
  'mission16', 'mission18', 'mission06', 'mission03', 'mission05', 'mission04',
  'mission25', 'mission08', 'mission15', 'mission21', 'mission17', 'mission09',
  'mission12', 'mission20', 'prg_player_0', 'menu'
)

foreach ($name in $order) {
  $cFile = "decomp/src/$name/$name.c"
  if ((Test-Path $cFile) -and -not $Force) {
    Write-Output "SKIP $name (ya existe $cFile)"
    continue
  }

  $meta = $mods | Where-Object { $_.name -eq "$name.bin" }
  if (-not $meta) { throw "sin metadatos para $name.bin" }
  $base = $meta.base
  $size = [int]$meta.text

  Write-Output "=== $name base=$base text=$size ==="

  node -e "const fs=require('fs');const b=fs.readFileSync('work/overlays/$name.bin');const t=b.readUInt32LE(0xc);fs.writeFileSync('work/overlays/$name.text.bin',b.subarray(0x40,0x40+t))"

  node scripts/discover-functions.mjs "work/overlays/$name.bin" --out "work/ghidra/$name.starts.csv" | Out-Null

  New-Item -ItemType Directory -Force "decomp/src/$name" | Out-Null

  & $ghidra work/ghidra SoE `
    -import "work/overlays/$name.text.bin" -overwrite `
    -loader BinaryLoader -loader-baseAddr $base `
    -processor "r5900:LE:32:default" `
    -scriptPath $scriptPath `
    -preScript PrepareRawModule.java `
    -postScript DecompileModule.java `
      "C:\repos\etheria\work\ghidra\$name.starts.csv" `
      "C:\repos\etheria\decomp\src\$name\$name.c" `
      "C:\repos\etheria\work\ghidra\${name}_functions.csv" `
      "C:\repos\etheria\work\ghidra\$name.asm" `
    -max-cpu 4 *> "work/ghidra/import-$name.log"

  if (-not (Select-String -Path "work/ghidra/import-$name.log" -Pattern 'Import succeeded' -Quiet)) {
    throw "Ghidra falló en $name (ver work/ghidra/import-$name.log)"
  }
  if (-not (Select-String -Path "work/ghidra/import-$name.log" -Pattern 'DecompileModule:' -Quiet)) {
    throw "DecompileModule no terminó en $name (ver work/ghidra/import-$name.log)"
  }

  $functionsCsv = "work/ghidra/${name}_functions.csv"
  if (-not (Test-Path $functionsCsv)) { throw "sin functions.csv en $name" }
  $count = (Get-Content $functionsCsv | Measure-Object -Line).Lines - 1
  if ($count -le 0) { throw "0 funciones creadas en $name" }

  node scripts/ghidra-to-symbols.mjs --csv $functionsCsv --module $name --base $base --size $size --out "decomp/symbols/$name.csv"
  node scripts/module-report.mjs --module $name --functions $functionsCsv --asm "work/ghidra/$name.asm" --c $cFile --out "decomp/modules/$name.md"

  node scripts/validate-decomp.mjs | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "gate de decomp falló en $name" }

  git add "decomp/src/$name" "decomp/symbols/$name.csv" "decomp/modules/$name.md"
  git commit -m "feat(decomp): $name ($count funciones)" -m "Decompilacion anotada de $name.bin ($size B de text), $count funciones, simbolos y reporte de cobertura."

  Write-Output "=== $name OK ($count funciones) ==="
}

Write-Output "LOTE COMPLETO"
