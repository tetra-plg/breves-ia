#!/bin/bash
# Installe Brèves IA dans /Applications SANS quarantaine.
#
# Pourquoi : l'app est signée ad-hoc (pas de Developer ID + notarisation).
# Sur macOS 26, le codeSigningMonitor refuse le JIT de V8 à une app Electron
# ad-hoc *quarantinée* → crash SIGTRAP au boot. Une app non quarantinée est
# traitée comme du code local et tourne normalement. Ce script retire la
# quarantaine AVANT le premier lancement (l'ordre est crucial).
#
# Usage : ./scripts/install-local.sh [chemin/vers/app-ou-dmg]
#   Sans argument : prend le dernier .app de out/, sinon le dernier .dmg de out/make.
set -euo pipefail

APP_NAME="Brèves IA.app"
DEST="/Applications/$APP_NAME"
SRC="${1:-}"
MNT=""

cleanup() { [ -n "$MNT" ] && hdiutil detach "$MNT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Résoudre la source
if [ -z "$SRC" ]; then
  if [ -d "out/Brèves IA-darwin-arm64/$APP_NAME" ]; then
    SRC="out/Brèves IA-darwin-arm64/$APP_NAME"
  else
    SRC="$(ls -t out/make/*.dmg 2>/dev/null | head -1 || true)"
  fi
fi
[ -n "$SRC" ] || { echo "❌ Aucune source (.app ou .dmg) trouvée. Lance 'npm run make' d'abord."; exit 1; }

# Si DMG : monter et pointer sur l'app à l'intérieur
case "$SRC" in
  *.dmg)
    echo "→ Montage du DMG : $SRC"
    MNT="$(hdiutil attach "$SRC" -nobrowse -readonly | grep '/Volumes/' | sed 's#.*/Volumes/#/Volumes/#')"
    SRC="$MNT/$APP_NAME"
    ;;
esac
[ -d "$SRC" ] || { echo "❌ App introuvable : $SRC"; exit 1; }

# Remplacer proprement toute install précédente (purge l'état provenance poisonné)
if [ -e "$DEST" ]; then
  echo "→ Suppression de l'ancienne install"
  rm -rf "$DEST"
fi

echo "→ Copie vers $DEST"
cp -R "$SRC" "$DEST"

# CRUCIAL : retirer la quarantaine AVANT le premier lancement
echo "→ Retrait de la quarantaine"
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "✅ Installé. Lance l'app : open \"$DEST\""
