#!/usr/bin/env bash
set -u
PIDS=()
trap 'kill "${PIDS[@]}" 2>/dev/null' EXIT
port=5201
for s in main head; do
  (cd /home/user/shot-$s/play/site && PLAY_API=http://localhost:3913 bunx vite dev --port $port --strictPort > /tmp/claude-0/shots/vite-$s.log 2>&1) &
  PIDS+=($!)
  port=$((port+1))
done
for p in 5201 5202; do for _ in $(seq 1 120); do curl -sf http://localhost:$p/ >/dev/null && break; sleep 2; done; done
cd /home/user/shot-head/play/site && node /tmp/claude-0/shots/shoot.mjs --site head=http://localhost:5202 --out /tmp/claude-0/shots/out
echo "shoot exit $?"
