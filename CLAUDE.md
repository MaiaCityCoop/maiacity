# Working rules for agents in this repository

## The repository is play and the website (Samuel 2026-11-02)

- `play/` is play.maia.city: the sandboxes and the asset library, its site (`play/site`) and its API (`play/api`, Bun on
  Postgres). Read `play/SPEC.md` first.
- `website/` is maia.city: a plain prerendered SvelteKit site. Nothing imported from beside it.
- `deploy/`, `docker-compose*.yml` and `.github/` are what the server and the deploys need.
- **Every reference is a UUID or a hash** (Samuel 2026-11-04, play/SPEC.md §4.7): a coop, asset, story, sandbox,
  intent or human is named by its UUID; a file, recipe or version by its BLAKE3 hash. Titles, labels, slugs, groups
  and routes are only shown: never look anything up by them, never hard-code one as a reference.
- Everything from before is on the branch `SNAPSHOT_2611101`.
  Nothing here may import from it; bring back what is needed as code of play or the website.

## How changes ship

Every change is an intent's (play/SPEC.md §4.12) and goes to `main` by pull request; `.github/workflows/main.yml` runs
play's checks (`play-checks.yml`: the API's tests against Postgres, its types, the site's build) and the website's
(`website-checks.yml`: its types and build). Once main is green for the merged commit, `.github/workflows/release.yml`
moves `production` to it (fast-forward) and starts `production.yml`, which deploys play (backup and image side by
side, then DNS, server, import, Caddy) and the website (its build into the server's `site/releases/<commit>`,
`site/current` switched); every job's first step after its checkout reads main's checks for that commit
(`.github/actions/main-green`) instead of running them again, and on the push to main those checks pass at once only on
the very tree the pull request's run tested (`.github/workflows/tested-tree.sh`), else they run in full.

**All work on play starts in an avenBOX session** (Samuel 2026-11-06; play/SPEC.md §4.12): an intent at any stage,
its code and its checks are done in a cloud session on avenBOX, `env_011Zm65erarH7ffXio13u5pG`, the only environment
with play's MCP token and the box. A session that finds itself elsewhere, without play's MCP (no `PLAY_MCP_TOKEN`; on a
Mac, in the Default environment), starts a session on avenBOX with the work's brief and hands it over: it builds,
pushes and records nothing itself (the SessionStart hook says so as such a session starts; no check run prints it).
One intent has one builder session.

