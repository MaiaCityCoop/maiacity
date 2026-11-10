#!/usr/bin/env bash
# Behaviour check of intent 5884ade4: play/site's own checks, which nothing ran before, green outside the files open
# intents change (./held.txt): svelte-check reports no error and vitest no failing test in a file not held.
#   site-checks.sh [all|app|structures-1|structures-2]
# all: everything; app: svelte-check and every test but Sandbox 2's structural tests (src/lib/sandbox-2/tests, ~1,300 s
# of CPU); structures-1: its two slowest files; structures-2: the rest of them. Each part fits in the box's 600 s a
# check, all together they do not.
set -uo pipefail
part=${1:-all}
cd "$(git rev-parse --show-toplevel)"
held=intent-work/5884ade4/held.txt
out=$(mktemp -d)
STRUCTURES=src/lib/sandbox-2/tests/
SLOWEST=("${STRUCTURES}telescopic-shoring.test.ts" "${STRUCTURES}dome-size.test.ts")
cd play/site
case $part in
  all) files=() ; exclude=() ;;
  app) files=() ; exclude=(--exclude "$STRUCTURES**") ;;
  structures-1) files=("${SLOWEST[@]}") ; exclude=() ;;
  structures-2) files=("$STRUCTURES") ; exclude=(--exclude "${SLOWEST[0]}" --exclude "${SLOWEST[1]}") ;;
  *) echo "site-checks.sh [all|app|structures-1|structures-2]"; exit 2 ;;
esac
if [ "${part%-*}" != structures ]; then
  bunx svelte-kit sync > /dev/null
  bunx svelte-check --tsconfig ./tsconfig.json --output machine > "$out/check.txt" 2>&1
else : > "$out/check.txt"; fi
bunx vitest run --config ../../intent-work/5884ade4/vitest.config.mts --root . "${exclude[@]}" --reporter=json --outputFile="$out/vitest.json" "${files[@]}" > "$out/vitest.log" 2>&1
cd ../..
errs=$(grep ' ERROR ' "$out/check.txt" | awk '{gsub(/"/,"",$3); print "play/site/"$3}' | grep -vxFf "$held" || true)
fails=$(jq -r '.testResults[] | select(.status != "passed") | .name' "$out/vitest.json" 2>/dev/null | sed "s#^$(pwd)/##" | grep -vxFf "$held" || true)
ran=$(jq -r '.numTotalTests' "$out/vitest.json" 2>/dev/null || echo 0)
[ "${part%-*}" != structures ] && { echo "svelte-check errors outside held files: $(printf '%s' "$errs" | grep -c . || true)"; printf '%s\n' "$errs" | sort | uniq -c | sed '/^ *0 *$/d;/^ *1 $/d'; }
echo "vitest ($part): $ran tests; failing files outside held files: $(printf '%s' "$fails" | grep -c . || true)"; printf '%s\n' "$fails" | sed '/^$/d'
[ -z "$errs" ] && [ -z "$fails" ] && [ "$ran" -gt 0 ]
