# deploy

What the server needs beside the compose files: Caddy's config (`Caddyfile`), the website's publish
(`publish-site.py`), and play's backups. `lib.sh` holds production's constants (its folder, its host, the bucket) and
what the scripts on the server share (the AWS CLI's call, compose, the health probe); `dns.sh` sets and removes a
name's records, `server-up.sh` brings play up on the server, `bucket-keys.sh` writes the bucket's keys there.

## Releases: Accept ships it (Samuel 2026-11-06)

An admin's Accept on play's intents' board is the one way code lands on `main` and goes to production
(play/SPEC.md §4.12, `play/api/src/ship.ts`): play posts the commit status **`Intent accepted`** on the intent's pull
request's head, adds it to main's merge queue, which merges it into `main` (*Main's ruleset and the merge queue*,
below), and follows it to production in the intent's stage **Ship**. Once main.yml is green for the merge,
`.github/workflows/release.yml` moves `production` to it (fast-forward only, `GITHUB_TOKEN`) and starts `production.yml`, which backs up and deploys. A red step brings the intent back to Proposal with its report;
Accept there ships it again.

- **`SHIP_TOKEN`**, a repository secret: a fine-grained token (github.com/settings/personal-access-tokens/new), its
  resource owner MyAvenCEO, only the repository maiacity, with Repository permissions **Contents**, **Pull requests**,
  **Commit statuses** and **Actions**, each read and write, for one year. The deploy writes it into the server's
  `play.env` with `SHIP_REPO` (the repository), and play-api reads it (`play/docker-compose.play.yml`); it is sent to
  api.github.com only and never logged. Without it, Accept on code is refused and says so. Renew it before it ends:
  a new token saved as the secret, then a deploy.
- **main's ruleset**: as code, applied with `deploy/ruleset.sh` (below, *Main's ruleset and the merge queue*).
- **production's ruleset**: production moves only by release.yml's fast-forward push (GitHub Actions), never by a pull
  request: enforcement Active; rules *Restrict deletions*, *Block force pushes* (so it only ever moves forward) and
  *Require status checks to pass*: the two named in `.github/required-checks.json` (main's own checks on the commit, so
  only a commit main has checked goes out). No *Require a pull request*, no *Only from main*: those were the old way
  (a pull request main → production), and they refuse release.yml's push (GH013).
- It stops every change landing without an Accept by mistake; it does not stop someone acting as the token's owner on
  GitHub on purpose (the agents act as Samuel there).
- By hand: Actions → **release** → Run workflow with a commit of main releases it (or deploys production's own commit
  again).

## Main's ruleset and the merge queue (intent f7721142)

Main's ruleset is code: `deploy/rulesets/main.json`, the ruleset named `main` on the default branch, enforcement
active, no bypass list. It holds *Restrict deletions*, *Block force pushes*, *Require a pull request* (0 approvals,
merge commits only), *Require status checks* (`play / API and site`, `website / build` and `Intent named` from GitHub
Actions, `Intent accepted` from any source; not strict) and the **merge queue** (merge commits, all green, up to 5
pull requests built and merged at once, no wait, 60 minutes for the checks). On Accept play posts `Intent accepted` on
the pull request's head and adds it to the queue; GitHub builds each merge group on a branch
`gh-readonly-queue/main/…`, runs main.yml and Intent named on the group's commit (event `merge_group`), play posts
`Intent accepted` on it, and once all are green GitHub fast-forwards main to that commit. The push to main then passes
its checks at once (`.github/workflows/tested-tree.sh`: the queue's run passed on that very commit).

An admin applies it (and sets the repository's merge commits to the pull request's title and body, so each keeps its
`Intent:` line):

```sh
GH_TOKEN=<an admin's token> bash deploy/ruleset.sh MyAvenCEO/maiacity
```

`--dry-run` prints the requests (PUT to the ruleset `main` when there is one, else POST; then the repository's PATCH)
and sends none. Until it is applied play refuses Accept, saying:

Main's ruleset has no merge queue yet: an admin applies it with deploy/ruleset.sh (deploy/README.md), then Accept again.

## Backups (Samuel 2026-11-02)

- **When:** before every deploy, and only then. The production workflow's job *The backup* (its step *Back up play*) runs
  `backup.sh` beside *The image*, and *The server* waits for both, so the backup is taken before play-api changes; the deploy stops if the backup fails. Nothing runs on a schedule.
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
  play's broken files: their good bytes from the folders kept when play's files moved into the bucket, then the
  backups' shared store, then the older backups' own copies, checked against their hash. A file whose bytes are lost
  everywhere and that nothing in play's data names but its own row is forgotten (its row in `play.files` removed);
  one that anything names is kept and reported.

A full disk is what breaks files: play now writes a file whole beside its name and only then moves it there, and takes
a file whose bytes do not hash to its name for missing (`play/api/src/blobs.ts`). The backup uploads the files
straight from their folder (or copies them inside the object storage), so it needs no room on the disk.
