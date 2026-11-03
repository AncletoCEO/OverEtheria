# Formato `SIMB`

Contenedor de assets usado por **todos** los `.BIN` grandes del disco
(`OL.BIN`, `CHARA.BIN`, `BG.BIN`, `EFFECT.BIN`, `INTER.BIN`, `EED…EEU.BIN`).

## Header observado

| Offset | Tipo | Valor (ejemplo `OL.BIN`) | Interpretación |
|---:|---|---|---|
| `0x00` | char[4] | `53 49 4D 42` (`SIMB`) | magic |
| `0x04` | u32 LE | `25` | cantidad de entradas del TOC |
| `0x08` | u32 LE | `1` | desconocido (¿tipo/versión?) |
| `0x0C` | u32 LE | `2605` | total de sub-entradas (≈ suma de `count`) |
| `0x10` | u32 LE | `1` | desconocido |
| `0x14`–`0x1F` | — | ceros | reservado |

## Tabla de contenidos

A partir de `0x20`, **16 bytes por entrada**, `entry_count` entradas:

| Offset | Tipo | Interpretación |
|---:|---|---|
| `+0x00` | u32 | índice acumulado (suma de `count` previos) |
| `+0x04` | u32 | `count` de sub-entradas del blob |
| `+0x08` | u32 | tamaño del blob **incluyendo su header de 0x40** |
| `+0x0C` | u32 | desconocido (crece ~0x10 por entrada; ver abajo) |

Verificación hecha sobre `OL.BIN`:

- `count = 25` → coincide con los 25 overlays.
- `size` de la primera entrada = `169.344` = `0x40` + text + data de `mission16.bin`. ✔
- La suma de `size` + `0x800` (header + padding) cierra con el tamaño del archivo
  salvo padding de alineación.
- El campo desconocido vale `0, 0x10, 0x20, 0x30, 0x40, 0x58, 0x68, …`: incrementa
  de a `0x10` con un salto de `+8` después de la quinta entrada. Probablemente un
  id/offset interno, no un índice.

## Layout de los blobs

```
0x0000  header (0x20)
0x0020  TOC (entry_count * 16)
....    padding
0x0800  blob 0  ← alineado a 2048 B
....    padding a 2048
        blob 1
        ...
```

Cada blob de `OL.BIN` empieza con un header [`MWo`](mwo.md). En los contenedores de
assets (`CHARA`, `BG`, …) el contenido interno todavía **no está documentado**.

## Entradas observadas

| Archivo | Magic | `count` (`+4`) | `+8` | `+0xC` |
|---|---|---:|---:|---:|
| `OL.BIN` | SIMB | 25 | 1 | 2605 |
| `CHARA.BIN` | SIMB | 167 | 2 | 76833 |
| `BG.BIN` | SIMB | 113 | 1 | 69036 |
| `EFFECT.BIN` | SIMB | 28 | 1 | 2755 |
| `INTER.BIN` | SIMB | 657 | 6 | 85717 |
| `EED.BIN` | SIMB | 432 | 4 | 3626 |
| `EEE.BIN` | SIMB | 432 | 4 | 3658 |
| `EEF.BIN` | SIMB | 432 | 4 | 3342 |
| `EEI.BIN` | SIMB | 432 | 4 | 3264 |
| `EEU.BIN` | SIMB | 432 | 4 | 3149 |

## Preguntas abiertas

- ¿Qué son `+0x08` y `+0x0C` del header?
- ¿El campo desconocido del TOC es un id, un offset o un checksum?
- ¿Los blobs de `CHARA`/`BG`/`INTER` tienen su propio header? (ver `MWo` y strings)
- ¿Los `EE*.BIN` comparten estructura entre idiomas? (mismo `count` = 432, sí)

## Reproducir

`node scripts/inspect-disc.mjs "Sword of Etheria.iso"` imprime magic y `count` de
cada contenedor. Para el TOC de `OL.BIN`, extraer el archivo con 7-Zip y volcar los
primeros 0x200 bytes.
