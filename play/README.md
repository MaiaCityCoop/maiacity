# play.maia.city

Three stateless sandboxes and the asset library with its versions, on Postgres and object storage. Spec:
[SPEC.md](SPEC.md). Legacy (maia.city, avenDB, aven/api) is only read, never changed.

## The API and its data (`api/`)

```sh
cd play/api && bun install
export DATABASE_URL=postgres://…            # the same Postgres as legacy; play keeps to its schema `play`
export PLAY_BLOBS=./blobs                    # or PLAY_BUCKET, PLAY_BUCKET_ENDPOINT, PLAY_BUCKET_ACCESS_KEY, PLAY_BUCKET_SECRET_KEY
bun src/migrate.ts                           # the schema
bun import/run.ts --dry                      # plan and check everything, write nothing
bun import/run.ts --founders --admin 1 --report import-report.md
bun test
```

The import reads the legacy avenDB server's public feed (no key needed): every recipe entry with every version and
variant it holds, each file checked against the BLAKE3 hash its own card names and against the version and variant
its last line names. It writes only what is missing, so it can run again; a version, once written, can't be changed.
`--founders` copies the legacy founders and passkeys (everyone a traveler), `--admin` names the admins by founder
number.

Last run against the live feed (2026-11-02): 203 assets (plants 105, things 55, machines 12, buildings 12, actors 12,
biomes 7), 264 versions, 145 variants, 340 files (18.1 MB), every file read back and hash-checked; 108 readable refs
between assets rewritten as hashes; 288 sandbox pins (Sandbox 1: 56 village, 109 garden, 105 plants; Sandbox 3: 18)
and Sandbox 1's garden config; 11 media files (covers, sounds). Every asset is named by its hash (SPEC.md §4.5).
