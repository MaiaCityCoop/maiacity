#!/usr/bin/env bash
# What a frame of Sandbox 1 costs Safari's engine, part by part (intent 0356b0ea), on Samuel's Mac (Metal).
#   bash intent-work/0356b0ea-render/run.sh [--browser webkit,chromium] [--world /sandbox-1/]   (from the repository's root)
# Needs bun; no token, no network: the site's build served from the pinned inputs, as play/site/scripts/gpu.ts does.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO/play/site"
[ -d node_modules ] || bun install
bun run build > /dev/null
bun "$REPO/intent-work/0356b0ea-render/parts.ts" "$@"
