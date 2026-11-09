#!/usr/bin/env bash
# Behaviour check of intent 5884ade4: play/site's own checks, which nothing ran before, green outside the files open
# intents change (./held.txt): svelte-check reports no error and vitest no failing test in a file not held.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
held=intent-work/5884ade4/held.txt
out=$(mktemp -d)
cd play/site
bunx svelte-kit sync > /dev/null
bunx svelte-check --tsconfig ./tsconfig.json --output machine > "$out/check.txt" 2>&1
bunx vitest run --reporter=json --outputFile="$out/vitest.json" > "$out/vitest.log" 2>&1
cd ../..
errs=$(grep ' ERROR ' "$out/check.txt" | awk '{gsub(/"/,"",$3); print "play/site/"$3}' | grep -vxFf "$held" || true)
fails=$(jq -r '.testResults[] | select(.status != "passed") | .name' "$out/vitest.json" 2>/dev/null | sed "s#^$(pwd)/##" | grep -vxFf "$held" || true)
ran=$(jq -r '.numTotalTests' "$out/vitest.json" 2>/dev/null || echo 0)
echo "svelte-check errors outside held files: $(printf '%s' "$errs" | grep -c . || true)"; printf '%s\n' "$errs" | sort | uniq -c | sed '/^ *0 *$/d;/^ *1 $/d'
echo "vitest: $ran tests; failing files outside held files: $(printf '%s' "$fails" | grep -c . || true)"; printf '%s\n' "$fails" | sed '/^$/d'
[ -z "$errs" ] && [ -z "$fails" ] && [ "$ran" -gt 0 ]
