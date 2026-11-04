#!/usr/bin/env python3
"""Genera las entradas de `entries.txt` de un overlay `MWo3` para ps2-native-recomp.

El runtime de ps2-native-recomp traduce código a partir de entradas conocidas
(llamadas directas, punteros, prólogos). Los menús de este juego llaman a muchas
funciones cortas por tablas que se construyen en runtime, así que ninguna de esas
heurísticas las ve y el juego se detiene con `missing code at ...`.

Uso:
    python scripts/make-overlay-entries.py menu.bin 00100000_46030C2F

Escribe en stdout una línea por cada palabra del rango de texto del overlay:

    00100000_46030C2F:40
    00100000_46030C2F:44
    ...

El nombre del módulo es el del archivo en `games/<game>/overlays/` sin `.bin`
(`<base>_<crc>`). Se agregan a `games/<game>/entries.txt` junto con las entradas
del programa principal.
"""
import struct
import sys

HEADER = 0x40


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    blob_path, module = sys.argv[1], sys.argv[2]
    blob = open(blob_path, "rb").read()
    if blob[:4] != b"MWo3":
        sys.exit("el archivo no empieza con la cabecera MWo3")
    base = struct.unpack_from("<I", blob, 0x08)[0]
    text = struct.unpack_from("<I", blob, 0x0C)[0]
    if not text or HEADER + text > len(blob):
        sys.exit("la cabecera no describe un rango de texto válido")
    for offset in range(HEADER, HEADER + text, 4):
        print(f"{module}:{offset:x}")
    print(f"# base 0x{base:x}, text 0x{text:x} ({len(range(HEADER, HEADER + text, 4))} palabras)",
          file=sys.stderr)


if __name__ == "__main__":
    main()
