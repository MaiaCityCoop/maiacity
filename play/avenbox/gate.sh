#!/bin/bash
# The checks CI runs, in avenBOX (play/SPEC.md §4.12, "Checks run in avenBOX"): what .github/workflows/play-checks.yml
# and website-checks.yml run, in their order, here, before a push.
#
#   bash play/avenbox/gate.sh                  # all five steps
#   bash play/avenbox/gate.sh api|site|website # one part
#
# It runs up.sh first (Postgres up, TEST_DATABASE_URL set, dependencies installed), prints each step's name and result,
# stops at the first red step, and counts play/api's tests red when any of them is skipped: in avenBOX none is.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PART=${1:-all}
case "$PART" in all | api | site | website) ;; *) echo "gate.sh [api|site|website]"; exit 2 ;; esac
export PATH="$HOME/.bun/bin:$PATH"
bash "$ROOT/play/avenbox/up.sh" || exit 1
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://postgres:play@127.0.0.1:5432/postgres}"
LOG=$(mktemp -d)

# step <name> <dir> <command…>: runs it in <dir>, its output kept in a log and its tail shown when it fails
step() {
  local name=$1 dir=$2
  shift 2
  local log="$LOG/$(echo "$name" | tr -c 'a-z0-9' '-').log" start=$SECONDS
  echo "· $name"
  if (cd "$ROOT/$dir" && "$@") > "$log" 2>&1; then
    local counts
    counts=$(grep -E '^ +[0-9]+ (pass|skip|fail)$' "$log" | xargs | sed 's/ \([0-9]\)/, \1/g')
    echo "✓ $name ($((SECONDS - start)) s${counts:+; $counts})"
  else
    tail -40 "$log"
    echo "✗ $name ($((SECONDS - start)) s; the whole output: $log)"
    exit 1
  fi
}
# play/api's tests, red when one fails or is skipped
api_tests() {
  local out s
  out=$(bun test 2>&1)
  s=$?
  echo "$out"
  [ $s = 0 ] && ! echo "$out" | grep -qE '^ +[1-9][0-9]* (skip|fail)$'
}

if [ "$PART" = all ] || [ "$PART" = api ]; then
  step "play/api types" play/api bunx tsc --noEmit -p .
  step "play/api tests (none skipped)" play/api api_tests
fi
if [ "$PART" = all ] || [ "$PART" = site ]; then
  step "play/site build" play/site bun run build
fi
if [ "$PART" = all ] || [ "$PART" = website ]; then
  step "website check" website bun run check
  step "website build" website bun run build
fi
echo "avenBOX gate: green ($PART)"
