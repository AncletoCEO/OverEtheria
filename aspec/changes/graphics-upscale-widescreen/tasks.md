# Tasks: Upscale interno y widescreen nativo (Hor+) sin distorsión

## Fase 0 — Re-verificación y línea base

- [ ] Medir el estado actual: capturas en 4:3 y 16:9 (estirado) de una escena con
      objetos circulares, HUD y un FMV; guardar fps y resolución de ventana.
- [ ] Confirmar cómo aplica hoy el launcher `--widescreen` y `PS2_SCALE` en el runtime.
- [ ] Documentar la línea base en `docs/analysis/07-runtime-nativo.md`.

**Gate**: capturas 4:3/16:9 actuales archivadas con fps y resolución.

## Fase 1 — Auditoría de FOV y parches

- [ ] Localizar en `SLES_537.68` y `SLPM_660.33` las constantes/instrucciones de la
      matriz de proyección (aspect, `lui`/`lwc1`/`mtc1`).
- [ ] Cruzar con los cheats de widescreen de PCSX2 como referencia.
- [ ] Elegir el mecanismo: `.pnach`/toggles del runtime o hook de cámara.
- [ ] Dejar las direcciones en un archivo de parches por versión (EU/JP).

**Gate**: un parche aplicado cambia el FOV sin tocar nada más.

## Fase 2 — Hor+ y frustum

- [ ] Aplicar Hor+ (`(16/9)/(4/3)` y 21:9 si aplica) en `main` y en una misión.
- [ ] Ampliar los planos laterales de culling.
- [ ] Verificar proporciones 1:1 de la geometría y ausencia de pop-in en los bordes.

**Gate**: capturas 4:3 vs 16:9 con la misma cámara y objetos circulares sin deformar.

## Fase 3 — HUD 4:3 y FMV

- [ ] Componer la capa 2D en un área segura 4:3 centrada.
- [ ] Reproducir `.PSS` en 4:3 con pillarbox.
- [ ] Verificar retratos, textos, barras y diálogos sin estiramiento.

**Gate**: HUD y FMV con proporciones originales en 16:9.

## Fase 4 — Escalado interno GS

- [ ] Soportar multiplicadores 1×–6× en el rasterizador.
- [ ] Corregir *half-pixel offset* y costuras de textura.
- [ ] Añadir filtro de presentación: entero, bilineal y nitidez (CAS).
- [ ] Medir fps por multiplicador y documentar el recomendado.

**Gate**: 3× a 1080p sin costuras visibles y con fps jugables.

## Fase 5 — Launcher y persistencia

- [ ] Pestaña «Video» con resolución interna, aspecto, modo de HUD y filtro.
- [ ] Persistir en `launcher.ini` y pasar los argumentos/entorno a `ps2run`.
- [ ] Verificar que reiniciar el launcher conserva los ajustes.

**Gate**: los ajustes se eligen desde la UI y sobreviven al reinicio.

## Fase 6 — Documentación y cierre

- [ ] Documentar el pipeline y las mediciones con capturas.
- [ ] Sincronizar el spec y archivar el change.
