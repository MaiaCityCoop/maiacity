#!/usr/bin/env bash
# c9 of intent 8823eb7c on Samuel's Mac (Metal): the fix's site served by the dev server against play read-only, and the
# Pickup, Fiat 500 F, City bus and Delivery van opened in the asset viewer (look.mjs). From the repository's root:
#   bash intent-work/8823eb7c-render/run.sh [out folder]
# Needs PLAY_MCP_TOKEN (sent to play only, by play/site/scripts/macjob/proxy.mjs on 127.0.0.1:3911).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; OUT="${1:-$HOME/8823eb7c-look}"; mkdir -p "$OUT"
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN is needed: the viewer reads play}"
cd "$REPO/play/site" && bun install >/dev/null
bun -e "import { playProxy } from './scripts/macjob/proxy.mjs'; await playProxy(3911); await new Promise(() => {});" & PROXY=$!
PLAY_API=http://localhost:3911 bunx vite dev --port 5191 --strictPort >"$OUT/vite.log" 2>&1 & VITE=$!
trap 'kill $PROXY $VITE 2>/dev/null || true' EXIT
for i in $(seq 60); do curl -sf http://localhost:5191/ >/dev/null && break; sleep 2; done
cd "$REPO" && node intent-work/8823eb7c-render/look.mjs --site http://localhost:5191 --out "$OUT"
