#!/usr/bin/env node
// Inspector del disco de Sword of Etheria (sin dependencias).
//
// Lee el ISO9660 directamente (no hace falta montarlo) y reporta:
//   - tabla de archivos
//   - formato de cada contenedor (SIMB / TYOSD / ceros)
//   - overlays MWo de OL.BIN (id, base, text, data, bss, offset)
//   - datos del ELF (entry, e_flags, .comment, gp)
//
// Uso:
//   node scripts/inspect-disc.mjs "Sword of Etheria.iso"
//   node scripts/inspect-disc.mjs "Sword of Etheria.iso" --md5
//   node scripts/inspect-disc.mjs "Sword of Etheria.iso" --json
//
// No escribe nada en disco.

import fs from 'node:fs';
import crypto from 'node:crypto';

const SECTOR = 2048;
const args = process.argv.slice(2);
const isoPath = args.find((a) => !a.startsWith('--'));
const wantMd5 = args.includes('--md5');
const wantJson = args.includes('--json');

if (!isoPath) {
  console.error('uso: node scripts/inspect-disc.mjs <iso> [--md5] [--json]');
  process.exit(1);
}

const fd = fs.openSync(isoPath, 'r');
const stat = fs.fstatSync(fd);

function readAt(offset, size) {
  const buf = Buffer.alloc(size);
  let done = 0;
  while (done < size) {
    const n = fs.readSync(fd, buf, done, size - done, offset + done);
    if (n <= 0) break;
    done += n;
  }
  return buf.subarray(0, done);
}

function u32(b, o) { return b.readUInt32LE(o); }

// ---------- ISO9660 ----------

let pvd = null;
for (let s = 16; s < 32; s++) {
  const b = readAt(s * SECTOR, SECTOR);
  if (b[0] === 1 && b.subarray(1, 6).toString('latin1') === 'CD001') { pvd = b; break; }
}
if (!pvd) {
  console.error('error: no se encontró un volumen ISO9660 (PVD)');
  process.exit(2);
}

const files = [];
const dirs = [];

function walkDir(lba, size, prefix) {
  const sectors = Math.ceil(size / SECTOR);
  for (let s = 0; s < sectors; s++) {
    const b = readAt(lba * SECTOR + s * SECTOR, SECTOR);
    let o = 0;
    while (o < SECTOR) {
      const len = b[o];
      if (!len) break;
      const extent = u32(b, o + 2);
      const sz = u32(b, o + 10);
      const flags = b[o + 25];
      const nlen = b[o + 32];
      const rawName = b.subarray(o + 33, o + 33 + nlen).toString('latin1');
      const name = rawName.replace(/;1$/, '');
      if (name !== '.' && name !== '..' && name !== '\u0000' && name !== '\u0001') {
        const full = prefix ? `${prefix}/${name}` : name;
        if (flags & 2) { dirs.push(full); walkDir(extent, sz, full); }
        else files.push({ name: full, lba: extent, size: sz });
      }
      o += len;
    }
  }
}

const rootRec = pvd.subarray(156, 156 + 34);
walkDir(u32(rootRec, 2), u32(rootRec, 10), '');

// ---------- helpers de formato ----------

function detectContainer(file) {
  const head = readAt(file.lba * SECTOR, 64);
  const magic = head.subarray(0, 4).toString('latin1');
  if (magic === 'SIMB') return { kind: 'SIMB', count: u32(head, 4), head };
  if (head.subarray(0, 5).toString('latin1') === 'TYOSD') return { kind: 'TYOSD', head };
  if (head.every((x) => x === 0)) return { kind: 'zeros', head };
  return { kind: 'desconocido', head };
}

