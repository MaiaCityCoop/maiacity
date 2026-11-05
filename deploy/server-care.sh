#!/usr/bin/env bash
# The server's care, by hand only (Actions → server → Run workflow; .github/workflows/server.yml):
#   report  what fills its disks (the root disk and the data volume), what Docker holds, the journal, the leftovers of
#           backups, play's files on the volume, and which of them are broken (their bytes not hashing to their name: a
#           write cut short by a full disk leaves a file empty or partial, and play then took it for the file).
#   clean   frees what nothing uses: Docker's unused images (older than a day; a rollback pulls its image again),
#           stopped containers, its build cache and dangling volumes are NOT touched (no volume is removed); the
#           journal past 200 MB; apt's cache; the leftovers of backups and restores. Then mends play's broken files:
#           each one's good bytes from the backups in the bucket (streamed, never stored whole), checked against its
#           hash and put back; one no backup holds is moved aside (kept beside the files), so play writes it anew the
#           next time it is made; first from the folders kept when play's files moved into the bucket. A file whose
#           bytes are lost everywhere and that nothing in play's data names but its own row is forgotten (its row in
#           play.files removed); one that anything names is kept and reported. Then reports again.
#   retire-avendb  avenDB is no longer run (Samuel 2026-11-05): its container stopped and removed for good, its data
#           kept as a legacy copy on the root disk (/var/lib/maia-city/avendb-legacy), compared file by file, and only
#           then removed from the data volume (it held 8.2 GB of the 9.8 GB volume, which filled).
# Access to the bucket for the mending comes from ../backup.env, as for deploy/backup.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-report}"
set -a
[ -f backup.env ] && . ./backup.env
[ -f play.env ] && . ./play.env
set +a
DATA="${PLAY_DATA_PATH:-}"
# while play's folder is still on the volume (the deploy moves it off once its files are in the bucket), the folder is
# play's store, whatever play.env already says
if [ -n "$DATA" ] && [ -d "$DATA/blobs" ]; then PLAY_BUCKET=""; fi

C="docker compose -f docker-compose.yml -f docker-compose.prod.yml -f play/docker-compose.play.yml"

broken() {
  # every file play's database names that its store (the folder or the bucket, as play.env sets it) cannot hand back
  # whole: missing, or its bytes not hashing to its name (a write cut short by a full disk); asked of play's own code,
  # in a one-off container of its image on the compose network, so it works while play itself is down
  $C run --rm -T --no-deps -e PLAY_BUCKET="${PLAY_BUCKET:-}" play-api bun -e '
    import { connect } from "/app/api/src/pg.ts";
    import { blobStore } from "/app/api/src/blobs.ts";
    const db = connect(), store = blobStore();
    const { rows } = await db.query("SELECT hash FROM play.files ORDER BY hash");
    for (const { hash } of rows) if (!(await store.get(hash).catch(() => null))) console.log(hash);
    process.exit(0);' </dev/null
}

