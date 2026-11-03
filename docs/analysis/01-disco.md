# 01 — El disco

## Verificación

| Dato | Valor |
|---|---|
| Archivo | `Sword of Etheria.iso` (raíz del repo) |
| Tamaño | 4.472.995.840 B = 4,17 GiB = 4,47 GB |
| MD5 | `b9c5115b77b7f05fbf14a67df8d3f99d` |
| Esperado por el proyecto previo | idéntico |
| Sistema de archivos | ISO9660 (sectores de 2048 B, archivos contiguos) |
| Archivos | 87 (61 son películas `.PSS`) |

Reproducir:

```bash
node scripts/inspect-disc.mjs "Sword of Etheria.iso" --md5
```

## Contenido

### Ejecutable y módulos IOP

| Archivo | Bytes | Formato |
|---|---:|---|
| `SYSTEM.CNF` | 56 | texto (`BOOT2 = cdrom0:\SLES_537.68;1`, `VMODE = PAL`) |
| `SLES_537.68` | 6.457.864 | ELF32 MIPS (ver `02`) |
| `IOP/IOPRP300.IMG` | 275.345 | imagen del IOP |
| `IOP/SIO2MAN.IRX` | 6.641 | módulo IRX |
| `IOP/PADMAN.IRX` | 44.869 | módulo IRX (pad) |
| `IOP/SIO2D.IRX` | 11.289 | módulo IRX |
| `IOP/DBCMAN.IRX` | 15.653 | módulo IRX |
| `IOP/MC2_D.IRX` | 20.501 | módulo IRX (memory card) |
| `IOP/CDVDSTM.IRX` | 33.521 | módulo IRX (CD/DVD) |
| `IOP/LIBSD.IRX` | 28.661 | módulo IRX (audio) |
| `IOP/SDRDRV.IRX` | 9.161 | módulo IRX (streaming) |
| `IOP/LIBSMF2.IRX` | 130.501 | módulo IRX (música MIDI) |
| `IOP/SDSTR3.IRX` | 38.885 | módulo IRX (streaming) |
| `IOP/SD_CALL.IRX` | 69.221 | módulo IRX |

### Contenedores de datos

| Archivo | Bytes | Magic | Entradas (u32 en +4) | Rol |
|---|---:|---|---:|---|
| `OL.BIN` | 5.337.088 | `SIMB` | 25 | **overlays** (`MWo`) |
| `CHARA.BIN` | 157.358.080 | `SIMB` | 167 | personajes |
| `BG.BIN` | 141.387.776 | `SIMB` | 113 | escenarios |
| `EFFECT.BIN` | 5.644.288 | `SIMB` | 28 | efectos |
| `INTER.BIN` | 175.560.704 | `SIMB` | 657 | interacción/interface |
| `EED.BIN` | 7.438.336 | `SIMB` | 432 | variante de idioma |
| `EEE.BIN` | 7.241.728 | `SIMB` | 432 | variante de idioma |
| `EEF.BIN` | 6.856.704 | `SIMB` | 432 | variante de idioma |
| `EEI.BIN` | 6.696.960 | `SIMB` | 432 | variante de idioma |
| `EEU.BIN` | 6.461.440 | `SIMB` | 432 | variante de idioma |
| `SD.BIN` | 715.327.488 | `TYOSD v-1.28` | — | audio |
| `OUT.BIN` | 52.428.800 | ceros | — | relleno de disco |

Formato de los contenedores: [`../formats/simb.md`](../formats/simb.md),
[`../formats/mwo.md`](../formats/mwo.md) y [`../formats/tyosd.md`](../formats/tyosd.md).

### Películas

- **61 archivos `.PSS`** en `MOVIE/00` … `MOVIE/03`.
- ~3,18 GB, el **71 % del disco**.
- Incluyen `TITLE.PSS`, `TITLE2.PSS`, las cinemáticas de misión (`M02_E1` … `M29_E1`),
  los finales (`EPI*`), los cortos (`SHORT*`) y los créditos (`STAFF*`).

## Observaciones

- `OUT.BIN` son 52.428.800 B de ceros (muestreado en todo el archivo). Parece relleno
  para completar la capa del DVD; no es un asset.
- Los cinco `EE*.BIN` tienen **exactamente 432 entradas** cada uno: son la misma
  estructura de datos en cinco idiomas (el ISO es `En,Fr,De,Es,It`).
- El ISO está en la raíz del repo por comodidad, pero **está ignorado por git**.
  No moverlo mientras haya procesos abiertos; no versionarlo nunca.
