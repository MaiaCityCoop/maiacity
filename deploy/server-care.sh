#!/usr/bin/env bash
# The server's care, by hand only (Actions → server → Run workflow; .github/workflows/server.yml):
#   report  what fills its disks (the root disk and the data volume), what Docker holds, the journal, the leftovers of
#           backups, play's files on the volume, and which of them are broken (their bytes not hashing to their name: a
#           write cut short by a full disk leaves a file empty or partial, and play then took it for the file).
#   clean   frees what nothing uses: Docker's unused images (older than a day; a rollback pulls its image again),
#           stopped containers, its build cache and dangling volumes are NOT touched (no volume is removed); the
#           journal past 200 MB; apt's cache; the leftovers of backups and restores. Then mends play's broken files:
#           each one's good bytes, first from the folders kept when play's files moved into the bucket, then from the
#           backups in the bucket (streamed, never stored whole), checked against its hash and put back. A file whose
#           bytes are lost everywhere and that nothing in play's data names but its own row is forgotten (its row in
#           play.files removed); one that anything names is kept and reported. Then reports again.
# Access to the bucket for the mending comes from ../backup.env (deploy/bucket-keys.sh), as for deploy/backup.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
. deploy/lib.sh
MODE="${1:-report}"
set -a
[ -f backup.env ] && . ./backup.env
[ -f play.env ] && . ./play.env
set +a
DATA="${PLAY_DATA_PATH:-}"
# while play's folder is still on the volume (the deploy moves it off once its files are in the bucket), the folder is
# play's store, whatever play.env already says
if [ -n "$DATA" ] && [ -d "$DATA/blobs" ]; then PLAY_BUCKET=""; fi

broken() {
  # every file play's database names that its store (the folder or the bucket, as play.env sets it) cannot hand back
  # whole: missing, or its bytes not hashing to its name (a write cut short by a full disk); asked of play's own code,
  # in a one-off container of its image on the compose network, so it works while play itself is down
  compose run --rm -T --no-deps -e PLAY_BUCKET="${PLAY_BUCKET:-}" play-api bun -e '
    import { connect } from "/app/api/src/pg.ts";
    import { blobStore } from "/app/api/src/blobs.ts";
    const db = connect(), store = blobStore();
    const { rows } = await db.query("SELECT hash FROM play.files ORDER BY hash");
    // the bucket takes a blob only whole (its bytes checked before the put), so there asking it is enough; the folder
    // is read back, a write cut short leaves a name with less in it; sixteen at a time, each a round trip
    const bucket = !!process.env.PLAY_BUCKET;
    let next = 0;
    await Promise.all(Array.from({ length: 16 }, async () => {
      for (let i = next++; i < rows.length; i = next++) {
        const h = rows[i].hash;
        const ok = await (bucket ? store.has(h) : store.get(h).then(Boolean)).catch(() => false);
        if (!ok) console.log(h);
      }
    }));
    process.exit(0);' </dev/null
}

