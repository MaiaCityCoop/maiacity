#!/usr/bin/env bash
# Proposes the forest dome's 31 things, then the dome, to play over its MCP (README.md). Needs PLAY_MCP_TOKEN. Stops at
# the first refusal. Run from the repository's root: bash play/proposals/forest-dome/run.sh
set -euo pipefail
here=play/proposals/forest-dome
propose=play/site/scripts/propose.mjs
: "${PLAY_MCP_TOKEN:?an admin token of play (made on its profile page) is needed in PLAY_MCP_TOKEN}"
node "$propose" --file "$here/forest-dome.js" --check --pending "$here/things.json"
for slug in $(node -e "console.log(Object.keys(require('./$here/things.json')).join(' '))"); do
	label=$(node -e "console.log(require('./$here/things.json')['$slug'].label)")
	echo "== things/$slug ($label)"
	node "$propose" --file "$here/things/$slug.js" --group things --label "$label" --slug "$slug" --note "$here/notes/$slug.md"
done
echo "== buildings/forest-dome"
node "$propose" --file "$here/forest-dome.js" --group buildings --label "Forest dome · 80 m" --slug forest-dome --note "$here/notes/forest-dome.md" --pending "$here/things.json"
