#!/usr/bin/env bash
# upload.sh <name> <mp4> <label> : the shot's video and its still (a frame from its middle) to play; hashes to hashes.json
set -euo pipefail
D=$(cd "$(dirname "$0")" && pwd); N=$1; V=$2; L=$3; H=${HASHES:-hashes.json}; [ -f "$H" ] || echo '{}' > "$H"
mid=$(python3 -c "print($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")/2)")
ffmpeg -y -loglevel error -ss "$mid" -i "$V" -frames:v 1 -q:v 3 "/tmp/$N.jpg"
python3 - "$V" "/tmp/$N.jpg" "$L" > /tmp/$N.v.json <<'P'
import base64,json,sys; print(json.dumps({"data":base64.b64encode(open(sys.argv[1],'rb').read()).decode(),"media_type":"video/mp4","label":sys.argv[3]}))
P
python3 - "$V" "/tmp/$N.jpg" "$L" > /tmp/$N.f.json <<'P'
import base64,json,sys; print(json.dumps({"data":base64.b64encode(open(sys.argv[2],'rb').read()).decode(),"media_type":"image/jpeg","label":sys.argv[3]+" (still)"}))
P
vh=$(bun "$D/mcp.ts" add_story_video /tmp/$N.v.json | grep -oE '[0-9a-f]{64}' | head -1)
fh=$(bun "$D/mcp.ts" add_story_frame /tmp/$N.f.json | grep -oE '[0-9a-f]{64}' | head -1)
python3 - "$H" "$N" "$vh" "$fh" <<'P'
import json,sys; f,n,v,fr=sys.argv[1:]; d=json.load(open(f)); d[n]={"video":v,"frame":fr}; json.dump(d,open(f,'w'),indent=1)
P
echo "$N video $vh frame $fh"
