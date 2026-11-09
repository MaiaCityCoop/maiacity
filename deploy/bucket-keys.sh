#!/usr/bin/env bash
# The bucket's keys to the server, run on a workflow's runner once .github/actions/prod-ssh has made `ssh prod`: written
# over stdin into the app's backup.env, readable by deploy only, never as arguments. backup.sh, restore.sh and
# server-care.sh read it. The keys come as S3_ACCESS_KEY and S3_SECRET_KEY (the secrets HETZNER_S3_ACCESS_KEY and
# HETZNER_S3_SECRET_KEY).
#   bash deploy/bucket-keys.sh            red without them
#   bash deploy/bucket-keys.sh --if-set   writes nothing without them (the server's care: its report needs none)
set -euo pipefail
. "$(dirname "$0")/lib.sh"
if [ -z "${S3_ACCESS_KEY:-}" ] || [ -z "${S3_SECRET_KEY:-}" ]; then
  [ "${1:-}" = --if-set ] && exit 0
  echo "::error::No access to the bucket: set HETZNER_S3_ACCESS_KEY and HETZNER_S3_SECRET_KEY."; exit 1
fi
printf 'BACKUP_BUCKET=%s\nBACKUP_ENDPOINT=%s\nBACKUP_REGION=%s\nAWS_ACCESS_KEY_ID=%s\nAWS_SECRET_ACCESS_KEY=%s\n' \
  "$S3_BUCKET" "$S3_ENDPOINT" "$S3_REGION" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" \
  | ssh prod "umask 077; cat > $APP_DIR/backup.env"
