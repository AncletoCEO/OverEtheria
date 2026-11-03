#!/usr/bin/env node
// Audita la cobertura de un CSV de funciones de Ghidra contra un módulo.
//
// Uso:
//   node scripts/audit-coverage.mjs --csv work/ghidra/main_functions.csv --elf work/elf/SLES_537.68
//   node scripts/audit-coverage.mjs --csv work/ghidra/mission98_functions.csv --module work/overlays/mission98.bin
//
// Opciones:
//   --min-gap <bytes>   tamaño mínimo de hueco a reportar (default 16)
//   --out <archivo.md>  escribe el informe en Markdown

import fs from 'node:fs';

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const csvPath = value('--csv');
const elfPath = value('--elf');
const modulePath = value('--module');
const minGap = Number.parseInt(value('--min-gap') ?? '16', 10);
const top = Number.parseInt(value('--top') ?? '40', 10);
const outPath = value('--out');

if (!csvPath || (!elfPath && !modulePath)) {
  console.error('uso: node scripts/audit-coverage.mjs --csv <csv> (--elf <elf> | --module <bin>) [--min-gap 16] [--out <md>]');
  process.exit(1);
}

function readElfMain(file) {
  const b = fs.readFileSync(file);
  const shoff = b.readUInt32LE(32);
  const shentsize = b.readUInt16LE(46);
  const shnum = b.readUInt16LE(48);
  const shstrndx = b.readUInt16LE(50);
  const sh = (i) => {
    const o = shoff + i * shentsize;
    return { name: b.readUInt32LE(o), addr: b.readUInt32LE(o + 12), off: b.readUInt32LE(o + 16), size: b.readUInt32LE(o + 20) };
  };
  const str = sh(shstrndx);
  const nameAt = (off) => {
    let end = str.off + off;
    while (b[end] !== 0) end++;
    return b.subarray(str.off + off, end).toString('latin1');
  };
  for (let i = 0; i < shnum; i++) {
    const s = sh(i);
    if (nameAt(s.name) === 'main') return { base: s.addr, offset: s.off, size: s.size, bytes: b };
  }
  throw new Error('no se encontró la sección main');
}

function readModule(file) {
  const b = fs.readFileSync(file);
  if (b.subarray(0, 3).toString('latin1') !== 'MWo') throw new Error('el módulo no empieza con MWo');
  return {
    base: b.readUInt32LE(8),
    offset: 0x40,
    size: b.readUInt32LE(0xc),
    bytes: b,
  };
}

const target = elfPath ? readElfMain(elfPath) : readModule(modulePath);
const label = elfPath ? 'main' : (modulePath.split(/[\\/]/).pop() ?? 'módulo');

const rows = fs
  .readFileSync(csvPath, 'utf8')
  .split(/\r?\n/)
  .slice(1)
  .filter((l) => l.trim() !== '')
  .map((l) => {
    const [name, start, end, size] = l.split(',');
    return { name, start: Number.parseInt(start, 16), end: Number.parseInt(end, 16), size: Number.parseInt(size, 10) };
  })
  .filter((r) => r.start >= target.base && r.start < target.base + target.size)
  .sort((a, b) => a.start - b.start);

const merged = [];
let overlaps = 0;
for (const r of rows) {
  const last = merged[merged.length - 1];
  if (last && r.start < last.end) {
    overlaps++;
    last.end = Math.max(last.end, r.end);
  } else {
    merged.push({ start: r.start, end: r.end });
  }
}

const gaps = [];
let prev = target.base;
for (const m of merged) {
  if (m.start > prev) gaps.push([prev, m.start]);
  prev = Math.max(prev, m.end);
}
if (prev < target.base + target.size) gaps.push([prev, target.base + target.size]);

const reported = gaps.filter(([a, b]) => b - a >= minGap).sort((a, b) => b[1] - b[0] - (a[1] - a[0]));

const byKind = new Map();
for (const [a, b] of reported) {
  const c = classify(a, b);
  const entry = byKind.get(c.kind) ?? { count: 0, bytes: 0 };
  entry.count++;
  entry.bytes += b - a;
  byKind.set(c.kind, entry);
}

function classify(start, end) {
  const off = target.offset + (start - target.base);
  const size = end - start;
  const bytes = target.bytes.subarray(off, off + size);
  let zero = 0;
  let prologues = 0;
  let returns = 0;
  let words = 0;
  for (let i = 0; i + 3 < bytes.length; i += 4) {
    const w = bytes.readUInt32LE(i);
    words++;
    if (w === 0) zero++;
    if ((w & 0xffff0000) === 0x27bd0000) prologues++;
    if (w === 0x03e00008) returns++;
  }
  const text = bytes.toString('latin1');
  let ascii = 0;
  for (let i = 0; i + 4 <= text.length; i++) {
    let ok = true;
    for (let j = 0; j < 4; j++) {
      const c = text.charCodeAt(i + j);
      if (c < 32 || c > 126) { ok = false; break; }
    }
    if (ok) { ascii++; i += 3; }
  }
  let kind = 'datos/desconocido';
  const per4k = size / 4096;
  const prologueDensity = (prologues + returns) / Math.max(per4k, 1);
  if (ascii >= size * 0.3) kind = 'datos (strings)';
  else if (words > 0 && zero / words >= 0.5) kind = 'datos/ceros';
  else if (prologues > 0 && prologueDensity >= 1) kind = 'código';
  else if (zero / Math.max(words, 1) < 0.1 && prologues === 0 && returns === 0) kind = 'datos';
  return { kind, words, zero, prologues, returns, ascii, prologueDensity: prologueDensity.toFixed(2) };
}

const coveredBytes = merged.reduce((a, m) => a + (m.end - m.start), 0);
const coveredPct = ((coveredBytes / target.size) * 100).toFixed(2);

const md = [];
md.push(`# Cobertura de \`${label}\``);
md.push('');
md.push(`- Base: \`0x${target.base.toString(16)}\``);
md.push(`- Tamaño: ${target.size} B`);
md.push(`- Funciones en el rango: **${rows.length}**`);
md.push(`- Bytes cubiertos: ${coveredBytes} / ${target.size} (${coveredPct} %)`);
md.push(`- Solapamientos entre funciones: ${overlaps}`);
md.push(`- Huecos >= ${minGap} B: **${reported.length}** (${reported.reduce((a, g) => a + (g[1] - g[0]), 0)} B)`);
md.push('');
md.push('### Resumen por clasificación');
md.push('');
md.push('| Clasificación | Huecos | Bytes |');
md.push('|---|---:|---:|');
for (const [kind, v] of [...byKind.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  md.push(`| ${kind} | ${v.count} | ${v.bytes} |`);
}
md.push('');
md.push('## Huecos más grandes');
md.push('');
md.push('| Rango | Bytes | Clasificación | Evidencia |');
md.push('|---|---:|---|---|');
for (const [a, b] of reported.slice(0, top)) {
  const c = classify(a, b);
  md.push(
    `| \`0x${a.toString(16)}-0x${b.toString(16)}\` | ${b - a} | ${c.kind} | nz=${c.words - c.zero}/${c.words} pro=${c.prologues} jr=${c.returns} ascii=${c.ascii} |`,
  );
}
if (reported.length > top) {
  md.push('');
  md.push(`_Mostrando los ${top} huecos más grandes de ${reported.length}. Regenerar con \`--top N\` para ver más._`);
}

const output = `${md.join('\n')}\n`;
if (outPath) {
  fs.mkdirSync(outPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  fs.writeFileSync(outPath, output);
  console.log(`informe escrito en ${outPath}`);
}
console.log(output);
