#!/usr/bin/env node
// Triage de un módulo: agrupa funciones por su perfil de llamadas externas.
//
// Uso:
//   node scripts/triage-module.mjs --functions work/ghidra/menu_functions.csv \
//     --asm work/ghidra/menu.asm --base 0x100000 --size 368960 \
//     --out decomp/modules/menu-triage.md
//
// Opcional: --cluster 0x005319c0 --starts-out work/ghidra/menu_c1.starts.csv
// escribe el subconjunto de funciones que llaman a ese target.

import fs from 'node:fs';

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const functionsPath = value('--functions');
const asmPath = value('--asm');
const base = Number.parseInt(value('--base') ?? '', 16);
const size = Number.parseInt(value('--size') ?? '', 10);
const outPath = value('--out');
const clusterTarget = value('--cluster');
const startsOut = value('--starts-out');

if (!functionsPath || !asmPath || !Number.isInteger(base) || !Number.isInteger(size)) {
  console.error('uso: node scripts/triage-module.mjs --functions <csv> --asm <asm> --base 0x... --size N [--out md] [--cluster 0x... --starts-out csv]');
  process.exit(1);
}

const end = base + size;

const funcs = fs
  .readFileSync(functionsPath, 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [name, start, funcEnd, funcSize] = line.split(',');
    return {
      name,
      start: Number.parseInt(start, 16),
      end: Number.parseInt(funcEnd, 16),
      size: Number.parseInt(funcSize, 10),
    };
  })
  .filter((f) => f.start >= base && f.start < end);

const instrs = new Map();
for (const line of fs.readFileSync(asmPath, 'utf8').split(/\r?\n/)) {
  const match = /^([0-9a-f]{8})\s+(.*)$/.exec(line);
  if (match) instrs.set(Number.parseInt(match[1], 16), match[2]);
}

for (const f of funcs) {
  const targets = new Map();
  for (let a = f.start; a < f.end; a += 4) {
    const text = instrs.get(a);
    if (!text) continue;
    const call = /^jal\s+0x([0-9a-f]+)/.exec(text);
    if (!call) continue;
    const target = Number.parseInt(call[1], 16);
    if (target < base || target >= end) targets.set(target, (targets.get(target) ?? 0) + 1);
  }
  f.targets = targets;
  f.primary = [...targets.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
}

const clusters = new Map();
for (const f of funcs) {
  const key = f.primary === null ? 'sin-llamadas' : `0x${f.primary.toString(16)}`;
  const c = clusters.get(key) ?? { key, functions: [], bytes: 0 };
  c.functions.push(f);
  c.bytes += f.size;
  clusters.set(key, c);
}

const sorted = [...clusters.values()].sort((a, b) => b.functions.length - a.functions.length);

const md = [];
md.push(`# Triage de módulo (\`0x${base.toString(16)}\`–\`0x${end.toString(16)}\`)`);
md.push('');
md.push(`- Funciones: **${funcs.length}**`);
md.push(`- Bytes: ${funcs.reduce((a, f) => a + f.size, 0)}`);
md.push(`- Targets externos distintos: ${new Set(funcs.flatMap((f) => [...f.targets.keys()])).size}`);
md.push('');
md.push('## Clusters por target primario');
md.push('');
md.push('| Cluster | Funciones | Bytes | Ejemplos |');
md.push('|---|---:|---:|---|');
for (const c of sorted) {
  const examples = c.functions.slice(0, 3).map((f) => f.name).join(', ');
  md.push(`| \`${c.key}\` | ${c.functions.length} | ${c.bytes} | ${examples} |`);
}

if (clusterTarget) {
  const target = Number.parseInt(clusterTarget, 16);
  const subset = funcs.filter((f) => f.targets.has(target));
  md.push('');
  md.push(`## Subconjunto \`${clusterTarget}\``);
  md.push('');
  md.push(`- Funciones que llaman a \`${clusterTarget}\`: **${subset.length}**`);
  md.push(`- Bytes: ${subset.reduce((a, f) => a + f.size, 0)}`);
  for (const f of subset.slice(0, 40)) {
    md.push(`- \`${f.name}\` (${f.size} B)`);
  }
  if (subset.length > 40) md.push(`- … y ${subset.length - 40} más`);

  if (startsOut) {
    const csv = ['Name,Start,End,Size'];
    for (const f of subset) {
      csv.push(`${f.name},0x${f.start.toString(16)},0x${f.end.toString(16)},${f.size}`);
    }
    fs.mkdirSync(startsOut.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    fs.writeFileSync(startsOut, `${csv.join('\n')}\n`);
    md.push('');
    md.push(`Subconjunto escrito en \`${startsOut}\`.`);
  }
}

const output = `${md.join('\n')}\n`;
if (outPath) {
  fs.mkdirSync(outPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  fs.writeFileSync(outPath, output);
  console.log(`triage escrito en ${outPath}`);
}
console.log(output);
