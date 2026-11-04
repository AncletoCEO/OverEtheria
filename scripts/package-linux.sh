#!/usr/bin/env bash
# Arma el AppImage del launcher con linuxdeploy.
#
#   bash scripts/package-linux.sh <directorio-de-build> <salida> [version]
#
# El paquete NO contiene contenido del juego: el usuario aporta su ISO y prepara.
# Requiere: cmake, ninja, g++, libsdl2-dev, wget, file, desktop-file-utils.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
build="${1:-$repo/build/launcher}"
out="${2:-$repo/build/dist}"
version="${3:-dev}"

exe="$build/bin/overetheria-launcher"
[ -x "$exe" ] || { echo "falta $exe (compilá launcher con cmake)" >&2; exit 1; }
mkdir -p "$out"

appdir="$out/OverEtheria.AppDir"
rm -rf "$appdir"
mkdir -p "$appdir/usr/bin" "$appdir/usr/share/applications" "$appdir/usr/share/icons/hicolor/scalable/apps"

cp "$exe" "$appdir/usr/bin/"
cp "$repo/launcher/overetheria.desktop" "$appdir/usr/share/applications/"
cp "$repo/launcher/icon.svg" "$appdir/usr/share/icons/hicolor/scalable/apps/overetheria.svg"
cp -r "$repo/scripts" "$appdir/usr/bin/scripts"
cp -r "$repo/patches" "$appdir/usr/bin/patches"
cp "$repo/README.md" "$appdir/usr/bin/README.md"
cp "$repo/launcher/README.md" "$appdir/usr/bin/LAUNCHER.md"

# El launcher busca scripts/ junto al ejecutable: en el AppImage el binario vive en
# usr/bin y los scripts también, así que la búsqueda relativa funciona.
tools="$out/linuxdeploy"
mkdir -p "$tools"
if [ ! -x "$tools/linuxdeploy-x86_64.AppImage" ]; then
    wget -q -O "$tools/linuxdeploy-x86_64.AppImage" \
        https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage
    chmod +x "$tools/linuxdeploy-x86_64.AppImage"
fi

export OUTPUT="OverEtheria-$version-linux-x86_64.AppImage"
export APPIMAGE_EXTRACT_AND_RUN=1
"$tools/linuxdeploy-x86_64.AppImage" --appdir "$appdir" \
    --executable "$appdir/usr/bin/overetheria-launcher" \
    --desktop-file "$appdir/usr/share/applications/overetheria.desktop" \
    --icon-file "$appdir/usr/share/icons/hicolor/scalable/apps/overetheria.svg" \
    --output appimage
mv "$OUTPUT" "$out/"
echo "listo: $out/$OUTPUT"
