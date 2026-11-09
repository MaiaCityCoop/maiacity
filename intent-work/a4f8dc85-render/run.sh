#!/usr/bin/env bash
# c2's renders of Samuel's character (intent a4f8dc85), on Samuel's Mac: the face fit (CPU) and its renders (Metal).
#   bash intent-work/a4f8dc85-render/run.sh [work folder]        (from the repository's root, on the Mac)
# Needs PLAY_MCP_TOKEN (Samuel's own play token) in the environment, sent to play only. Nothing it makes goes into git:
# the work folder is outside the repository, and the review image goes to Samuel's personal library on play.
# RENDERER=cpu runs the same job with the CPU checker instead (avenBOX); UPLOAD=0 keeps the review image local.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; T="$REPO/tools/character"; W="${1:-$HOME/a4f8dc85-work}"
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN is needed: the photos are fetched from play by hash}"
bash "$T/setup.sh" "$W"; cd "$W"; PY=./venv/bin/python
get() { [ -s "$2" ] || curl -sSf -H "Authorization: Bearer $PLAY_MCP_TOKEN" -o "$2" "https://play.maia.city/api/files/$1"; }
# Samuel's personal library, by hash: his two face photos and his current sheet
get 6aa9786804f987949b864f1dcd540ad83d1737e5a814d530576c805bbd57178e photo-front.jpg   # front, smiling
get bf7e4a5f32d7b249b8b793cefa44dc127106bad1fc9964b152a87a8f254835c3 photo-34.jpg      # three-quarter, smiling, cap
get 0263b59cc6f44a0ee2cd8334d4b42b5df5ade40f13ca83629760876368887a90 sheet.jpg         # the sheet (5504 × 3072)
# its head cells: front · neutral and profile · neutral (bald, plain background)
$PY -c "
from PIL import Image; s = Image.open('sheet.jpg')
s.crop((3905, 40, 3905 + 735, 40 + 698)).save('sheet-front.png'); s.crop((3905, 822, 3905 + 735, 822 + 698)).save('sheet-profile.png')"
export SIL="sheet-front.png:front,sheet-profile.png:profile"
$PY "$T/prepare.py" --years 37 --muscle 0.75 --weight 0.5
$PY "$T/raster.py" s-base-front.json man-front
$PY "$T/lm.py" man-front.png photo-front.jpg photo-34.jpg sheet-front.png 2>&1 | grep -E "pts|NO FACE"
$PY "$T/corr.py"
$PY "$T/fit.py" photo-front photo-34 sheet-front 2>&1 | grep -E "^(base|outline|fitted)"
$PY "$T/apply.py" fit
$PY "$T/texture.py" fit --size 4096 | tail -1
SCENES=$($PY "$T/views.py" fit)
if [ "${RENDERER:-gpu}" = cpu ]; then for s in $SCENES; do $PY "$T/raster.py" "$s" "${s%.json}"; done
else bun "$T/render-gpu.mjs" $SCENES; fi
$PY "$T/compose.py" fit c2-review.jpg photo-front.jpg photo-34.jpg --sheet sheet-front.png sheet-profile.png
if [ "${UPLOAD:-1}" = 1 ]; then
  (cd "$REPO" && bun -e "
import { upload } from './tools/sheet/fal.ts';
const r = await upload('$W/c2-review.jpg', 'Samuel · character · c2 review: renders beside his photos and sheet (${RENDERER:-gpu})', 'personal');
console.log('kept in his personal library:', r.hash);")
fi
cat fit-report.json
