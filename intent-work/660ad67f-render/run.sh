#!/usr/bin/env bash
# c6 of intent 660ad67f on Samuel's Mac (Metal, README.md): the fix's production build served (vite preview), Sandbox 5
# walked and Sandbox 1's film advanced in Chromium and WebKit (look.mjs). Run from anywhere inside the repository; needs
# bun, node and PLAY_MCP_TOKEN (sent to play only, by a read-only proxy on 127.0.0.1:3911). Writes ./out/ beside it.
#   bash intent-work/660ad67f-render/run.sh [commit]   (default: the fix's pull request head, #2203)
set -euo pipefail
: "${PLAY_MCP_TOKEN:?PLAY_MCP_TOKEN: the admin token the read-only proxy reads play with}"
ROOT=$(git rev-parse --show-toplevel)
JOB="$ROOT/intent-work/660ad67f-render"; OUT="$JOB/out"; mkdir -p "$OUT"
git -C "$ROOT" fetch -q origin intent/660ad67f-regressions
C=${1:-$(git -C "$ROOT" rev-parse origin/intent/660ad67f-regressions)}
TREE="$ROOT/../660ad67f-head"
if [ -d "$TREE" ]; then git -C "$TREE" checkout -q --detach "$C"; else git -C "$ROOT" worktree add -q --detach "$TREE" "$C"; fi
echo "serving $C (production build)"
PIDS=(); trap 'kill "${PIDS[@]}" 2>/dev/null || true' EXIT
node -e "
const http = require('node:http');
http.createServer(async (q, s) => {
  if (!['GET','HEAD'].includes(q.method) || !q.url.startsWith('/api/')) return s.writeHead(405).end('read-only');
  try { const r = await fetch('https://play.maia.city' + q.url, { method: q.method, headers: { authorization: 'Bearer ' + process.env.PLAY_MCP_TOKEN, accept: q.headers.accept ?? '*/*', ...(q.headers.range ? { range: q.headers.range } : {}) } });
    s.writeHead(r.status, Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding','content-length','transfer-encoding'].includes(k)))); s.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { s.writeHead(502).end(String(e)); }
}).listen(3911, '127.0.0.1');" >"$OUT/proxy.log" 2>&1 &
PIDS+=($!)
cd "$TREE/play/site"
bun install --frozen-lockfile >/dev/null
bun run build >"$OUT/build.log" 2>&1
PLAY_API=http://localhost:3911 bunx vite preview --port 5190 --strictPort >"$OUT/preview.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 60); do curl -sf http://localhost:5190/ >/dev/null && break; sleep 1; done
# Playwright from the served tree's play/site (Chromium on Metal and WebKit)
# one process per browser, each ending only once its results are written
for b in chromium webkit; do
  rm -f "$OUT/results-$b.json"
  node "$JOB/look.mjs" --site http://localhost:5190 --out "$OUT" --browser "$b" 2>&1 | tee "$OUT/stdout-$b.txt"
  [ -s "$OUT/results-$b.json" ] || { echo "FAILED: $b ended before its results were written"; exit 1; }
done
echo "out: $OUT (commit out/ and push the branch intent-work/660ad67f-render)"
