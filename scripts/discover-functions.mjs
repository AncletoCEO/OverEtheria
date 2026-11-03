#!/usr/bin/env node
// Descubre entradas de función en el text de un overlay MWo.
//
// Heurística explícita (no usa el CSV del recomp):
//   - salta el prefijo de ceros (0x40 B) que reserva el loader;
//   - agrega el primer byte de código;
//   - agrega targets directos de JAL/J dentro del módulo;
//   - agrega prólogos `addiu sp,sp,-N`;
//   - opcionalmente fusiona las funciones que ya encontró Ghidra (--ghidra).
//
// Uso:
//   node scripts/discover-functions.mjs work/overlays/mission22.bin --out work/ghidra/mission22.starts.csv
//   node scripts/discover-functions.mjs work/overlays/menu.bin --ghidra work/ghidra/menu_functions.csv --out ...
//
// Salida: Name,Start,End,Size (rangos no solapados).

import fs from 'node:fs';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const outPath = value('--out');
const ghidraPath = value('--ghidra');

if (!input) {
  console.error('uso: node scripts/discover-functions.mjs <module.bin> [--out <csv>] [--ghidra <csv>]');
  process.exit(1);
}

const blob = fs.readFileSync(input);
if (blob.subarray(0, 3).toString('latin1') !== 'MWo') {
  console.error('error: el archivo no empieza con MWo');
  process.exit(2);
}

const base = blob.readUInt32LE(8);
const textSize = blob.readUInt32LE(0xc);
const text = blob.subarray(0x40, 0x40 + textSize);
const textEnd = base + textSize;

let prefix = 0;
while (prefix < text.length && text[prefix] === 0) prefix++;
const codeStart = base + prefix;
const starts = new Set([codeStart]);

for (let off = prefix; off + 4 <= text.length; off += 4) {
  const pc = base + off;
  const w = text.readUInt32LE(off);
  const op = w >>> 26;

  if (op === 2 || op === 3) {
    const target = ((pc + 4) & 0xf0000000) | ((w & 0x03ffffff) << 2);
    if (target >= codeStart && target < textEnd) starts.add(target);
  }

  // addiu sp,sp,-N  => prólogo
  if (op === 9 && ((w >>> 21) & 0x1f) === 29 && ((w >>> 16) & 0x1f) === 29) {
    const imm = w & 0xffff;
    if (imm >= 0x8000) starts.add(pc);
  }
}

if (ghidraPath) {
  for (const line of fs.readFileSync(ghidraPath, 'utf8').split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const addr = Number.parseInt(cols[1], 16);
    if (addr >= codeStart && addr < textEnd) starts.add(addr);
  }
}

const sorted = [...starts]
  .filter((a) => a >= codeStart && a < textEnd && (a - base) % 4 === 0)
  .sort((a, b) => a - b);

const rows = sorted.map((start, i) => {
  const end = i + 1 < sorted.length ? sorted[i + 1] : textEnd;
  return { name: `sub_${start.toString(16)}`, start, end, size: end - start };
});

const md = [];
md.push(`# ${input}`);
md.push('');
md.push(`- base: \`0x${base.toString(16)}\``);
md.push(`- text: ${textSize} B`);
md.push(`- prefijo de ceros: ${prefix} B (0x${prefix.toString(16)})`);
md.push(`- primer código: \`0x${codeStart.toString(16)}\``);
md.push(`- entradas descubiertas: **${rows.length}**`);
md.push('');
md.push('| Nombre | Inicio | Fin | Bytes |');
md.push('|---|---:|---:|---:|');
for (const r of rows) {
  md.push(`| \`${r.name}\` | 0x${r.start.toString(16)} | 0x${r.end.toString(16)} | ${r.size} |`);
}

if (outPath) {
  const csv = ['Name,Start,End,Size', ...rows.map((r) => `${r.name},0x${r.start.toString(16)},0x${r.end.toString(16)},${r.size}`)];
  fs.mkdirSync(outPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  fs.writeFileSync(outPath, `${csv.join('\n')}\n`);
  md.push('');
  md.push(`CSV: \`${outPath}\``);
}

console.log(md.join('\n'));
