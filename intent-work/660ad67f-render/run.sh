#!/usr/bin/env bash
# c6 of intent 660ad67f on Samuel's Mac (Metal): this branch's site served, Sandbox 5 and Sandbox 1 looked at in
# Chromium and WebKit (look.mjs). From the repository's root:  bash intent-work/660ad67f-render/run.sh [out folder]
# Needs PLAY_MCP_TOKEN (sent to play only, by selector-shots' kind of read-only proxy: here vite's PLAY_API to play).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; OUT="${1:-$HOME/660ad67f-look}"
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN is needed: the worlds read play}"
cd "$REPO/play/site" && bun install >/dev/null
bunx playwright install webkit >/dev/null 2>&1 || true
# a read-only proxy to play on 127.0.0.1:3911 (GET/HEAD of /api only, the token to play only)
node -e "
const http = require('node:http');
http.createServer(async (q, s) => {
  if (!['GET','HEAD'].includes(q.method) || !q.url.startsWith('/api/')) return s.writeHead(405).end('read-only');
  try { const r = await fetch('https://play.maia.city' + q.url, { method: q.method, headers: { authorization: 'Bearer ' + process.env.PLAY_MCP_TOKEN, accept: q.headers.accept ?? '*/*', ...(q.headers.range ? { range: q.headers.range } : {}) } });
    s.writeHead(r.status, Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding','content-length','transfer-encoding'].includes(k)))); s.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { s.writeHead(502).end(String(e)); }
}).listen(3911, '127.0.0.1');" & PROXY=$!
PLAY_API=http://localhost:3911 bunx vite dev --port 5190 --strictPort >"$OUT.vite.log" 2>&1 & VITE=$!
trap 'kill $PROXY $VITE 2>/dev/null || true' EXIT
for i in $(seq 60); do curl -sf http://localhost:5190/ >/dev/null && break; sleep 2; done
cd "$REPO" && node intent-work/660ad67f-render/look.mjs --site http://localhost:5190 --out "$OUT"
