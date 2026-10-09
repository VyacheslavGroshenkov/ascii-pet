#!/usr/bin/env bash
# Собирает build/AsciiPet.app (ad-hoc подпись).
#   --install  скопировать в ~/Applications и запустить;
#   --public   без приватных анимаций из local/ — для всего, что уходит наружу (релизы и т. п.).
set -euo pipefail

INSTALL=0 PUBLIC=0
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    --public) PUBLIC=1 ;;
    *) echo "unknown flag: $arg (use --install and/or --public)" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/build/AsciiPet.app"
VERSION=1.0

cd "$ROOT"
[ -f Resources/pieces.js ] || ./scripts/fetch-pieces.sh
WITH_LOCAL=0
if [ "$PUBLIC" = 0 ] && [ -f local/pieces.json ]; then
  WITH_LOCAL=1
  [ -f local/pieces.js ] || ./scripts/fetch-pieces.sh
fi
# Без фильтров и `|| true`: упавшая сборка должна останавливать скрипт, а не упаковывать прошлый бинарник.
swift build -c release --arch arm64 --arch x86_64
BIN="$(swift build -c release --arch arm64 --arch x86_64 --show-bin-path)/AsciiPet"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/AsciiPet"
cp Resources/pieces.js Resources/pieces.json Resources/ascii.rest-LICENSE.txt "$APP/Contents/Resources/"
if [ "$WITH_LOCAL" = 1 ]; then
  cp local/pieces.js "$APP/Contents/Resources/local-pieces.js"
  cp local/pieces.json "$APP/Contents/Resources/local-pieces.json"
fi

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>AsciiPet</string>
  <key>CFBundleIdentifier</key><string>local.asciipet</string>
  <key>CFBundleName</key><string>AsciiPet</string>
  <key>CFBundleDisplayName</key><string>AsciiPet</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
EOF

# allow-jit: без него JavaScriptCore в приложении работает без JIT — анимации в 15–20 раз медленнее.
codesign --force --sign - --options runtime --entitlements Resources/AsciiPet.entitlements "$APP"
codesign --verify --strict "$APP"
echo "OK: $APP$([ "$WITH_LOCAL" = 1 ] && echo " (with private pieces from local/)")"

if [ "$INSTALL" = 1 ]; then
  mkdir -p "$HOME/Applications"
  pkill -x AsciiPet 2>/dev/null || true
  rm -rf "$HOME/Applications/AsciiPet.app"
  cp -R "$APP" "$HOME/Applications/"
  open "$HOME/Applications/AsciiPet.app"
  echo "Installed: ~/Applications/AsciiPet.app"
fi
