# Arregla iterativamente los MISSING del gate del CSV: divide la función contenedora
# en cada dirección referenciada que no tiene fila propia, hasta converger.
#
# Uso: pwsh -File scripts/fix-csv-gate.ps1 [-Csv work/ghidra/main.functions.csv]

param(
  [string]$Csv = 'work/ghidra/main.functions.csv',
  [string]$Elf = 'work/elf/SLES_537.68',
  [int]$MaxIterations = 30
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$python = "$root\tools\python\python.exe"
$validator = "$root\tools\legacy-recomp\game\validate_csv.py"

for ($i = 1; $i -le $MaxIterations; $i++) {
  $out = & $python $validator $Csv --elf $Elf 2>&1 | Out-String
  if ($out -match 'ERRORES \(bloquean build\):\s*0' -or $out -match '(?m)^OK:') {
    Write-Output "OK en iteracion $i"
    Write-Output ($out | Select-String 'filas=|OK:')
    exit 0
  }

  $addresses = @(
    [regex]::Matches($out, 'REFERENCIADO en 0x([0-9a-f]+)') |
      ForEach-Object { '0x' + $_.Groups[1].Value } |
      Select-Object -Unique
  )

  if ($addresses.Count -eq 0) {
    Write-Output $out
    throw "errores sin MISSING reparables en la iteracion $i"
  }

  Write-Output "iteracion $i : $($addresses.Count) split(s)"
  & node scripts/split-csv-at.mjs $Csv $addresses
}

throw "no convergio en $MaxIterations iteraciones"
