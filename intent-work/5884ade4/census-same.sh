#!/usr/bin/env bash
# Behaviour check of intent 5884ade4: every world the census counts draws the same at this head as at main (the merge
# base): per world and view, its totals (triangles, draws, instances, shadow and culled counts) equal. On the CPU in
# Bun, no GPU (play/site/scripts/census.ts), each from the inputs pinned in play/site/scripts/census/inputs.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# main as play/avenbox/vs-main.ts finds it: a runner's checkout has no origin/main, or too little history for a base
git rev-parse -q --verify origin/main > /dev/null || git fetch -q --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
[ "$(git rev-parse --is-shallow-repository)" = true ] && git fetch -q --no-tags --unshallow origin '+refs/heads/main:refs/remotes/origin/main'
base=$(git merge-base HEAD origin/main)
out=$(mktemp -d)
fail=0
for w in "sandbox-1 all" "sandbox-3 open" "worlds open"; do
  set -- $w
  bun play/site/scripts/census.ts --world "$1" --view "$2" --at "$base" --json "$out/$1.base.json" > /dev/null
  bun play/site/scripts/census.ts --world "$1" --view "$2" --json "$out/$1.head.json" > /dev/null
  a=$(jq -cS '[.views[] | {view, totals}]' "$out/$1.base.json")
  b=$(jq -cS '[.views[] | {view, totals}]' "$out/$1.head.json")
  if [ "$a" = "$b" ]; then echo "same  $1 ($2) at ${base:0:7} and HEAD"; else echo "DIFF  $1 ($2)"; diff <(echo "$a" | jq .) <(echo "$b" | jq .) || true; fail=1; fi
done
exit $fail
