#!/bin/bash
# Main's ruleset as code (intent f7721142): puts deploy/rulesets/main.json on the repository as its ruleset named
# "main" (updated in place when there is one, else created), with its merge queue, then sets the repository's merge
# commits to carry the pull request's title and body, so every merge commit keeps its `Intent:` line.
#
#   GH_TOKEN=<an admin's token> bash deploy/ruleset.sh [owner/name] [--dry-run]
#
# The repository defaults to MyAvenCEO/maiacity. --dry-run prints the requests it would send and sends none (it still
# reads the rulesets, when GH_TOKEN is set, to say whether it would PUT or POST). The token is never printed.
set -euo pipefail
REPO=MyAvenCEO/maiacity
DRY=false
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=true ;;
    */*) REPO=$a ;;
    *) echo "ruleset.sh: [owner/name] [--dry-run], not '$a'" >&2; exit 2 ;;
  esac
done
API=${GITHUB_API_URL:-https://api.github.com}
RULESET="$(dirname "$0")/rulesets/main.json"
NAME=$(jq -er .name "$RULESET")
REPO_SETTINGS='{"merge_commit_title":"PR_TITLE","merge_commit_message":"PR_BODY"}'

gh_api() { # <method> <path> [body]
  local args=(-fsS --max-time 30 -X "$1" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28"
    -H "Authorization: Bearer $GH_TOKEN")
  [ $# -ge 3 ] && args+=(-H "Content-Type: application/json" --data-binary "$3")
  curl "${args[@]}" "$API$2"
}
send() { # <method> <path> <body>
  if $DRY; then
    echo "$1 $API$2"
    echo "$3" | jq .
  else
    gh_api "$1" "$2" "$3" | jq -c '{id, name, enforcement} | with_entries(select(.value != null))' 2> /dev/null || true
    echo "$1 $API$2: done"
  fi
}

if [ -z "${GH_TOKEN:-}" ]; then
  $DRY || { echo "ruleset.sh: GH_TOKEN (an admin's token) is needed" >&2; exit 2; }
  id=""
else
  id=$(gh_api GET "/repos/$REPO/rulesets?per_page=100" | jq -r --arg n "$NAME" '[.[] | select(.name == $n)][0].id // empty')
fi

body=$(jq -c . "$RULESET")
if [ -n "$id" ]; then
  echo "ruleset '$NAME' of $REPO is $id: updated in place"
  send PUT "/repos/$REPO/rulesets/$id" "$body"
else
  echo "no ruleset '$NAME' on $REPO: created"
  [ -n "${GH_TOKEN:-}" ] || echo "(dry run without GH_TOKEN: if '$NAME' exists, PUT /repos/$REPO/rulesets/<its id> instead)"
  send POST "/repos/$REPO/rulesets" "$body"
fi
echo "merge commits carry the pull request's title and body"
send PATCH "/repos/$REPO" "$REPO_SETTINGS"
