# play.maia.city — spec v0.4 (2026-11-02)

A new, separate app with **three sandboxes and the asset library with its versions**, on Postgres and object storage
instead of avenDB. Legacy (today's maia.city, avenDB, the current API, MaiaCity V1/V2) is not touched: nothing in it
is changed, moved or deleted, and the new sandboxes drift apart from it from day one.

## 1. Decisions

| Topic | Decision |
|---|---|
| Domain | `play.maia.city`, its own Caddy block on the same Hetzner machine |
| Code | `play/` in this repo. Code is **cloned** from `maia/content` into `play/`, never imported from legacy, so the two drift apart freely |
| Sandboxes | **Sandbox 1** = a clone of today's Sandbox 4 (the dome cell and its food forest). **Sandbox 2** = a clone of today's Sandbox 7 (the physical world lab), restyled in the light brand CI. **Sandbox 3** = a clone of MaiaCity V2's world, stripped to the world itself (§5) |
| Games | No V1/V2 game in play. One **game placeholder** page, where an invited person becomes a citizen (the game itself comes later) |
| State | All three sandboxes are **stateless**: nothing a visitor does in a world is saved on the server |
| Accounts | Today's founders and passkeys copied in once (the same passkey works: RP_ID `maia.city` covers the subdomain). Sign-up is **open**; everyone who signs up is a **traveler** |
| Ownership | The **Maia City coop owns every asset** and is their authority. Its **admins** are its owners and act for it (Samuel to start) |
| Rights | Visitors (not signed in): no rights, they see the sign-in page. Travelers: enter and play every sandbox, read every asset and every version. Citizens (by invite): + propose new asset versions, + the coming game. Admins: accept or reject proposals, run members and invites |
| Proposals | v0: **asset update proposals** only (a new version of an asset): **citizens propose, admins accept**. Pinning a sandbox to an asset version is a separate proposal kind, later (§4.4) |
| Encryption | None for now; it can come back as a layer on top |
| Versioning | No Loro, no CRDT. A content-addressed version DAG in Postgres, from first principles (§4) |
| Out of scope | Studio, blog, stories, posts, chat, the agent MCP, theOS, DB2, the V2 trailer/intro |

## 2. Shape

```
browser ──► play.maia.city (Caddy)
              ├─ /            static SvelteKit build (play/site)
              └─ /api/*  ──►  play-api (Bun)  ──►  Postgres (same instance, own schema `play`, own role)
                                   └──────────────►  Hetzner Object Storage, bucket `maiacity-play`
                                                      (blobs by BLAKE3 hash, served by signed URL)
```

A new `play-api` service in `docker-compose.prod.yml` with its own image and release workflow. After the one-time
import the `play` role reads nothing of `public`.

## 3. Ownership chain (Postgres, schema `play`)

Who owns what, who may do what, who wrote and who approved each version. No keys or signatures: the server is trusted.

```sql
humans       (id, name, founder_number, created)                  -- copied once from public.founders
passkeys     (id, human_id → humans, public_key, counter, transports, created)
coops        (id, name, created)                                  -- 'maia-city'
memberships  (coop_id, human_id, level, granted_by → humans, granted_at, via_invite)
             -- level: admin | citizen | traveler; sign-up writes traveler; admins are the coop's owners
level_rules  (coop_id, level, rule jsonb)                         -- seeded from today's cap groups, then changed:
             -- traveler: read every sandbox + every asset; citizen: + propose, + the game; admin: everything
invites      (code, coop_id, level /*citizen*/, made_by, expires_at, used_by, used_at)
sessions     -- as today's API (signed cookie)
```

## 4. Asset version control, from first principles

### 4.1 What is versioned

An asset version is atomic: a **recipe file** (bundled JS, made from source by the box; named by its BLAKE3 hash), its
**card** (JSON: label, size, triangles, engine, params it takes), and the engine version it runs on. A recipe file is
a build output: it is never edited in place and two of them are never merged line by line. Variants (param presets,
e.g. `actors/stand-in:stand-in?face=…`) belong to a version.

### 4.2 What it has to do

Propose a new version, accept or reject it, read an asset's history as a chain, read any old version forever, compare
two versions (card diff, file hashes), revert (propose an old version's content as the next one), pin a sandbox to a
version.

### 4.3 The primitive

A **version DAG**, the part of avenDB worth keeping, without signatures and without a CRDT:

```sql
assets          (id, coop_id /*owner: maia-city*/, grp, slug, label, head → asset_versions, created) -- unique (grp, slug)
asset_versions  (id /*BLAKE3 of canonical {asset, parents, recipe, default_variant, variants, card, engine}*/,
                 asset_id, parents text[] /*version ids; one, or none for the first*/,
                 number int /*@v, given on accept, 1, 2, 3 …*/,
                 recipe_hash → files      /*its own recipe; NULL for a kind of variants (actors, machines)*/,
                 default_variant          /*for a kind of variants: the one a ref without a variant names*/,
                 card jsonb, engine int, author → humans, approved_by → humans, note, created,
                 imported jsonb           /*provenance: avenDB vault, entry, heads, edits, authors*/)
                 -- immutable: a trigger refuses UPDATE and DELETE (only number/approver are set once, on accept)
asset_variants  (version_id, name, recipe_hash → files, card jsonb)              -- immutable
files           (hash PK /*BLAKE3 of the bytes*/, size, media_type, bucket_key, created)
proposals       (id, coop_id, kind /*asset_version*/, asset_id, base → asset_versions, version → asset_versions,
                 author, status /*open|accepted|rejected|withdrawn|stale*/, decided_by, decided_at, note, created)
```

- A proposal names its **base** (the head it was made from) and a not yet numbered version.
- **Accept** is one transaction: it checks `assets.head = proposal.base` (optimistic concurrency), gives the version
  the next number, moves the head, writes `approved_by`. If someone accepted another version first, the proposal is
  **stale**: re-propose it on the new head, or an admin accepts it as a replacement (its parents then name both).
- Content addressing gives what avenDB gave: the same content has the same id, a file is checked by its hash wherever
  it is read, and history can't be rewritten without every id changing.

### 4.4 Why no Loro (for now)

A CRDT such as Loro merges concurrent edits to the same document field by field, offline, without a server deciding.
Asset versions have none of that: each is replaced whole, a central Postgres decides the order, and a head check in a
transaction resolves the one conflict there is (two proposals on the same base). A CRDT here would add a dependency,
a binary format and merge rules for content that is never merged.

We keep its useful ideas instead: immutable history, parents and heads, proposals as lines next to the main one, and
versions anchored by pins. If a document that people edit live together comes later (a world layout, shared params),
Loro can come back for that document type only: its snapshot and updates stored as `bytea` next to the row.

### 4.5 One source, every asset by its hash

- **One source of truth:** Postgres (the catalog: assets, versions, variants, cards, the owner; the sandboxes' pins and
  configs) and the bucket (every file under the BLAKE3 hash of its bytes). Nothing else is read: no avenDB, no repo
  fallback, no index of readable names in the site.
- **Every reference is a hash.** A build is `<hash>?values`. A sandbox names an asset by a slot of its pins,
  `pin:<sandbox>/<slot>`, which its config in the database maps to a build (`GET /api/sandboxes/<id>/config`). A card
  that names another asset names its build: the import rewrote every readable ref legacy's cards made (the biomes'
  cover kinds, the pickup's Power Cube) and a proposal that names one is refused. A version's number, an asset's id
  and a label are only shown.
- **One loader** (play/site's `content/assets/catalog.js`): hash → its record from `/api/catalog` → its file from
  `/api/files/<hash>`, held to the hash → the frozen box engine builds it. Media (covers, sounds) are play's files too.

### 4.6 Pins (later proposal kind)

`sandbox_pins (sandbox_id, slot, asset_id, version_id, variant, params)`: which version a sandbox draws.
Imported as they are today. Changing one later is a `pin_change` proposal ("update Sandbox 1's hens to version x"),
accepted by an admin. It is not part of v0.

## 5. The three sandboxes

| New | Cloned from | What changes |
|---|---|---|
| **Sandbox 1** | Sandbox 4 (`maia/site/routes/app/games/sandbox-4`, `maia/content/sandbox-kit`, `maia/content/sandbox-2/interior`), its 56 asset pins | Recipes come from play's API instead of the avenDB device; pins become `group/id@v` |
| **Sandbox 2** | Sandbox 7 (`maia/content/sandbox-7`), no avenDB dependency | Restyled in the light brand CI: cream/paper backgrounds, ink green text, mustard/sage/terracotta accents, Fraunces display and DM Sans body (tokens from `maia/site/app.css`) |
| **Sandbox 3** | MaiaCity V2's world (`maia/content/maiacity-v2`, engine `maia/content/game/maiacity-v2/engine.js`) | **Stripped:** coops, tokens and money (HEARTS, the MINDs, €uro, the pool, rents, mint, demurrage, dividends), MIPs/AIPs, seats, the ledger and the trailer/intro/tour/film. Also stripped for now: **planting a tree** (the seedlings in the backpack, planting, watering a planted tree). **Kept:** the land, the plots, the trees already there, the van, the things. **Stateless:** no server state, no seats |

**Every visitor gets a random character** when a world opens: today's stand-in actor (`actors/stand-in`) with
random values for its params (face, hair and colour, skin, height, shirt, trousers, shoes …), drawn within the
ranges its card allows. In all three sandboxes; in Sandbox 2 the character walks through the lab among the buildings.

## 6. Where the data comes from (one-time import, `play/import/`)

| Data | Source | Key needed? |
|---|---|---|
| 203 asset recipes (plants 105, things 55, machines 12, buildings 12, actors 12, biomes 7) and their cards | avenDB public feed `GET /feed/entries?seed=1&type=recipe` | No |
| Every version and variant with its own card (264 versions, 145 variants) | `GET /feed/entry/<vault>/<entry>`: its `brought` rows, one per version and variant | No |
| 340 recipe files (18 MB) | `GET /feed/entry/<vault>/<entry>/file/<root>`; each BLAKE3-checked against its own card's `recipe` and its last line against its card's version and variant. History: a linear chain by version number | No |
| Sandbox 1's pins (165: 56 village + 109 garden) | `maia/content/code/configs/sandbox-4/{assets,garden}`; `entry@heads` translated through `maia/content/assets/pins.fixture.json` | No |
| Level rules | feed `type=capgroup` (Admin, Citizen, Traveler), then set to §1's rights | No |
| Humans + passkeys | `public.founders`, `public.passkeys` (read once) | No |
| Owners/admins | Samuel names them; everyone else starts as a traveler | No |

No V2 game state is imported (Sandbox 3 is stateless). The master recovery key is not needed. The avenDB feed takes
only post-quantum TLS: the import runs on Bun (OpenSSL 3.5).

The import is idempotent and verifies before it reports success: every file's BLAKE3 after a read back from the bucket,
every pin resolving, the counts per group against the feed.

## 7. API (`play/api`, Bun)

- Auth: `POST /api/passkey/register/{options,finish}` (open sign-up → traveler),
  `POST /api/passkey/login/{options,finish}`, `GET /api/me`, sign-out. Ported from `aven/api/src/passkey.ts` and
  `session.ts`.
- Assets (traveler+): `GET /api/assets`, `GET /api/assets/:grp/:slug` (its chain), `GET /api/assets/:grp/:slug/:v`,
  `GET /api/files/:hash` (signed redirect to the bucket).
- Sandboxes (traveler+): `GET /api/sandboxes/:id/pins`.
- Proposals: `POST /api/proposals` (citizen+: a new asset version, card + recipe file upload), `GET /api/proposals`,
  `POST /api/proposals/:id/{accept,reject}` (admin+), `POST /api/proposals/:id/withdraw` (its author).
- Coop (admin+): `GET/POST /api/coops/:id/members`, `POST /api/invites`; `POST /api/invites/:code/claim` (makes the
  claimer a citizen).

Every route checks the caller's level against `level_rules`; a visitor gets 401 everywhere except sign-in/sign-up.

## 8. App (`play/site`, SvelteKit, light brand CI throughout)

`/` sign in or sign up · `/sandbox-1/` · `/sandbox-2/` · `/sandbox-3/` · `/assets/` (library; an asset's versions as
a chain, its variants, a viewer) · `/proposals/` · `/game/` (placeholder; claim an invite to become a citizen) ·
`/admin/` (members, invites).

## 9. Deploy

- `play-api` service + a Caddy block for `play.maia.city`; DNS to the same machine.
- Env: `DATABASE_URL` (role `play`), `PLAY_BUCKET`, `PLAY_BUCKET_ENDPOINT`, `PLAY_BUCKET_ACCESS_KEY`,
  `PLAY_BUCKET_SECRET_KEY`, `RP_ID=maia.city`, `SITE_ORIGIN=https://play.maia.city`.
- A release workflow for `play/` only; legacy workflows stay parked.
- Backups: a daily `pg_dump -n play` to the backup bucket; the object bucket with versioning or Object Lock.

## 10. Milestones

1. **M1 Data:** schema, import, verification report.
2. **M2 API:** auth (open sign-up), assets and files, pins, asset proposals, members and invites.
3. **M3 Sandboxes:** Sandbox 2 (no data dependency; the brand CI restyle), then Sandbox 1 (on the new recipe source),
   then Sandbox 3 (strip, random character), then the asset library, proposals, the game placeholder and admin.
4. **M4 Deploy:** `play.maia.city` live next to maia.city.

## 11. Open questions

None for v0. Settled 2026-11-02: citizens propose and admins accept; the Maia City coop owns every asset and its
admins are its owners; Sandbox 3 has no tree planting for now; every sandbox gets the random walking character.
