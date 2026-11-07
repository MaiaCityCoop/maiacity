#!/bin/bash
# The workflows' lint (intent aa59f248): actionlint, pinned, before a push. gate.sh runs it as its `lint` step.
#
#   bash play/avenbox/actionlint.sh              # every workflow in .github/workflows
#   bash play/avenbox/actionlint.sh <file>…      # these files
#   bash play/avenbox/actionlint.sh --install    # only make sure it is installed (setup.sh, up.sh)
#
# Built once from Go's module proxy at the pinned version, its module hash checked against the one pinned here (Go
# checks it against its checksum database as it downloads; this holds it to the very release we read), and kept under
# ~/.cache/avenbox. Shellcheck and pyflakes are off, so the result never depends on what else the box has installed.
set -u
VERSION=v1.7.7
SUM="h1:0KgkoNTrYY7vmOCs9BW2AHxLvvpoY9nEUzgBHiPUr0k="
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
DIR="${AVENBOX_CACHE:-$HOME/.cache/avenbox}"
BIN="$DIR/actionlint-$VERSION"
export PATH="$PATH:/usr/local/go/bin"

if [ ! -x "$BIN" ]; then
  command -v go > /dev/null || { echo "actionlint: no Go in this box to build it with"; exit 1; }
  tmp=$(mktemp -d)
  if ! GOBIN="$tmp" GOFLAGS=-mod=mod go install "github.com/rhysd/actionlint/cmd/actionlint@$VERSION" > "$tmp/log" 2>&1; then
    tail -5 "$tmp/log"
    echo "actionlint: could not build $VERSION"
    exit 1
  fi
  got=$(go version -m "$tmp/actionlint" | awk '$1 == "mod" && $2 == "github.com/rhysd/actionlint" { print $3, $4 }')
  if [ "$got" != "$VERSION $SUM" ]; then
    echo "actionlint: built '$got', not the pinned '$VERSION $SUM'"
    exit 1
  fi
  mkdir -p "$DIR" && mv "$tmp/actionlint" "$BIN" && rm -rf "$tmp"
fi
[ "${1:-}" = --install ] && exit 0
cd "$ROOT" && exec "$BIN" -shellcheck= -pyflakes= "$@"
