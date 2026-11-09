#!/usr/bin/env bash
# tools/character's CPU chain, smoke-run on no one's face: MakeHuman's CC0 base head, rendered here on the CPU, stands in
# for the photo, so the fit must land at least as close as the base head (it starts there). Then the texture, the
# review's scenes rendered on the CPU (raster.py) and the review image. With PLAY_MCP_TOKEN also the bake into the
# accepted Person head v2 and the character's recipe built on its pieces (node, CPU); without one those are skipped.
#   bash tools/character/smoke.sh [work folder]          (from the repository's root; the folder is made outside the repo)
set -euo pipefail
T="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$T/../.." && pwd)"; W="${1:-$(mktemp -d)}"
bash "$T/setup.sh" "$W" >/dev/null; cd "$W"; PY=./venv/bin/python
$PY "$T/prepare.py" --years 37 >/dev/null
$PY "$T/raster.py" s-base-front.json man-front
cp man-front.png photo-front.png
$PY "$T/lm.py" man-front.png photo-front.png
$PY "$T/corr.py"
$PY "$T/fit.py" photo-front | grep -E "^(base|fitted)"
$PY -c "
import json, sys; r = json.load(open('fit-report.json')); b, f = r['base']['photo-front']['mean_px'], r['fitted']['photo-front']['mean_px']
sys.exit(0 if f <= b and f < 2 else print(f'FAIL: the fit {f} px against the base head {b} px') or 1)"
echo "ok: the fit lands within 2 px of the landmarks, no further than the base head"
$PY "$T/apply.py" fit
$PY "$T/texture.py" fit --size 512 | tail -1
SCENES=$($PY "$T/views.py" fit); for s in $SCENES; do $PY "$T/raster.py" "$s" "${s%.json}"; done
$PY "$T/compose.py" fit review.jpg photo-front.png
test -s review.jpg && test -s tex-fit.png && echo "ok: the fit, its texture and its review rendered on the CPU"
if [ -n "${PLAY_MCP_TOKEN:-}" ]; then
  mkdir -p pieces; HEAD2=04ff652935a0b510c224beb4f369c65a8407b4ce53f73bf3eea63ffb08e884b9
  curl -sSf -H "Authorization: Bearer $PLAY_MCP_TOKEN" -o pieces/$HEAD2.js "https://play.maia.city/api/files/$HEAD2"
  $PY "$T/bake.py" fit pieces/$HEAD2.js | tail -1
  $PY "$T/make-recipe.py" "$REPO/intent-work/a4f8dc85-render/samuel.template.js" look-fit.json baked.js >/dev/null
  node "$T/build-recipe.mjs" baked.js pieces | tail -1 | grep -q '"skinned":1' && echo "ok: baked into the Person head v2 and built on its pieces"
else echo "skipped: the bake and the recipe build (no PLAY_MCP_TOKEN to fetch play's pieces)"; fi
