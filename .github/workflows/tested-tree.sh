#!/bin/bash
# The tested tree (intent 5ab64b8e; the merge queue, intent f7721142), for play-checks.yml and website-checks.yml on a
# push to main: whether the pushed commit is the very commit a merge group of main's merge queue tested. The queue
# runs this repository's .github/workflows/main.yml on the group's commit (event merge_group) and, once the required
# checks pass there, fast-forwards main to that same commit; so a successful merge_group run whose head is the pushed
# SHA, with the job of the required check PART names (../required-checks.json) passed, tested the pushed tree itself.
# GitHub's API is asked for it here.
#
#   EVENT=push REPO=<owner/name> SHA=<pushed commit> PART=play|website GH_TOKEN=… bash tested-tree.sh
#
# Writes skip=true to $GITHUB_OUTPUT only then: the same bytes passed already, so the job passes without running them
# again; a run still finishing counts once that job passed (the queue moves main as the required checks pass, perhaps
# before the run itself is marked done). Anything else (another event, no such run, a run that failed or was
# cancelled or is another workflow's, event's or repository's, the job not passed, any error of the API): skip=false, and the job runs its
# checks in full. It never fails the job itself.
set -uo pipefail
API=${GITHUB_API_URL:-https://api.github.com}
OUT=${GITHUB_OUTPUT:-/dev/stdout}
WORKFLOW=.github/workflows/main.yml
CHECK=$(jq -r --arg p "${PART:-}" '.[$p] // empty' "$(dirname "$0")/../required-checks.json" 2> /dev/null)

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
[ -n "${REPO:-}" ] && [ -n "${CHECK:-}" ] || decide false "no repository or required check named: the checks run"

runs=$(get "actions/runs?event=merge_group&head_sha=$SHA&per_page=100" | jq -er --arg r "$REPO" --arg w "$WORKFLOW" --arg s "$SHA" \
  '[.workflow_runs[] | select(.path == $w and .event == "merge_group" and .head_sha == $s and (.conclusion == null or .conclusion == "success")
     and (.repository.full_name | ascii_downcase) == ($r | ascii_downcase))] | sort_by(.id) | reverse | map(.id) | .[]') \
  || decide false "no passing merge_group run of $WORKFLOW for ${SHA::7}: the checks run"
for run in $runs; do
  if get "actions/runs/$run/jobs?per_page=100" | jq -e --arg c "$CHECK" \
    'any(.jobs[]; .name == $c and .status == "completed" and .conclusion == "success")' > /dev/null; then
    decide true "'$CHECK' passed on this very commit in the merge queue (run $run): not run again"
  fi
done
decide false "no merge_group run passed '$CHECK' on ${SHA::7}: the checks run"
