#!/usr/bin/env node
// Convierte el CSV de funciones de Ghidra (Name,Start,End,Size) al formato de
// decomp/symbols/<module>.csv.
//
// Uso:
//   node scripts/ghidra-to-symbols.mjs --csv work/ghidra/main.functions.csv --module main \
//     --base 0x4c0000 --size 5667968 --out decomp/symbols/main.csv
//   node scripts/ghidra-to-symbols.mjs --csv work/ghidra/mission22_functions.csv \
//     --module mission22 --base 0x154000 --size 3392 --out decomp/symbols/mission22.csv

import fs from 'node:fs';

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const csvPath = value('--csv');
const moduleName = value('--module');
const base = Number.parseInt(value('--base') ?? '', 16);
const size = Number.parseInt(value('--size') ?? '', 10);
const outPath = value('--out');

if (!csvPath || !moduleName || !Number.isInteger(base) || !Number.isInteger(size) || !outPath) {
  console.error('uso: node scripts/ghidra-to-symbols.mjs --csv <csv> --module <name> --base 0x... --size N --out <csv>');
  process.exit(1);
}

const end = base + size;
const rows = [];
const seen = new Set();

for (const line of fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const cols = line.split(',');
  if (cols.length < 4) continue;
  const address = Number.parseInt(cols[1], 16);
  const startSize = Number.parseInt(cols[3], 10);
  if (!Number.isInteger(address) || address < base || address >= end) continue;
  if (!Number.isInteger(startSize) || startSize <= 0 || address + startSize > end) continue;
  if (seen.has(address)) continue;
  seen.add(address);

  let name = cols[0];
  const m = /^FUN_([0-9a-f]+)$/i.exec(name);
  if (m) name = `sub_${m[1].toLowerCase()}`;

  rows.push({ address, size: startSize, name });
}

rows.sort((a, b) => a.address - b.address);

const out = ['module,address,size,name,kind,source'];
for (const r of rows) {
  out.push(`${moduleName},0x${r.address.toString(16)},${r.size},${r.name},function,ghidra`);
}

fs.mkdirSync(outPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
fs.writeFileSync(outPath, `${out.join('\n')}\n`);
console.log(`${outPath}: ${rows.length} símbolos (${moduleName})`);
