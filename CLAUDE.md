# Working rules for agents in this repository

## The repository is play and the website (Samuel 2026-11-02)

- `play/` is play.maia.city: the sandboxes and the asset library, its site (`play/site`) and its API (`play/api`, Bun on
  Postgres). Read `play/SPEC.md` first.
- `website/` is maia.city: a plain prerendered SvelteKit site. No avenDB, nothing imported from beside it.
- `deploy/`, `docker-compose*.yml` and `.github/` are what the server and the deploys need.
- **Every reference is a UUID or a hash** (Samuel 2026-11-04, play/SPEC.md §4.7): a coop, asset, story, sandbox,
  proposal or human is named by its UUID; a file, recipe or version by its BLAKE3 hash. Titles, labels, slugs, groups
  and routes are only shown: never look anything up by them, never hard-code one as a reference.
- Everything from before (avenDB, theOS, the old app, the blog, the universe) is on the branch `SNAPSHOT_2611101`.
  Nothing here may import from it; bring back what is needed as code of play or the website.

## How changes ship

Changes go to `main` by pull request; `.github/workflows/main.yml` runs play's checks (`play-checks.yml`: the API's
tests against Postgres, its types, the site's build) and the website's (`website-checks.yml`: its types and build).
`main` is then merged into `production` by a pull request (`production.yml`: `Only from main`, and `Main is green`
reads main's checks for that commit instead of running them again). The push to `production` deploys play (image, DNS,
server, import, Caddy) and the website (its build into the server's `site/releases/<commit>`, `site/current` switched).

Before you push, run the checks of what you touched, in **avenBOX** (the cloud environment the agents work in; play/SPEC.md
§4.12): `bash play/avenbox/gate.sh` runs what CI runs (in `play/api` `bunx tsc --noEmit` and `bun test`, none skipped,
against the box's Postgres 17; in `play/site` `bun run build`; in `website` `bun run check && bun run build`), `gate.sh
api|site|website` one part. A cloud session starts with the box up (`.claude/settings.json` runs `play/avenbox/up.sh`:
Postgres on 127.0.0.1:5432, `TEST_DATABASE_URL` set). A change made for an intent names it in its commits, the line
`Intent: <the intent's UUID>` at the end of each message: once it is merged, `.github/workflows/intents.yml` runs the
intent's checks again on main in the same box and records them on the intent as main's, and the intent is accepted on
those.

**Ship without asking** (Samuel 2026-11-03): once a change is done and its checks pass, mark its pull request ready,
merge it into `main` (a merge commit), open the pull request `main` → `production` and merge it when its gates are
green, so it deploys. Do not ask first; say what shipped, and report a failing check or deploy instead of merging past
it.

## Backups

Every deploy first backs up play to the bucket `maiacity` as a snapshot, like Time Machine's (`deploy/backup.sh`;
Samuel 2026-11-05): `BACKUPS/play/<when>-<label>/` holds a full dump of its schema, the list of its files (hash and
size) and the image; the files themselves are kept once each under their hash in `BACKUPS/play-files/blobs/`, shared by
every snapshot, so a deploy copies only its new files. That store is also play's **second copy** of every file: play
writes each file to both, holds every bucket call steady (timeouts, retries) and mends a file its bucket can't hand back
from the second copy (`play/api/src/blobs.ts`, play/SPEC.md §4.5). Nothing on a schedule. Restoring, as a check or a rollback, is by hand only:
`.github/workflows/restore.yml` (`deploy/README.md`).

## Members

Sign-up is by invite only: an admin's invite link (`/?invite=<code>` on play, made on the members page) lets one person
in, as a traveler. An admin makes a citizen by hand. Admins are Maia City's owners.

## Agents (MCP)

play is an MCP server at `https://play.maia.city/api/mcp` (Streamable HTTP; `play/api/src/mcp.ts`). An admin makes an
access token on play's profile page (`play_…`, shown once, kept hashed, revocable) and gives it to the agent as
`Authorization: Bearer`. The agent reads assets, versions, sources and recipe files and proposes new versions or assets as **readable
source** (play refuses minified code and wraps the source into the recipe file itself); they come to the Proposals page
under the admin's name, marked MCP, where people read the source and see it built in the asset box (the sandboxed
frame; proposed code never runs on the server or on play's origin) before they decide. The agent also reads and proposes
**stories** (`list_stories`, `get_story`, `propose_story`, `propose_story_version`, `add_story_frame`, `add_story_audio`, `add_story_video`, `story_edit`,
`story_history`; play/SPEC.md §12): a film as one timeline of tracks and clips (storyboard shots, each a still and, once made, its video; voice, notes, and
the sound: voice takes, music, sfx and beds, each a recording on its clip, played in the Stories player),
versioned like the assets (one film, one story: its rewrites are its next versions, never stories of their own), every field of every clip editable only this way, shown on the Proposals page played in the
Stories player beside what changed. Every image, video and recording it adds is kept among play's files and shown in
the admins' **Library** (`/library/`), each with the `label` it was given (only shown; a file is named by its hash)
and where the stories use it. A story may link an accepted version of another (a track of kind `story`, its clip
naming that story's UUID and the version's hash: the trailer its own story, played in every film), and a film moves to a
newer trailer only by its own proposal (play/SPEC.md §12). Every story is also a Loro document (play/SPEC.md §4.4): every step kept with its
author, message and time, a proposal a branch of it; an agent drafts a change step by step with `story_edit` and
proposes the draft with `propose_story_version`'s `branch`. So is every **asset** (play/SPEC.md §4.4): its source,
card and variants, its history made from its versions (and the work kept between them, `play/api/import/history`);
an agent drafts an asset step by step with `asset_edit` (a replace by its text, a range, a card field, each step with
its message), reads it with `asset_history` and `get_asset`'s `step`, and proposes the draft with `propose_version`'s
`branch`, its steps shown on the Proposals page; admins play an asset's making in the asset viewer's history bar. A
**sandbox's layout** (which asset version and variant each slot draws, and any field of its configs: Sandbox 1's garden,
where a thing stands) changes only by proposal too: `get_sandbox` reads it, `propose_sandbox_change` proposes edits
(`pin`, `pin_latest`, `unpin`, `set`, `delete`; play/SPEC.md §4.6), shown on the Proposals page before and after and
openable in the sandbox as it would be; never by a migration. A
**factory** (a production line on the Factories page: its line and its bill of process) is a Loro document too
(play/SPEC.md §4.7): `list_factories`, `get_factory`, `factory_history` read it, `factory_edit` drafts a change step by
step (a station's machines, buffer or breakdowns, a part's operation and its seconds, the demand), and
`propose_factory_version` proposes it, shown on the Proposals page field by field and openable as the factory would be,
its simulation running; never by a migration. The **game's configs** (the Game editor, first the levelling: how a
village grows level by level) are Loro documents the same way (play/SPEC.md §4.9): `list_game_configs`,
`get_game_config`, `game_config_history`, `game_config_edit`, `propose_game_config_version`. A plant
version names its **reference sheet** (`propose_version`'s `sheet`: the hash of the plate kept with `add_story_frame`; play/SPEC.md
§4.10), shown with the version in the asset library and, in the Library, beside the image, the plant it belongs to, and
its **data sheet** and its sheet's **brief** (`datasheet`, `brief`: Markdown kept with `add_document`), so a plant's whole
dataset is in play. A
version can be a kind of **variants** (`propose_version`'s `variants`: a plant's kinds, an animal's breeds), each its own
recipe and a chip in the asset viewer. Everything Maia City wants made, fixed or improved is an **intent** (play/SPEC.md
§4.12; Samuel 2026-11-06), every proposal an intent's, on the intents' board (a modal from the nav pill's star): **Idea →
Specify → Prototype → Proposal → Accepted** (or Archived). An agent adds one (`add_intent`, over MCP only: nothing is
typed in by hand), reads them (`list_intents`, `get_intent`) and, sent to one at Idea, specifies it (`specify_intent`:
its goal, its scope, and checks, each one statement that passes or fails, by a `test`, a `measure` or a `look`, must or
nice, every test and measure with its `run`: the exact command that decides it in **avenBOX**, from the repository's
root, as written, play refusing a placeholder in it) and **stops: an admin approves the spec**. Sent to one in
Prototype, it builds it in avenBOX, runs every check and records each result with its evidence (`bun
play/avenbox/intent.ts <the intent's UUID> --record`, which calls `check_intent`, a failure as a failure; a look by hand)
until every must check passes: then the intent **moves to Proposal by itself**, the one gate with a person in it after
the spec, where an admin decides it (nothing is accepted from Prototype; Samuel 2026-11-06). Work that is one of play's
proposals it also proposes with the propose tool's `intent` (the intent's UUID): play refuses the proposal before every
must check passes. Code ships by pull request instead, its commits naming the intent (`Intent: <UUID>`): main runs the
checks again after the merge (`.github/workflows/intents.yml`, `where: main`, recorded at Proposal; a must failing there
takes it back to Prototype), and an admin accepts the intent only once every must check with a `run` has passed on
main. A
proposal made without `intent` is an intent of its own, with no spec. No tool approves, accepts or rejects an intent;
an agent archives only its own proposals made over MCP that still wait for a decision (`archive_proposal`: one
it has replaced or no longer stands by; Samuel 2026-11-04). **Every agent connected over MCP is avenMAIA** (play/SPEC.md
§4.13; Samuel 2026-11-06), whatever its client or token, working for the admin whose token connected it, and it keeps
Maia City's **Artifacts** (`/artifacts/`, admins): every link from the net we keep, once each, with a very compact title (at
most 70 characters), a description (1–2 sentences, at most 280 characters) and a summary (a small report on the topic,
500–1,500 words: `## What it is`, `## Key points`, `## The topic`), and its authors, each a row of its own named by its
UUID (`list_authors` first). Every link its operator pastes it adds with `add_artifact`'s `origin: 'human'` (shown "Added
by" the operator), every artifact it finds and uses in its own research with `origin: 'agent'` (shown "Sourced by
avenMAIA"); `list_artifacts`, `get_artifact`, `update_artifact`, `get_author` read and correct them. The same token also opens play's **read-only world routes** (`GET /api/me`, `/api/catalog`,
`/api/files/<hash>`, `/api/sandboxes/<id>/config`, `/api/assets…`) as its admin, so an agent can load a sandbox in its own
browser (sending the header to play only) and film it for a storyboard; nothing else, and nothing that writes. Admins
only for now: a token opens nothing once its owner is no admin.
