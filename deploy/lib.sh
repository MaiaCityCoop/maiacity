# The deploy's toolkit, sourced, never run: production's constants, and what the scripts on the server share
# (backup.sh, restore.sh, server-care.sh, server-up.sh). Sourcing it changes nothing. The workflows read the constants
# from it on their runner (.github/actions/prod-ssh, bucket-keys.sh); the server has the copy the last deploy put there.
# shellcheck shell=bash
# shellcheck disable=SC2034
APP_DIR=/opt/maia-city
# the server, as the deploy reaches it over SSH
HOST=api.maia.city
# Hetzner Object Storage: BACKUPS/ (backup.sh) and play's files (blobs/)
S3_BUCKET=maiacity
S3_ENDPOINT=https://hel1.your-objectstorage.com
S3_REGION=hel1
# the backups' layout in their bucket (deploy/backup.sh): the snapshots, and the store of play's files every snapshot
# shares, which play also writes each file to as its second copy (play.env's PLAY_MIRROR_ROOT, server-up.sh)
SNAPSHOTS_PREFIX=BACKUPS/play
STORE_PREFIX=BACKUPS/play-files/blobs
# the containers the compose files name
DB_CONTAINER=maia-city-db
PLAY_CONTAINER=maia-city-play

# docker compose on play's three files, from the app's folder
compose() {
  docker compose -f docker-compose.yml -f docker-compose.prod.yml -f play/docker-compose.play.yml "$@"
}

# answers <container> <tries> <pause>: whether play-api in it answers /api/health, asked up to <tries> times
answers() {
  local _
  for _ in $(seq 1 "$2"); do
    docker exec "$1" bun -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" && return 0
    sleep "$3"
  done
  return 1
}

# snapshot_name <label>: a new snapshot's name, <when>-<label>, which snapshots finds by its <when>
snapshot_name() { echo "$(date -u +%Y%m%dT%H%M%SZ)-$1"; }
# snapshots [docker run options …]: the snapshots' names in the backups' bucket, oldest first
snapshots() {
  s3 backup "$@" -- s3 ls "s3://$BACKUP_BUCKET/$SNAPSHOTS_PREFIX/" | awk '/PRE /{print $2}' | tr -d / | grep -E '^[0-9]{8}T[0-9]{6}Z-' | sort
}

# s3 <backup|play> [docker run options …] -- <aws arguments …>: the AWS CLI in its container against the backups' bucket
# (backup.env's keys) or play's own (play.env's), stdin closed. S3_TIMEOUT bounds the whole call (seconds, default 900,
# 0 none), S3_READ_TIMEOUT each read (default 120).
s3() {
  local keys endpoint run=()
  case "$1" in
    backup)
      keys=(-e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION")
      endpoint=$BACKUP_ENDPOINT ;;
    play)
      keys=(-e AWS_ACCESS_KEY_ID="$PLAY_BUCKET_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$PLAY_BUCKET_SECRET_KEY"
        -e AWS_DEFAULT_REGION="${PLAY_BUCKET_REGION:-$BACKUP_REGION}")
      endpoint=$PLAY_BUCKET_ENDPOINT ;;
    *) echo "s3: backup or play, not $1" >&2; return 2 ;;
  esac
  shift
  while [ $# -gt 0 ] && [ "$1" != -- ]; do run+=("$1"); shift; done
  shift
  # Hetzner's S3 does not take the checksums newer AWS CLIs send by default, only when an operation requires one
  timeout "${S3_TIMEOUT:-900}" docker run --rm "${run[@]}" "${keys[@]}" \
    -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    -e AWS_RETRY_MODE=adaptive -e AWS_MAX_ATTEMPTS=6 \
    amazon/aws-cli --endpoint-url "$endpoint" --cli-connect-timeout 20 --cli-read-timeout "${S3_READ_TIMEOUT:-120}" "$@" </dev/null
}
