#!/usr/bin/env bash
# play's backup, to Hetzner Object Storage (bucket `maiacity`): a snapshot like Time Machine's, made before every deploy.
#   BACKUPS/play/<when>-<label>/   the snapshot: a full dump of play's schema in Postgres (pg_dump -n play, every time),
#                                  files.txt (every file the dump names: its hash and size) and a manifest naming the
#                                  play image that ran with them, so a rollback brings that image back too
#   BACKUPS/play-files/blobs/      play's files, each kept once under its hash (blobs/<xx>/<hash>), shared by every
#                                  snapshot: a file is named by its BLAKE3 hash and never changes, so a snapshot copies
#                                  only the files the store does not hold yet (a deploy's few new ones), never the rest
# The backup fails unless the store holds every file the dump names, each at its size, and the snapshot's three
# objects are in the bucket whole. Older snapshots (before 2026-11-05) carry their own full copy (blobs.tar or blobs/).
# It runs before every deploy (the production workflow's server job, which stops if it fails), and by hand:
#   bash /opt/maia-city/deploy/backup.sh <label> [commit]
# Restoring, as a check or as a rollback, is .github/workflows/restore.yml, run by hand. Nothing runs on a schedule
# (Samuel 2026-11-02; snapshots, Samuel 2026-11-05).
# Access comes from ../backup.env (the deploy writes it, readable by deploy only):
#   BACKUP_BUCKET, BACKUP_ENDPOINT, BACKUP_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# Each file is written first and uploaded as a file: no stream through stdin, and every step says where it is.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
. ./backup.env
[ -f play.env ] && . ./play.env
set +a
: "${BACKUP_BUCKET:?}" "${BACKUP_ENDPOINT:?}" "${BACKUP_REGION:?}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}"
LABEL="${1:-by-hand}"
COMMIT="${2:-}"
if ! docker ps --format '{{.Names}}' | grep -qx maia-city-db; then
  echo "backup: no database container running, nothing to back up"; exit 0
fi
if ! docker exec maia-city-db psql -U maiacity -d maiacity -Atc "SELECT 1 FROM pg_namespace WHERE nspname = 'play'" </dev/null | grep -q 1; then
  echo "backup: no schema play yet (play's first deploy), nothing to back up"; exit 0
fi
NAME="$(date -u +%Y%m%dT%H%M%SZ)-${LABEL}"
PREFIX="BACKUPS/play/$NAME"
WORK="$(pwd)/backups-tmp/$NAME"
mkdir -p "$WORK"
trap 'rm -rf "$WORK"' EXIT

echo "backup: dumping the schema play …"
timeout 900 docker exec maia-city-db pg_dump -U maiacity -d maiacity -n play -Fc -w --lock-wait-timeout=120s </dev/null >"$WORK/play.dump"
[ -s "$WORK/play.dump" ] || { echo "backup: the dump is empty"; exit 1; }
# the files the dump names, listed now, before the copy: play keeps a file in its store before its row, so every row
# listed here has its file there when the copy starts (listed after it, files play kept while the copy ran were named
# but not copied; 2026-11-05: 2287 rows, 2267 copied)
docker exec maia-city-db psql -U maiacity -d maiacity -AtF ' ' -c "SELECT hash, size FROM play.files ORDER BY hash" </dev/null >"$WORK/files.txt"
ROWS=$(wc -l <"$WORK/files.txt")
STORE_PREFIX="BACKUPS/play-files/blobs"
# the backup bucket, with the backup's own access
s3b() {
  timeout "${S3_TIMEOUT:-900}" docker run --rm -v "$WORK:/work" "$@"
}
backup_cli() {
  s3b -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
    -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    -e AWS_RETRY_MODE=adaptive -e AWS_MAX_ATTEMPTS=6 \
    amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 "$@" </dev/null
}
# the files into the store: from the bucket where play keeps them there, else from its folder. Only what the store
# does not hold yet is copied: a sync compares each name and size, and a file named by its hash never changes.
STORE=folder
# while play's folder is still on the volume (the deploy moves it off once its files are in the bucket), the folder is
# where play's files are, whatever play.env already says
if [ -n "${PLAY_BUCKET:-}" ] && ! { [ -n "${PLAY_DATA_PATH:-}" ] && [ -d "$PLAY_DATA_PATH/blobs" ]; }; then
  # copied inside the object storage, from play's files to the store (nothing comes down to the server's disk)
  STORE="bucket $PLAY_BUCKET"
  echo "backup: adding what is new in s3://$PLAY_BUCKET/blobs/ to s3://$BACKUP_BUCKET/$STORE_PREFIX/ …"
  copy() {
    S3_TIMEOUT=1800 s3b \
      -e AWS_ACCESS_KEY_ID="$PLAY_BUCKET_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$PLAY_BUCKET_SECRET_KEY" \
      -e AWS_DEFAULT_REGION="${PLAY_BUCKET_REGION:-$BACKUP_REGION}" \
      -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
      -e AWS_RETRY_MODE=adaptive -e AWS_MAX_ATTEMPTS=6 \
      amazon/aws-cli --endpoint-url "$PLAY_BUCKET_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 \
      s3 sync "s3://$PLAY_BUCKET/blobs/" "s3://$BACKUP_BUCKET/$STORE_PREFIX/" --size-only --exclude '*.part-*' --only-show-errors </dev/null
  }
