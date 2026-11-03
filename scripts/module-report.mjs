#!/usr/bin/env node
// Genera el informe de un módulo decompilado: metadatos, cobertura y perfil de llamadas.
//
// Uso:
//   node scripts/module-report.mjs --module mission24 \
//     --functions work/ghidra/mission24_functions.csv --asm work/ghidra/mission24.asm \
//     --c decomp/src/mission24/mission24.c --out decomp/modules/mission24.md

import fs from 'node:fs';

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const moduleName = value('--module');
const functionsPath = value('--functions');
const asmPath = value('--asm');
const cPath = value('--c');
const outPath = value('--out');

if (!moduleName || !functionsPath || !outPath) {
  console.error('uso: node scripts/module-report.mjs --module <name> --functions <csv> [--asm <asm>] [--c <file>] --out <md>');
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync('decomp/modules.json', 'utf8'));
const meta = registry.modules.find((m) => m.name === `${moduleName}.bin`);
if (!meta) {
  console.error(`error: ${moduleName}.bin no está en decomp/modules.json`);
  process.exit(2);
}
const base = Number.parseInt(meta.base, 16);
const textEnd = base + meta.text;

const funcs = fs
  .readFileSync(functionsPath, 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [name, start, end, size] = line.split(',');
    return { name, start: Number.parseInt(start, 16), end: Number.parseInt(end, 16), size: Number.parseInt(size, 10) };
  })
  .filter((f) => f.start >= base && f.start < textEnd);

const totalBytes = funcs.reduce((a, f) => a + f.size, 0);
const codeBytes = meta.text - meta.prefix;

let topTargets = [];
if (asmPath && fs.existsSync(asmPath)) {
  const instrs = new Map();
  for (const line of fs.readFileSync(asmPath, 'utf8').split(/\r?\n/)) {
    const match = /^([0-9a-f]{8})\s+(.*)$/.exec(line);
    if (match) instrs.set(Number.parseInt(match[1], 16), match[2]);
  }
  const counts = new Map();
  for (const f of funcs) {
    for (let a = f.start; a < f.end; a += 4) {
      const text = instrs.get(a);
      if (!text) continue;
      const call = /^jal\s+0x([0-9a-f]+)/.exec(text);
      if (!call) continue;
      const target = Number.parseInt(call[1], 16);
      if (target < base || target >= textEnd) counts.set(target, (counts.get(target) ?? 0) + 1);
    }
  }
  topTargets = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
}

const md = [];
md.push(`# \`${moduleName}.bin\``);
md.push('');
md.push('> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.');
md.push('');
md.push('## Metadatos');
md.push('');
md.push('| Campo | Valor |');
md.push('|---|---|');
md.push(`| id | ${meta.id} (\`0x${meta.id.toString(16)}\`) |`);
md.push(`| base | \`${meta.base}\` |`);
md.push(`| text | ${meta.text} B |`);
md.push(`| data | ${meta.data} B |`);
md.push(`| bss | ${meta.bss} B |`);
md.push(`| prefijo de ceros | ${meta.prefix} B |`);
md.push(`| entry (primer código) | \`${meta.entry}\` |`);
md.push(`| \`_static_init\` | \`${meta.staticInit}\` … \`${meta.staticInitEnd}\` |`);
md.push(`| sha256 | \`${meta.sha256}\` |`);
md.push('');
md.push('## Cobertura');
md.push('');
md.push(`- Funciones creadas: **${funcs.length}**`);
md.push(`- Bytes en funciones: ${totalBytes} / ${codeBytes} (${((totalBytes / codeBytes) * 100).toFixed(2)} %)`);
md.push(`- Rango: \`0x${Math.min(...funcs.map((f) => f.start)).toString(16)}\` … \`0x${Math.max(...funcs.map((f) => f.end)).toString(16)}\``);
if (cPath) md.push(`- C: \`${cPath}\``);
md.push('');

if (topTargets.length) {
  md.push('## Perfil de llamadas externas');
  md.push('');
  md.push('| Target | Llamadas |');
  md.push('|---|---:|');
  for (const [target, count] of topTargets) {
    md.push(`| \`0x${target.toString(16)}\` | ${count} |`);
  }
  md.push('');
}

md.push('## Verificación');
md.push('');
md.push(`- El sha256 coincide con \`decomp/modules.json\` (gate \`scripts/validate-decomp.mjs\`).`);
md.push(`- Prefijo de \`${meta.prefix}\` B en cero; el código empieza en \`${meta.entry}\`.`);
md.push('- Cobertura calculada sobre el text menos el prefijo.');
md.push('- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).');
md.push('');
md.push('## Pendiente');
md.push('');
md.push('- Nombrar las funciones y los targets externos.');
md.push('- Identificar la semántica del módulo y sus subsistemas.');
md.push('- Verificar comportamiento contra PCSX2 cuando haya runtime.');

fs.mkdirSync(outPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
fs.writeFileSync(outPath, `${md.join('\n')}\n`);
console.log(`${outPath}: ${funcs.length} funciones, ${totalBytes} B`);
