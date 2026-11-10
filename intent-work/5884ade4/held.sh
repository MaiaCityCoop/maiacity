#!/usr/bin/env bash
# The files open intents' branches change (intent 5884ade4 leaves them alone): every intent/* branch of an intent in
# Build or at Proposal other than 5884ade4's, diffed against main. Usage: held.sh <8-hex prefix>... > held.txt
set -euo pipefail
git fetch -q origin main
for p in "$@"; do
  for b in $(git ls-remote origin "refs/heads/intent/$p-*" | awk '{print $2}' | sed 's#refs/heads/##'); do
    git fetch -q origin "$b:refs/remotes/origin/$b"
    git merge-base --is-ancestor "origin/$b" origin/main && continue
    git diff --name-only "origin/main...origin/$b"
  done
done | sort -u
