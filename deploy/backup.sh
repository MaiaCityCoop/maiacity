#!/usr/bin/env bash
# play's backup, to Hetzner Object Storage (bucket `maiacity`, under BACKUPS/play/<when>-<label>/): its schema in Postgres
# (pg_dump -n play), a full copy of its files (the blob store, small enough to copy whole each time) and a manifest
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
FILES=0
if [ -n "${PLAY_DATA_PATH:-}" ] && [ -d "$PLAY_DATA_PATH/blobs" ]; then
  echo "backup: copying the files in $PLAY_DATA_PATH/blobs …"
  tar -cf "$WORK/blobs.tar" -C "$PLAY_DATA_PATH" blobs
  FILES=$(find "$PLAY_DATA_PATH/blobs" -type f | wc -l)
else
  echo "backup: no blob folder (play keeps its files in a bucket, or has none yet)"
fi
cat >"$WORK/manifest.json" <<EOF
{
  "name": "$NAME",
  "label": "$LABEL",
  "commit": "$COMMIT",
  "image": "${PLAY_IMAGE:-}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "dumpBytes": $(stat -c %s "$WORK/play.dump"),
  "files": $FILES
}
EOF

echo "backup: uploading to s3://$BACKUP_BUCKET/$PREFIX/ …"
# Hetzner's S3 does not take the checksums newer AWS CLIs send by default, only when an operation requires one
timeout 900 docker run --rm -v "$WORK:/work:ro" \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
  -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
  amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 \
  s3 cp /work "s3://$BACKUP_BUCKET/$PREFIX/" --recursive --only-show-errors </dev/null
echo "backup: s3://$BACKUP_BUCKET/$PREFIX/ ($(cat "$WORK/manifest.json" | tr -d '\n '))"
