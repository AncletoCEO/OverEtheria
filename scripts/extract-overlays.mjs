#!/usr/bin/env node
// Extrae los módulos MWo de un contenedor SIMB (OL.BIN) y valida su consistencia.
//
// Uso:
//   node scripts/extract-overlays.mjs work/elf/OL.BIN
//   node scripts/extract-overlays.mjs work/elf/OL.BIN --out work/overlays --json decomp/modules.json --elf work/elf/SLES_537.68
//   node scripts/extract-overlays.mjs work/elf/OL.BIN --check
//
// --check valida sin escribir nada (para scripts/validate-decomp.mjs).
//
// Reglas de validación (falla entera, no escribe archivos si algo no cierra):
//   - magic SIMB y TOC dentro del archivo
//   - cada blob alineado a 2048 y dentro del archivo
//   - header MWo con nombre válido
//   - size == 0x40 + sz_text + sz_data
//   - base en {0x100000, 0x154000}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SECTOR = 2048;
const HEADER = 0x40;
const FIRST_BLOB = 0x800;
const VALID_BASES = new Set([0x100000, 0x154000]);

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const outDir = valueAfter('--out') ?? 'work/overlays';
const jsonPath = valueAfter('--json');
const elfPath = valueAfter('--elf');
const checkOnly = args.includes('--check');

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

if (!input) {
  console.error('uso: node scripts/extract-overlays.mjs <OL.BIN> [--out <dir>] [--json <file>] [--check]');
  process.exit(1);
}

const data = fs.readFileSync(input);
const sourceSha = sha256(data);
const errors = [];

function u32(offset) {
  return data.readUInt32LE(offset);
}

function fail(message) {
  errors.push(message);
}

function hex(value) {
  return `0x${value.toString(16)}`;
}

if (data.subarray(0, 4).toString('latin1') !== 'SIMB') {
  console.error('error: el archivo no empieza con SIMB');
  process.exit(2);
}

const count = u32(4);
const tocBytes = count * 16;
if (count <= 0 || 0x20 + tocBytes > data.length) {
  console.error(`error: TOC inválido (count=${count})`);
  process.exit(2);
}

const toc = [];
for (let i = 0; i < count; i++) {
  const o = 0x20 + i * 16;
  toc.push({
    cumulative: u32(o),
    count: u32(o + 4),
    size: u32(o + 8),
    unknown: u32(o + 12),
  });
}

const modules = [];
let offset = FIRST_BLOB;

for (let i = 0; i < count; i++) {
  const entry = toc[i];
  const label = `entrada ${i}`;

  if (offset % SECTOR !== 0) fail(`${label}: offset ${hex(offset)} no está alineado a ${SECTOR}`);
  if (offset + entry.size > data.length) {
    fail(`${label}: el blob (${hex(offset)} + ${entry.size}) excede el archivo`);
    break;
  }

  const header = data.subarray(offset, offset + HEADER);
  const magic = header.subarray(0, 3).toString('latin1');
  if (magic !== 'MWo') fail(`${label}: header sin magic MWo en ${hex(offset)}`);

  const name = header.subarray(0x20, 0x40).toString('latin1').replace(/\0.*$/, '');
  const id = header.readUInt32LE(4);
  const base = header.readUInt32LE(8);
  const text = header.readUInt32LE(0xc);
  const moduleData = header.readUInt32LE(0x10);
  const bss = header.readUInt32LE(0x14);
  const staticInit = header.readUInt32LE(0x18);
  const staticInitEnd = header.readUInt32LE(0x1c);

  if (!name || !name.endsWith('.bin') || name.includes('/') || name.includes('\\')) {
    fail(`${label}: nombre inválido ${JSON.stringify(name)}`);
  }
  if (entry.size !== HEADER + text + moduleData) {
    fail(
      `${label} (${name}): TOC size ${entry.size} != 0x40 + text ${text} + data ${moduleData} = ${HEADER + text + moduleData}`,
    );
  }
  if (!VALID_BASES.has(base)) fail(`${label} (${name}): base inesperada ${hex(base)}`);
  if (staticInit < base || staticInitEnd < staticInit) {
    fail(`${label} (${name}): rango _static_init inválido ${hex(staticInit)}..${hex(staticInitEnd)}`);
  }

  const blob = data.subarray(offset, offset + entry.size);
  modules.push({
    name,
    id,
    base,
    text,
    data: moduleData,
    bss,
    offset,
    size: entry.size,
    staticInit,
    staticInitEnd,
    entryCount: entry.count,
    sha256: sha256(blob),
    _blob: blob,
  });

  offset += Math.ceil(entry.size / SECTOR) * SECTOR;
}

