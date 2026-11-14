#!/usr/bin/env bash
# deploy/admin-keys.pub's keys to root's authorized_keys on the server, run on a workflow's runner once
# .github/actions/prod-ssh has made `ssh prod` (production.yml's server job). Append only: a key already there is left
# as it is, nothing is removed or rewritten. Every line is checked as a public key first; anything else stops it.
# AK (default /root/.ssh/authorized_keys) and SUDO (default sudo) are only for its test.
set -euo pipefail
FILE=${1:-deploy/admin-keys.pub}
AK=${AK:-/root/.ssh/authorized_keys}
SUDO=${SUDO-sudo}
KEYS=$(grep -vE '^[[:space:]]*(#|$)' "$FILE" || true)
[ -n "$KEYS" ] || { echo "no admin keys in $FILE"; exit 0; }
while IFS= read -r line; do
  case "$line" in *PRIVATE*) echo "::error::$FILE holds a private key"; exit 1 ;; esac
  printf '%s\n' "$line" | ssh-keygen -lf - || { echo "::error::$FILE: not a public key: ${line:0:40}…"; exit 1; }
done <<< "$KEYS"

# on the server, as root: the keys on stdin, the file as $1
read -r -d '' REMOTE <<'EOS' || true
set -euo pipefail
umask 077
AK=$1
mkdir -p "$(dirname "$AK")"; chmod 700 "$(dirname "$AK")"
touch "$AK"; chmod 600 "$AK"
while IFS= read -r line; do
  body=$(awk '{print $2}' <<< "$line")
  if grep -qF -- "$body" "$AK"; then echo "already there: ${line##* }"
  else printf '%s\n' "$line" >> "$AK"; echo "added: ${line##* }"; fi
done
EOS
printf '%s\n' "$KEYS" | ssh prod "$SUDO bash -c $(printf %q "$REMOTE") admin-keys $(printf %q "$AK")"
