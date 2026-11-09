# play on the server (production.yml's step "Start play-api, import, and answer play.maia.city"): play.env written,
# play's role and schema in the same Postgres, play-api beside the running containers (--no-deps), the import, Caddy
# answering play.maia.city. It reaches the server on stdin after the values it needs, never as arguments:
#   { DATA_MOUNT=… IMAGE=… GHCR_TOKEN=… ACTOR=… S3_ACCESS_KEY=… S3_SECRET_KEY=… SHIP_TOKEN=… SHIP_REPO=…; cat deploy/server-up.sh; } \
#     | ssh prod "cd $APP_DIR && bash -s"
# and runs in the app's folder, with the deploy/lib.sh the backup job has just put there.
# shellcheck shell=bash
set -e
if [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
  echo "::error::play keeps its files in the bucket: set HETZNER_S3_ACCESS_KEY and HETZNER_S3_SECRET_KEY."; exit 1
fi
. deploy/lib.sh
exec 9>.env.lock; flock -w 300 9
# play's database password: made once beside Postgres's data, never in git or a log
PWFILE="$DATA_MOUNT/.play_db_password"
if [ ! -f "$PWFILE" ]; then openssl rand -hex 24 | sudo tee "$PWFILE" >/dev/null; sudo chown deploy "$PWFILE"; sudo chmod 600 "$PWFILE"; fi
PW=$(cat "$PWFILE")
sudo mkdir -p "$DATA_MOUNT/play" && sudo chown 1000:1000 "$DATA_MOUNT/play"
umask 077
cat > play.env <<EOF2
PLAY_IMAGE=$IMAGE
PLAY_DATABASE_URL=postgres://play:$PW@db:5432/maiacity
PLAY_DATA_PATH=$DATA_MOUNT/play
PLAY_BUCKET=$S3_BUCKET
PLAY_BUCKET_ENDPOINT=$S3_ENDPOINT
PLAY_BUCKET_REGION=$S3_REGION
PLAY_BUCKET_ACCESS_KEY=$S3_ACCESS_KEY
PLAY_BUCKET_SECRET_KEY=$S3_SECRET_KEY
PLAY_MIRROR_ROOT=$STORE_PREFIX
SHIP_TOKEN=$SHIP_TOKEN
SHIP_REPO=$SHIP_REPO
EOF2
set -a; . ./play.env; set +a
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$ACTOR" --password-stdin >/dev/null
compose pull play-api
# the files still in the folder on the volume go into the bucket first (only the ones it lacks, each checked
# against its hash), so play finds every one there once it runs on the bucket; a copy that fails stops here
# then the folder leaves the volume (kept whole on the root disk, beside the app), which it was filling
if [ -d "$DATA_MOUNT/play/blobs" ]; then
  compose run --rm -T --no-deps play-api bun src/tobucket.ts </dev/null
  KEPT=$APP_DIR/play-folder-blobs-$(date -u +%Y%m%dT%H%M%SZ)
  sudo mv "$DATA_MOUNT/play/blobs" "$KEPT"
  echo "play's files are in the bucket; the folder they were in is kept at $KEPT"
fi
# play's role and schema
compose exec -T db psql -v ON_ERROR_STOP=1 -U maiacity -d maiacity -v pw="'$PW'" < play/deploy/setup.sql
compose up -d --no-deps play-api
# the import: it writes only what play lacks from the repo (its site's media, readable sources, stories, …)
# -T and </dev/null: this script reaches the server on stdin (bash -s), and a run that reads stdin eats the rest
compose run --rm -T --no-deps play-api bun import/run.ts --report /data/import-report.md </dev/null
compose exec -T db psql -v ON_ERROR_STOP=1 -U maiacity -d maiacity < play/deploy/after-import.sql
# Caddy answers play.maia.city: its block added once, the file's inode kept (it is bind-mounted)
grep -q '>>> play.maia.city' deploy/Caddyfile || cat play/deploy/Caddyfile.play >> deploy/Caddyfile
# a file bind mount holds the file the container started with: if deploy/Caddyfile was replaced since, Caddy
# still sees the old one. Then load the current file from the site folder it also mounts (not served: the
# site is site/current), with no restart; the next start of Caddy reads deploy/Caddyfile itself.
CONFIG=/etc/caddy/Caddyfile
if [ "$(compose exec -T caddy grep -c '>>> play.maia.city' /etc/caddy/Caddyfile </dev/null || true)" = "0" ]; then
  cp deploy/Caddyfile site/.Caddyfile-current
  CONFIG=/srv/site/.Caddyfile-current
fi
compose exec -T caddy caddy validate --config $CONFIG --adapter caddyfile </dev/null
compose exec -T caddy caddy reload --config $CONFIG --adapter caddyfile </dev/null
docker logout ghcr.io >/dev/null
