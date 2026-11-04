#!/usr/bin/env python3
"""Extrae el contenido de un ISO de PS2 a una carpeta, para no volver a usar el ISO.

    python scripts/extract-disc.py "Sword of Etheria.iso" data/game/disc

Cada archivo del ISO se escribe con su ruta (sin el `;1` de ISO 9660). El runtime de
`ps2-native-recomp`, con el parche de `patches/`, lee el disco desde esa carpeta:
`ps2run ... --disc data/game/disc`.

- Los archivos se extraen en orden de sector, así el ISO se lee secuencialmente.
- Se puede cortar y volver a ejecutar: los archivos ya presentes con el mismo tamaño
  se saltan.
- Al terminar escribe `.extracted` con el serial, la fecha y el tamaño total.
"""
import argparse
import datetime
import os
import struct
import sys

SECTOR = 2048
MARKER = '.extracted'


class Iso:
    def __init__(self, path):
        self.file = open(path, 'rb')
        self.size = os.path.getsize(path)
        self.files = []  # (lba, size, path)

    def read(self, lba, size):
        self.file.seek(lba * SECTOR)
        return self.file.read(size)

    def pvd(self, sector=16):
        data = self.read(sector, SECTOR)
        return data if data[1:6] == b'CD001' else None

    def walk(self, prefix, extent, length):
        data = self.read(extent, length)
        at = 0
        while at < len(data):
            n = data[at]
            if not n or at + n > len(data):
                # a record cannot span the end of its extent: jump to the next sector
                at = (at // SECTOR + 1) * SECTOR
                continue
            name_len = data[at + 32]
            raw = data[at + 33:at + 33 + name_len]
            name = raw.decode('ascii', 'replace')
            entry_lba = struct.unpack_from('<I', data, at + 2)[0]
            entry_size = struct.unpack_from('<I', data, at + 10)[0]
            flags = data[at + 25]
            at += n
            if name_len == 1 and name in ('\x00', '\x01'):
                continue
            if ';' in name:
                name = name.split(';')[0]
            if not name or name in ('.', '..') or any(c in name for c in '/\\:'):
                continue
            if flags & 2:
                self.walk(prefix + name + '/', entry_lba, entry_size)
            else:
                self.files.append((entry_lba, entry_size, prefix + name))

    def index(self):
        pvd = self.pvd()
        if not pvd:
            raise SystemExit('no es un ISO 9660 (falta el volumen descriptor en el sector 16)')
        root = pvd[156:]
        self.walk('', struct.unpack_from('<I', root, 2)[0], struct.unpack_from('<I', root, 10)[0])
        # PS2 DVDs de doble capa traen un segundo descriptor: sus archivos se suman a los del primero.
        layer0 = struct.unpack_from('<I', pvd, 80)[0]
        for sector in range(layer0, min(layer0 + 64, self.size // SECTOR)):
            if self.pvd(sector):
                second = self.pvd(sector)
                root = second[156:]
                self.walk('', struct.unpack_from('<I', root, 2)[0], struct.unpack_from('<I', root, 10)[0])
                break
        self.files.sort()

    def serial(self):
        for lba, size, path in self.files:
            if path.upper() == 'SYSTEM.CNF':
                text = self.read(lba, size).decode('ascii', 'replace')
                for line in text.splitlines():
                    if line.strip().upper().startswith('BOOT2'):
                        return line.split(':', 1)[-1].strip().lstrip('\\')
        return 'unknown'


def main():
    parser = argparse.ArgumentParser(description='Extrae un ISO de PS2 a una carpeta.')
    parser.add_argument('iso')
    parser.add_argument('dest', help='carpeta de destino, o el archivo de salida con --pick')
    parser.add_argument('--pick', metavar='NOMBRE', help='extrae sólo ese archivo (p. ej. OL.BIN)')
    parser.add_argument('--force', action='store_true', help='reescribe todo aunque ya esté')
    args = parser.parse_args()

    iso = Iso(args.iso)
    iso.index()

    if args.pick:
        wanted = args.pick.upper()
        for lba, size, rel in iso.files:
            if rel.upper() == wanted or rel.upper().endswith('/' + wanted):
                with open(args.dest, 'wb') as out:
                    out.write(iso.read(lba, size))
                print('[extract] %s: %d bytes en %s' % (rel, size, args.dest))
                return
        raise SystemExit('no está %s en %s' % (args.pick, args.iso))
    print('[extract] %s: %d archivos, %.1f GB' % (args.iso, len(iso.files), sum(s for _, s, _ in iso.files) / 1e9))
    os.makedirs(args.dest, exist_ok=True)

    done = skipped = 0
    total = 0
    for lba, size, rel in iso.files:
        target = os.path.join(args.dest, *rel.split('/'))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        if not args.force and os.path.exists(target) and os.path.getsize(target) == size:
            skipped += 1
            total += size
            continue
        with open(target, 'wb') as out:
            left = size
            at = lba
            while left > 0:
                chunk = iso.read(at, min(SECTOR * 256, left))
                if not chunk:
                    break
                out.write(chunk)
                left -= len(chunk)
                at += (len(chunk) + SECTOR - 1) // SECTOR
        done += 1
        total += size
        if done % 32 == 0 or size > 32 << 20:
            print('[extract] %d archivos escritos, %.0f MB' % (done, total / 1e6), flush=True)

    with open(os.path.join(args.dest, MARKER), 'w', encoding='utf-8') as marker:
        marker.write('serial=%s\n' % iso.serial())
        marker.write('date=%s\n' % datetime.datetime.now().isoformat(timespec='seconds'))
        marker.write('bytes=%d\n' % total)
        marker.write('files=%d\n' % (done + skipped))
    print('[extract] listo: %d archivos, %d ya estaban, %.1f GB en %s' % (done, skipped, total / 1e9, args.dest))


if __name__ == '__main__':
    main()
