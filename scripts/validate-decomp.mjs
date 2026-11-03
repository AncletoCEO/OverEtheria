#!/usr/bin/env node
// Gate de la decompilación: valida el registro de módulos, los hashes y los símbolos.
//
// Uso:
//   node scripts/validate-decomp.mjs            # valida lo que exista
//   node scripts/validate-decomp.mjs --strict   # exige overlays extraídos y símbolos
//
// Falla (exit != 0) si:
//   - modules.json no cumple el esquema o los totales
//   - un módulo tiene base/size/offset inválidos
//   - un hash no coincide con work/overlays o work/elf/OL.BIN
//   - un símbolo está fuera del rango del módulo, duplicado o mal formado
//   - hay un binario del juego dentro de decomp/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, 'decomp', 'modules.json');
const OVERLAYS = path.join(ROOT, 'work', 'overlays');
const OL_BIN = path.join(ROOT, 'work', 'elf', 'OL.BIN');
const SYMBOLS = path.join(ROOT, 'decomp', 'symbols');
const DECOMP = path.join(ROOT, 'decomp');

const strict = process.argv.includes('--strict');
const errors = [];
const warnings = [];

const VALID_BASES = new Set(['0x100000', '0x154000']);
const VALID_KINDS = new Set(['function', 'global', 'thunk', 'struct', 'enum']);
const VALID_SOURCES = new Set(['ghidra', 'manual', 'legacy-csv', 'recomp']);
const FORBIDDEN = /\.(bin|elf|iso|pss|irx|img|exe|dll|o|obj|p2s)$/i;
const SYMBOL_HEADER = 'module,address,size,name,kind,source';