Before you push, run the checks of what you touched, in **avenBOX** (the cloud environment the agents work in; play/SPEC.md
§4.12): `bash play/avenbox/gate.sh` runs what CI runs (in `play/api` `bunx tsc --noEmit` and `bun test`, none skipped,
against the box's Postgres 17; in `play/site` `bun run build`; in `website` `bun run check && bun run build`), `gate.sh
api|site|website` one part. A cloud session starts with the box up (`.claude/settings.json` runs `play/avenbox/up.sh`:
Postgres on 127.0.0.1:5432, `TEST_DATABASE_URL` set). A change made for an intent names it in its commits, the line
`Intent: <the intent's UUID>` at the end of each message.

**Accept ships it** (Samuel 2026-11-06; play/SPEC.md §4.12, `play/api/src/ship.ts`): the intent flow is the one
authority over what lands on main and goes to production. Every pull request into main is the work of exactly **one
intent**, its **one active pull request**: its title `[<the intent's first 8 characters>] …` (only shown), its body and
commits ending with `Intent: <the intent's UUID>` (`.github/pull_request_template.md`); the required check
**Intent named** (`.github/workflows/intent-named.yml`) is red otherwise, or when another open pull request is the intent's
(consolidate into it, or close yours). While building, open it as a **draft** and test yourself anywhere: `bash
play/avenbox/gate.sh` and `bun play/avenbox/intent.ts <the intent's UUID>` (it runs and prints the checks, records
nothing). Once the change is done, **mark it ready for review**: `.github/workflows/intents-pr.yml` runs the intent's
checks in avenBOX on GitHub on its head and records them with the head, the run's link and the pull request (**only
the box's run is evidence**: play takes a code intent's test and measure results from avenBOX's token alone; looks you
still record by hand with check_intent). Every must green, the intent moves to Proposal by itself: **stop there**; any
red, the intent stays in Build, failed on the board, its pull request as it is: fix and push. Each push to a ready pull
request is run and recorded again (a newer head cancels the older head's run, which records nothing).
**Never merge** into `main` or `production` by hand, and open no pull request into `production`. An admin's Accept on
play's intents' board takes **only a waiting intent** (play/SPEC.md §4.12 *Sub-states*: its pull request's head the checked one, mergeable, its required checks green; working or failed, Accept is refused with why) and puts it in **Ship** at once: there it waits its turn (one ship at a time, in the order
accepted) and for GitHub (the pull request's checks green, its mergeability worked out), its reason shown live, and
play then merges the pull request itself (it posts the commit status **`Intent accepted`** on its head first; main's
ruleset requires it, with the checks `.github/required-checks.json` names); Ship shows live main's checks, the release and
the deploy (backup, image, server, website); it is Accepted exactly when play runs its merge commit (the reconcile, `play/api/src/ship.ts`, against the commit `GET /api/version` names; an Accepted one not live is flagged); a red step brings it back to Proposal with the report: fix it in a new pull request of the intent (its
run records its checks on its head as it is marked ready), and Accept ships it again. After the merge,
`.github/workflows/intents.yml` runs the intent's checks again on main in the same box and records them as main's, a
confirmation. **Main is merged in by play** (intent f28822d9, `play/api/src/mainmerge.ts`): whenever main moves, Ship's
watcher merges main into every open intent pull request (Build or Proposal) that merges cleanly with GitHub's
`update-branch`, its checks then run and recorded again on the new head by the box's run (working until then); never
merge main into your branch by hand for that. A real conflict shows the intent failed, "conflicts with main: <files>",
and play posts the commit status **`Merges with main`** (failure) on its head, which wakes you as a PR event: resolve
it, push, and it turns success. Say what you opened and that it waits for Accept; report a failing check instead of going past it.

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
source** (play refuses minified code and wraps the source into the recipe file itself); a recipe names a **piece by hash**
(play/SPEC.md §4.5, `play/api/src/pieces.ts`): shared readable source, a `piece:<uuid>` document proposed with
`propose_doc_version`'s `kind: "piece"`, required as `require('<the hash of an accepted version's source>')` and listed in
the manifest's `pieces`, read by the box from play's files and held to its hash, so a frozen version keeps its pieces; to propose is to put an intent
at Proposal with that work, on the intents' board under the admin's name, marked MCP, where people read the source and see it built in the asset box (the sandboxed
frame; proposed code never runs on the server or on play's origin) before they decide. **One version control**
(play/SPEC.md §4.15, `play/api/src/versioned.ts`; Samuel 2026-11-06) versions everything play keeps (assets, stories,
factories, the game's configs, skills), in one vocabulary: an **Edit** is one change, kept with its author, message and
time; a **Variant** a line of edits of one document; **Main** the default variant, what is accepted; an **Intent
variant** one that exists only inside an intent (Accept merges it into Main, Archive closes it, kept in the history); a
**Seed** the version a variant grows from; a **Version** a numbered state of Main, named on accept. One set of tools
for every kind, by a document's UUID: `list_docs`, `doc_at` (a version, an edit or an intent's variant), `doc_history`
(edits, versions, variants), `doc_edit` (one edit of an intent variant, a new one seeded from Main if none is named)
and `propose_doc_version` (its `variant`, or edits or the whole at once, with `intent`); each kind's own reads and
creates stay where they hold more (`get_asset`, `get_story`, `propose_asset`, `propose_story`). Every view of a
versioned thing shows one aside on the right with its **Info and History** tabs centred on top, the same on a phone (`play/site/src/lib/app/Aside.svelte`, play/SPEC.md §4.15 *One aside*), and
every review on the intents' board its changes through `Changes.svelte`. **A schema is a document** too (play/SPEC.md
§4.15, `play/api/src/docs/schemas.ts`; Samuel 2026-11-06): every type of document is a versioned document `schema:<uuid>`
of the meta-schema (its UUIDs `play/api/src/ids.ts` `SCHEMA`), never a type written in code; every document names the
schema's UUID and version it was written against, and every edit is checked against the schema's Main. A schema
changes by an intent variant like any document, and its Accept is refused while any document on Main fails it; a new
type is a schema document and its intent (`propose_doc_version`'s `kind: "schema"`), no code; admins see them on
`/schemas/`. Never by a migration. The agent also reads and proposes
**stories** (`list_stories`, `get_story`, `propose_story`, `add_story_frame`, `add_story_audio`, `add_story_video`, and
the doc tools; play/SPEC.md §12): a film as one timeline of tracks and clips (storyboard shots, each a still and, once made, its video; voice, notes, and
the sound: voice takes, music, sfx and beds, each a recording on its clip, played in the Stories player),
versioned like the assets (one film, one story: its rewrites are its next versions, never stories of their own), every field of every clip editable only this way, shown on the intents' board played in the
Stories player beside what changed. Every image, video and recording it adds is kept among play's files and shown in
the admins' **Library** (`/library/`), each with the `label` it was given (only shown; a file is named by its hash)
and where the stories use it; an agent finds one by its label or hash prefix with `list_library` (or `GET
/api/library` with its token) and fetches it with `GET /api/files/<hash>`. A story may link an accepted version of another (a track of kind `story`, its clip
naming that story's UUID and the version's hash: the trailer its own story, played in every film), and a film moves to a
newer trailer only by its own proposal (play/SPEC.md §12). Every story is also a Loro document (play/SPEC.md §4.4): every edit kept with its
author, message and time, an intent's work an intent variant of it, made edit by edit with `doc_edit` (the timeline's
ops: `set_clip`, `shift` …) and proposed with `propose_doc_version`. So is every **asset** (play/SPEC.md §4.4): its
source, card and variants, its history made from its versions (and the work kept between them,
`play/api/import/history`); an agent makes an asset's change edit by edit with `doc_edit` (a replace by its text, a
range, a card field, each edit with its message), reads it with `doc_history` and `get_asset`'s `edit` or `intent`, and
proposes it with `propose_doc_version`, its edits shown on the intents' board; admins play an asset's making in its
History tab. A
**sandbox's layout** (which asset version and variant each slot draws, and any field of its configs: Sandbox 1's garden,
where a thing stands) is a document too, `sandbox:<uuid>` (play/SPEC.md §4.6): `get_sandbox` reads it, `doc_edit`
drafts a change in an intent variant with its helpers (`pin`, `pin_latest`, `unpin`, `set`, `delete`) and
`propose_doc_version` proposes it, shown on the intents' board pin by pin before and after and openable in the sandbox
as it would be; accepted, its pins and configs are written for the worlds; its History is at `/sandboxes/<uuid>/`;
never by a migration. A
**factory** (a production line on the Factories page: its line and its bill of process) is a Loro document too
(play/SPEC.md §4.8), changed edit by edit with the doc tools (a station's machines, buffer or breakdowns, a part's
operation and its seconds, the demand), shown on the intents' board field by field and openable as the factory would
be, its simulation running; never by a migration. The **game's configs** (the Game editor, first the levelling: how a
village grows level by level) are Loro documents the same way (play/SPEC.md §4.9). A plant
version names its **reference sheet** (its card's `sheet`, set with `doc_edit`, or `propose_asset`'s: the hash of the plate kept with `add_story_frame`; play/SPEC.md
§4.10), shown with the version in the asset library and, in the Library, beside the image, the plant it belongs to, and
its **data sheet** and its sheet's **brief** (`datasheet`, `brief`: Markdown kept with `add_document`), so a plant's whole
dataset is in play. A
version can be a kind of **variants** (a plant's kinds, an animal's breeds), each its own
recipe and a chip in the asset viewer: an asset's variants are **breeds** of its document (play/SPEC.md §4.15, Breeds), named variants beside Main
that take every edit accepted on Main except on the fields they override (its `source`, its `card`); a breed changes by its own intent variant
(`doc_edit`'s and `propose_doc_version`'s `breed`), a new one is made by one (`new_breed`), and every Accept, on Main or on a breed, is the asset's
next frozen version with every breed built as its variant. Everything Maia City wants made, fixed or improved is an **intent** (play/SPEC.md
§4.12; Samuel 2026-11-06), on the intents' board (a modal from the nav pill's star): **Idea → Specify → Build →
Proposal → (Ship →) Accepted** (or Archived). **One record** (Samuel 2026-11-06: "not a proposal belongs to an intent: the intent
has a state, proposal"): there is no proposal beside an intent; Proposal is the intent's stage, and the work it brings
(its documents' versions, each an intent variant, a row of `play.intent_variants`, or a sandbox's change) is on the
intent itself (`play/api/src/work.ts`). **No edit without an intent** (intent 847c5d38): `doc_edit` names its `intent`,
nothing reaches a document's Main but an admin's Accept of the intent at Proposal, and one intent may change several
documents, each proposed naming it, accepted together in one transaction or archived together. An agent adds one (`add_intent`, over MCP only: nothing is
typed in by hand), reads them (`list_intents`, `get_intent`) and does what the intent's **brief** says for the stage it
is at (`get_intent`'s `brief`): the **Intents skill**'s text for that stage. What play teaches its agents (avenMAIA's
system prompt, the intents' lifecycle, each stage's instructions) is kept once, as **skills** in play's Postgres
(`list_docs`, `doc_at`, `doc_history`; `/skills/`; play/SPEC.md §4.14), never in the code or on the board, and changes
only by proposal (`doc_edit`, `propose_doc_version`), served from Postgres on each request (`initialize`, the brief, MCP's
prompts). **Play's database is the one source of every skill** (intent a90151df): each is also an MCP prompt,
`skill:<uuid>`, and `.claude/skills` is only a mirror, written from play at each avenBOX session's start by
`play/avenbox/skills.ts` and never committed (`.gitignore`); change a skill on play by proposal, never in that folder.
The code skills name lives in `tools/` (`tools/security-auditor/`, `tools/plant/`, `tools/sheet/`). In short: at Idea it specifies the intent (every test and measure check with its `run` in **avenBOX**) and
stops for an admin's approval; in Build it builds it, tests itself (`bun play/avenbox/intent.ts <the intent's
UUID>`) and marks its draft pull request ready, whose run in avenBOX on GitHub records the checks, until it moves to Proposal by itself, where an admin decides it; work of play's it proposes
naming the intent, code it ships by pull request (*Accept ships it*, above). **No work without an intent** (intent
706ed873): every propose path (`propose_*`, `add_artifact`, `update_artifact`, `doc_edit`, `POST /api/intents`) needs
`intent`, one in Build or at Proposal, so every intent at Proposal has a spec. **Auto-accept rules** (play/SPEC.md §4.12, intent
de24f1c5): one versioned rule set, `rules:<uuid>`, may let a matching intent pass Approve spec or Accept with no person,
by a person's own path and recorded as the rule's; today only an artifact added or corrected over MCP (`add_artifact`
or `update_artifact` without `intent` makes its own intent, kept at once); the rules themselves are always a person's:
no rule decides an intent that changes them. No tool approves, accepts or rejects an
intent; an agent archives only its own intents at Proposal put there over MCP (`archive_intent`: one it no longer
stands by; Samuel 2026-11-04). An intent is named by its own UUID (the old proposals' ids went with migration 0032). **Every agent connected over MCP is avenMAIA** (play/SPEC.md
§4.13; Samuel 2026-11-06), whatever its client or token, working for the admin whose token connected it, and it keeps
Maia City's **Artifacts** (`/artifacts/`, admins): every link from the net we keep, once each, with a very compact title (at
most 70 characters), a description (1–2 sentences, at most 280 characters) and a summary (a small report on the topic,
500–1,500 words: `## What it is`, `## Key points`, `## The topic`), and its authors, each a row of its own named by its
UUID (`list_authors` first). Every link its operator pastes it adds with `add_artifact`'s `origin: 'human'` (shown "Added
by" the operator), every artifact it finds and uses in its own research with `origin: 'agent'` (shown "Sourced by
avenMAIA"); `list_artifacts`, `get_artifact`, `update_artifact`, `get_author` read and correct them. An artifact is a
document like any other (`artifact:<uuid>`): `add_artifact` and `update_artifact` propose its next version as an
intent's work (named with `intent`, held to its gate), decided by the same
Accept, one intent at a time; it is kept once accepted, its History in its History tab. The same token also opens play's **read-only world routes** (`GET /api/me`, `/api/catalog`,
`/api/files/<hash>`, `/api/sandboxes/<id>/config`, `/api/assets…`) as its admin, so an agent can load a sandbox in its own
browser (sending the header to play only) and film it for a storyboard; nothing else, and nothing that writes. Admins
only for now: a token opens nothing once its owner is no admin.
