#!/usr/bin/env python3
"""Registra un overlay `MWo` de OL.BIN para ps2-native-recomp.

    python scripts/register-overlay.py OL.BIN menu.bin games/oz/overlays

Hace lo mismo que se hizo a mano con la versión PAL:

1. busca el módulo por nombre en `OL.BIN` y copia el blob completo
   (cabecera + texto + datos) a `<overlays>/<base>_<crc>.bin`, que el runtime
   carga tal cual está en RAM;
2. escribe además una imagen pequeña en la dirección de `_static_init`, porque ese
   código vive en la zona de datos y el traductor sólo analiza el rango de texto;
3. imprime en stdout las entradas para `entries.txt`:
   - una por cada palabra del rango de texto,
   - una para el módulo de `_static_init`.

La cabecera MWo3 la usa el parche del runtime para saber dónde empieza y termina el
texto; no hay que pasar ningún tamaño a mano.
"""
import binascii
import os
import struct
import sys

HEADER = 0x40


def modules(data):
    at = 0
    while True:
        at = data.find(b'MWo', at)
        if at < 0:
            return
        if at + HEADER <= len(data) and data[at + 3] in (ord('1'), ord('2'), ord('3')):
            ident, base, text, dsize, bss = struct.unpack_from('<5I', data, at + 4)
            name = data[at + 0x20:at + 0x40].split(b'\x00')[0].decode('ascii', 'replace')
            if 0x100000 <= base <= 0x200000 and text and name:
                yield {
                    'at': at,
                    'id': ident,
                    'base': base,
                    'text': text,
                    'data': dsize,
                    'bss': bss,
                    'static_init': struct.unpack_from('<I', data, at + 0x18)[0],
                    'static_init_end': struct.unpack_from('<I', data, at + 0x1C)[0],
                    'name': name,
                }
        at += 1


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    ol_path, wanted, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    data = open(ol_path, 'rb').read()
    module = next((m for m in modules(data) if m['name'].lower() == wanted.lower()), None)
    if not module:
        sys.exit('no está %s en %s' % (wanted, ol_path))
    size = HEADER + module['text'] + module['data']
    blob = data[module['at']:module['at'] + size]
    if len(blob) != size:
        sys.exit('el módulo se sale del archivo')

    os.makedirs(out_dir, exist_ok=True)
    crc = binascii.crc32(blob) & 0xFFFFFFFF
    image = '%08X_%08X.bin' % (module['base'], crc)
    open(os.path.join(out_dir, image), 'wb').write(blob)
    print('# imagen %s: base 0x%x, text 0x%x, data 0x%x' %
          (image, module['base'], module['text'], module['data']), file=sys.stderr)

    init_name = None
    start, end = module['static_init'], module['static_init_end']
    if start and end > start:
        offset = start - module['base']
        code = blob[offset:offset + (end - start)]
        code += b'\x00' * ((4 - len(code) % 4) % 4)
        if len(code) < 0x400:
            code += b'\x00' * (0x400 - len(code))
        init_crc = binascii.crc32(code) & 0xFFFFFFFF
        init_name = '%08X_%08X' % (start, init_crc)
        open(os.path.join(out_dir, init_name + '.bin'), 'wb').write(code)
        print('# static init 0x%x..0x%x: %s' % (start, end, init_name), file=sys.stderr)

    for offset in range(HEADER, HEADER + module['text'], 4):
        print('%s:%x' % (image[:-4], offset))
    if init_name:
        print('%s:0' % init_name)


if __name__ == '__main__':
    main()
