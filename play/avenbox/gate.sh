#!/bin/bash
# The checks, in avenBOX (play/SPEC.md §4.12, "Checks run in avenBOX"): run here before a push, and by CI itself
# (.github/workflows/play-checks.yml: `api` and `site`; website-checks.yml: `website`); and the workflows' lint.
#
#   bash play/avenbox/gate.sh                       # what this change touched (intent aa59f248; ./select.ts)
#   bash play/avenbox/gate.sh --all                 # everything, as CI and main run it
#   bash play/avenbox/gate.sh --plan                # what it would run, and why; runs nothing
#   bash play/avenbox/gate.sh api|site|website|lint # one part, whole (as before: other intents' checks run these)
#   bash play/avenbox/gate.sh lint <file>…          # the lint on these workflow files
#   bash play/avenbox/gate.sh site-tests            # play/site's own tests (vitest), only when asked: neither CI nor
#                                                   # the gate's default runs them (a speed decision left to Samuel)
#   bash play/avenbox/gate.sh api --no-up           # without up.sh: the caller has Postgres answering at
#                                                   # TEST_DATABASE_URL and the part's dependencies installed (CI)
#
# What a change touched: since the merge base with origin/main, plus the working tree (GATE_CHANGED="<paths>" names
# them instead). play/api's tests are the ones that import a changed file or name it; all of them when a change is
# one everything depends on or can't be placed, and everything runs when there is no merge base (a shallow checkout).
# CI and main never narrow: they run the whole suite (play-checks.yml).
#
# It runs up.sh first (Postgres up, TEST_DATABASE_URL set, dependencies installed), prints each step's name and result,
# stops at the first red step, and counts play/api's tests red when any of them is skipped: in avenBOX none is. The
# tests run in parallel (one worker per core, each test file its own database).
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PART=all ALL=0 PLAN=0 UP=1 FILES=()
for a in "$@"; do
  case "$a" in
    --all) ALL=1 ;;
    --plan) PLAN=1 ;;
    --no-up) UP=0 ;;
    all | api | site | website | lint | site-tests) PART=$a ;;
    -*) echo "gate.sh [all|api|site|website|lint|site-tests] [--all] [--plan] [--no-up]"; exit 2 ;;
    *) [ "$PART" = lint ] && FILES+=("$a") || { echo "gate.sh [all|api|site|website|lint|site-tests] [--all] [--plan] [--no-up]"; exit 2; } ;;
  esac
done
export PATH="$HOME/.bun/bin:$PATH"

# the plan: every step with --all, else select.ts's for what changed; one part keeps only its own steps
if [ ${#FILES[@]} -gt 0 ]; then
  PLANNED="step lint"
elif [ "$PART" = site-tests ]; then
  PLANNED="step site-tests"
elif [ $ALL = 1 ] || [ "$PART" != all ]; then
  PLANNED=$(bun "$ROOT/play/avenbox/select.ts" --all)
else
  PLANNED=$(bun "$ROOT/play/avenbox/select.ts")
fi
case "$PART" in
  api) KEEP='^step api-|^test ' ;;
  site) KEEP='^step site-' ;;
  website) KEEP='^step website-' ;;
  lint) KEEP='^step lint' ;;
  site-tests) KEEP='^step site-tests' ;;
  *) KEEP='^step |^test ' ;;
esac
STEPS=$(echo "$PLANNED" | grep -E "$KEEP" | grep '^step ' | cut -c6-)
TESTS=$(echo "$PLANNED" | grep '^test ' | cut -c6-)
if [ $PLAN = 1 ]; then
  echo "gate.sh plan ($PART${ALL:+$([ $ALL = 1 ] && echo ', --all')}):"
  echo "$PLANNED" | grep '^why ' | sed 's/^why /  why: /'
  for s in $STEPS; do
    if [ "$s" = api-tests ]; then
      [ -n "$TESTS" ] && echo "  step api-tests: $(echo "$TESTS" | wc -l) files" && echo "$TESTS" | sed 's/^/    /' || echo "  step api-tests: every file"
    else
      echo "  step $s"
    fi
  done
  [ -n "$STEPS" ] || echo "  (nothing to run)"
  exit 0
fi

has() { echo "$STEPS" | grep -qx "$1"; }
if [ $UP = 1 ] && { has api-types || has api-tests || has site-build || has website-check || has site-tests; }; then
  bash "$ROOT/play/avenbox/up.sh" || exit 1
fi
. "$ROOT/play/avenbox/box.env"
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-$BOX_DATABASE_URL}"
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
    # on GitHub the whole output, folded (a runner keeps no log file)
    [ -n "${GITHUB_ACTIONS:-}" ] && echo "::group::$name" && cat "$log" && echo "::endgroup::"
    echo "✓ $name ($((SECONDS - start)) s${counts:+; $counts})"
  else
    if [ -n "${GITHUB_ACTIONS:-}" ]; then cat "$log"; else tail -40 "$log"; fi
    echo "✗ $name ($((SECONDS - start)) s; the whole output: $log)"
    exit 1
  fi
}
# play/api's tests (the files given, or every one), in parallel; red when one fails or is skipped
api_tests() {
  local out s
  out=$(bun test --parallel "$@" 2>&1)
  s=$?
  echo "$out"
  [ $s = 0 ] && ! echo "$out" | grep -qE '^ +[1-9][0-9]* (skip|fail)$'
}

START=$SECONDS
has api-types && step "play/api types" play/api bunx tsc --noEmit -p .
if has api-tests; then
  if [ -n "$TESTS" ]; then
    # shellcheck disable=SC2046
    step "play/api tests, $(echo "$TESTS" | wc -l) files this change touched (none skipped)" play/api api_tests $(echo "$TESTS")
  else
    step "play/api tests (none skipped)" play/api api_tests
  fi
fi
has site-build && step "play/site build" play/site bun run build
has site-tests && step "play/site tests (vitest)" play/site bunx vitest run
has website-check && step "website check" website bun run check
has website-build && step "website build" website bun run build
has lint && step "workflows' lint (actionlint)" . bash play/avenbox/actionlint.sh "${FILES[@]}"
[ -n "$STEPS" ] || echo "nothing of the gate's touched by this change (gate.sh --all runs everything)"
echo "avenBOX gate: green ($PART$([ $ALL = 1 ] && echo ', --all'); $((SECONDS - START)) s)"
