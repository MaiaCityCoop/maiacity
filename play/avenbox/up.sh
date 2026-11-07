#!/bin/bash
# avenBOX in a session (play/SPEC.md §4.12, "Checks run in avenBOX"): makes the box ready for every check a spec runs.
# The SessionStart hook (.claude/settings.json) runs it as a cloud session starts; run it yourself any time. It
#
#   - starts PostgreSQL on 127.0.0.1:5432 if it is down (setup.sh first, if there is no cluster on that port), and
#     waits until it answers;
#   - writes TEST_DATABASE_URL (the URL play-checks.yml uses) into $CLAUDE_ENV_FILE, where the hook has one, so every
#     command of the session has it;
#   - installs a part's dependencies (play/api, play/site, website) where they are missing or older than its bun.lock.
#
# It is only the box: gate.sh and every check run call it too, so it says nothing about where it runs.
#
# On a ready box it takes well under 10 s and leaves the running server alone. It exits 1 only when Postgres can't be
# made to answer.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PORT=5432
URL="postgres://postgres:play@127.0.0.1:$PORT/postgres"
export PATH="$HOME/.bun/bin:$PATH"
say() { echo "avenBOX: $*"; }
ready() { pg_isready -q -h 127.0.0.1 -p "$PORT" 2> /dev/null; }
# starting a cluster is root's (avenBOX runs as root; main's runner has sudo)
as_root() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo -n "$@"; fi; }
# the cluster set to our port (pg_lsclusters: version, name, port …)
ours() { pg_lsclusters -h 2> /dev/null | awk -v p="$PORT" '$3 == p { print $1, $2; exit }'; }

if ! ready; then
  if [ -z "$(ours)" ]; then
    say "no PostgreSQL cluster on port $PORT yet: setting the box up first"
    as_root env "PATH=$PATH" bash "$ROOT/play/avenbox/setup.sh"
  fi
  read -r V C <<< "$(ours)"
  if [ -n "${V:-}" ]; then
    as_root pg_ctlcluster "$V" "$C" start > /dev/null 2>&1 || {
      # a pid file left behind by a container that stopped (a snapshot keeps files, not processes)
      pid="/var/lib/postgresql/$V/$C/postmaster.pid"
      if as_root test -f "$pid" && ! as_root kill -0 "$(as_root head -1 "$pid")" 2> /dev/null; then as_root rm -f "$pid"; fi
      as_root pg_ctlcluster "$V" "$C" start > /dev/null 2>&1
    }
  fi
  for _ in $(seq 1 40); do ready && break; sleep 0.25; done
fi
if ! ready; then
  say "PostgreSQL does not answer on 127.0.0.1:$PORT (see /var/log/postgresql/); the checks that need it will fail"
  exit 1
fi

# room for the API's tests in parallel (intent aa59f248; setup.sh sets it on a new cluster): a box made before has 100
MAXC=500
pq() { PGPASSWORD=play psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc "$1" postgres 2> /dev/null; }
if [ "$(pq 'show max_connections')" -lt "$MAXC" ] 2> /dev/null; then
  read -r V C <<< "$(ours)"
  pq "ALTER SYSTEM SET max_connections = $MAXC" > /dev/null && [ -n "${V:-}" ] && as_root pg_ctlcluster "$V" "$C" restart > /dev/null 2>&1
  for _ in $(seq 1 40); do ready && break; sleep 0.25; done
  say "max_connections: $(pq 'show max_connections')"
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qs "^export TEST_DATABASE_URL=$URL\$" "$CLAUDE_ENV_FILE"; then
  echo "export TEST_DATABASE_URL=$URL" >> "$CLAUDE_ENV_FILE"
fi

for d in play/api play/site website; do
  dir="$ROOT/$d"
  if [ -f "$dir/bun.lock" ] && { [ ! -d "$dir/node_modules" ] || [ "$dir/bun.lock" -nt "$dir/node_modules" ]; }; then
    (cd "$dir" && bun install --frozen-lockfile > /dev/null 2>&1 && touch node_modules) && say "$d's dependencies installed" || say "could not install $d's dependencies"
  fi
done
# the site's $lib for `bun test` on its files (intent 67d5e185): SvelteKit's tsconfig, which a build writes too
if [ -d "$ROOT/play/site/node_modules" ] && [ ! -f "$ROOT/play/site/.svelte-kit/tsconfig.json" ]; then
  (cd "$ROOT/play/site" && bunx svelte-kit sync > /dev/null 2>&1) || say "could not sync play/site's SvelteKit types"
fi

# the workflows' lint (intent aa59f248), built once if it is missing
bash "$ROOT/play/avenbox/actionlint.sh" --install > /dev/null 2>&1 || say "could not install actionlint (gate.sh lint tries again)"

version=$(PGPASSWORD=play psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc 'show server_version' postgres 2> /dev/null | cut -d' ' -f1)
say "PostgreSQL ${version:-?} on 127.0.0.1:$PORT; TEST_DATABASE_URL=$URL"
