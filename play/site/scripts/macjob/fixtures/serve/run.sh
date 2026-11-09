#!/usr/bin/env bash
# A fixture of the dry run's tests (../../dry.test.ts): a server started in a command substitution that keeps its
# stdout, so $(…) never ends (6fd5e63f's first run.sh).
set -euo pipefail
serve() { (cd "$(dirname "$0")" && bunx vite dev --port 5199) & echo $!; }
P=$(serve)
echo "never reached $P"
