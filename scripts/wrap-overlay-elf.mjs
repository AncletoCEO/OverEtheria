#!/usr/bin/env node
// Envuelve el text de un overlay MWo en un ELF32 LE MIPS mínimo, para que ps2_recomp
// pueda procesarlo con su CSV y su base.
//
// Uso: node scripts/wrap-overlay-elf.mjs --module mission22
//      node scripts/wrap-overlay-elf.mjs --module menu --out work/elf-overlays/menu.elf

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const moduleName = value('--module');
if (!moduleName) {
  console.error('uso: node scripts/wrap-overlay-elf.mjs --module <name> [--out <elf>]');
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync('decomp/modules.json', 'utf8'));
const meta = registry.modules.find((m) => m.name === `${moduleName}.bin`);
if (!meta) {
  console.error(`error: ${moduleName}.bin no está en decomp/modules.json`);
  process.exit(2);
}

const blob = fs.readFileSync(path.join('work', 'overlays', `${moduleName}.bin`));
const text = blob.subarray(0x40, 0x40 + meta.text);
const base = Number.parseInt(meta.base, 16);
const entry = Number.parseInt(meta.entry, 16);

const EH = 52;
const PH = 32;
const SH = 40;
const DATA_OFF = 0x1000;
const STR = Buffer.from('\0.text\0.shstrtab\0', 'latin1');
const strOff = DATA_OFF + text.length;
const shOff = (strOff + STR.length + 3) & ~3;
const total = shOff + 3 * SH;

const buf = Buffer.alloc(total, 0);

// ELF header
buf.write('\x7fELF', 0, 'latin1');
buf[4] = 1; // ELFCLASS32
buf[5] = 1; // little-endian
buf[6] = 1; // version
buf[7] = 0;
buf.writeUInt16LE(2, 16); // ET_EXEC
buf.writeUInt16LE(8, 18); // EM_MIPS
buf.writeUInt32LE(1, 20);
buf.writeUInt32LE(entry, 24);
buf.writeUInt32LE(EH, 28); // e_phoff
buf.writeUInt32LE(shOff, 32);
buf.writeUInt32LE(0x20924000, 36); // R5900
buf.writeUInt16LE(EH, 40);
buf.writeUInt16LE(PH, 42);
buf.writeUInt16LE(1, 44);
buf.writeUInt16LE(SH, 46);
buf.writeUInt16LE(3, 48);
buf.writeUInt16LE(2, 50);

// Program header: PT_LOAD RWE
buf.writeUInt32LE(1, EH + 0);
buf.writeUInt32LE(DATA_OFF, EH + 4);
buf.writeUInt32LE(base, EH + 8);
buf.writeUInt32LE(base, EH + 12);
buf.writeUInt32LE(text.length, EH + 16);
buf.writeUInt32LE(text.length, EH + 20);
buf.writeUInt32LE(7, EH + 24);
buf.writeUInt32LE(0x1000, EH + 28);

text.copy(buf, DATA_OFF);
STR.copy(buf, strOff);

const sh = (index) => shOff + index * SH;
// .text
buf.writeUInt32LE(1, sh(1) + 0);
buf.writeUInt32LE(1, sh(1) + 4); // SHT_PROGBITS
buf.writeUInt32LE(6, sh(1) + 8); // SHF_ALLOC | SHF_EXECINSTR
buf.writeUInt32LE(base, sh(1) + 12);
buf.writeUInt32LE(DATA_OFF, sh(1) + 16);
buf.writeUInt32LE(text.length, sh(1) + 20);
buf.writeUInt32LE(4, sh(1) + 32);
// .shstrtab
buf.writeUInt32LE(7, sh(2) + 0);
buf.writeUInt32LE(3, sh(2) + 4); // SHT_STRTAB
buf.writeUInt32LE(strOff, sh(2) + 16);
buf.writeUInt32LE(STR.length, sh(2) + 20);
buf.writeUInt32LE(1, sh(2) + 32);

const out = value('--out') ?? path.join('work', 'elf-overlays', `${moduleName}.elf`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`${out}: base=0x${base.toString(16)} entry=0x${entry.toString(16)} text=${text.length} B`);
