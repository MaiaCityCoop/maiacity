# deploy

What the server needs beside the compose files: Caddy's config (`Caddyfile`), the website's publish
(`publish-site.py`), and play's backups.

## Backups (Samuel 2026-11-02)

- **When:** before every deploy, and only then. The production workflow's step *Back up play* runs `backup.sh`
  before play-api changes; the deploy stops if the backup fails. Nothing runs on a schedule.
- **What, always together:** play's schema in Postgres (`pg_dump -n play`) **and** a full copy of its files (the
  blob store, from its folder or from its bucket when `PLAY_BUCKET` is set; small enough to copy whole each time), and
  `manifest.json` naming the commit and the play image that ran with them. The backup fails unless the copy holds
  every file the dump names and all three objects are in the bucket at their size; a restore refuses a backup that
  lacks either half.
- **Where:** Hetzner Object Storage, bucket `maiacity`, `BACKUPS/play/<when>-<label>/` (`play.dump`,
  `blobs.tar`, `manifest.json`). The deploy's log names each one.
- **By hand on the server:** `bash /opt/maia-city/deploy/backup.sh <label>`.

## Restore, by hand only

GitHub → Actions → **restore** → Run workflow, with the backup's name (or `latest`):

- **check** restores it beside production into a throwaway Postgres, runs play's `src/verify.ts` (every file
  there and hashing to its name, every head a version, every recipe a file) and starts the image it ran with on it.
  Production is not touched.
- **rollback** (type `ROLLBACK` to confirm) first backs up how play is now (`before-rollback`), then puts back
  play's schema from the dump, its files from the copy (the ones before are kept as `blobs.before-rollback-<when>`
  beside them) and the image it ran with, and checks that play answers. The next deploy moves play forward again.

The workflow shares the deploy's concurrency group, so it never runs beside a deploy.