report() {
  echo "## Disks"; df -h / "${DATA:-/}" | sed 's/^/    /'
  echo "## Docker"; docker system df | sed 's/^/    /'
  echo "## Largest under the app, the volume and Docker"
  sudo du -xsh "$APP_DIR"/* /var/lib/docker /var/log 2>/dev/null | sort -h | tail -12 | sed 's/^/    /'
  if [ -n "$DATA" ]; then
    sudo du -xsh "$(dirname "$DATA")"/* 2>/dev/null | sort -h | tail -12 | sed 's/^/    /'
    echo "## The largest folders on the data volume"
    sudo du -xh --max-depth=3 "$(dirname "$DATA")" 2>/dev/null | sort -h | tail -20 | sed 's/^/    /'
  fi
  echo "## Journal"; sudo journalctl --disk-usage 2>/dev/null | sed 's/^/    /' || true
  [ -n "$DATA" ] && [ -d "$DATA/blobs" ] && echo "## play's files in the folder: $(find "$DATA/blobs" -type f | wc -l) in $(du -sh "$DATA/blobs" | cut -f1)"
  if [ -n "${PLAY_BUCKET:-}" ]; then echo "## play's store: the bucket $PLAY_BUCKET"; else echo "## play's store: the folder $DATA/blobs"; fi
  B=$(broken || true)
  if [ -n "$B" ]; then
    echo "## Files play's database names that its store cannot hand back whole, and what they are"
    for h in $B; do
      docker exec "$DB_CONTAINER" psql -U maiacity -d maiacity -Atc \
        "SELECT hash, size, media_type, coalesce(label, ''), created FROM play.files WHERE hash = '$h'" </dev/null | sed 's/^/    /' || true
    done
  else
    echo "## Every file play's database names is whole in its store"
  fi
}

# the backups' bucket, a large file streamed: no bound on the whole call
aws() { S3_TIMEOUT=0 S3_READ_TIMEOUT=300 s3 backup -- "$@"; }

# whether a file's bytes hash to its name (by play's own hash, in a container of its image)
whole_file() {
  [ -s "$1" ] && [ "$(docker run --rm -i -v "$1:/f:ro" --entrypoint bun "${PLAY_IMAGE}" -e 'import { hashBytes } from "/app/api/src/hash.ts"; console.log(hashBytes(new Uint8Array(await Bun.file("/f").arrayBuffer())))' </dev/null)" = "$2" ]
}

# a file's good bytes put back into play's store (the bucket or the folder)
put_back() {
  local h=$1 f=$2
  if [ -n "${PLAY_BUCKET:-}" ]; then
    S3_TIMEOUT=0 s3 play -v "$f:/f:ro" -- s3 cp /f "s3://$PLAY_BUCKET/blobs/${h:0:2}/$h" --only-show-errors
  else
    sudo install -D -o 1000 -g 1000 -m 0644 "$f" "$DATA/blobs/blobs/${h:0:2}/$h.mended" && sudo mv "$DATA/blobs/blobs/${h:0:2}/$h.mended" "$DATA/blobs/blobs/${h:0:2}/$h"
  fi
}

mend() {
  local want; want=$(broken || true)
  [ -n "$want" ] || { echo "mend: every file is whole"; return 0; }
  echo "mend: $(echo "$want" | wc -l) files not whole"
  # first the folders play's files were kept in when they moved into the bucket (a file written whole there after the
  # copy began is whole in them, not in the bucket)
  local left=""
  for h in $want; do
    local found=""
    for k in $(ls -d "$APP_DIR"/play-folder-blobs-* 2>/dev/null | sort -r); do
      if sudo test -s "$k/blobs/${h:0:2}/$h"; then
        local t; t=$(mktemp "$APP_DIR/backups-tmp/kept-XXXX"); sudo cat "$k/blobs/${h:0:2}/$h" > "$t"
        if whole_file "$t" "$h"; then put_back "$h" "$t"; echo "mend: $h put back from $k"; found=1; fi
        rm -f "$t"; [ -n "$found" ] && break
      fi
    done
    [ -n "$found" ] || left="$left $h"
  done
  want=$(echo $left)
  [ -n "$want" ] || return 0
  echo "mend: looking for $(echo $want | wc -w) in the backups …"
  local tmp; tmp=$(mktemp -d "$APP_DIR/backups-tmp/mend-XXXX")
  # first the store every snapshot shares (<xx>/<hash> under lib.sh's STORE_PREFIX, deploy/backup.sh)
  left=""
  for h in $want; do
    local f="$tmp/store-$h"
    aws s3 cp "s3://$BACKUP_BUCKET/$STORE_PREFIX/${h:0:2}/$h" - </dev/null >"$f" 2>/dev/null || true
    if whole_file "$f" "$h"; then put_back "$h" "$f"; echo "mend: $h put back from the backups' store"; else left="$left $h"; fi
    rm -f "$f"
  done
  want=$(echo $left)
  # then the older backups, each with its own full copy
  # the newest backups first: each one's blobs.tar streamed through tar, which takes out only the files wanted (a
  # backup of the folder holds blobs/blobs/<xx>/<hash>)
  for b in $(S3_TIMEOUT=0 S3_READ_TIMEOUT=300 snapshots | sort -r | head -8); do
    [ -n "$want" ] || break
    local names=""; for h in $want; do names="$names blobs/blobs/${h:0:2}/$h"; done
    aws s3 cp "s3://$BACKUP_BUCKET/$SNAPSHOTS_PREFIX/$b/blobs.tar" - </dev/null 2>/dev/null | tar -x -C "$tmp" $names 2>/dev/null || true
    left=""
    for h in $want; do
      f="$tmp/blobs/blobs/${h:0:2}/$h"
      if whole_file "$f" "$h"; then put_back "$h" "$f"; echo "mend: $h put back from $b"; else left="$left $h"; fi
      rm -f "$f"
    done
    want=$(echo $left)
  done
  for h in $want; do echo "mend: $h is in no backup whole"; done
  # removed here, not by a RETURN trap: that trap outlives the function and fired again where tmp is not set
  rm -rf "$tmp"
}

# a file whose bytes are lost everywhere (in no store, no kept folder, no backup) and that nothing in play's data
# names but its own row in play.files: its row is removed, so play no longer counts it as one of its files. One that
# anything else names (a version, a story, a proposal, a document) is kept and reported.
forget_lost() {
  local lost; lost=$(broken || true)
  [ -n "$lost" ] || { echo "forget-lost: every file is whole"; return 0; }
  local dump; dump=$(mktemp "$APP_DIR/backups-tmp/play-data-XXXX.sql")
  docker exec "$DB_CONTAINER" pg_dump -U maiacity -d maiacity -n play --data-only --inserts </dev/null > "$dump"
  for h in $lost; do
    local n; n=$(grep -o "$h" "$dump" | wc -l)
    # its own row names it twice (its hash and its bucket key); a foreign key from any other row also stops the delete
    local own; own=$(grep "^INSERT INTO play.files " "$dump" | grep -o "$h" | wc -l)
    if [ "$n" -le "$own" ]; then
      docker exec "$DB_CONTAINER" psql -U maiacity -d maiacity -v ON_ERROR_STOP=1 -Atc "DELETE FROM play.files WHERE hash = '$h'" </dev/null >/dev/null
      echo "forget-lost: $h: its bytes are lost and nothing names it; its row in play.files is removed"
    else
      echo "forget-lost: $h: its bytes are lost, and $((n - own)) other places in play's data name it: kept, to be put again"
    fi
  done
  rm -f "$dump"
}

clean() {
  echo "clean: Docker's unused images older than a day, stopped containers, its build cache"
  docker container prune -f | tail -1
  docker image prune -af --filter "until=24h" | tail -1
  docker builder prune -af | tail -1
  echo "clean: the journal past 200 MB, apt's cache"
  sudo journalctl --vacuum-size=200M 2>&1 | tail -1 || true
  sudo apt-get clean || true
  echo "clean: the leftovers of backups and restores"
  sudo find "$APP_DIR/backups-tmp" -mindepth 1 -maxdepth 1 -mmin +60 -exec rm -rf {} + 2>/dev/null || true
  mkdir -p "$APP_DIR/backups-tmp"
  mend
  forget_lost
}

case "$MODE" in
  report) report ;;
  clean) report; echo; clean; echo; echo "# After"; report ;;
  *) echo "server-care: report or clean, not $MODE"; exit 1 ;;
esac
