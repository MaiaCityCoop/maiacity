#!/usr/bin/env bash
# c3's bench film of Samuel's character (intent a4f8dc85), on Samuel's Mac: after run.sh (the fit and the texture, in the
# same work folder), the Person head v2 and body v3 fetched from play by hash (each checked against it), his
# face baked into them, his recipe made from samuel.template.js, and the film rendered on Metal (bench-gpu.mjs):
# walk, a quarter turn, sit down, sitting, stand up, wave; friendly throughout, joy where it smiles.
#   bash intent-work/a4f8dc85-render/bench.sh [work folder]      (from the repository's root, on the Mac)
# His face is in the recipe and the film: they stay in the work folder. Only a contact sheet goes to his personal
# library; the film itself is kept on the Mac (bench.mp4), since play keeps a video only in Maia City's Library.
# RENDERER=cpu stops before the film (avenBOX: everything but the GPU).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; T="$REPO/tools/character"; W="${1:-$HOME/a4f8dc85-work}"
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN is needed: the pieces are fetched from play by hash}"
cd "$W"; PY=./venv/bin/python; $PY -c "import blake3" 2>/dev/null || ./venv/bin/pip install -q blake3
mkdir -p pieces
get() { [ -s "pieces/$1.js" ] || curl -sSf -H "Authorization: Bearer $PLAY_MCP_TOKEN" -o "pieces/$1.js" "https://play.maia.city/api/files/$1"; }
HEAD2=04ff652935a0b510c224beb4f369c65a8407b4ce53f73bf3eea63ffb08e884b9; BODY3=b5aec61b1bfc9e91e251b9194d74cd15ada3a8705792973ec31a8074c78cc8bd
# the accepted Person head v2 and body v3, and the pieces they and his recipe name, each checked against its hash
for h in $HEAD2 $BODY3 c6bd60a52004748e86bd99d3a922057c155a76b2ef4ffdb3a41903dd7b60f129 16dadf0099be9638315e10bf913916253a824c32f215ef6bfa7c5e3252fd2d3f \
  87f6540d15a24f7164ff7080290b56bd1067a8e5e1a0357848f06b5314b41bdd e1c0a220afd1949475d88210214ad813e17e6a054406f0a96a798964292e4831 5ce51f9e5126cb38ef44ddbe205b359e0917da6774d28ac1e7931797365004ce; do
  get $h; $PY -c "import blake3,sys; h=blake3.blake3(open('pieces/$h.js','rb').read()).hexdigest(); sys.exit(0 if h=='$h' else print('hash differs: $h', h) or 1)"; done
echo "pieces: head v2 and body v3 fetched and checked"
$PY "$T/bake.py" fit pieces/$HEAD2.js
$PY "$T/make-recipe.py" "$REPO/intent-work/a4f8dc85-render/samuel.template.js" look-fit.json samuel.js
node "$T/build-recipe.mjs" samuel.js pieces 2>/dev/null | tail -1 || bun "$T/build-recipe.mjs" samuel.js pieces | tail -1
[ "${RENDERER:-gpu}" = cpu ] && { echo "RENDERER=cpu: stopped before the film"; exit 0; }
rm -rf bench && bun "$T/bench-gpu.mjs" samuel.js pieces bench 20 24
command -v ffmpeg >/dev/null && ffmpeg -loglevel error -y -framerate 24 -i bench/frames/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 bench.mp4 && echo "film: $W/bench.mp4"
$PY -c "
from PIL import Image
fr=[f'bench/frames/{int(t*24):04d}.png' for t in (1,3,4.5,6,7.2,8.8,10,11.5,13.3,15.5,16.5,18.5)]
ims=[Image.open(f).convert('RGB').resize((640,360)) for f in fr]; s=Image.new('RGB',(640*4,360*3))
for i,im in enumerate(ims): s.paste(im,((i%4)*640,(i//4)*360))
s.save('c3-bench.jpg',quality=88)"
(cd "$REPO" && bun -e "
import { upload } from './tools/sheet/fal.ts';
const r = await upload('$W/c3-bench.jpg', 'Samuel · character · c3 bench: walk, turn, sit, stand, wave (12 frames)', 'personal');
console.log('kept in his personal library:', r.hash);")
