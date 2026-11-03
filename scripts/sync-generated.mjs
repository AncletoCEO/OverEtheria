#!/usr/bin/env node
// Sincroniza un directorio de C++ generado (nuevo) sobre otro, copiando solo los
// archivos cuyo contenido cambió y eliminando los obsoletos. Preserva el mtime de los
// archivos sin cambios para que CMake no recompile todo.
//
// Uso: node scripts/sync-generated.mjs work/generated/main.new work/generated/main

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error('uso: node scripts/sync-generated.mjs <nuevo> <destino>');
  process.exit(1);
}

function walk(dir, base = dir, map = new Map()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, map);
    else map.set(path.relative(base, full), full);
  }
  return map;
}

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const next = walk(src);
const current = fs.existsSync(dst) ? walk(dst) : new Map();

let copied = 0;
let unchanged = 0;
for (const [rel, file] of next) {
  const target = path.join(dst, rel);
  if (current.has(rel) && hash(file) === hash(current.get(rel))) {
    unchanged++;
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  copied++;
}

let removed = 0;
for (const [rel, file] of current) {
  if (!next.has(rel)) {
    fs.unlinkSync(file);
    removed++;
  }
}

console.log(`copiados: ${copied}, sin cambios: ${unchanged}, eliminados: ${removed}`);
