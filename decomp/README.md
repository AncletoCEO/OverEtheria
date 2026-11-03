# `decomp/` — registro de la decompilación anotada

Acá vive el **conocimiento** del juego: módulos, símbolos, structs y el código
decompilado. **Nunca** se guardan binarios del juego.

## Layout

```
decomp/
  README.md            este archivo
  modules.json         metadatos de los 25 overlays (generado por scripts/extract-overlays.mjs)
  symbols/
    main.csv           símbolos de main (0x4C0000..)
    mission22.csv      símbolos del piloto
    <module>.csv
  structs/
    README.md
    mw_overlay_header.h
  src/
    <module>/<module>.c
  modules/
    <module>.md        informe: funciones, ABI, evidencia y estado
```

- `modules.json` se **regenera**, no se edita a mano:
  `node scripts/extract-overlays.mjs work/elf/OL.BIN --json decomp/modules.json`
- Los binarios extraídos viven en `work/overlays/` (ignorado).
- `scripts/validate-decomp.mjs` es el gate: módulos, hashes, símbolos y ausencia de
  binarios.

## Convención de nombres

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `sub_<ADDR>` | función sin identificar (8 hex, minúsculas) | `sub_154000` |
| `f_<name>` | función identificada | `f_overlay_init` |
| `g_<name>` | variable global | `g_texture_manager` |
| `s_<name>` | struct/tipo | `s_mw_overlay_header` |
| `v_<name>` | variable local o campo | `v_state` |

Reglas:

- Las funciones se nombran por comportamiento verificado, no por parecido.
- Un nombre nuevo reemplaza al `sub_` en el CSV; el `sub_` original queda como
  alias en el informe del módulo.
- Direcciones siempre en hex con `0x` en CSV y docs; 8 dígitos en el nombre.

## Formato de `symbols/*.csv`

Encabezado obligatorio:

```csv
module,address,size,name,kind,source
mission22,0x154000,3392,sub_154000,function,ghidra
```

| Columna | Valores |
|---|---|
| `module` | `main`, `menu`, `mission22`, … (nombre sin `.bin`) |
| `address` | hex `0x…`, dentro de `[base, base + text)` del módulo |
| `size` | bytes (entero > 0) |
| `name` | convención de arriba |
| `kind` | `function`, `global`, `thunk`, `struct`, `enum` |
| `source` | `ghidra`, `manual`, `legacy-csv`, `recomp` |

Una dirección no puede repetirse dentro del mismo módulo. `source` registra de
dónde salió el dato para poder auditarlo.

## Estado

| Módulo | Estado |
|---|---|
| `main` | ingesta inicial + auditoría de cobertura |
| `mission22` | piloto decompilado (pseudocódigo) + mapa verificado |
| `menu` | pendiente |
| `mission01..25` | pendiente |
| `mission98` | vacío: 192 B de ceros (stub) |
