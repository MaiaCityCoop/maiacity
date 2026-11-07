# play.maia.city

Three stateless sandboxes and the asset library with its versions, on Postgres and object storage. Spec:
[SPEC.md](SPEC.md). What came before is on the branch `SNAPSHOT_2611101`; nothing of play's reads it.

## The API and its data (`api/`)

```sh
cd play/api && bun install
export DATABASE_URL=postgres://…            # the same Postgres as legacy; play keeps to its schema `play`
export PLAY_BLOBS=./blobs                    # or PLAY_BUCKET, PLAY_BUCKET_ENDPOINT, PLAY_BUCKET_ACCESS_KEY, PLAY_BUCKET_SECRET_KEY
bun src/migrate.ts                           # the schema
bun import/run.ts --report import-report.md  # what play lacks from the repo (media, sources, stories, …)
bun test
```

The import adds only what play lacks from the repo (its site's media from `play/media`, the legacy versions' readable
sources, the stories, factories, game configs and skills) and overrides nothing; a media file play's site names that
play's files lack and `play/media` doesn't hold is an error naming its hash (SPEC.md §6).

The legacy import's run, from legacy's feed before it was retired (2026-11-02): 203 assets (plants 105, things 55,
machines 12, buildings 12, actors 12, biomes 7), 264 versions, 145 variants, 340 files (18.1 MB), every file read back and hash-checked; 108 readable refs
between assets rewritten as hashes; 288 sandbox pins (Sandbox 1: 56 village, 109 garden, 105 plants; Sandbox 3: 18)
and Sandbox 1's garden config; 11 media files (covers, sounds). Every asset is named by its hash (SPEC.md §4.5).

## Factories (`site/src/lib/content/factories`, `/factories/`)

Production lines as live 3D simulations (AirSup's factory skill, its runtime cloned from `SNAPSHOT_2611101`). The first
is the LifeTrac line: every one of the 135 parts of `machines/lifetrac@1` with its raw stock and every operation it goes
through (`lifetrac-bom.js`), each station's cycle time the sum of those operations (`lifetrac-line.js`). The line draws
the real LifeTrac and our Euro pallet by the Factories' pins (the legacy import wrote them). Admins only for now
(Samuel 2026-11-03): the dashboard shows the tile to admins, the page sends anyone else back, and the API hands the
Factories' config to admins alone. Its checks:
`cd play/site && bunx vitest run src/lib/content/factories`.
