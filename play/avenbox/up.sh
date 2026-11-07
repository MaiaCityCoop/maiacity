#!/bin/bash
# avenBOX in a session (play/SPEC.md §4.12, "Checks run in avenBOX"): makes the box ready for every check a spec runs.
# The SessionStart hook (.claude/settings.json) runs it as a cloud session starts; run it by hand any time. It
#
#   - starts PostgreSQL on 127.0.0.1:5432 if it is down (setup.sh first, if there is no cluster on that port), and
#     waits until it answers;
#   - writes TEST_DATABASE_URL (the URL play-checks.yml uses) into $CLAUDE_ENV_FILE, where the hook has one, so every
#     command of the session has it;
#   - installs a part's dependencies (play/api, play/site, website) where they are missing or older than its bun.lock.
#   - ends, where PLAY_MCP_TOKEN is not set, by telling the session it is not on avenBOX and must hand its work over.
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

if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -qs "^export TEST_DATABASE_URL=$URL\$" "$CLAUDE_ENV_FILE"; then
  echo "export TEST_DATABASE_URL=$URL" >> "$CLAUDE_ENV_FILE"
fi

for d in play/api play/site website; do
  dir="$ROOT/$d"
  if [ -f "$dir/bun.lock" ] && { [ ! -d "$dir/node_modules" ] || [ "$dir/bun.lock" -nt "$dir/node_modules" ]; }; then
    (cd "$dir" && bun install --frozen-lockfile > /dev/null 2>&1 && touch node_modules) && say "$d's dependencies installed" || say "could not install $d's dependencies"
  fi
done

version=$(PGPASSWORD=play psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc 'show server_version' postgres 2> /dev/null | cut -d' ' -f1)
say "PostgreSQL ${version:-?} on 127.0.0.1:$PORT; TEST_DATABASE_URL=$URL"

# all work on play is done in an avenBOX session (play/SPEC.md §4.12): a session without play's MCP hands it over
if [ -z "${PLAY_MCP_TOKEN:-}" ]; then
  say "no PLAY_MCP_TOKEN: this session is not on avenBOX (env_011Zm65erarH7ffXio13u5pG) and has no play MCP. Build," \
    "push and record nothing here: start a session on avenBOX with the work's brief and hand the work over to it."
fi
