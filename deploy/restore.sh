#!/usr/bin/env bash
# One of play's backups (deploy/backup.sh) back from the bucket, run by hand only (.github/workflows/restore.yml):
#   bash deploy/restore.sh check <name|latest>     restore it beside production, into a throwaway Postgres, and check it:
#                                                  every file there and hashing to its name, every head a version
#                                                  (play's src/verify.ts), its image answering on it. Production untouched.
#   bash deploy/restore.sh rollback <name|latest>  put it back in production: first a backup of how things are now, then
#                                                  play's schema from the dump, its files from the copy (the ones before
#                                                  kept beside them), and the image it ran with.
# GHCR_TOKEN and ACTOR in the environment let it pull an image the server does not have.
set -euo pipefail
cd "$(dirname "$0")/.."
APP=$(pwd)
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
s3() {
  timeout 900 docker run --rm -v "$WORK:/work" \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION="$BACKUP_REGION" \
    -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
    amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" --cli-connect-timeout 20 --cli-read-timeout 120 "$@" </dev/null
}
json() { sed -n "s/^ *\"$1\": *\"\(.*\)\",\{0,1\}$/\1/p" "$WORK/manifest.json" | head -1; }

if [ "$NAME" = latest ]; then
  NAME=$(s3 s3 ls "s3://$BACKUP_BUCKET/BACKUPS/play/" | awk '/PRE /{print $2}' | tr -d / | sort | tail -1)
  [ -n "$NAME" ] || { echo "restore: there is no backup under BACKUPS/play/"; exit 1; }
fi
echo "restore: $MODE from s3://$BACKUP_BUCKET/BACKUPS/play/$NAME/ …"
s3 s3 cp "s3://$BACKUP_BUCKET/BACKUPS/play/$NAME/" /work/ --recursive --only-show-errors
[ -f "$WORK/play.dump" ] && [ -f "$WORK/manifest.json" ] || { echo "restore: $NAME has no play.dump and manifest.json"; exit 1; }
echo "restore: manifest $(tr -d '\n ' < "$WORK/manifest.json")"
IMAGE=$(json image)
IMAGE="${IMAGE:-$PLAY_IMAGE}"
if [ -n "${GHCR_TOKEN:-}" ]; then echo "$GHCR_TOKEN" | docker login ghcr.io -u "${ACTOR:-deploy}" --password-stdin >/dev/null 2>&1 || true; fi
docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE" >/dev/null
docker image inspect "$PLAY_IMAGE" >/dev/null 2>&1 || docker pull "$PLAY_IMAGE" >/dev/null
mkdir -p "$WORK/data"
[ -f "$WORK/blobs.tar" ] && tar -xf "$WORK/blobs.tar" -C "$WORK/data"
chmod -R a+rX "$WORK/data"

if [ "$MODE" = check ]; then
  docker network create "$NET" >/dev/null
  docker run -d --name "$NET-db" --network "$NET" -e POSTGRES_PASSWORD=restore postgres:17-alpine >/dev/null
  for i in $(seq 1 60); do docker exec "$NET-db" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
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
  for i in $(seq 1 30); do
    if docker exec "$NET-api" bun -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
      echo "restore: OK — $NAME restores, its files check out, and $IMAGE answers on it"; exit 0
    fi
    sleep 2
  done
  docker logs --tail 40 "$NET-api"; echo "restore: $IMAGE did not answer on the restored backup"; exit 1
fi

[ "$MODE" = rollback ] || { echo "restore: the mode is check or rollback"; exit 1; }
echo "restore: first, a backup of how play is now …"
bash "$APP/deploy/backup.sh" before-rollback </dev/null
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml -f play/docker-compose.play.yml"
echo "restore: stopping play-api, putting back the schema play …"
$C stop play-api </dev/null || true
docker exec -i maia-city-db pg_restore -U maiacity -d maiacity --clean --if-exists -n play < "$WORK/play.dump"
if [ -d "$WORK/data/blobs" ]; then
  KEPT="$PLAY_DATA_PATH/blobs.before-rollback-$(date -u +%Y%m%dT%H%M%SZ)"
  echo "restore: putting back the files (the ones before kept in $KEPT) …"
  sudo mv "$PLAY_DATA_PATH/blobs" "$KEPT" 2>/dev/null || true
  sudo cp -a "$WORK/data/blobs" "$PLAY_DATA_PATH/blobs"
  sudo chown -R 1000:1000 "$PLAY_DATA_PATH/blobs"
fi
echo "restore: running $IMAGE …"
sed -i "s#^PLAY_IMAGE=.*#PLAY_IMAGE=$IMAGE#" play.env
set -a; . ./play.env; set +a
$C up -d --no-deps play-api </dev/null
for i in $(seq 1 30); do
  if docker exec maia-city-play bun -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "restore: rolled back to $NAME ($IMAGE); play answers"; exit 0
  fi
  sleep 2
done
docker logs --tail 40 maia-city-play; echo "restore: play did not answer after the rollback"; exit 1
