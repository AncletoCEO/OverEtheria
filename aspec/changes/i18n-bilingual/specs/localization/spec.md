## ADDED Requirements

### Requirement: Inglés por defecto en código y diagnóstico

El proyecto SHALL usar inglés en comentarios de código, mensajes de log, mensajes de
consola de scripts y documentación de producto principal.

#### Scenario: Comentarios del launcher

- **WHEN** se audita `launcher/src/` y `scripts/`
- **THEN** no hay comentarios ni literales de log en español fuera del catálogo de
  traducciones

#### Scenario: Salida de scripts

- **WHEN** un script falla o informa progreso
- **THEN** el mensaje está en inglés y es comprensible sin contexto del idioma del autor

### Requirement: Catálogo de cadenas completo

El launcher SHALL resolver todas sus cadenas visibles a través de un catálogo indexado por
clave, con traducciones para inglés y español.

#### Scenario: Clave sin traducción

- **WHEN** una clave del catálogo no tiene texto en el idioma activo
- **THEN** la UI muestra el texto en inglés y el test de catálogo falla si falta `en` o
  `es`

#### Scenario: Normalización de idioma

- **WHEN** se parsea `es-AR`, `en-US` o un código desconocido
- **THEN** se resuelve a español, inglés e inglés respectivamente

### Requirement: Selector de idioma con cambio en caliente

El launcher SHALL ofrecer un selector de idioma en la interfaz y SHALL aplicar el cambio sin
reiniciar.

#### Scenario: Cambio a español

- **WHEN** el usuario elige Español en la cabecera
- **THEN** pestañas, botones, estados, etiquetas de controles y diálogos se muestran en
  español en el mismo frame

#### Scenario: Cambio a inglés

- **WHEN** el usuario elige English
- **THEN** toda la interfaz vuelve a inglés sin reiniciar ni perder la configuración

### Requirement: Persistencia del idioma

El launcher SHALL guardar la preferencia de idioma en su archivo de configuración y SHALL
respetarla en el siguiente arranque.

#### Scenario: Reinicio

- **WHEN** el usuario elige Español, cierra y vuelve a abrir el launcher
- **THEN** la interfaz arranca en español y `launcher.ini` contiene `language = es`

#### Scenario: Configuración sin idioma

- **WHEN** `launcher.ini` existe pero no tiene la clave `language`
- **THEN** el launcher resuelve el idioma por detección del sistema y no borra el archivo

### Requirement: Resolución de idioma y CLI

El launcher SHALL resolver el idioma con precedencia `--lang` > `OE_LANG` >
`launcher.ini` > locale del SO > `en`, y SHALL localizar su ayuda.

#### Scenario: Flag explícito

- **WHEN** se ejecuta `--lang es --help`
- **THEN** la ayuda se imprime en español y la UI arranca en español

#### Scenario: Variable de entorno

- **WHEN** `OE_LANG=en` está definida y no hay `--lang`
- **THEN** el launcher arranca en inglés aunque el locale del sistema sea español

#### Scenario: Primera ejecución

- **WHEN** no hay preferencia guardada y el sistema está en inglés
- **THEN** la interfaz se muestra íntegramente en inglés

### Requirement: Documentación bilingüe con paridad

El repositorio SHALL mantener `README.md` en inglés y `README.es.md` en español con la
misma información, enlazados entre sí, y SHALL verificar su paridad.

#### Scenario: Navegación entre idiomas

- **WHEN** un visitante abre el repositorio
- **THEN** ve el `README.md` en inglés con un enlace visible a `README.es.md`, y viceversa

#### Scenario: Deriva de contenido

- **WHEN** un README agrega o quita una sección o un enlace relativo sin actualizar el otro
- **THEN** `scripts/check-docs.mjs` falla indicando la diferencia

#### Scenario: Documentación técnica fechada

- **WHEN** un lector entra a `docs/analysis/`
- **THEN** el índice `docs/README.md` aclara que esa evidencia se conserva en español

### Requirement: Política de idioma sin romper artifacts

La política SHALL distinguir documentación de producto (inglés) de artifacts de aspec
(idioma de la conversación) y SHALL preservar los bloques `LOCKED` de `AGENTS.md`.

#### Scenario: Actualización de AGENTS.md

- **WHEN** se traduce `AGENTS.md` al inglés
- **THEN** los bloques `<!-- LOCKED: ... -->` y su contenido permanecen literalmente
  intactos

#### Scenario: Nuevo artifact

- **WHEN** se crea un `proposal.md`, `design.md`, `tasks.md` o `specs/` después de este
  change
- **THEN** se escribe en el idioma de la conversación, como fija la regla LOCKED

### Requirement: Dashboard bilingüe

El sitio SHALL ofrecer selector `EN | ES`, localizar etiquetas, tooltips e hitos, y
recordar la preferencia.

#### Scenario: Cambio de idioma en el sitio

- **WHEN** el usuario elige ES en el dashboard
- **THEN** los textos fijos, contadores, tooltips, tabla e hitos se muestran en español sin
  recargar la página ni volver a pedir los JSON

#### Scenario: Preferencia recordada

- **WHEN** el usuario recarga el sitio después de elegir ES
- **THEN** el sitio arranca en español y `<html lang>` es `es`

#### Scenario: Idioma del navegador

- **WHEN** no hay preferencia guardada y `navigator.language` es `es-*`
- **THEN** el sitio arranca en español; en cualquier otro caso arranca en inglés

### Requirement: Sin regresión de build y distribución

El cambio SHALL mantener los builds de Windows y Linux y el contrato de CLI existente.

#### Scenario: CI del launcher

- **WHEN** se ejecuta `launcher.yml` en `ubuntu-latest` y `windows-latest`
- **THEN** ambos jobs compilan, pasan el test de catálogo y el smoke test de `--version`

#### Scenario: Paquete de release

- **WHEN** se empaqueta una release
- **THEN** el contenido y los argumentos de CLI documentados no cambian por el idioma
