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
| Versioning | A content-addressed version DAG in Postgres (§4.3), and under it every step kept in Loro: one Loro document per story (assets next), proposals as branches, versions named by the hash of their content (§4.4, §12; Samuel 2026-11-03) |
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

**Readable source, the box, the host (Samuel 2026-11-02).** Every proposed version brings its **readable source**: a
CommonJS module that sets `module.exports.recipe`, as written (play refuses minified code), kept as a file of its own
(`source_hash`). play makes the recipe file from it (`RECIPE_HEAD + source + recipeTail(slug, v, variant)`), so the
file the box runs is exactly the source people read. Proposed code never runs on play's server (it only measures,
labels and hashes text), and in the page only in the **asset box**: a frame with `sandbox="allow-scripts"` and no
origin, its own CSP with no connection, the frozen engine (held to its hash) in a worker. A proposal's record may name
only a frozen box engine, and its manifest is the libraries its source requires. The Proposals page is a board (Samuel 2026-11-03): a
column per status (Open, Accepted, Archived: a proposal ends accepted or archived, nothing else, Samuel 2026-11-04;
an admin archives any, its author their own); a card opened shows the version built in the box nearly
full screen, its note folded, its source (beside its base's, as changes) a button away, before anyone decides. Nothing
is proposed or edited on the page: versions come over MCP. `/api/files` serves
code as plain text (`nosniff`, `sandbox`), never as script on play's origin.

**Imported versions' sources (Samuel 2026-11-03).** Legacy bundled each asset's library and minified it into the recipe
files play imported. Each library was made again from `SNAPSHOT_2611101` by legacy's own bundler at the commit its file
was seeded from, minified to prove it is that file byte for byte, and kept unminified as the version's source
(`play/api/import/legacy/sources`, how: its README). The import gives each imported version and variant its source once
(`source_hash`, the only field a frozen version may still take, and only where it had none). The box still runs the
imported recipe file; its source is the code it was made from, for people and agents to read and start from.

An asset version is atomic: a **recipe file** (named by its BLAKE3 hash, made by play from the readable source), its
**card** (JSON: label, size, triangles, engine, params it takes), and the engine version it runs on. A recipe file is
a build output: it is never edited in place and two of them are never merged line by line. Variants (param presets,
e.g. `actors/stand-in:stand-in?face=…`) belong to a version.

### 4.2 What it has to do

Propose a new version, accept or archive it, read an asset's history as a chain, read any old version forever, compare
two versions (card diff, file hashes), revert (propose an old version's content as the next one), pin a sandbox to a
version.

### 4.3 The primitive

A **version DAG**, the part of avenDB worth keeping, without signatures and without a CRDT:

```sql
assets          (id UUID /*its identity: random for a new asset, derived from its avenDB entry (v5) for an imported one*/,
                 coop_id /*owner: the Maia City coop*/, grp, slug /*a name, shown; two assets may share it*/, label, head → asset_versions, created)
                 -- nothing refers to an asset by its group and slug (§4.7)
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
                 author, status /*open|accepted|archived*/, decided_by, decided_at, note, created)
```

- A proposal names its **base** (the head it was made from) and a not yet numbered version.
- **Accept** is one transaction: it checks `assets.head = proposal.base` (optimistic concurrency), gives the version
  the next number, moves the head, writes `approved_by`. If someone accepted another version first, the proposal is
  **archived**: re-propose it on the new head, or an admin accepts it as a replacement (its parents then name both).
- Content addressing gives what avenDB gave: the same content has the same id, a file is checked by its hash wherever
  it is read, and history can't be rewritten without every id changing.

### 4.4 Documents in Loro: every step kept (Samuel 2026-11-03)

Asset versions began as the DAG of §4.3: each version whole, nothing in between. Samuel wants every step between two
versions kept as well: how a story or an asset got from one version to the next, edit by edit, for people and agents
to read, to time-travel through and to tell (a making-of is that history played back). So documents are kept in
**Loro** (loro-crdt, a CRDT with its own history), one document per thing, while every guarantee of §4.3 stays.

- **One Loro document per document**, typed by a schema (`play/api/src/docs/schema.ts`: a JSON Schema with Loro hints):
  `story/1` now, `asset/1` next (its readable source a text, its card, its variants), later others (a world's layout,
  shared params). An object is a Loro map, an array a movable list, a string marked `x-loro: text` a Loro text, edited
  and kept character by character. A document is always read back as plain JSON; the browser never needs Loro.
- **The server is the only writer.** Every write locks the document's row, loads it, applies the edit, checks the whole
  result against its type (and the type's own rules, such as a clip inside its story), and appends a **step**: its Loro
  update, its author (a member, or an agent under its admin's name), its means (site, mcp, import), its message and its
  time. Every MCP call that edits is a step. A whole new body sent at once lands as the few operations it differs by.
- **A proposal is a branch**: forked at the main line's head, with its own steps (an agent can take as many as it needs).
  Proposing names it; accepting merges it into the main line (a CRDT merge: if the line moved on, both sets of edits
  stand), checks the merged result, and names it the next **version**, whose canonical JSON's BLAKE3 is recorded with
  its frontiers. Rejecting or withdrawing keeps its steps on their side line.
- **Code is never merged unseen**: a type whose content is code (`asset/1`) whose merge met other edits is accepted only
  with the hash of the merged result as it was built and previewed in the box.
- **Built recipe files and pins are unchanged**: a recipe file is still made from a version's source and named by its
  hash; sandboxes still pin builds. Loro adds the history under a version; it replaces nothing of §4.5.
- **Tables** (migration `0013-docs`): `docs` (its type, schema, head frontiers and a snapshot of its main line, written
  again every 32 steps and always holding the whole history), `doc_updates` (every step, append only), `doc_versions`
  (named versions, never changed), `doc_branches` (proposals), `doc_peers` (who writes as which Loro peer: one per
  author on the main line, a fresh one on every branch, so two branches never write the same operation ids).
- **Reading**: a document now, any step or version as JSON, its history (the main line with every accepted branch's
  steps where they were made), and what changed between two points, field by field (lists of clips followed by their ids).
- **Measured** (the papaya, a 54 kB source): 39 steps of history in a 61 kB snapshot, the state alone 30 kB, a step
  about 20 ms to write; its eleven real versions (v1, nine draft rounds, v2) in 142 kB against 734 kB stored whole,
  each restored exactly.

**Assets on documents** (Samuel 2026-11-03, `play/api/src/assetdocs.ts`). Every asset is an `asset/1` document,
`asset:<uuid>`: its readable source as a text (diffed by lines when a whole source is sent), its label, note and engine,
its card (the version's record), and for a kind of variants its default variant and each variant's card and, where it
differs from the asset's own, its source. The §4.3 tables stay what the catalog, the pins and the box read: a version's
id, number, recipe file and source hash are exactly what they were, and nothing downstream reads the document.

- **Its history, made once from its versions** (in the deploy's import, and the first time an asset is touched): each
  accepted version a step at its own date, by its author, named its own number (a number legacy skipped stays
  skipped); the work kept between two versions (`play/api/import/history/<asset's uuid>`: each step's file, hash, date
  and message) as the steps between them, only where the two versions are exactly the sources it ran between, its last
  step then the next version byte for byte. The papaya's nine rounds between v1 and v2, by Maia over MCP, are the first.
  Each proposal not yet on a branch gets one at its base, closed as it was decided.
- **Proposals are branches**: a proposal over the web or MCP is a branch at the head it was made on, the version as
  proposed its last step; an agent can draft it first step by step (`asset_edit`: a replace by its text, a range of the
  source, a field of the card, each step with its message) and propose the draft (`propose_version` with its `branch`),
  its steps going with it. Accepting merges the branch and names the document's version the asset's new number.
- **An agent's camera** (Samuel 2026-11-03): an admin's MCP token also opens the world's read-only routes (`GET
  /api/me`, `/api/catalog`, `/api/files/<hash>`, `/api/sandboxes/<id>/config`, `/api/assets…`; `READ_BY_TOKEN` in
  `play/api/src/app.ts`), so an agent loads a sandbox in its own browser as its admin and films it (`window.__world`'s
  `fly` and `sun`) for a story's storyboard. Every other route still wants a session.
- **Variants over MCP** (Samuel 2026-11-03): `propose_version`'s `variants` (each a `name`, a `label`, its own `source`
  where it differs) make a version a kind of variants, as the animals are: each variant its own recipe file, the source
  called with its name (`module.exports.recipe(id, v, variant)`), its label shown as a chip in the asset viewer
  ("Papaya: Male" as Male), `default_variant` the one a ref without a variant names. `params` sets the card's
  parameters when the recipe declares new ones (its meta.params, in its build's order), on the version and every
  variant. The papaya's three kinds (both, female, male) are the first.
- **Never merged unseen**: an asset's proposal is still accepted only on the head it was made on (a moved head archives it,
  §4.3), so what is accepted is exactly the version the Proposals page built and showed in the asset box; the
  document's own rule (a merge that met other edits needs its previewed hash) stands behind it.
- **The making-of**: for admins the asset viewer has a history bar of every step (versions marked; who, how, message,
  time) and plays them as a time-lapse. At a version's point it builds that version's own recipe file; at any other step
  play makes a recipe file the same way (the box's header, the step's source, the line naming the asset and the
  version the step leads to) and keeps it among its files by its hash (`GET /api/assets/:id/steps/:seq/recipe`).
- **Measured** on the full legacy import: 203 asset documents from 264 versions, 15.1 MB of steps, made in one deploy
  with the rest of the import in under 90 s, no errors.

### 4.5 One source, every asset by its hash

- **One source of truth:** Postgres (the catalog: assets, versions, variants, cards, the owner; the sandboxes' pins and
  configs) and the bucket (every file under the BLAKE3 hash of its bytes). Nothing else is read: no avenDB, no repo
  fallback, no index of readable names in the site.
- **An asset is its UUID; a recipe is its hash.** Versions, proposals, the catalog and the library's addresses
  (`#<uuid>[/<hash>]`) name an asset by its UUID; a group and slug are only shown, and can't be taken twice.
- **Every reference is a hash.** A build is `<hash>?values`. A sandbox names an asset by a slot of its pins,
  `pin:<sandbox>/<slot>`, which its config in the database maps to a build (`GET /api/sandboxes/<id>/config`). A card
  that names another asset names its build: the import rewrote every readable ref legacy's cards made (the biomes'
  cover kinds, the pickup's Power Cube) and a proposal that names one is refused. A version's number, an asset's id
  and a label are only shown.
- **One loader** (play/site's `content/assets/catalog.js`): hash → its record from `/api/catalog` → its file from
  `/api/files/<hash>`, held to the hash → the frozen box engine builds it. Media (covers, sounds) are play's files too.

### 4.6 A sandbox's layout (the `sandbox_change` proposal, Samuel 2026-11-04)

`sandbox_pins (sandbox_id, slot, version_id, variant, params)`: which version a sandbox draws; `sandbox_configs
(sandbox_id, name, data)`: how it lays them out (Sandbox 1's `garden`: its plantings, spacing, drifts and fields; where a
thing stands), anything in one with a `slot` drawn as that slot's pin. Both change **only by proposal**, never by a
migration or by hand: an agent reads a sandbox over MCP (`list_sandboxes`, `get_sandbox`: each pin's asset, version, the
asset's newest, its variant and values, and where a config names it) and proposes edits (`propose_sandbox_change`):
`pin` (a slot to an accepted version, variant and values; a new slot too), `pin_latest` (every slot of an asset to its
newest version), `unpin`, and `set`/`delete` of any value at a path of a config ("update Sandbox 1's papayas to v4",
"move the hens", "weight the apples 5"). Each is checked as a whole: only accepted versions, variants they have, no
readable refs, every slot a config names pinned. The Proposals page shows each change before and after and opens the
sandbox as it would be (`/sandbox-1/?layout=<sandbox's uuid>/<proposal>`, its config read with `?proposal=`, admins only); an
admin accepts it there, which applies the edits to the sandbox as it is then, in one transaction (one that no longer
holds is archived). Admins only for now (`play/api/src/sandboxes.ts`).

### 4.7 Every reference a UUID or a hash (Samuel 2026-11-04)

A thing is named by its UUID (a coop, an asset, a story, a sandbox, a proposal, a human, a token) or, where it never
changes, by the BLAKE3 hash of its content (a file, a recipe, a version). A title, a label, a slug, a group or a route
is only shown: nothing is looked up by it, no row refers to it, and two things may share it.

- **Migration `0017-uuids`** moved what was still named by a readable id onto UUIDs, everywhere it was named: the coop
  (`maia-city`), the sandboxes (`sandbox-1`, `sandbox-2`, `sandbox-3`, `factories`) and the stories (their slugs), with
  the story documents (`story:<slug>` → `story:<uuid>`) and every step of their history. Each got the UUID
  `play.uuid_of('<kind>:<old id>')` (version 8, the first 16 bytes of SHA-256 over `play:<kind>:<old id>`; `uuidOf` in
  `play/api/src/uuid.ts`), so the repo names the same ones: `play/api/src/ids.ts` (the coop and the sandboxes),
  `play/site/src/lib/content/assets/sandboxes.js` (a slot is `pin:<sandbox's uuid>/<slot>`), each `story.json`'s `id`,
  `folds.json`, the kept history's folders (`import/history/<asset's uuid>`) and the animals' sounds (`sounds.json`).
- **Anything new gets a random UUID**: `propose_story` takes no id and answers with the story's; `propose_asset` needs
  a group and a label, its slug (the name its recipe is called with, `recipe(slug, v, variant)`) made from the label
  where none is given, and no longer unique. A story or a sandbox named by anything but a UUID is not found.
- **What stays a name, on purpose**: a version's number (`v3`, shown, given on accept), a slot of a sandbox's pins and
  a config's name (keys inside one sandbox's layout, like the fields of a record), a clip's or track's id inside a
  timeline, a variant's name, a draft's number. None of them is looked up across play.
- **Hashes made before stay as they were**: a version id is the hash of its content as it was made, and that content
  named its asset or story by what it was then (`plants/papaya`, `papaya-v2-devlog`); new versions name their story by
  its UUID. Nothing recomputes an old one.

### 4.8 The Factories on Loro (the `factory_version` proposal, Samuel 2026-11-04)

Every production line play shows is a Loro document, `factory:<uuid>` (a factory is its UUID, §4.7; the first,
the LifeTrac line, `uuidOf('factory:lifetrac-line')`, `play/api/src/ids.ts` `FACTORY`; type `factory/1`, `play/api/src/docs/schema.ts`;
`play/api/src/factories.ts`): its **line** as AirSup's factory runtime reads it (the product, the demand, the calendar,
every station with its machine, cycle variation, buffer, spare floor, breakdowns, yield and what it joins, the stages'
looks, the floor's layout) and its **bill of process** (every part of what it builds with its raw stock and every
operation it goes through, at which station and for how many seconds; the stock it buys; the assemblies; each station's
own handling). Data only, nothing of it code: a station's cycle time is the sum of its operations and its handling,
worked out where the line is drawn (`play/site`'s `content/factories/index.js` `lineOf`), unless the station gives its
own `ct`, so changing a part's operation moves the line. `play.factories` holds each factory's id and
label so a proposal can name it (migration `0018`). A factory's first version is made once from the repo by the deploy's import
(`play/api/import/factories`: the LifeTrac line as it was first written, 2026-11-03); from then on play's Postgres is
its source of truth.

A factory changes **only by proposal**, as a story does: an agent reads it (`list_factories`, `get_factory` at its
newest version, a version, a step or as an open proposal would make it; `factory_history`), drafts a change step by
step (`factory_edit`: the document's own edits, set, insert, delete, move and text, a list's item named by its index or
by its id, `{ id: 'weld' }`; each step checked whole: every operation at a station of the line, every id once) and
proposes the draft (`propose_factory_version` with its `branch`), or proposes edits at once. The Proposals page shows
what it changes field by field from the version it was made on, its steps, and opens the factory as it would be
(`/factories/?factory=<id>&proposal=<id>`), its simulation running. Accepting merges the branch into the main line and
names the next version; made on a version that is no longer the newest, it still goes in where the two changes touch
different fields and is archived where they touch the same. The Factories page reads every version (`&v=<n>`). Admins
only, as the Factories are.

### 4.9 The Game editor (the `game_config_version` proposal, Samuel 2026-11-04)

The game's configs are Loro documents too, `game:<uuid>` (type by kind: `levels/1` first, `play/api/src/docs/schema.ts`;
`play/api/src/gameconfigs.ts`, which follows the Factories step for step), listed in `play.game_configs` (migration
`0019`) and shown on the **Game editor** (`/game-editor/`, a tile of the coop's own on the dashboard; admins only): on the
left the configs and the picked one's versions, in the middle the config worked out. The first, the **levelling**
(`GAME_CONFIG.levelling`, its v1 made once by the deploy's import, `play/api/import/gameconfigs`), is how a village
grows: a level at every Fibonacci count of villagers (1, 2, 3, 5 … 1,597), each unlocking what the village builds next
with its cost; every new villager brings €12,500 and 50,000 hearts, and an investor adds a multiple of the level's new
villagers' euros. A mind costs 10 hearts more at every level (or that in euros at 4 hearts a euro), so the page works
out (`play/site`'s `routes/game-editor/levels.ts`) the minds each villager and investor gets, the investor's share, the
minds minted, and the treasury after every level in euros (raised and left after building), hearts and minds. A config
changes only by proposal, as a factory does: `list_game_configs`, `get_game_config`, `game_config_history`,
`game_config_edit`, `propose_game_config_version` over MCP; the Proposals page shows it field by field and opens the
Game editor as it would be (`?config=<id>&proposal=<id>`).

### 4.10 A plant's reference sheet, data sheet and brief (Samuel 2026-11-05)

A version may name its **reference sheet**: one clean-lit photographic plate of every stage and organ of the plant,
made for it (the plant skill makes it with Google's Nano Banana Pro) and kept among play's `files` like any image, in
the Library, labelled. The version's record holds it by its hash (`sheet`), set by the proposal (`propose_version`'s
or `propose_asset`'s `sheet`: an image play keeps, else refused) and carried on from the head unless a proposal names
another, or `null` for none. The asset library shows each version's sheet beside its note, opened whole; the Library
shows, beside an image, every asset version that has it as its sheet (accepted, or a proposal still open), linked to
the asset. The recipe names the same hash in its `meta.sheet`, so the plant and the plate it was checked against are
kept together.

Its **data sheet** (the researched numbers, every row with its source) and the **brief** its sheet was made from are
kept the same way, so a plant's whole dataset is in play and nothing of it only in the repository: each a Markdown
document among play's `files` (`text/markdown`, at most 2 MB, added with MCP `add_document` and a label), named in
the version's record (`datasheet`, `brief`: `propose_version`'s and `propose_asset`'s fields of those names, refused
unless a document play keeps; carried on from the head, `null` for none). The Library lists documents as their own kind
(never the recipe sources, `text/javascript`), opens one as its text, and names beside it every asset version that has
it as its data sheet or brief; the asset library links a version's data sheet and brief beside its note.

### 4.11 Worlds (Samuel 2026-11-05)

A **world** is an asset of the group `worlds`: the other assets composed into one place (the first, the Old City: a
section of an old city, the highway into it across monoculture land, its traffic, under a smoggy dusk). It is
versioned, proposed and accepted like any asset (§4.1–4.5); only accepted versions of what it names are drawn on play.
Its card is checked against card schema v2 (`card.v2.json`: v1 with the group `worlds`). The Worlds page (`/worlds/`,
`#<asset id>[/<recipe hash>]`) shows the one picked big, under its own sky, with three cameras (orbit; walk at 1.65 m;
drive at 1.2 m and 50 km/h) and the views it names.

**Its recipe builds its land** (terrain, roads and their markings, kerbs, pavements, field plots; root on y 0, 1 unit =
1 m) and **names everything else by hash**: a node `use:<recipe hash>?values` is drawn by the page with that build
there (`plantings.js`, the universal renderer's levels of detail and far pictures, so hundreds of guests cost a few
hundred draw calls), a mesh `biome:<recipe hash>` is painted with that biome's floor and cover. A biome's floor is read
off its card's catalog: the catalog play keeps (the imported biomes'), else, for a biome proposed over MCP (play keeps
no catalog for it, and never runs or trusts code to make one), the catalog its own build's card carries, the biome
built in the box on the page like any guest. A catalog part may name its asset by build hash (`<hash>?values`) in card
schema v2. A floor's rows (a tilled field's furrows, stubble, a crop sown in rows, its tramlines) run along the mesh's
own +x, or the way its name says: `biome:<hash> rows:<deg>` (degrees from world +x toward +z; `$content/biomes/surfaces.js`
`rowsOf`).

**How a world moves: its own build, kept running in the box** (decided 2026-11-05, over a trusted traffic runtime in
the page, so a world's behaviour is in its versioned recipe). The recipe sets `root.userData.tick = (t) => …` (engine
4 on): the box hands it the world's **time** t, in seconds since its run began (a quarter second more at most each
call; measured, 2026-11-05: not the time since the last call). It brings the world to t in fixed steps of its own,
counted (`while ((n + 1) * 0.1 <= t) step(0.1), n++`), seeded, so the world at a time is the same however it got
there: a film steps through a shot, the page goes frame by frame. Each step it moves its own `use:`
nodes (or their parents) and hides one by `visible = false`; the box sends back what changed, and the page moves each
guest where its node now stands (a hidden node's guest is put away). Lanes, car following, queues, red lights and
emergency vehicles are the world's own code. A world keeps its moving guests to about 400.

**A guest's state** is the empty child nodes of its `use:` node named `state:<name>`, on while visible: a vehicle's
`head`, `tail`, `brake`, `indicator-l`, `indicator-r` (blinked by the page), `beacon` (its blue and red flashed in
turn), `horn`, `siren`, `engine` and any other a sound is for; a signal's `red`, `amber`, `green` (all its heads) or
`<i>:<colour>` (head i, its heads in tree order); a street lamp's `lamp`. Where a guest has no state for it, head,
tail and lamp lights follow the mood's `lamps`; the rest are off.

**The guests name the parts the page lights**, each modelled dark (its lens off): `light:head`, `light:tail`,
`light:brake`, `light:indicator-l`, `light:indicator-r`, `light:reverse`, `light:beacon-blue`, `light:beacon-red`,
`light:beacon-amber` (a work vehicle's; all beacons flash on `state:beacon`, the red against the others),
`light:lamp`, `light:window` (a building's window cells, lit at dusk: the cells fall into four sets in their order and
each copy lights some of them by its seed), and a signal head's `lamp:red`, `lamp:amber`, `lamp:green`, one set per
head. The name is on the mesh itself or on a group holding it: every mesh under a named group is that light. The page
draws each lit light over its copy, bright and with its glow, copy by copy (`$content/worlds/lights.js`), never
touching the guest's own drawing. Node names survive the box to 120 characters. Later, not yet driven: wheels as
groups at their hubs `wheel:fl|fr|rl|rr` (spun about local x from a guest's speed), and a guest's sub-node turned by
the world (a semi-trailer swinging at its kingpin).

**Its mood** is a root node `mood:<preset>?k=v` (presets `smog-dusk`, `overcast`, `clear-day`, `night`; keys `sun` and
`az` in degrees, `fog` a density a metre, `haze` a hex colour, `lamps` 0 or 1): the sky dome, the fog in the haze's
colour, the sun and the sky's light (`$content/worlds/sky.js`). **Its sound** is root nodes
`sound:<file hash>?for=<x>&gain=<g>`, recordings among play's files: `for=bed` the ambient loop; any other plays at
each guest whose `state:<x>` is on, panned and fading with distance (`horn` once each time it comes on, the rest looped
at the nearest few; `$content/worlds/sound.js`). **Its views** are nodes `view:<name>`: an eye where it stands, looking
along its +z.

**Filmable** (Samuel 2026-11-05): the Worlds screen is where a virtual film camera will fly through a world and render
shots for the films, so a world keeps to the film contract the sandboxes keep (`sandbox-kit/film.js` `connectFilm`,
`render/film.js`, `film/pipeline.js`; a shot as data, `game/film/shot.js`): its traffic and lights run on the shot's
clock, deterministic from its seed (a world's tick is seeded and its own clock is the sum of its steps, so a shot
stepped from 0 renders the same every time), and a shot names its world by the world asset's UUID and its version's
recipe hash (`world: { sandbox: 'worlds', asset, recipe, … }`, checked by `shot.js`; its film page
`/worlds/?film&asset=<uuid>&recipe=<hash>`, `$content/worlds/film.js`). There, each frame the world is brought to the
shot's moment (forward by its steps, back by building it afresh and stepping from 0), `window.__world.settle()`
resolving once the box has answered for it; a shot's camera may ride in a node the world names `frame:<name>` (a seat
in a vehicle, under its `use:` node), and scale its `sun`, `sky` and `lamps`. The frozen box engines run a build on by at most 0.25 s a
step, so the page sends a world its time exactly, 0.25 s at a time, owing the rest (a machine's time it lets go of
instead); a world in the box and the same recipe run in Node at the same t stand alike, guest for guest (checked).

**Developing a world** before its guests are accepted: `scripts/render.mjs --world --file <world.js> --guests
<guests.json>` runs it on the world bench (`/worlds/bench/`, development only) exactly as the Worlds page does, each
guest a local readable source put in place of the hash the world names it by (`as`), and shoots stills after the
world has run (`run`) from eyes, views or street cameras. The stand-in test world and its guests are
`$content/worlds/test/` (the template of the contract); the contract is read in one place,
`$content/worlds/contract.js`.

## 5. The sandboxes

| New | Cloned from | What changes |
|---|---|---|
| **Sandbox 1** | Sandbox 4 (`maia/site/routes/app/games/sandbox-4`, `maia/content/sandbox-kit`, `maia/content/sandbox-2/interior`), its 56 asset pins | Recipes come from play's API instead of the avenDB device; pins become `group/id@v` |
| **Sandbox 2** | Sandbox 7 (`maia/content/sandbox-7`), no avenDB dependency | Restyled in the light brand CI: cream/paper backgrounds, ink green text, mustard/sage/terracotta accents, Fraunces display and DM Sans body (tokens from `maia/site/app.css`) |
| **Sandbox 3** | MaiaCity V2's world (`maia/content/maiacity-v2`, engine `maia/content/game/maiacity-v2/engine.js`) | **Stripped:** coops, tokens and money (HEARTS, the MINDs, €uro, the pool, rents, mint, demurrage, dividends), MIPs/AIPs, seats, the ledger and the trailer/intro/tour/film. Also stripped for now: **planting a tree** (the seedlings in the backpack, planting, watering a planted tree). **Kept:** the land, the plots, the trees already there, the van, the things. **Stateless:** no server state, no seats |
| **Sandbox 4** (Samuel 2026-11-05) | Nothing: new, `play/site/src/lib/sandbox-4` | The dome cassette joint: one cast cassette of the grand dome's (Ø 100 m) lowest rows seated from outside, keyed with sliding basalt keys, capped at its nodes and clamped by a ring cable, five steps on one clock, with the joint in section. No pins and no configs; a random UUID (migration `0021-sandbox-4`), in the light brand CI |

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

The import verifies before it reports success: every file's BLAKE3 after a read back from the bucket, every pin
resolving, the counts per group against the feed.

**It runs once (Samuel 2026-11-03).** Postgres keeps that it ran (`play.imports`), and from then on **play's Postgres is
the one source of truth** for its assets, members and sandboxes: a later run (every deploy runs it) writes none of the
legacy import again, so nothing play changed (a label, a head moved by accepting a version, a sound, a member's level, a
member or pin removed) is ever overridden or brought back. A later run only adds play's own site media missing from its
files and the imported versions' readable sources where they have none (§4.1). Forced to run again (`--again`), it
still only adds what is missing and changes nothing that is there.

## 7. API (`play/api`, Bun)

- Auth: `POST /api/passkey/register/{options,finish}` (open sign-up → traveler),
  `POST /api/passkey/login/{options,finish}`, `GET /api/me`, sign-out. Ported from `aven/api/src/passkey.ts` and
  `session.ts`.
- Assets (traveler+): `GET /api/assets`, `GET /api/assets/:grp/:slug` (its chain), `GET /api/assets/:grp/:slug/:v`,
  `GET /api/files/:hash` (signed redirect to the bucket). Admins: `GET /api/assets/:id/history` (every step of its
  document, §4.4) and `GET /api/assets/:id/steps/:seq/recipe` (the recipe file it builds at a step, kept by its hash).
- Sandboxes (traveler+): `GET /api/sandboxes/:id/pins`.
- Proposals: `POST /api/proposals` (citizen+: a new asset version, card + recipe file upload), `GET /api/proposals`,
  `POST /api/proposals/:id/{accept,archive}` (admin+; its author archives their own). Over MCP an agent archives only
  its own open proposals made there (`archive_proposal`, Samuel 2026-11-04); no tool accepts.
- Coop (admin+): `GET/POST /api/coops/:id/members`, `POST /api/invites`; `POST /api/invites/:code/claim` (makes the
  claimer a citizen).

Every route checks the caller's level against `level_rules`; a visitor gets 401 everywhere except sign-in/sign-up.

## 8. App (`play/site`, SvelteKit, light brand CI throughout)

`/` sign in or sign up · `/sandbox-1/` · `/sandbox-2/` · `/sandbox-3/` · `/sandbox-4/` · `/assets/` (library; an asset's versions as
a chain, its variants, a viewer) · `/proposals/` · `/game/` (placeholder; claim an invite to become a citizen) ·
`/admin/` (members, invites).

**The Library** (`/library/`, Samuel 2026-11-04; `play/api/src/library.ts`): every image, video and recording play
keeps among its `files` (§4.3), newest first, for Maia City's admins only. Each shows its preview (a video plays,
a recording sounds), its media type, size and when it was kept, its **label**, and where the newest version of
every story uses it: a shot's still or video, or a clip's recording. A label is only shown, never looked up by: a
file is named by its hash. An agent gives one with `add_story_frame`, `add_story_video` or `add_story_audio`'s
`label`, where a new label replaces the old one and none keeps it. An admin renames it in the Library
(`POST /api/library/:hash/label`). `GET /api/library?kind=image|video|audio&q=…&offset=…&limit=…` lists them, `q`
matching a label or the start of a hash, with the count of each kind.

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

## 12. Stories (Samuel 2026-11-03)

A **story** is one of our films as **one timeline**: admins play it through on `/stories/` (its storyboard frames
beside the subtitles of its script, the notes for the edit, its sections and its mood rising and falling) to feel
whether it works before anything is filmed or rendered. Admins only, reading and proposing. Later the same timeline
becomes the film itself (motion design, three.js scenes per shot) and is **rendered into a video frame by frame**.
The format and the player are made for that now.

**The format, `story/1`: tracks of clips.**

```
{ schema: 'story/1', format: '9:16' | '16:9' | '1:1' | '4:5', fps: 24|25|30|48|50|60, duration,
  tracks: [ { id, kind, clips: [ { id, at, duration, …its kind's fields } ] } ] }
```

| kind | a clip's fields | later |
|---|---|---|
| `shots` | `frame` (an image's file hash, a still of the storyboard), `transition` (how it goes into the next shot, read as code where it starts with one, below); `video` (a video's file hash: the shot's moving picture, an MP4 or WebM added with MCP `add_story_video`, ≤ 40 MB) played muted over the still from `video_in` (s) for the shot's length, the story's own sound under it (Samuel 2026-11-04) | `scene`: an asset ref by hash, its values (a plant's stage…), camera keyframes `[{ t, pos, look, fov }]`, replacing the still shot by shot |
| `voice` | `who`, `line` (the narration; its subtitle, cut into lines of about 26 characters spoken evenly); `cues` its own subtitles where it sets them, `[{ at, text, em? }]` (`at` seconds into the clip, each until the next; `em` one set apart, alone and large: "100x" while "a hundred times" is said; Samuel 2026-11-04); its take as the clip's sound (below) | |
| `notes` | `section`, `camera`, `retention`, `mood` (↑ ↑↑ ↑↑↑ ↓ ↓↓ ↕) | |
| `music`, `sfx`, `ambience` | the score and cues, spot sounds and hits, beds; clips may overlap; nothing dips under the voice by itself (a track's `duck: true` asks for about 6 dB under it; Samuel 2026-11-04) | |
| `story` | `story` (another story's UUID) and `version` (the id of the accepted version of it that plays; required); `duration` that version's own (left out, it is given it): that version linked in, below | |

**Every clip may sound** (Samuel 2026-11-03, the old studio's model of a clip's sound, `SNAPSHOT_2611101`
`maia/content/studio`): `audio` a recording's file hash (MCP `add_story_audio`: MP3, WAV, Ogg, FLAC, M4A or WebM, its
type read from its bytes, ≤ 25 MB, kept among `files` and served as audio), `audio_in` the trim into it (s), `gain`
(dB, −60…+24), `fade_in`/`fade_out` (s), `eq` (≤ 8 biquad bands `{ type, f, gain, q }`) and `keys` (gain automation,
`[s, dB]`). A track may carry `gain` (dB) and `mute`. Every hash must be a recording play holds, as every frame must be
an image. The player lays every sounding clip on one Web Audio clock (`play/site/src/lib/stories/sound.ts`, from the
pure `soundsOf(story)` in `timeline.ts`, which an export's mix will lay the same way); while it plays, t follows that
clock, and a seek lays the sound again from the new t.

**One film, one timeline** (Samuel 2026-11-03). A film's rewrites are versions of its one story, never stories of their
own: `propose_story_version` on its head. Stories proposed apart are brought together by `import/stories/folds.json`
(run with every deploy, `foldStories` in `play/api/src/stories.ts`): each story it names, in turn, has its accepted
versions proposed and accepted on the one story as its next versions (each by its own author and approver, its note
saying where it came from), its open proposals proposed again there and archived where they were; then it is
`folded_into` that story: kept with its whole history, listed no more, taking no proposal. The papaya devlog is the
first: v1 the devlog short, v2 "The Tree That Remembers", v3–v5 the Day 1 rewrites ("Your papaya flew across an
ocean", the same voiced, "Three seeds. One will never give fruit."), Three Seeds' voice its next proposal.

Times are seconds; `duration` is worked out from the clips. Clips of `shots`, `voice` and `notes` follow one another
and never overlap; other kinds may. **A clip may carry fields no kind names, and a track may be of a kind not named
here** (`music`, `sfx`, `callout`, `scene`): both are kept as given, so a new kind needs no migration. Frames are
`files` like any other (§4.3), served by `GET /api/files/:hash`.

**Linked stories: one timeline composed of others** (Samuel 2026-11-04: "Can you introduce timeline composition … so
we pull out the trailer as its own timeline, but we can reuse the trailer timeline in each other timeline, so this just
links into the actual trailer timeline? So we can develop the trailer individually or independently of all other
timelines." And then: "the linked trailer feature timeline should be like you need to link the actual version. So
different timelines can link different trailer versions."). The trailer every film plays after its intro is a story of
its own, and each film links a version of it:

- **The format.** A track of kind `story` holds links, one clip each: `{ id, at, duration, story: <its UUID>, version:
  <one of its accepted versions' ids> }`, by UUID and hash only (§4.7). A link always names its version: a film plays
  that version until a proposal on the film moves it to another (`set_clip` on the link with the new `version`; the
  clip then takes that version's length, and a `shift` closes or opens the difference), so two films can play two
  versions of one trailer, and a new trailer version changes no film. `duration` is the version's own, held to it.
- **Checked whole, with the rest** (`checkBody`, on every proposal and every `story_edit` step): refused are a link
  without a version, to a story that does not exist, to the story itself, to a version not that story's, to a version
  never accepted (a film links only what an admin accepted), with a duration other than its version's, and links that
  loop at any depth (A links B links A: a story never plays inside itself) or nest more than 4 stories deep. A story
  track's clips never overlap each other; a link's content may overlap the story's own clips (the trailer's music
  ringing out under the film's next line) and is never checked against them. A story folded into another (below)
  keeps its versions, so a link to one of them plays on as it was.
- **Reading resolves them.** `GET /api/stories/:id[?v=n]`, a step's read, a proposal's review (the proposal and its
  base) and MCP `get_story` give the story as stored and `links`: every version it links, to any depth, by the
  version's id, each `{ id (its story), title, number, version, duration, newest, body }` (`newest`: its story's newest
  accepted number, shown as "v5 available", never played). `get_story` leaves the bodies out unless asked
  (`links: true`). `GET /api/stories/:id` also gives `linked_by`: the stories whose newest version links it, and which
  version of it each plays.
- **The player flattens them** (`flatten(story, links)` in `play/site/src/lib/stories/timeline.ts`): each link's
  version laid in from its `at`, recursively, its clips tagged with the story they came from and their ids made unique
  against the story's own; `renderAt` and `soundsOf` (so the Web Audio mix) run on that one timeline, so the linked
  pictures, subtitles, notes and recordings play in their place. Where a linked clip and the story's own clip of a
  kind shown one at a time (shots, voice, notes) both cover t, the one that started later shows; two that start
  together, the story's own. The timeline draws a lane of links ("The trailer · v2", "v3 available" where its story has
  a newer version), each opening that story at that version on the Stories page, and the clips they lay in hatched
  and dashed in their own lanes, the link's span marked across them. Nothing of it is edited there.

**One function shows it.** The player's picture is `renderAt(story, t)` (`play/site/src/lib/stories/timeline.ts`):
from the timeline alone, the shot at second t, the one fading out under it and how far (a cut cuts, other
transitions cross-fade over up to half a second), how bright it is (the fades from and to black), the
subtitle and how much of it is spoken, the notes. Play and scrub only move t; nothing runs on a clock of its own. The
same t gives the same picture every time, which is what a frame-by-frame export needs (WebCodecs in the browser, or a
page a renderer seeks through): it comes later.

**A transition is code** (Samuel 2026-11-04: a fade is a transition like any other, set by a proposal like any other
field). A shot's `transition` holds codes separated by commas (`;` and `·` too), each read from its start, with its
seconds where it gives them (`transitionOf`): `cut` (and a hard, smash, match or jump cut, "cut to …") goes into the
next shot at once; `dissolve` or `cross-fade` [s] fades the next shot in over it (0.5 s unless it says, at most half of
either shot); `from black` or `fade in` [s] brings this shot up from black; `to black` or `fade out` [s] takes it down
to black; `dip to black` [s] takes it down and brings the next up out of black. Anything else is prose about the
transition, and a shot whose codes name no cut goes into the next with a short dissolve. A film opens out of black
with its first shot's `from black 0.7, cut`.

**Versioned like assets: the content-addressed DAG of §4.**

```sql
stories         (id UUID /*§4.7*/, coop_id, title /*its head's*/, head → story_versions, created, updated)
story_versions  (id /*BLAKE3 of canonical {story, parents, title, body}, as asset versions' ids (versions.ts)*/,
                 story_id, parents text[], number /*v1, v2 …, given on accept, shown only*/, title, body jsonb /*story/1*/,
                 note, author → humans, approved_by → humans, created)
                 -- immutable: a trigger refuses UPDATE and DELETE (only number/approver are set once, on accept)
proposals       (… kind 'story_version', story_id, story_base → story_versions, story_version → story_versions)
```

- A version's id is its content's: the same story, parents, title and timeline give the same id; any change to any
  of them, or to the history it stands on, gives another, so history can't be rewritten without the ids changing.
- Each version names its parent; a proposal names the **base** it was made on.
- **Accept** is the asset versions' transaction: it checks `stories.head = proposal.story_base`, gives the version
  the next number and moves the head (and the story's title). A proposal whose base is no longer the head still goes
  in where the two changes touch **different fields**: both stand, in a new version whose parents are the head and
  the proposal (its note says it was merged). Where they touch **the same field** it is **archived**, never accepted: it
  is proposed again on the new head. Archived proposals stay as side lines in the history; their versions keep no
  number.
- The repo's stories (`play/api/import/stories/<folder>/`, `story.json`, whose `id` is the story's UUID, and its
  `frames/`) are written once, as their accepted v1, by the import every deploy runs, only where play holds no story of
  that id (`import/stories.ts`).

**Changed only by proposal, over MCP.** No page and no route edits a story: `GET /api/stories` and
`GET /api/stories/:id[?v=n]` read them (admins), and a story changes only by an admin's agent proposing over play's
MCP server (§7, `play/api/src/mcp.ts`):

- `list_stories`, `get_story` (its head, or an accepted version, with its versions);
- `propose_story`: a new story, as its whole timeline;
- `propose_story_version`: a new version, as its whole timeline or as **edits applied to the head**: `set_clip`
  (any field of any clip; null removes one), `add_clip`, `remove_clip`, `add_track`, `remove_track`, `set_track`,
  `shift` (every clip from a time on moved by some seconds, to make room or close a gap) and `set` (format, fps).
  What is stored is the whole timeline, checked as a whole: its format, unique ids, times, no overlaps, every frame
  an image play holds;
- `add_story_frame`: an image (JPEG, PNG or WebP, up to 4 MB) as base64, kept as a file; its hash for a shot's frame.

The Proposals page shows a story's proposal played in the Stories player, beside what changed against its base (the
title and settings, and track by track the clips added, removed, moved and changed) and the steps it was made in.
Admins accept or archive it there. No tool accepts; the agent that proposed it may archive it while it is open
(`archive_proposal`: one it has replaced, or no longer stands by), and nothing else of anyone's.

**Every step kept: each story is a Loro document (§4.4).** Under its versions, story `x` (its UUID) is the document `story:x`
(its title and its timeline; a clip's line, transition, camera and retention Loro texts), every change a step with
its author, its means, its message and its time (`play/api/src/storydocs.ts`):

- every proposal is a **branch** of the document; accepting merges it, and the document's version of the same number
  is named with the BLAKE3 of its content. Versions and documents stay in step, number for number;
- an agent can make a change **step by step**: `story_edit` (`message`, and edits, a whole timeline or a title; plus
  `edit_text`, a range of one of a clip's texts) adds a step to a draft (a new one from the head if none is named),
  each checked whole; `propose_story_version` with the draft's `branch` proposes it, its steps going with it;
- `story_history` lists every step (the main line with every accepted proposal's steps; or one draft's) and
  `get_story`'s `step` reads the story at any of them; the site reads them at `GET /api/stories/:id/history` and
  `GET /api/stories/:id/steps/:seq`, and the Stories page's history bar plays the story as it was at any step;
- a story from before the documents gets one from its history the first time it is touched, and at every deploy's
  import: each accepted version a step at its date, named its number, and each open proposal a branch at its base.
