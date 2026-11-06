#!/bin/bash
# avenBOX's setup (play/SPEC.md §4.12, "Checks run in avenBOX"). avenBOX is the cloud environment our agents work on
# play in (env_01BqgqGckrzz4FdXd8SD4HHd); its own setup script only finds this file, wherever the repository is cloned,
# and runs it as root when a container is built fresh, before the session starts. It
#
#   - installs PostgreSQL 17, the major CI runs (postgres:17-alpine in .github/workflows/play-checks.yml), from
#     apt.postgresql.org;
#   - makes its cluster 17/main on 127.0.0.1:5432, the postgres role's password `play` (the image's own 16/main, if
#     there is one, moves to port 5433 and no longer starts by itself);
#   - installs the dependencies of play/api, play/site and website.
#
# Run again it changes nothing. It never fails a session: what it can't do (no network, say) it says, and exits 0;
# up.sh, which starts the box in every session, then makes do with what is there. It leaves Postgres stopped: a
# container's processes don't outlive its setup, up.sh starts it.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PG=17
PORT=5432
export PATH="$HOME/.bun/bin:/usr/lib/postgresql/$PG/bin:$PATH"
say() { echo "avenBOX setup: $*"; }
[ "$(id -u)" = 0 ] || { say "run me as root (the environment's setup script does); nothing done"; exit 0; }

# PostgreSQL 17 from apt.postgresql.org (Ubuntu's own stops at 16)
if [ ! -x "/usr/lib/postgresql/$PG/bin/postgres" ]; then
  say "installing PostgreSQL $PG from apt.postgresql.org"
  if (
    set -e
    . /etc/os-release
    install -d /usr/share/postgresql-common/pgdg /etc/postgresql-common/createcluster.d
    # the cluster is made below, on our port, not by the package
    echo "create_main_cluster = false" > /etc/postgresql-common/createcluster.d/avenbox.conf
    curl -fsSL --max-time 30 --retry 2 -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    timeout 300 apt-get update -qq -o Acquire::Retries=2 -o APT::Update::Error-Mode=any
    DEBIAN_FRONTEND=noninteractive timeout 600 apt-get install -y -qq --no-install-recommends "postgresql-$PG" > /dev/null
  ); then
    say "PostgreSQL $PG installed"
  else
    rm -f /etc/apt/sources.list.d/pgdg.list
    say "could not install PostgreSQL $PG (no network?); up.sh uses the PostgreSQL there is"
  fi
fi

# the cluster on 127.0.0.1:5432: 17/main if 17 is there, else the newest there is
if command -v pg_lsclusters > /dev/null; then
  if [ -x "/usr/lib/postgresql/$PG/bin/postgres" ]; then V=$PG; else V=$(ls /usr/lib/postgresql 2>/dev/null | sort -n | tail -1); fi
  if [ -n "${V:-}" ]; then
    # any other cluster on our port steps aside: to port 5433, started only by hand
    pg_lsclusters -h 2>/dev/null | while read -r v c port _; do
      if [ "$port" = "$PORT" ] && [ "$v/$c" != "$V/main" ]; then
        pg_ctlcluster "$v" "$c" stop > /dev/null 2>&1
        sed -i "s/^port = $PORT\b.*/port = $((PORT + 1))/" "/etc/postgresql/$v/$c/postgresql.conf"
        echo manual > "/etc/postgresql/$v/$c/start.conf"
        say "cluster $v/$c moved off port $PORT"
      fi
    done
    if [ ! -f "/etc/postgresql/$V/main/postgresql.conf" ]; then
      pg_createcluster "$V" main -p "$PORT" > /dev/null && say "cluster $V/main made on port $PORT" || say "could not make cluster $V/main"
    else
      sed -i "s/^port = .*/port = $PORT/" "/etc/postgresql/$V/main/postgresql.conf"
    fi
    if [ -f "/etc/postgresql/$V/main/postgresql.conf" ]; then
      running=0
      pg_isready -q -h 127.0.0.1 -p "$PORT" && running=1
      [ $running = 1 ] || pg_ctlcluster "$V" main start > /dev/null 2>&1
      for _ in $(seq 1 30); do pg_isready -q -h 127.0.0.1 -p "$PORT" && break; sleep 0.5; done
      if su postgres -c "psql -q -p $PORT -c \"ALTER ROLE postgres PASSWORD 'play'\"" > /dev/null 2>&1; then
        say "PostgreSQL $V on 127.0.0.1:$PORT, postgres's password set"
      else
        say "could not set postgres's password on cluster $V/main"
      fi
      [ $running = 1 ] || pg_ctlcluster "$V" main stop > /dev/null 2>&1
    fi
  fi
else
  say "no PostgreSQL tools in this image"
fi

# the dependencies, as CI installs them
if command -v bun > /dev/null; then
  for d in play/api play/site website; do
    if [ -f "$ROOT/$d/bun.lock" ]; then
      (cd "$ROOT/$d" && timeout 300 bun install --frozen-lockfile > /dev/null 2>&1 && touch node_modules) && say "$d's dependencies installed" || say "could not install $d's dependencies"
    fi
  done
else
  say "no bun in this image"
fi
exit 0