function parseOverlays(file) {
  const data = readAt(file.lba * SECTOR, file.size);
  const count = u32(data, 4);
  const overlays = [];
  for (let i = 0; i < count; i++) {
    const toc = 0x20 + i * 16;
    if (toc + 16 > data.length) break;
    const size = u32(data, toc + 8);
    // Los blobs están alineados a 2048; el primero arranca en 0x800.
    let off = 0x800;
    for (let j = 0; j < i; j++) {
      const prevSize = u32(data, 0x20 + j * 16 + 8);
      off += Math.ceil(prevSize / SECTOR) * SECTOR;
    }
    if (off + 0x40 > data.length) break;
    if (data.subarray(off, off + 3).toString('latin1') !== 'MWo') continue;
    const name = data.subarray(off + 0x20, off + 0x40).toString('latin1').replace(/\0.*$/, '');
    if (!name.endsWith('.bin')) continue;
    overlays.push({
      name,
      id: u32(data, off + 4),
      address: u32(data, off + 8),
      text: u32(data, off + 0xc),
      data: u32(data, off + 0x10),
      bss: u32(data, off + 0x14),
      offset: off,
      size,
    });
  }
  return { count, overlays };
}

// ---------- ELF ----------

function parseElf(file) {
  const header = readAt(file.lba * SECTOR, 52);
  const result = {
    entry: u32(header, 24),
    flags: u32(header, 36),
    phoff: u32(header, 28),
    shoff: u32(header, 32),
    phnum: header.readUInt16LE(44),
    shnum: header.readUInt16LE(48),
    shstrndx: header.readUInt16LE(50),
    comment: null,
    gp: null,
    segments: [],
    sections: [],
  };
  const base = file.lba * SECTOR;

  for (let i = 0; i < result.phnum; i++) {
    const o = result.phoff + i * 32;
    const ph = readAt(base + o, 32);
    result.segments.push({
      vaddr: u32(ph, 8), filesz: u32(ph, 16), memsz: u32(ph, 20), flags: u32(ph, 24),
    });
  }

  const shTable = readAt(base + result.shoff, result.shnum * 40);
  const strSh = shTable.subarray(result.shstrndx * 40, result.shstrndx * 40 + 40);
  const strOff = u32(strSh, 16);
  const strSize = u32(strSh, 20);
  const strTable = readAt(base + strOff, strSize);
  const nameAt = (offset) => {
    let end = offset;
    while (end < strTable.length && strTable[end] !== 0) end++;
    return strTable.subarray(offset, end).toString('latin1');
  };
  for (let i = 0; i < result.shnum; i++) {
    const o = i * 40;
    const sh = shTable.subarray(o, o + 40);
    const name = nameAt(u32(sh, 0));
    const sec = { name, addr: u32(sh, 12), off: u32(sh, 16), size: u32(sh, 20) };
    result.sections.push(sec);
    if (name === '.comment') {
      result.comment = readAt(base + sec.off, sec.size)
        .toString('latin1')
        .replace(/\0+$/, '')
        .replace(/\0/g, ' | ');
    }
    if (name === '.reginfo') {
      const reg = readAt(base + sec.off, sec.size);
      result.gp = u32(reg, 0x14);
    }
  }
  return result;
}

function decodeFlags(flags) {
  const arch = (flags >>> 28) & 0xf;
  const mach = (flags >>> 16) & 0xff;
  const archNames = ['MIPS-I', 'MIPS-II', 'MIPS-III', 'MIPS-IV', 'MIPS-V'];
  return {
    arch: archNames[arch] ?? `ARCH_${arch}`,
    mach: mach === 0x92 ? 'R5900 (PS2 EE)' : `0x${mach.toString(16)}`,
  };
}

// ---------- reporte ----------

const report = {
  iso: { path: isoPath, bytes: stat.size, files: files.length, dirs: dirs.length },
  containers: [],
  overlays: null,
  elf: null,
};

if (wantMd5) {
  const hash = crypto.createHash('md5');
  const chunk = Buffer.alloc(8 * 1024 * 1024);
  let pos = 0;
  while (pos < stat.size) {
    const n = fs.readSync(fd, chunk, 0, Math.min(chunk.length, stat.size - pos), pos);
    if (n <= 0) break;
    hash.update(chunk.subarray(0, n));
    pos += n;
  }
  report.iso.md5 = hash.digest('hex');
}

