#!/usr/bin/env node
// Resumen global de la decompilación: por módulo, funciones, bytes y cobertura.
//
// Uso: node scripts/summarize-decomp.mjs [--out decomp/analysis/decompilation-summary.md]

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : 'decomp/analysis/decompilation-summary.md';

const registry = JSON.parse(fs.readFileSync('decomp/modules.json', 'utf8'));

const rows = registry.modules.map((m) => {
  const name = m.name.replace(/\.bin$/, '');
  const symPath = path.join('decomp', 'symbols', `${name}.csv`);
  const cPath = path.join('decomp', 'src', name, `${name}.c`);
  let functions = 0;
  let bytes = 0;

  if (fs.existsSync(symPath)) {
    const lines = fs.readFileSync(symPath, 'utf8').trim().split(/\r?\n/);
    for (const line of lines.slice(1)) {
      const cols = line.split(',');
      functions++;
      bytes += Number.parseInt(cols[2], 10) || 0;
    }
  }

  const code = m.text - m.prefix;
  const cSize = fs.existsSync(cPath) ? fs.statSync(cPath).size : 0;
  return {
    name,
    base: m.base,
    code,
    functions,
    bytes,
    pct: code > 0 ? (bytes / code) * 100 : 0,
    cKB: cSize / 1024,
    empty: m.text === m.prefix,
  };
});

const totalFunctions = rows.reduce((a, r) => a + r.functions, 0);
const totalBytes = rows.reduce((a, r) => a + r.bytes, 0);
const totalCode = rows.reduce((a, r) => a + r.code, 0);
const withC = rows.filter((r) => r.cKB > 0).length;

const md = [];
md.push('# Resumen de la decompilación');
md.push('');
md.push(`- Módulos con C: **${withC}/${rows.length}** (mission98 es un stub vacío)`);
md.push(`- Funciones: **${totalFunctions}**`);
md.push(`- Bytes de código cubiertos: ${totalBytes} / ${totalCode} (${((totalBytes / totalCode) * 100).toFixed(2)} %)`);
md.push('- Tipo: **decompilación anotada** (pseudocódigo de Ghidra); no es matching decomp.');
md.push('');
md.push('| Módulo | Base | Código | Funciones | Bytes | Cobertura | C |');
md.push('|---|---:|---:|---:|---:|---:|---:|');
for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  const coverage = r.empty ? '—' : `${r.pct.toFixed(1)} %`;
  const functions = r.empty ? '—' : r.functions;
  md.push(
    `| \`${r.name}\` | \`${r.base}\` | ${r.code} | ${functions} | ${r.empty ? '—' : r.bytes} | ${coverage} | ${r.cKB ? `${r.cKB.toFixed(0)} KB` : '—'} |`,
  );
}
md.push('');
md.push('## Verificación');
md.push('');
md.push('- `node scripts/validate-decomp.mjs` en verde.');
md.push('- Cada módulo tiene su reporte en `decomp/modules/<name>.md`.');
md.push('- `mission98.bin` son 192 B de ceros: no se decompila.');
md.push('- Byte-match: deuda declarada; requiere MWCCPS2 2.4.x.');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${md.join('\n')}\n`);
console.log(`${outPath}: ${totalFunctions} funciones, ${totalBytes} B`);
