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
#           next time it is made. Then reports again.
#   move-avendb  avenDB's data off the data volume onto the root disk (/var/lib/maia-city/avendb; Samuel
#           2026-11-05: the 9.8 GB volume was full, avenDB's 8.2 GB of it): avenDB stopped, its folder copied and the
#           copy compared file by file, .env pointed at it, avenDB started and answering; only then is the folder on
#           the volume removed. If avenDB does not answer on the copy, .env goes back and it starts on the old folder.
# Access to the bucket for the mending comes from ../backup.env, as for deploy/backup.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-report}"
set -a
[ -f backup.env ] && . ./backup.env
[ -f play.env ] && . ./play.env
set +a
DATA="${PLAY_DATA_PATH:-}"

broken() {
  # every file in play's folder whose bytes do not hash to its name, by play's own hash (in a container of its image,
  # so it works while play itself is down)
  docker run --rm -v "$DATA/blobs:/data/blobs:ro" --entrypoint bun "$PLAY_IMAGE" -e '
    import { hashBytes } from "/app/api/src/hash.ts";
    import { readdirSync } from "node:fs";
    const root = "/data/blobs";
    for (const d of readdirSync(root)) for (const n of readdirSync(`${root}/${d}`)) {
      if (!/^[0-9a-f]{64}$/.test(n)) { console.log(`${n} stray`); continue; }
      const b = new Uint8Array(await Bun.file(`${root}/${d}/${n}`).arrayBuffer());
      if (hashBytes(b) !== n) console.log(`${n} ${b.length}`);
    }' </dev/null
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
  if [ -n "$DATA" ] && [ -d "$DATA/blobs" ]; then
    echo "## play's files: $(find "$DATA/blobs" -type f | wc -l) in $(du -sh "$DATA/blobs" | cut -f1)"
    B=$(broken || true)
    if [ -n "$B" ]; then
      echo "## Broken files (name, bytes held) and what play says they are"
      echo "$B" | sed 's/^/    /'
      for h in $(echo "$B" | awk '$2 != "stray" {print $1}'); do
        docker exec maia-city-db psql -U maiacity -d maiacity -Atc \
          "SELECT hash, size, media_type, coalesce(label, ''), created FROM play.files WHERE hash = '$h'" </dev/null | sed 's/^/    /' || true
      done
    else
      echo "## No broken files"
    fi
  fi
}

aws() {
  docker run --rm -i -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
    -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 300 "$@"
}

mend() {
  [ -n "$DATA" ] && [ -d "$DATA/blobs" ] || return 0
  local B want
  B=$(broken || true)
  want=$(echo "$B" | awk 'NF == 2 && $2 != "stray" {print $1}')
  [ -n "$want" ] || { echo "mend: no broken files"; return 0; }
  echo "mend: $(echo "$want" | wc -l) broken files; looking for their bytes in the backups …"
  local tmp; tmp=$(mktemp -d /opt/maia-city/backups-tmp/mend-XXXX); trap 'rm -rf "$tmp"' RETURN
  # the newest backups first: each one's blobs.tar streamed through tar, which takes out only the files wanted
  for b in $(aws s3 ls "s3://$BACKUP_BUCKET/BACKUPS/play/" </dev/null | awk '{print $2}' | tr -d / | sort -r | head -8); do
    [ -n "$want" ] || break
    local names=""; for h in $want; do names="$names blobs/${h:0:2}/$h"; done
    aws s3 cp "s3://$BACKUP_BUCKET/BACKUPS/play/$b/blobs.tar" - </dev/null | tar -x -C "$tmp" $names 2>/dev/null || true
    local left=""
    for h in $want; do
      f="$tmp/blobs/${h:0:2}/$h"
      if [ -s "$f" ] && [ "$(docker run --rm -i -v "$f:/f:ro" --entrypoint bun "${PLAY_IMAGE}" -e 'import { hashBytes } from "/app/api/src/hash.ts"; console.log(hashBytes(new Uint8Array(await Bun.file("/f").arrayBuffer())))' </dev/null)" = "$h" ]; then
        sudo install -o 1000 -g 1000 -m 0644 "$f" "$DATA/blobs/${h:0:2}/$h.mended" && sudo mv "$DATA/blobs/${h:0:2}/$h.mended" "$DATA/blobs/${h:0:2}/$h"
        echo "mend: $h put back from $b"
      else
        left="$left $h"
      fi
      rm -f "$f"
    done
    want=$(echo $left)
  done
  if [ -n "$want" ]; then
    local aside="$DATA/broken-$(date -u +%Y%m%dT%H%M%SZ)"
    sudo mkdir -p "$aside"
    for h in $want; do sudo mv "$DATA/blobs/${h:0:2}/$h" "$aside/$h"; echo "mend: $h is in no backup: moved aside to $aside (play writes it anew when it is made again)"; done
  fi
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
}