for (const file of files.filter((f) => !f.name.startsWith('MOVIE/'))) {
  const info = detectContainer(file);
  if (info.kind === 'desconocido') continue;
  const entry = { name: file.name, bytes: file.size, kind: info.kind };
  if (info.kind === 'SIMB') entry.count = info.count;
  report.containers.push(entry);
  if (file.name === 'OL.BIN') {
    const parsed = parseOverlays(file);
    report.overlays = {
      count: parsed.count,
      totalText: parsed.overlays.reduce((a, o) => a + o.text, 0),
      totalData: parsed.overlays.reduce((a, o) => a + o.data, 0),
      totalBss: parsed.overlays.reduce((a, o) => a + o.bss, 0),
      modules: parsed.overlays.sort((a, b) => a.address - b.address || a.name.localeCompare(b.name)),
    };
  }
}

const elf = files.find((f) => /^SLES_.*\.\d+$/.test(f.name)) || files.find((f) => f.name === 'SLES_537.68');
if (elf) report.elf = parseElf(elf);

if (wantJson) {
  console.log(JSON.stringify(report, null, 2));
  fs.closeSync(fd);
  process.exit(0);
}

const md = [];
md.push(`# ${isoPath}`);
md.push('');
md.push(`- Tamaño: ${stat.size.toLocaleString('es-AR')} B (${(stat.size / 1024 ** 3).toFixed(2)} GiB)`);
if (report.iso.md5) md.push(`- MD5: \`${report.iso.md5}\``);
md.push(`- Archivos: ${files.length} (${files.filter((f) => f.name.startsWith('MOVIE/')).length} películas)`);
md.push('');

md.push('## Contenedores');
md.push('');
md.push('| Archivo | Bytes | Formato | Entradas |');
md.push('|---|---:|---|---:|');
for (const c of report.containers) {
  md.push(`| \`${c.name}\` | ${c.bytes.toLocaleString('es-AR')} | ${c.kind} | ${c.count ?? '—'} |`);
}
md.push('');

if (report.overlays) {
  const o = report.overlays;
  md.push(`## Overlays (\`OL.BIN\`)`);
  md.push('');
  md.push(`- Módulos: **${o.count}**`);
  md.push(`- Text: **${o.totalText.toLocaleString('es-AR')} B**`);
  md.push(`- Data: ${o.totalData.toLocaleString('es-AR')} B`);
  md.push(`- BSS: ${o.totalBss.toLocaleString('es-AR')} B`);
  md.push('');
  md.push('| Módulo | id | base | text | data | bss | offset |');
  md.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const m of o.modules) {
    md.push(`| \`${m.name}\` | 0x${m.id.toString(16)} | 0x${m.address.toString(16)} | ${m.text} | ${m.data} | ${m.bss} | 0x${m.offset.toString(16)} |`);
  }
  md.push('');
}

if (report.elf) {
  const e = report.elf;
  const flags = decodeFlags(e.flags);
  md.push('## ELF');
  md.push('');
  md.push(`- Entry: \`0x${e.entry.toString(16).toUpperCase()}\``);
  md.push(`- e_flags: \`0x${e.flags.toString(16)}\` → ${flags.arch}, ${flags.mach}`);
  md.push(`- Segmentos: ${e.segments.length}, secciones: ${e.shnum}`);
  if (e.comment) md.push(`- \`.comment\`: \`${e.comment}\``);
  if (e.gp != null) md.push(`- gp declarado: \`0x${e.gp.toString(16).toUpperCase()}\``);
  md.push('');
  md.push('| Segmento | vaddr | filesz | memsz |');
  md.push('|---|---:|---:|---:|');
  e.segments.forEach((s, i) => {
    md.push(`| ${i} | 0x${s.vaddr.toString(16)} | ${s.filesz} | ${s.memsz} |`);
  });
  const placeholders = e.sections.filter(
    (s) => s.size === 0 && s.addr !== 0 && /\.bin$/.test(s.name) && !s.name.startsWith('.rel'),
  );
  if (placeholders.length) {
    md.push('');
    md.push(`### Placeholders de overlay en la tabla de secciones (${placeholders.length})`);
    md.push('');
    md.push(placeholders.map((s) => `\`${s.name}@0x${s.addr.toString(16)}\``).join(', '));
  }
}

console.log(md.join('\n'));
fs.closeSync(fd);
