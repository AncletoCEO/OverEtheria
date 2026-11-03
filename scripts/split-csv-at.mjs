#!/usr/bin/env node
// Divide una fila del CSV de funciones en una dirección referenciada que no tiene
// fila propia (los MISSING de validate_csv.py).
//
// Uso: node scripts/split-csv-at.mjs <csv> <addr> [<addr> ...]

import fs from 'node:fs';

const [csvPath, ...addrArgs] = process.argv.slice(2);
if (!csvPath || addrArgs.length === 0) {
  console.error('uso: node scripts/split-csv-at.mjs <csv> 0xADDR [0xADDR ...]');
  process.exit(1);
}

const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const header = lines[0];
const rows = lines.slice(1).map((line) => {
  const [name, start, end, size] = line.split(',');
  return {
    name,
    start: Number.parseInt(start, 16),
    end: Number.parseInt(end, 16),
    size: Number.parseInt(size, 10),
  };
});

for (const arg of addrArgs) {
  const addr = Number.parseInt(arg, 16);
  const row = rows.find((r) => r.start < addr && addr < r.end);
  if (!row) {
    console.error(`no hay contenedor para ${arg}`);
    continue;
  }
  const newRow = {
    name: `FUN_${addr.toString(16)}`,
    start: addr,
    end: row.end,
    size: row.end - addr,
  };
  row.end = addr;
  row.size = addr - row.start;
  rows.push(newRow);
  console.log(`${row.name}: ${row.start.toString(16)}..${addr.toString(16)} + ${newRow.name}: ${addr.toString(16)}..${newRow.end.toString(16)}`);
}

rows.sort((a, b) => a.start - b.start);

const out = [header];
for (const r of rows) {
  out.push(`${r.name},0x${r.start.toString(16).toUpperCase().padStart(8, '0')},0x${r.end.toString(16).toUpperCase().padStart(8, '0')},${r.size}`);
}
fs.writeFileSync(csvPath, `${out.join('\r\n')}\r\n`);
console.log(`${csvPath}: ${rows.length} filas`);