move_avendb() {
  local NEW=/var/lib/maia-city/avendb cur
  cur=$(sed -n 's/^AVENDB_DATA_PATH=//p' .env | tail -1)
  [ -n "$cur" ] || { echo "move-avendb: .env names no AVENDB_DATA_PATH"; exit 1; }
  if [ "$cur" = "$NEW" ]; then echo "move-avendb: avenDB's data is at $NEW already"; return 0; fi
  [ -d "$cur" ] || { echo "move-avendb: $cur is not there"; exit 1; }
  local need free
  need=$(sudo du -sk "$cur" | cut -f1); free=$(df -Pk / | awk 'NR == 2 {print $4}')
  [ "$free" -gt $((need * 2)) ] || { echo "move-avendb: $((free / 1024)) MB free on /, avenDB holds $((need / 1024)) MB"; exit 1; }
  local C="docker compose -f docker-compose.yml -f docker-compose.prod.yml -f play/docker-compose.play.yml"
  set -a; . ./.env; [ -f play.env ] && . ./play.env; set +a
  echo "move-avendb: stopping avenDB, copying $cur ($((need / 1024)) MB) to $NEW …"
  $C stop avendb </dev/null
  sudo mkdir -p "$NEW"
  sudo cp -a "$cur/." "$NEW/"
  # the copy, compared file by file with what it was copied from
  if ! sudo diff -r --no-dereference "$cur" "$NEW" >/dev/null; then
    echo "move-avendb: the copy differs from $cur: avenDB starts again on $cur, the copy is left at $NEW"
    $C up -d --no-deps avendb </dev/null; exit 1
  fi
  cp .env ".env.before-avendb-move-$(date -u +%Y%m%dT%H%M%SZ)"
  sed -i "s#^AVENDB_DATA_PATH=.*#AVENDB_DATA_PATH=$NEW#" .env
  set -a; . ./.env; set +a
  $C up -d --no-deps avendb </dev/null
  local ok=""
  for i in $(seq 1 30); do
    if docker exec maia-city-caddy wget -q -O /dev/null -T 5 http://avendb:3351/feed 2>/dev/null; then ok=1; break; fi
    sleep 3
  done
  if [ -z "$ok" ]; then
    docker logs --tail 30 maia-city-avendb 2>&1 | sed 's/^/    /' || true
    echo "move-avendb: avenDB did not answer on $NEW: back to $cur"
    sed -i "s#^AVENDB_DATA_PATH=.*#AVENDB_DATA_PATH=$cur#" .env
    set -a; . ./.env; set +a
    $C up -d --no-deps avendb </dev/null; exit 1
  fi
  echo "move-avendb: avenDB answers on $NEW; removing the folder it left on the volume ($cur)"
  sudo rm -rf "$cur"
}

case "$MODE" in
  report) report ;;
  clean) report; echo; clean; echo; echo "# After"; report ;;
  move-avendb) move_avendb; echo; echo "# After"; report ;;
  *) echo "server-care: report, clean or move-avendb, not $MODE"; exit 1 ;;
esac
