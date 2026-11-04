#!/usr/bin/env python3
"""Convierte un PT_LOAD de un ELF32 LE en una ventana de código (p_filesz=0).

Uso: patch-elf-window.py <elf> <vaddr> <memsz>

Si el ELF no tiene un PT_LOAD en <vaddr> pero sí una entrada ejecutable vacía
(filesz=0, memsz=0, address=0), la reutiliza para la ventana: es el caso del ELF
japonés, cuyos overlays también se cargan en 0x100000.

Lo usa el port de ps2-native-recomp para que un overlay cargado en runtime
(p. ej. menu.bin en 0x100000) se trate como ventana capturable.
"""
import struct
import sys

if len(sys.argv) != 4:
    sys.exit("uso: patch-elf-window.py <elf> <vaddr> <memsz>")

path = sys.argv[1]
vaddr = int(sys.argv[2], 0)
memsz = int(sys.argv[3], 0)
data = bytearray(open(path, "rb").read())

if data[:4] != b"\x7fELF" or data[4] != 1 or data[5] != 1:
    sys.exit("no es un ELF32 little-endian")
if struct.unpack_from("<H", data, 16)[0] != 2:
    sys.exit("no es ET_EXEC")

phoff = struct.unpack_from("<I", data, 28)[0]
phentsize = struct.unpack_from("<H", data, 42)[0]
phnum = struct.unpack_from("<H", data, 44)[0]

for i in range(phnum):
    off = phoff + i * phentsize
    p_type = struct.unpack_from("<I", data, off)[0]
    p_vaddr = struct.unpack_from("<I", data, off + 8)[0]
    if p_type == 1 and p_vaddr == vaddr:
        struct.pack_into("<I", data, off + 16, 0)      # p_filesz
        struct.pack_into("<I", data, off + 20, memsz)  # p_memsz
        open(path, "wb").write(data)
        print(f"patched PT_LOAD 0x{vaddr:x}: filesz=0 memsz=0x{memsz:x}")
        sys.exit(0)

# No PT_LOAD at that address: an executable entry with no contents is a free slot (the
# Japanese ELF has one at address 0). Its program header becomes the window.
for i in range(phnum):
    off = phoff + i * phentsize
    p_type, _, p_vaddr, _, p_filesz, p_memsz, p_flags, _ = struct.unpack_from("<8I", data, off)
    if p_type == 1 and p_filesz == 0 and p_memsz == 0 and p_vaddr == 0 and (p_flags & 1):
        struct.pack_into("<I", data, off + 8, vaddr)   # p_vaddr
        struct.pack_into("<I", data, off + 12, vaddr)  # p_paddr
        struct.pack_into("<I", data, off + 16, 0)      # p_filesz
        struct.pack_into("<I", data, off + 20, memsz)  # p_memsz
        open(path, "wb").write(data)
        print(f"added PT_LOAD 0x{vaddr:x} in an empty entry: filesz=0 memsz=0x{memsz:x}")
        sys.exit(0)

sys.exit(f"no hay PT_LOAD en 0x{vaddr:x} ni una entrada vacía para reutilizar")