if (!fs.existsSync(REGISTRY)) {
  console.error(`error: falta ${path.relative(ROOT, REGISTRY)}`);
  process.exit(2);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
if (registry.schema !== 1) errors.push(`schema inesperado: ${registry.schema}`);
if (!Array.isArray(registry.modules) || registry.modules.length === 0) {
  errors.push('modules vacío');
}

const byName = new Map();
const seenOffsets = new Set();
for (const m of registry.modules ?? []) {
  const where = m.name ?? '(sin nombre)';
  if (!m.name || !/^[a-z0-9_]+\.bin$/i.test(m.name)) errors.push(`${where}: nombre inválido`);
  if (byName.has(m.name)) errors.push(`${m.name}: módulo duplicado`);
  byName.set(m.name, m);

  if (!VALID_BASES.has(m.base)) errors.push(`${where}: base ${m.base} inesperada`);
  for (const field of ['text', 'data', 'bss', 'size', 'offset']) {
    if (!Number.isInteger(m[field]) || m[field] < 0) errors.push(`${where}: ${field} inválido`);
  }
  if (m.size !== 0x40 + m.text + m.data) {
    errors.push(`${where}: size ${m.size} != 0x40 + text ${m.text} + data ${m.data}`);
  }
  if (m.offset % 2048 !== 0) errors.push(`${where}: offset ${m.offset} no alineado a 2048`);
  if (seenOffsets.has(m.offset)) errors.push(`${where}: offset duplicado ${m.offset}`);
  seenOffsets.add(m.offset);
  if (!/^[0-9a-f]{64}$/i.test(m.sha256 ?? '')) errors.push(`${where}: sha256 inválido`);
}

const sums = (registry.modules ?? []).reduce(
  (acc, m) => ({ text: acc.text + m.text, data: acc.data + m.data, bss: acc.bss + m.bss }),
  { text: 0, data: 0, bss: 0 },
);
for (const key of ['text', 'data', 'bss']) {
  if (registry.totals?.[key] !== sums[key]) {
    errors.push(`totales.${key}: ${registry.totals?.[key]} != suma ${sums[key]}`);
  }
}

const programRanges = new Map();
for (const p of registry.programs ?? []) {
  const base = Number.parseInt(p.base, 16);
  if (!p.name || !Number.isInteger(base) || !Number.isInteger(p.text) || p.text <= 0) {
    errors.push(`programa ${p.name ?? '?'}: rango inválido`);
    continue;
  }
  programRanges.set(p.name, { base, text: p.text });
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

if (fs.existsSync(OL_BIN)) {
  const digest = hashFile(OL_BIN);
  if (digest !== registry.source?.sha256) {
    errors.push(`OL.BIN: sha256 ${digest} != registry.source.sha256`);
  }
}

let checkedOverlays = 0;
for (const m of registry.modules ?? []) {
  const file = path.join(OVERLAYS, m.name);
  if (!fs.existsSync(file)) {
    if (strict) errors.push(`${m.name}: falta en work/overlays (modo --strict)`);
    else warnings.push(`${m.name}: no extraído (se omite el hash)`);
    continue;
  }
  checkedOverlays++;
  if (hashFile(file) !== m.sha256) errors.push(`${m.name}: hash no coincide`);
}

// --- símbolos ---

const symbols = [];
if (fs.existsSync(SYMBOLS)) {
  for (const entry of fs.readdirSync(SYMBOLS).filter((f) => f.endsWith('.csv'))) {
    const file = path.join(SYMBOLS, entry);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines[0] !== SYMBOL_HEADER) {
      errors.push(`${entry}: encabezado inválido (esperado "${SYMBOL_HEADER}")`);
      continue;
    }
    const addresses = new Set();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length !== 6) {
        errors.push(`${entry}:${i + 1}: se esperaban 6 columnas, hay ${cols.length}`);
        continue;
      }
      const [module, addressRaw, sizeRaw, name, kind, source] = cols;
      const address = Number.parseInt(addressRaw, 16);
      const size = Number.parseInt(sizeRaw, 10);
      const mod = byName.get(`${module}.bin`);
      const range = mod
        ? { base: Number.parseInt(mod.base, 16), text: mod.text }
        : programRanges.get(module);
      const where = `${entry}:${i + 1}`;
      if (!range) { errors.push(`${where}: módulo desconocido ${module}`); continue; }
      if (!/^0x[0-9a-f]+$/i.test(addressRaw) || !Number.isInteger(address)) {
        errors.push(`${where}: address inválida ${addressRaw}`);
        continue;
      }
      if (!Number.isInteger(size) || size <= 0) errors.push(`${where}: size inválida ${sizeRaw}`);
      if (!name) errors.push(`${where}: nombre vacío`);
      if (!VALID_KINDS.has(kind)) errors.push(`${where}: kind inválido ${kind}`);
      if (!VALID_SOURCES.has(source)) errors.push(`${where}: source inválido ${source}`);
      if (address < range.base || address >= range.base + range.text) {
        errors.push(`${where}: ${addressRaw} fuera de 0x${range.base.toString(16)}..0x${(range.base + range.text).toString(16)}`);
      }
      if (address + size > range.base + range.text) {
        errors.push(`${where}: el símbolo excede el text del módulo`);
      }
      if (addresses.has(address)) errors.push(`${where}: dirección duplicada ${addressRaw}`);
      addresses.add(address);
      symbols.push({ module, address, size, name, kind, source });
    }
  }
} else {
  warnings.push('decomp/symbols/ no existe todavía');
}

// --- binarios prohibidos ---

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (FORBIDDEN.test(entry.name)) errors.push(`binario prohibido en decomp/: ${path.relative(ROOT, full)}`);
  }
}
walk(DECOMP);

// --- reporte ---

console.log(`módulos: ${registry.modules?.length ?? 0}`);
console.log(`hashes verificados: ${checkedOverlays}/${registry.modules?.length ?? 0}`);
console.log(`símbolos: ${symbols.length}`);

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

if (errors.length) {
  console.error(`\nFALLÓ: ${errors.length} error(es)`);
  process.exit(1);
}
console.log('\nOK: gate de decomp en verde');