report() {
  echo "## Disks"; df -h / "${DATA:-/}" | sed 's/^/    /'
  echo "## Docker"; docker system df | sed 's/^/    /'
  echo "## Largest under the app, the volume and Docker"
  sudo du -xsh /opt/maia-city/* /var/lib/docker /var/log 2>/dev/null | sort -h | tail -12 | sed 's/^/    /'
  if [ -n "$DATA" ]; then
    sudo du -xsh "$(dirname "$DATA")"/* 2>/dev/null | sort -h | tail -12 | sed 's/^/    /'
    echo "## The largest folders on the data volume"
    sudo du -xh --max-depth=3 "$(dirname "$DATA")" 2>/dev/null | sort -h | tail -20 | sed 's/^/    /'
  fi
  echo "## Journal"; sudo journalctl --disk-usage 2>/dev/null | sed 's/^/    /' || true
  [ -n "$DATA" ] && [ -d "$DATA/blobs" ] && echo "## play's files in the folder: $(find "$DATA/blobs" -type f | wc -l) in $(du -sh "$DATA/blobs" | cut -f1)"
  echo "## play's store: ${PLAY_BUCKET:+the bucket $PLAY_BUCKET}${PLAY_BUCKET:-the folder $DATA/blobs}"
  B=$(broken || true)
  if [ -n "$B" ]; then
    echo "## Files play's database names that its store cannot hand back whole, and what they are"
    for h in $B; do
      docker exec maia-city-db psql -U maiacity -d maiacity -Atc \
        "SELECT hash, size, media_type, coalesce(label, ''), created FROM play.files WHERE hash = '$h'" </dev/null | sed 's/^/    /' || true
    done
  else
    echo "## Every file play's database names is whole in its store"
  fi
}

aws() {
  docker run --rm -i -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
    -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 300 "$@"
}

# whether a file's bytes hash to its name (by play's own hash, in a container of its image)
whole_file() {
  [ -s "$1" ] && [ "$(docker run --rm -i -v "$1:/f:ro" --entrypoint bun "${PLAY_IMAGE}" -e 'import { hashBytes } from "/app/api/src/hash.ts"; console.log(hashBytes(new Uint8Array(await Bun.file("/f").arrayBuffer())))' </dev/null)" = "$2" ]
}

# a file's good bytes put back into play's store (the bucket or the folder)
put_back() {
  local h=$1 f=$2
  if [ -n "${PLAY_BUCKET:-}" ]; then
    docker run --rm -v "$f:/f:ro" -e AWS_ACCESS_KEY_ID="$PLAY_BUCKET_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$PLAY_BUCKET_SECRET_KEY" \
      -e AWS_DEFAULT_REGION="${PLAY_BUCKET_REGION:-$BACKUP_REGION}" \
      -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
      amazon/aws-cli --endpoint-url "$PLAY_BUCKET_ENDPOINT" s3 cp /f "s3://$PLAY_BUCKET/blobs/${h:0:2}/$h" --only-show-errors </dev/null
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
    for k in $(ls -d /opt/maia-city/play-folder-blobs-* 2>/dev/null | sort -r); do
      if sudo test -s "$k/blobs/${h:0:2}/$h"; then
        local t; t=$(mktemp /opt/maia-city/backups-tmp/kept-XXXX); sudo cat "$k/blobs/${h:0:2}/$h" > "$t"
        if whole_file "$t" "$h"; then put_back "$h" "$t"; echo "mend: $h put back from $k"; found=1; fi
        rm -f "$t"; [ -n "$found" ] && break
      fi
    done
    [ -n "$found" ] || left="$left $h"
  done
  want=$(echo $left)
  [ -n "$want" ] || return 0
  echo "mend: looking for $(echo $want | wc -w) in the backups …"
  local tmp; tmp=$(mktemp -d /opt/maia-city/backups-tmp/mend-XXXX); trap 'rm -rf "$tmp"' RETURN
  # the newest backups first: each one's blobs.tar streamed through tar, which takes out only the files wanted (a
  # backup of the folder holds blobs/blobs/<xx>/<hash>)
  for b in $(aws s3 ls "s3://$BACKUP_BUCKET/BACKUPS/play/" </dev/null | awk '{print $2}' | tr -d / | sort -r | head -8); do
    [ -n "$want" ] || break
    local names=""; for h in $want; do names="$names blobs/blobs/${h:0:2}/$h"; done
    aws s3 cp "s3://$BACKUP_BUCKET/BACKUPS/play/$b/blobs.tar" - </dev/null 2>/dev/null | tar -x -C "$tmp" $names 2>/dev/null || true
    left=""
    for h in $want; do
      f="$tmp/blobs/blobs/${h:0:2}/$h"
      if whole_file "$f" "$h"; then put_back "$h" "$f"; echo "mend: $h put back from $b"; else left="$left $h"; fi
      rm -f "$f"
    done
    want=$(echo $left)
  done
  for h in $want; do echo "mend: $h is in no backup whole"; done
}

# a file whose bytes are lost everywhere (in no store, no kept folder, no backup) and that nothing in play's data
# names but its own row in play.files: its row is removed, so play no longer counts it as one of its files. One that
# anything else names (a version, a story, a proposal, a document) is kept and reported.
forget_lost() {
  local lost; lost=$(broken || true)
  [ -n "$lost" ] || { echo "forget-lost: every file is whole"; return 0; }
  local dump; dump=$(mktemp /opt/maia-city/backups-tmp/play-data-XXXX.sql)
  docker exec maia-city-db pg_dump -U maiacity -d maiacity -n play --data-only --inserts </dev/null > "$dump"
  for h in $lost; do
    local n; n=$(grep -o "$h" "$dump" | wc -l)
    # its own row names it twice (its hash and its bucket key); a foreign key from any other row also stops the delete
    local own; own=$(grep "^INSERT INTO play.files " "$dump" | grep -o "$h" | wc -l)
    if [ "$n" -le "$own" ]; then
      docker exec maia-city-db psql -U maiacity -d maiacity -v ON_ERROR_STOP=1 -Atc "DELETE FROM play.files WHERE hash = '$h'" </dev/null >/dev/null
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
  sudo find /opt/maia-city/backups-tmp -mindepth 1 -maxdepth 1 -mmin +60 -exec rm -rf {} + 2>/dev/null || true
  mkdir -p /opt/maia-city/backups-tmp
  mend
  forget_lost
}

retire_avendb() {
  # avenDB is no longer run (Samuel 2026-11-05): its container is stopped and removed for good, and its data kept as a
  # legacy copy on the root disk, compared file by file with what it was; only then does the folder leave the volume
  local KEEP=/var/lib/maia-city/avendb-legacy cur
  cur=$(sed -n 's/^AVENDB_DATA_PATH=//p' .env | tail -1)
  [ -n "$cur" ] || { echo "retire-avendb: .env names no AVENDB_DATA_PATH"; exit 1; }
  local C="docker compose -f docker-compose.yml -f docker-compose.prod.yml -f play/docker-compose.play.yml"
  # compose reads .env itself, exactly as written; only play.env is loaded, for play's compose file
  set -a; [ -f play.env ] && . ./play.env; set +a
  echo "retire-avendb: stopping and removing avenDB's container …"
  $C rm -sf avendb </dev/null || docker rm -f maia-city-avendb >/dev/null 2>&1 || true
  docker ps --format '{{.Names}}' | grep -qx maia-city-avendb && { echo "retire-avendb: avenDB is still running"; exit 1; }
  if [ "$cur" = "$KEEP" ]; then echo "retire-avendb: its data is kept at $KEEP already"; return 0; fi
  [ -d "$cur" ] || { echo "retire-avendb: $cur is not there"; exit 1; }
  local need free
  need=$(sudo du -sk "$cur" | cut -f1); free=$(df -Pk / | awk 'NR == 2 {print $4}')
  [ "$free" -gt $((need * 2)) ] || { echo "retire-avendb: $((free / 1024)) MB free on /, avenDB's data is $((need / 1024)) MB"; exit 1; }
  sudo mkdir -p "$KEEP"
  # the copy the first move made (/var/lib/maia-city/avendb) is used where it is there, brought up to date
  [ -d /var/lib/maia-city/avendb ] && [ ! -e "$KEEP/.kept" ] && sudo rmdir "$KEEP" && sudo mv /var/lib/maia-city/avendb "$KEEP"
  echo "retire-avendb: keeping $cur ($((need / 1024)) MB) at $KEEP …"
  if command -v rsync >/dev/null; then sudo rsync -aH --delete "$cur/" "$KEEP/"; else sudo cp -a "$cur/." "$KEEP/"; fi
  if ! sudo diff -r --no-dereference "$cur" "$KEEP" >/dev/null; then
    echo "retire-avendb: the copy differs from $cur: nothing removed (the copy is at $KEEP)"; exit 1
  fi
  sudo touch "$KEEP/.kept"
  cp .env ".env.before-avendb-retired-$(date -u +%Y%m%dT%H%M%SZ)"
  sed -i "s#^AVENDB_DATA_PATH=.*#AVENDB_DATA_PATH=$KEEP#" .env
  echo "retire-avendb: the legacy copy is whole at $KEEP; removing the folder from the volume ($cur)"
  sudo rm -rf "$cur"
}

case "$MODE" in
  report) report ;;
  clean) report; echo; clean; echo; echo "# After"; report ;;
  retire-avendb) retire_avendb; echo; echo "# After"; report ;;
  *) echo "server-care: report, clean or retire-avendb, not $MODE"; exit 1 ;;
esac
