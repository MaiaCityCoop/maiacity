#!/bin/bash
# The tested tree (intent 5ab64b8e), for play-checks.yml and website-checks.yml on a push to main: whether the pushed
# commit's tree is the very tree a successful pull_request run of this repository's .github/workflows/main.yml tested,
# for the pull request merged as that commit, in the job named CHECK. That job, on a pull request, ends by printing the
# tree it tested as a notice titled "Tested tree" (its check run's annotation); GitHub's API is asked for it here.
#
#   EVENT=push REPO=<owner/name> SHA=<pushed commit> CHECK='play / API and site' GH_TOKEN=… bash tested-tree.sh
#
# Writes skip=true to $GITHUB_OUTPUT only when the trees are equal: the same bytes passed already, so the job passes
# without running them again. Anything else (another event, no merged pull request, a run that failed, was cancelled
# or is another workflow's or repository's, no notice, a different tree, any error of the API): skip=false, and the job
# runs its checks in full. It never fails the job itself.
set -uo pipefail
API=${GITHUB_API_URL:-https://api.github.com}
OUT=${GITHUB_OUTPUT:-/dev/stdout}
WORKFLOW=.github/workflows/main.yml

decide() {
  echo "skip=$1" >> "$OUT"
  echo "tested tree: $2"
  exit 0
}
get() {
  curl -fsS --max-time 15 --retry 2 -H "Authorization: Bearer ${GH_TOKEN:-}" -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" "$API/repos/$REPO/$1"
}

[ "${EVENT:-}" = push ] || decide false "not a push (${EVENT:-none}): the checks run"
[[ "${SHA:-}" =~ ^[0-9a-f]{40}$ ]] || decide false "no commit ('${SHA:-}'): the checks run"
[ -n "${REPO:-}" ] && [ -n "${CHECK:-}" ] || decide false "no repository or check named: the checks run"

tree=$(get "git/commits/$SHA" | jq -er '.tree.sha') || decide false "the pushed commit's tree could not be read: the checks run"
pull=$(get "commits/$SHA/pulls" | jq -er --arg s "$SHA" \
  '[.[] | select(.merged_at != null and .merge_commit_sha == $s)][0] | select(. != null) | "\(.number) \(.head.sha)"') \
  || decide false "$SHA is no pull request's merge: the checks run"
read -r number head <<< "$pull"
[[ "$head" =~ ^[0-9a-f]{40}$ ]] || decide false "#$number names no head: the checks run"

runs=$(get "actions/runs?event=pull_request&head_sha=$head&per_page=100" | jq -er --arg r "$REPO" --arg w "$WORKFLOW" \
  '[.workflow_runs[] | select(.path == $w and .event == "pull_request" and .status == "completed" and .conclusion == "success"
     and (.repository.full_name | ascii_downcase) == ($r | ascii_downcase))] | sort_by(.id) | reverse | map(.id) | .[]') \
  || decide false "no successful run of $WORKFLOW for #$number's head ${head::7}: the checks run"
for run in $runs; do
  job=$(get "actions/runs/$run/jobs?per_page=100" | jq -er --arg c "$CHECK" \
    '[.jobs[] | select(.name == $c and .status == "completed" and .conclusion == "success")][0].id | select(. != null)') || continue
  tested=$(get "check-runs/$job/annotations?per_page=100" | jq -er \
    '[.[] | select(.annotation_level == "notice" and .title == "Tested tree") | .message | select(test("^[0-9a-f]{40}$"))] | last | select(. != null)') || continue
  if [ "$tested" = "$tree" ]; then
    decide true "'$CHECK' passed on this very tree ($tree) for #$number (run $run): not run again"
  fi
  decide false "'$CHECK' for #$number (run $run) tested $tested, not the pushed tree $tree: the checks run"
done
decide false "no passed '$CHECK' for #$number's head ${head::7} says what tree it tested: the checks run"
