# deploy

What the server needs beside the compose files: Caddy's config (`Caddyfile`), the website's publish
(`publish-site.py`), and play's backups.

## Backups (Samuel 2026-11-02)

- **When:** before every deploy, and only then. The production workflow's step *Back up play* runs `backup.sh`
  before play-api changes; the deploy stops if the backup fails. Nothing runs on a schedule.
- **What, always together: a snapshot, like Time Machine's** (Samuel 2026-11-05). Every snapshot holds a **full**
  dump of play's schema in Postgres (`pg_dump -n play`), `files.txt` (every file the dump names: its hash and size)
  and `manifest.json` naming the commit and the play image that ran with them. The **files** are kept once each, under
  their BLAKE3 hash, in a store every snapshot shares: a file named by its hash never changes, so a deploy copies only
  the files the store does not hold yet (its few new ones, from play's folder or from its bucket when `PLAY_BUCKET` is
  set), never the rest. The backup fails unless the store holds every file the dump names, each at its size, and the
  snapshot's three objects are in the bucket at their size; a restore refuses a snapshot whose files the store lacks.
- **Where:** Hetzner Object Storage, bucket `maiacity`:
  - `BACKUPS/play/<when>-<label>/` the snapshots (`play.dump`, `files.txt`, `manifest.json`); the deploy's log names
    each one. Older backups (before 2026-11-05) hold their own full copy of the files instead (`blobs.tar` or
    `blobs/`), and still restore.
  - `BACKUPS/play-files/blobs/<xx>/<hash>` the files, shared by every snapshot. Nothing is ever removed from it.
- **By hand on the server:** `bash /opt/maia-city/deploy/backup.sh <label>`.

## Restore, by hand only

GitHub → Actions → **restore** → Run workflow, with the backup's name (or `latest`):

- **check** restores it beside production into a throwaway Postgres, runs play's `src/verify.ts` (every file
  there and hashing to its name, every head a version, every recipe a file) and starts the image it ran with on it.
  Production is not touched.
- **rollback** (type `ROLLBACK` to confirm) first backs up how play is now (`before-rollback`), then puts back
  play's schema from the dump, its files (the ones it names, from the shared store; an older backup's from its own
  copy; the ones before are kept as `blobs.before-rollback-<when>` beside them) and the image it ran with, and checks that play answers. The next deploy moves play forward again.

The workflow shares the deploy's concurrency group, so it never runs beside a deploy.

## The server's care, by hand only

GitHub → Actions → **server** → Run workflow (`server-care.sh`), never beside a deploy:

- **report** changes nothing: what fills the root disk and the data volume, what Docker holds, the journal, the
  leftovers of backups, play's files, and which of them are broken (their bytes not hashing to their name).
- **clean** frees what nothing uses (Docker's unused images older than a day, stopped containers, its build cache,
  the journal past 200 MB, apt's cache, leftovers of backups older than an hour; no volume is removed), then mends
  play's broken files: their good bytes from the backups' shared store, then from the older backups' own copies,
  checked against their hash; one no
  backup holds is moved aside to `broken-<when>/` beside the files, so play writes it anew when it is made again.

A full disk is what breaks files: play now writes a file whole beside its name and only then moves it there, and takes
a file whose bytes do not hash to its name for missing (`play/api/src/blobs.ts`). The backup uploads the files
straight from their folder (or copies them inside the object storage), so it needs no room on the disk.
