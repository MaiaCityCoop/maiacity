#!/usr/bin/env bash
# play's backup, to Hetzner Object Storage (bucket `maiacity`, under BACKUPS/play/<when>-<label>/): always both halves
# together — its schema in Postgres (pg_dump -n play) and a full copy of its files (the blob store, from its folder or
# its bucket, small enough to copy whole each time; the backup fails unless it holds every file the dump names) — and a manifest
# naming the play image that ran with them, so a rollback brings that image back too. It runs before every deploy (the
# production workflow's server job, which stops if it fails), and by hand:
#   bash /opt/maia-city/deploy/backup.sh <label> [commit]
# Restoring, as a check or as a rollback, is .github/workflows/restore.yml, run by hand. Nothing runs on a schedule
# (Samuel 2026-11-02).
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
# the files the dump names, counted now, before the copy: play keeps a file in its store before its row, so every row
# counted here has its file there when the copy starts; counted after it, the files play keeps while the copy runs (a
# few minutes) were counted but not copied, and the backup failed for them (2026-11-05: 2287 rows, 2267 copied)
ROWS=$(docker exec maia-city-db psql -U maiacity -d maiacity -Atc "SELECT count(*) FROM play.files" </dev/null)
# the files, always beside the dump: from the bucket where play keeps them there, else from its folder. Each is named by
# its hash and never changes, so files written after the dump only add to what the copy holds.
STORE=folder
# while play's folder is still on the volume (the deploy moves it off once its files are in the bucket), the folder is
# where play's files are, whatever play.env already says
if [ -n "${PLAY_BUCKET:-}" ] && ! { [ -n "${PLAY_DATA_PATH:-}" ] && [ -d "$PLAY_DATA_PATH/blobs" ]; }; then
  # copied inside the object storage, from play's files to the backup's (nothing comes down to the server's disk); each
  # is named by its hash and never changes, so files written after the dump only add to what the copy holds
  STORE="bucket $PLAY_BUCKET"
  echo "backup: copying the files in s3://$PLAY_BUCKET/blobs/ to s3://$BACKUP_BUCKET/$PREFIX/blobs/ …"
  s3play() {
    timeout 1800 docker run --rm \
      -e AWS_ACCESS_KEY_ID="$PLAY_BUCKET_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$PLAY_BUCKET_SECRET_KEY" \
      -e AWS_DEFAULT_REGION="${PLAY_BUCKET_REGION:-$BACKUP_REGION}" \
      -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
      -e AWS_RETRY_MODE=adaptive -e AWS_MAX_ATTEMPTS=6 \
      amazon/aws-cli --endpoint-url "$PLAY_BUCKET_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 "$@" </dev/null
  }
  # the bucket now and then answers a copy of a large file with a GatewayTimeout: the sync is run again (it copies only
  # what is still missing), up to three times, before the backup gives up
  for try in 1 2 3; do
    if s3play s3 sync "s3://$PLAY_BUCKET/blobs/" "s3://$BACKUP_BUCKET/$PREFIX/blobs/" --only-show-errors; then break; fi
    [ "$try" -lt 3 ] || { echo "backup: the copy of play's files failed three times"; exit 1; }
    echo "backup: the copy stopped short (try $try of 3); copying what is still missing …"; sleep $((10 * try))
  done
  FILES=$(s3play s3 ls "s3://$BACKUP_BUCKET/$PREFIX/blobs/" --recursive | wc -l)
elif [ -n "${PLAY_DATA_PATH:-}" ] && [ -d "$PLAY_DATA_PATH/blobs" ]; then
  # packed straight from the folder (no copy of it first: that held every file twice on the disk), and only if the
  # disk has room for the pack, so a backup never fills it
  NEED=$(du -sk "$PLAY_DATA_PATH/blobs" | cut -f1)
  FREE=$(df -Pk "$WORK" | awk 'NR == 2 {print $4}')
  if [ "$FREE" -lt $((NEED + NEED / 10 + 524288)) ]; then
    echo "backup: $((FREE / 1024)) MB free beside $WORK, the files need $((NEED / 1024)) MB: free some space first (the server workflow's clean)"; exit 1
  fi
  echo "backup: packing the files in $PLAY_DATA_PATH/blobs …"
  tar -cf "$WORK/blobs.tar" --exclude='*.part-*' -C "$PLAY_DATA_PATH" blobs
  FILES=$(find "$PLAY_DATA_PATH/blobs" -type f ! -name '*.part-*' | wc -l)
else
  echo "backup: play.env names neither PLAY_BUCKET nor a PLAY_DATA_PATH with blobs/: no files to copy"; exit 1
fi
# a backup holds every file the dump names, or it is no backup
if [ "$FILES" -lt "$ROWS" ]; then
  echo "backup: the dump names $ROWS files and the copy holds $FILES"; exit 1
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
  "blobsBytes": $([ -f "$WORK/blobs.tar" ] && stat -c %s "$WORK/blobs.tar" || echo 0),
  "store": "$STORE"
}
EOF

echo "backup: uploading to s3://$BACKUP_BUCKET/$PREFIX/ …"
# Hetzner's S3 does not take the checksums newer AWS CLIs send by default, only when an operation requires one
timeout 900 docker run --rm -v "$WORK:/work:ro" \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
  -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
  amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 \
  s3 cp /work "s3://$BACKUP_BUCKET/$PREFIX/" --recursive --only-show-errors </dev/null
# and both are there: the dump and the files, each at its size
LISTED=$(timeout 300 docker run --rm \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
  amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" s3 ls "s3://$BACKUP_BUCKET/$PREFIX/" </dev/null)
PARTS="play.dump manifest.json"; [ -f "$WORK/blobs.tar" ] && PARTS="$PARTS blobs.tar"
for f in $PARTS; do
  size=$(awk -v f="$f" '$4 == f {print $3}' <<<"$LISTED")
  [ "$size" = "$(stat -c %s "$WORK/$f")" ] || { echo "backup: $f is not in the bucket whole ($size)"; exit 1; }
done
echo "backup: s3://$BACKUP_BUCKET/$PREFIX/ ($(tr -d '\n ' < "$WORK/manifest.json"))"
