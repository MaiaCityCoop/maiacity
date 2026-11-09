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
# Sandbox 1's pair first (it is the heavy one), then the two worlds that wait out their 180 s side by side: since
# 7af6e162 the census never sees a world with no asset renderers settle (Sandbox 3, the worlds view: ./run.ts quiet()
# takes quietness's null as moving), so its counts are taken at the timeout, and one after another the six counts
# outlast a check's 600 s. Each world's base runs beside its head, under the same load.
# the base's tree made once first (../../play/site/scripts/census/tree.ts): runs adding one worktree at once collide
bun -e "import { treeAt } from './play/site/scripts/census/tree.ts'; treeAt('$base')" > /dev/null
count() { # <world> <view> <tag>: the base and the head counted side by side, in the background
  bun play/site/scripts/census.ts --world "$1" --view "$2" --at "$base" --json "$out/$1.base$3.json" > "$out/$1.base$3.log" 2>&1 &
  bun play/site/scripts/census.ts --world "$1" --view "$2" --json "$out/$1.head$3.json" > "$out/$1.head$3.log" 2>&1 &
}
settle() { wait || true; for f in "$@"; do [ -s "$f" ] || { echo "a census run failed:"; tail -n 20 "$out"/*.log; exit 1; }; done; }
same() { [ "$(jq -cS '[.views[] | {view, totals}]' "$out/$1.base$2.json")" = "$(jq -cS '[.views[] | {view, totals}]' "$out/$1.head$2.json")" ]; }
count sandbox-1 all; settle "$out"/sandbox-1.{base,head}.json
count sandbox-3 open; count worlds open; settle "$out"/{sandbox-3,worlds}.{base,head}.json
fail=0
for w in "sandbox-1 all" "sandbox-3 open" "worlds open"; do
  set -- $w
  if same "$1" ""; then echo "same  $1 ($2) at ${base:0:7} and HEAD"; continue; fi
  # a world counted at its timeout can catch one copy more or less on one side: counted again, a real change shows again
  echo "differed once: $1 ($2), counted again"
  count "$1" "$2" .2; settle "$out/$1.base.2.json" "$out/$1.head.2.json"
  if same "$1" .2; then echo "same  $1 ($2) at ${base:0:7} and HEAD (counted again)"; else
    echo "DIFF  $1 ($2)"; diff <(jq -S '[.views[] | {view, totals}]' "$out/$1.base.2.json") <(jq -S '[.views[] | {view, totals}]' "$out/$1.head.2.json") || true; fail=1; fi
done
exit $fail
