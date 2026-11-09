#!/usr/bin/env bash
# One of play's backups (deploy/backup.sh) back from the bucket, run by hand only (.github/workflows/restore.yml):
#   bash deploy/restore.sh check <name|latest>     restore it beside production, into a throwaway Postgres, and check it:
#                                                  every file there and hashing to its name, every head a version
#                                                  (play's src/verify.ts), its image answering on it. Production untouched.
#   bash deploy/restore.sh rollback <name|latest>  put it back in production: first a backup of how things are now, then
#                                                  play's schema from the dump, its files (the ones it names, from the
#                                                  shared store; an older backup's from its own copy; the ones before
#                                                  kept beside them), and the image it ran with.
# GHCR_TOKEN and ACTOR in the environment let it pull an image the server does not have.
set -euo pipefail
cd "$(dirname "$0")/.."
APP=$(pwd)
. deploy/lib.sh
set -a
. ./backup.env
. ./play.env
set +a
MODE="${1:?check or rollback}"
NAME="${2:-latest}"
WORK="$APP/backups-tmp/restore-$$"
mkdir -p "$WORK"
NET="play-restore-$$"
cleanup() {
  docker rm -f "$NET-db" "$NET-api" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
json() { sed -n "s/^ *\"$1\": *\"\(.*\)\",\{0,1\}$/\1/p" "$WORK/manifest.json" | head -1; }

if [ "$NAME" = latest ]; then
  NAME=$(snapshots -v "$WORK:/work" | tail -1)
  [ -n "$NAME" ] || { echo "restore: there is no backup under $SNAPSHOTS_PREFIX/"; exit 1; }
fi
echo "restore: $MODE from s3://$BACKUP_BUCKET/$SNAPSHOTS_PREFIX/$NAME/ …"
s3 backup -v "$WORK:/work" -- s3 cp "s3://$BACKUP_BUCKET/$SNAPSHOTS_PREFIX/$NAME/" /work/ --recursive --only-show-errors
# a backup is both halves, the dump and the files, or it is none: a snapshot's files are in the shared store
# (files.txt names them), an older backup's in its own blobs.tar or blobs/
for f in play.dump manifest.json; do
  [ -s "$WORK/$f" ] || { echo "restore: $NAME has no $f: not a whole backup"; exit 1; }
done
[ -f "$WORK/files.txt" ] || [ -s "$WORK/blobs.tar" ] || [ -d "$WORK/blobs" ] || { echo "restore: $NAME has neither files.txt nor blobs.tar nor blobs/: not a whole backup"; exit 1; }
echo "restore: manifest $(tr -d '\n ' < "$WORK/manifest.json")"
IMAGE=$(json image)
IMAGE="${IMAGE:-$PLAY_IMAGE}"
if [ -n "${GHCR_TOKEN:-}" ]; then echo "$GHCR_TOKEN" | docker login ghcr.io -u "${ACTOR:-deploy}" --password-stdin >/dev/null 2>&1 || true; fi
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE" >/dev/null
docker image inspect "$PLAY_IMAGE" >/dev/null 2>&1 || docker pull "$PLAY_IMAGE" >/dev/null
mkdir -p "$WORK/data"
if [ -f "$WORK/files.txt" ]; then
  # a snapshot: the files it names, from the store every snapshot shares (a file named by its hash never changes, so
  # the store's copy is the one the snapshot was made with); each must be there, at its size
  echo "restore: fetching the $(wc -l <"$WORK/files.txt") files it names from s3://$BACKUP_BUCKET/$STORE_PREFIX/ …"
  mkdir -p "$WORK/data/blobs"
  # the store synced down whole (in parallel, only what is not here yet), then whatever this snapshot does not name
  # taken out again below
  S3_TIMEOUT=2400 s3 backup -v "$WORK:/work" -- \
    s3 sync "s3://$BACKUP_BUCKET/$STORE_PREFIX/" /work/data/blobs/ --size-only --only-show-errors
  while read -r h size; do
    f="$WORK/data/blobs/${h:0:2}/$h"
    [ -f "$f" ] && [ "$(stat -c %s "$f")" = "$size" ] || { echo "restore: the store lacks $h (or holds it at another size): not a whole snapshot"; exit 1; }
  done <"$WORK/files.txt"
  # the store's files this snapshot does not name are not part of it
  find "$WORK/data/blobs" -type f | awk -F/ 'NR == FNR { want[$1] = 1; next } !($NF in want) { print }' <(cut -d' ' -f1 "$WORK/files.txt") - | xargs -r rm -f
elif [ -s "$WORK/blobs.tar" ]; then tar -xf "$WORK/blobs.tar" -C "$WORK/data"
else mv "$WORK/blobs" "$WORK/data/blobs"
fi
chmod -R a+rX "$WORK/data"

if [ "$MODE" = check ]; then
  docker network create "$NET" >/dev/null
  docker run -d --name "$NET-db" --network "$NET" -e POSTGRES_PASSWORD=restore postgres:17-alpine >/dev/null
  for _ in $(seq 1 60); do docker exec "$NET-db" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  sleep 2
  docker exec -i "$NET-db" pg_restore -U postgres -d postgres --no-owner --no-acl < "$WORK/play.dump"
  echo "restore: the dump is in a throwaway Postgres; checking it against its files …"
  # the newest image's check (src/verify.ts), which reads the schema and the files alone
  docker run --rm --network "$NET" -v "$WORK/data:/data:ro" \
    -e DATABASE_URL="postgres://postgres:restore@$NET-db:5432/postgres" -e PLAY_BLOBS=/data/blobs \
    "$PLAY_IMAGE" bun src/verify.ts </dev/null
  # and the image the backup ran with, serving it
  docker run -d --name "$NET-api" --network "$NET" -v "$WORK/data:/data:ro" \
    -e DATABASE_URL="postgres://postgres:restore@$NET-db:5432/postgres" -e PLAY_BLOBS=/data/blobs -e PORT=3000 \
    -e RP_ID=maia.city -e SITE_ORIGIN=https://play.maia.city "$IMAGE" >/dev/null
  if answers "$NET-api" 30 2 2>/dev/null; then
    echo "restore: OK — $NAME restores, its files check out, and $IMAGE answers on it"; exit 0
  fi
  docker logs --tail 40 "$NET-api"; echo "restore: $IMAGE did not answer on the restored backup"; exit 1
fi

[ "$MODE" = rollback ] || { echo "restore: the mode is check or rollback"; exit 1; }
echo "restore: first, a backup of how play is now …"
bash "$APP/deploy/backup.sh" before-rollback </dev/null
echo "restore: stopping play-api, putting back the schema play …"
compose stop play-api </dev/null || true
docker exec -i "$DB_CONTAINER" pg_restore -U maiacity -d maiacity --clean --if-exists -n play < "$WORK/play.dump"
if [ -n "${PLAY_BUCKET:-}" ]; then
  # files are named by their hash and never change: putting back the backup's is adding the ones the bucket lacks
  echo "restore: putting back the files into s3://$PLAY_BUCKET/blobs/ …"
  S3_TIMEOUT=1800 s3 play -v "$WORK/data:/data:ro" -- s3 sync /data/blobs/ "s3://$PLAY_BUCKET/blobs/" --only-show-errors
else
  KEPT="$PLAY_DATA_PATH/blobs.before-rollback-$(date -u +%Y%m%dT%H%M%SZ)"
  echo "restore: putting back the files (the ones before kept in $KEPT) …"
  sudo mv "$PLAY_DATA_PATH/blobs" "$KEPT" 2>/dev/null || true
  sudo cp -a "$WORK/data/blobs" "$PLAY_DATA_PATH/blobs"
  sudo chown -R 1000:1000 "$PLAY_DATA_PATH/blobs"
fi
echo "restore: running $IMAGE …"
sed -i "s#^PLAY_IMAGE=.*#PLAY_IMAGE=$IMAGE#" play.env
set -a; . ./play.env; set +a
compose up -d --no-deps play-api </dev/null
if answers "$PLAY_CONTAINER" 30 2 2>/dev/null; then
  echo "restore: rolled back to $NAME ($IMAGE); play answers. Checking its files against its database …"
  docker exec "$PLAY_CONTAINER" bun src/verify.ts </dev/null || echo "restore: (the image $IMAGE has no src/verify.ts, or it found problems: see above)"
  exit 0
fi
docker logs --tail 40 "$PLAY_CONTAINER"; echo "restore: play did not answer after the rollback"; exit 1
