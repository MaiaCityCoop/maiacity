#!/usr/bin/env bash
# Intent 90de96fb, a Mac job (WebGL on Metal): the posters of story 55b69416's world shots, each at its first frame.
set -euo pipefail
cd "$(dirname "$0")/../../play/site"
bun install --frozen-lockfile >/dev/null
OUT="$(cd ../.. && pwd)/intent-work/90de96fb-render/out"
rm -rf "$OUT"
bun scripts/world-posters.ts --story 55b69416-8516-47dc-a235-781a8c08c640 --intent 90de96fb-2ea0-40f9-8f7e-515d07201ece --out "$OUT"
cd "$OUT"
for f in player-*.png; do sips -g pixelWidth -g pixelHeight "$f" | tail -2 | tr '\n' ' '; echo " $f"; done
rm -rf project fixture.json live-runtime.js