elif [ -n "${PLAY_DATA_PATH:-}" ] && [ -d "$PLAY_DATA_PATH/blobs" ]; then
  # uploaded straight from the folder (no copy or pack of it on the disk)
  echo "backup: adding what is new in $PLAY_DATA_PATH/blobs to s3://$BACKUP_BUCKET/$STORE_PREFIX/ …"
  copy() {
    S3_TIMEOUT=1800 s3b -v "$PLAY_DATA_PATH/blobs:/blobs:ro" \
      -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
      -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
      -e AWS_RETRY_MODE=adaptive -e AWS_MAX_ATTEMPTS=6 \
      amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 \
      s3 sync /blobs/ "s3://$BACKUP_BUCKET/$STORE_PREFIX/" --size-only --exclude '*.part-*' --only-show-errors </dev/null
  }
else
  echo "backup: play.env names neither PLAY_BUCKET nor a PLAY_DATA_PATH with blobs/: no files to copy"; exit 1
fi
# the bucket now and then answers a copy of a large file with a GatewayTimeout: the sync is run again (it copies only
# what is still missing), up to three times, before the backup gives up
for try in 1 2 3; do
  if copy; then break; fi
  [ "$try" -lt 3 ] || { echo "backup: adding play's files to the store failed three times"; exit 1; }
  echo "backup: the copy stopped short (try $try of 3); copying what is still missing …"; sleep $((10 * try))
done
# a snapshot holds every file the dump names, or it is no snapshot: each in the store under its hash, at its size
backup_cli s3 ls "s3://$BACKUP_BUCKET/$STORE_PREFIX/" --recursive >"$WORK/store.txt"
MISSING=$(awk 'NR == FNR { n = split($4, k, "/"); have[k[n]] = $3; next } !($1 in have) || have[$1] != $2 { print $1 }' \
  "$WORK/store.txt" "$WORK/files.txt")
FILES=$((ROWS - $(printf '%s' "$MISSING" | grep -c . || true)))
STORED=$(wc -l <"$WORK/store.txt")
rm -f "$WORK/store.txt"
if [ -n "$MISSING" ]; then
  echo "backup: the dump names $ROWS files and the store lacks $(printf '%s\n' "$MISSING" | wc -l) of them (or holds them at another size):"
  printf '%s\n' "$MISSING" | head -20
  echo "backup: (the server workflow's report says which of play's files are broken; its clean mends them)"
  exit 1
fi
cat >"$WORK/manifest.json" <<EOF
{
  "name": "$NAME",
  "label": "$LABEL",
  "commit": "$COMMIT",
  "image": "${PLAY_IMAGE:-}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "dumpBytes": $(stat -c %s "$WORK/play.dump"),
  "files": $FILES,
  "fileRows": $ROWS,
  "layout": "snapshot",
  "filesIn": "$STORE_PREFIX",
  "storeHolds": $STORED,
  "from": "$STORE"
}
EOF

echo "backup: uploading the snapshot to s3://$BACKUP_BUCKET/$PREFIX/ …"
# Hetzner's S3 does not take the checksums newer AWS CLIs send by default, only when an operation requires one
backup_cli s3 cp /work "s3://$BACKUP_BUCKET/$PREFIX/" --recursive --only-show-errors
# and all three are there, each at its size
LISTED=$(S3_TIMEOUT=300 backup_cli s3 ls "s3://$BACKUP_BUCKET/$PREFIX/")
for f in play.dump files.txt manifest.json; do
  size=$(awk -v f="$f" '$4 == f {print $3}' <<<"$LISTED")
  [ "$size" = "$(stat -c %s "$WORK/$f")" ] || { echo "backup: $f is not in the bucket whole ($size)"; exit 1; }
done
echo "backup: s3://$BACKUP_BUCKET/$PREFIX/ ($(tr -d '\n ' < "$WORK/manifest.json"))"
