#!/usr/bin/env bash
# Two intents adding a migration in parallel never conflict (play/SPEC.md "Migrations"): in a temporary clone of this
# repository, two scratch branches each add one new migration file; git merge-tree merges them without a conflict, and
# the runner (play/api/src/migrations.ts) applies both, in name order, on a fresh database (TEST_DATABASE_URL).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"   # play/api
repo="$(git -C "$here" rev-parse --show-toplevel)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
git clone -q --no-hardlinks "$repo" "$tmp/clone"
cd "$tmp/clone"
git config user.email merge-test@play.maia.city; git config user.name "migrations-merge"
# the base: this work tree's migrations as they stand (committed or not)
rm -rf play/api/migrations && cp -R "$here/migrations" play/api/migrations
git add -A play/api/migrations && git commit -qm base --allow-empty
git branch -q base
add() { # branch, file, sql
  git checkout -q -b "$1" base
  printf '%s\n' "$3" > "play/api/migrations/$2.sql"
  git add "play/api/migrations/$2.sql" && git commit -qm "$1"
}
A=202611071200-aaaaaaaa-first; B=202611071200-bbbbbbbb-second
add intent-a "$A" "CREATE TABLE IF NOT EXISTS play.mig_merge (who TEXT); INSERT INTO play.mig_merge VALUES ('a');"
add intent-b "$B" "CREATE TABLE IF NOT EXISTS play.mig_merge (who TEXT); INSERT INTO play.mig_merge VALUES ('b');"
if ! tree="$(git merge-tree --write-tree intent-a intent-b)"; then
  echo "FAIL: the two branches conflict:"; echo "$tree"; exit 1
fi
tree="$(head -1 <<<"$tree")"
mkdir "$tmp/merged" && git archive "$tree" play/api/migrations | tar -x -C "$tmp/merged"
dir="$tmp/merged/play/api/migrations"
[ -f "$dir/$A.sql" ] && [ -f "$dir/$B.sql" ] || { echo "FAIL: the merge lost a file"; exit 1; }
echo "merge-tree: no conflict ($tree), both files kept"
cd "$here"
MERGED="$dir" A="$A" B="$B" bun -e '
  import { loadMigrations, migrate } from "./src/migrations";
  import { fromBunSql } from "./src/kit/pg";
  const all = loadMigrations(process.env.MERGED);
  const url = process.env.TEST_DATABASE_URL;
  if (!url) { console.error("FAIL: TEST_DATABASE_URL is not set (bash play/avenbox/up.sh)"); process.exit(1); }
  const name = `play_migmerge_${Date.now()}`;
  const admin = new Bun.SQL(url); await admin.unsafe(`CREATE DATABASE ${name}`);
  const u = new URL(url); u.pathname = `/${name}`; const s = new Bun.SQL(u.toString());
  let ok = false;
  try {
    const ran = await migrate(fromBunSql(s), { migrations: all });
    const tail = ran.slice(-2), rows = await s.unsafe("SELECT who FROM play.mig_merge");
    ok = tail.join() === [process.env.A, process.env.B].join() && rows.map((r) => r.who).join() === "a,b";
    console.log(`runner: ran ${ran.length} migrations, the last ${tail.join(", ")}; rows ${rows.map((r) => r.who).join(",")}`);
  } finally { await s.close(); await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); await admin.close(); }
  if (!ok) { console.error("FAIL: the runner did not apply both"); process.exit(1); }
  console.log("PASS: two migrations added in parallel merge and both run");
'