if (modules.length !== count) {
  fail(`se parsearon ${modules.length} módulos de ${count} declarados`);
}

const names = new Set();
for (const m of modules) {
  if (names.has(m.name)) fail(`nombre duplicado: ${m.name}`);
  names.add(m.name);
}

if (errors.length) {
  console.error(`FALLÓ la validación de ${input}:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(3);
}

if (!checkOnly) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const m of modules) {
    const target = path.join(outDir, m.name);
    fs.writeFileSync(target, m._blob);
  }
}

const clean = modules
  .map(({ _blob, ...rest }) => ({
    name: rest.name,
    id: rest.id,
    base: hex(rest.base),
    text: rest.text,
    data: rest.data,
    bss: rest.bss,
    offset: rest.offset,
    size: rest.size,
    staticInit: hex(rest.staticInit),
    staticInitEnd: hex(rest.staticInitEnd),
    entryCount: rest.entryCount,
    sha256: rest.sha256,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const registry = {
  schema: 1,
  source: {
    file: path.basename(input),
    bytes: data.length,
    sha256: sourceSha,
  },
  totals: {
    modules: clean.length,
    text: clean.reduce((a, m) => a + m.text, 0),
    data: clean.reduce((a, m) => a + m.data, 0),
    bss: clean.reduce((a, m) => a + m.bss, 0),
  },
  modules: clean,
};

if (elfPath) {
  const elf = fs.readFileSync(elfPath);
  const main = findElfSection(elf, 'main');
  registry.programs = [
    {
      name: 'main',
      source: path.basename(elfPath),
      base: hex(main.addr),
      text: main.size,
      offset: main.off,
      sha256: sha256(elf.subarray(main.off, main.off + main.size)),
    },
  ];
}

if (jsonPath) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(registry, null, 2)}\n`);
}

console.log(`OK: ${clean.length} módulos, text ${registry.totals.text} B, data ${registry.totals.data} B`);
for (const m of clean) {
  console.log(
    `  ${m.name.padEnd(20)} id=0x${m.id.toString(16).padStart(2, '0')} base=${m.base} text=${m.text} offset=0x${m.offset.toString(16)}`,
  );
}
if (!checkOnly) console.log(`  escritos en ${outDir}`);
if (jsonPath) console.log(`  registro en ${jsonPath}`);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function findElfSection(buf, wanted) {
  const shoff = buf.readUInt32LE(32);
  const shentsize = buf.readUInt16LE(46);
  const shnum = buf.readUInt16LE(48);
  const shstrndx = buf.readUInt16LE(50);
  const sh = (i) => {
    const o = shoff + i * shentsize;
    return {
      name: buf.readUInt32LE(o),
      addr: buf.readUInt32LE(o + 12),
      off: buf.readUInt32LE(o + 16),
      size: buf.readUInt32LE(o + 20),
    };
  };
  const str = sh(shstrndx);
  const nameAt = (off) => {
    let end = str.off + off;
    while (buf[end] !== 0) end++;
    return buf.subarray(str.off + off, end).toString('latin1');
  };
  for (let i = 0; i < shnum; i++) {
    const s = sh(i);
    if (nameAt(s.name) === wanted) return s;
  }
  throw new Error(`no se encontró la sección ${wanted}`);
}
