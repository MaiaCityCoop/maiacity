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
worlds=("sandbox-1 all" "sandbox-3 open" "worlds open")
# every count at once, each world's base beside its head under the same load: since 7af6e162 the census waits out its
# 180 s for each view of a world with no asset renderers (Sandbox 3, the worlds view: ./run.ts quiet() takes
# quietness's null as moving), so one after another they outlast a check's 600 s; side by side, the slowest one's time
# the base's tree made once first (../../play/site/scripts/census/tree.ts): three runs adding one worktree at once collide
bun -e "import { treeAt } from './play/site/scripts/census/tree.ts'; treeAt('$base')" > /dev/null
pids=()
for w in "${worlds[@]}"; do
  set -- $w
  bun play/site/scripts/census.ts --world "$1" --view "$2" --at "$base" --json "$out/$1.base.json" > "$out/$1.base.log" 2>&1 & pids+=($!)
  bun play/site/scripts/census.ts --world "$1" --view "$2" --json "$out/$1.head.json" > "$out/$1.head.log" 2>&1 & pids+=($!)
done
for p in "${pids[@]}"; do wait "$p" || { echo "a census run failed:"; tail -n 20 "$out"/*.log; exit 1; }; done
fail=0
for w in "${worlds[@]}"; do
  set -- $w
  a=$(jq -cS '[.views[] | {view, totals}]' "$out/$1.base.json")
  b=$(jq -cS '[.views[] | {view, totals}]' "$out/$1.head.json")
  if [ "$a" = "$b" ]; then echo "same  $1 ($2) at ${base:0:7} and HEAD"; else echo "DIFF  $1 ($2)"; diff <(echo "$a" | jq .) <(echo "$b" | jq .) || true; fail=1; fi
done
exit $fail
