# Working rules for agents in this repository

## The repository is play and the website (Samuel 2026-11-02)

- `play/` is play.maia.city: the sandboxes and the asset library, its site (`play/site`) and its API (`play/api`, Bun on
  Postgres). Read `play/SPEC.md` first.
- `website/` is maia.city: a plain prerendered SvelteKit site. No avenDB, nothing imported from beside it.
- `deploy/`, `docker-compose*.yml` and `.github/` are what the server and the deploys need.
- **Every reference is a UUID or a hash** (Samuel 2026-11-04, play/SPEC.md §4.7): a coop, asset, story, sandbox,
  intent or human is named by its UUID; a file, recipe or version by its BLAKE3 hash. Titles, labels, slugs, groups
  and routes are only shown: never look anything up by them, never hard-code one as a reference.
- Everything from before (avenDB, theOS, the old app, the blog, the universe) is on the branch `SNAPSHOT_2611101`.
  Nothing here may import from it; bring back what is needed as code of play or the website.

## How changes ship

Every change is an intent's (play/SPEC.md §4.12) and goes to `main` by pull request; `.github/workflows/main.yml` runs
play's checks (`play-checks.yml`: the API's tests against Postgres, its types, the site's build) and the website's
(`website-checks.yml`: its types and build). Once main is green for the merged commit, `.github/workflows/release.yml`
moves `production` to it (fast-forward) and starts `production.yml`, which deploys play (backup, image, DNS, server,
import, Caddy) and the website (its build into the server's `site/releases/<commit>`, `site/current` switched);
`Main is green` reads main's checks for that commit instead of running them again.

Before you push, run the checks of what you touched, in **avenBOX** (the cloud environment the agents work in; play/SPEC.md
§4.12): `bash play/avenbox/gate.sh` runs what CI runs (in `play/api` `bunx tsc --noEmit` and `bun test`, none skipped,
against the box's Postgres 17; in `play/site` `bun run build`; in `website` `bun run check && bun run build`), `gate.sh
api|site|website` one part. A cloud session starts with the box up (`.claude/settings.json` runs `play/avenbox/up.sh`:
Postgres on 127.0.0.1:5432, `TEST_DATABASE_URL` set). A change made for an intent names it in its commits, the line
`Intent: <the intent's UUID>` at the end of each message.

**Accept ships it** (Samuel 2026-11-06; play/SPEC.md §4.12, `play/api/src/ship.ts`): the intent flow is the one
authority over what lands on main and goes to production. Once the change is done, open its pull request into `main`
(ready, not a draft), record the intent's checks on its head and name it: `bun play/avenbox/intent.ts <the intent's
UUID> --record --pr <its number>`. Once every must check passes, the intent moves to Proposal by itself: **stop there**.
**Never merge** into `main` or `production` by hand, and open no pull request into `production`. An admin's Accept on
play's intents' board puts the intent in **Ship** at once: there it waits its turn (one ship at a time, in the order
accepted) and for GitHub (the pull request's checks green, its mergeability worked out), its reason shown live, and
play then merges the pull request itself (it posts the commit status **`Intent accepted`** on its head first; main's
ruleset requires it, with `play / API and site` and `website / build`); Ship shows live main's checks, the release and
the deploy (backup, image, server, website); all green, it is Accepted; a red step brings it back to Proposal with the report: fix it in a new pull request of the intent (named
with `--pr`, its checks recorded on its head), and Accept ships it again. After the merge,
`.github/workflows/intents.yml` runs the intent's checks again on main in the same box and records them as main's, a
confirmation. Say what you opened and that it waits for Accept; report a failing check instead of going past it.

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
source** (play refuses minified code and wraps the source into the recipe file itself); to propose is to put an intent
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
versioned thing shows its History in its own **History tab** on the right (`play/site/src/lib/app/History.svelte`), and
every review on the intents' board its changes through `Changes.svelte`. The agent also reads and proposes
**stories** (`list_stories`, `get_story`, `propose_story`, `add_story_frame`, `add_story_audio`, `add_story_video`, and
the doc tools; play/SPEC.md §12): a film as one timeline of tracks and clips (storyboard shots, each a still and, once made, its video; voice, notes, and
the sound: voice takes, music, sfx and beds, each a recording on its clip, played in the Stories player),
versioned like the assets (one film, one story: its rewrites are its next versions, never stories of their own), every field of every clip editable only this way, shown on the intents' board played in the
Stories player beside what changed. Every image, video and recording it adds is kept among play's files and shown in
the admins' **Library** (`/library/`), each with the `label` it was given (only shown; a file is named by its hash)
and where the stories use it. A story may link an accepted version of another (a track of kind `story`, its clip
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
where a thing stands) changes only by proposal too: `get_sandbox` reads it, `propose_sandbox_change` proposes edits
(`pin`, `pin_latest`, `unpin`, `set`, `delete`; play/SPEC.md §4.6), shown on the intents' board before and after and
openable in the sandbox as it would be; never by a migration. A
**factory** (a production line on the Factories page: its line and its bill of process) is a Loro document too
(play/SPEC.md §4.8), changed edit by edit with the doc tools (a station's machines, buffer or breakdowns, a part's
operation and its seconds, the demand), shown on the intents' board field by field and openable as the factory would
be, its simulation running; never by a migration. The **game's configs** (the Game editor, first the levelling: how a
village grows level by level) are Loro documents the same way (play/SPEC.md §4.9). A plant
version names its **reference sheet** (its card's `sheet`, set with `doc_edit`, or `propose_asset`'s: the hash of the plate kept with `add_story_frame`; play/SPEC.md
§4.10), shown with the version in the asset library and, in the Library, beside the image, the plant it belongs to, and
its **data sheet** and its sheet's **brief** (`datasheet`, `brief`: Markdown kept with `add_document`), so a plant's whole
dataset is in play. A
version can be a kind of **variants** (the document's `variants`, or `propose_asset`'s: a plant's kinds, an animal's breeds), each its own
recipe and a chip in the asset viewer. Everything Maia City wants made, fixed or improved is an **intent** (play/SPEC.md
§4.12; Samuel 2026-11-06), on the intents' board (a modal from the nav pill's star): **Idea → Specify → Prototype →
Proposal → (Ship →) Accepted** (or Archived). **One record** (Samuel 2026-11-06: "not a proposal belongs to an intent: the intent
has a state, proposal"): there is no proposal beside an intent; Proposal is the intent's stage, and the work it brings
(a document's version, named by its `doc_id` and `doc_variant`, or a sandbox's change) is on the intent itself
(`play/api/src/work.ts`). An agent adds one (`add_intent`, over MCP only: nothing is
typed in by hand), reads them (`list_intents`, `get_intent`) and does what the intent's **brief** says for the stage it
is at (`get_intent`'s `brief`): the **Intents skill**'s text for that stage. What play teaches its agents (avenMAIA's
system prompt, the intents' lifecycle, each stage's instructions) is kept once, as **skills** in play's Postgres
(`list_docs`, `doc_at`, `doc_history`; `/skills/`; play/SPEC.md §4.14), never in the code or on the board, and changes
only by proposal (`doc_edit`, `propose_doc_version`), served from Postgres on each request (`initialize`, the brief, MCP's
prompts). In short: at Idea it specifies the intent (every test and measure check with its `run` in **avenBOX**) and
stops for an admin's approval; in Prototype it builds it and records every check (`bun play/avenbox/intent.ts <the
intent's UUID> --record`) until it moves to Proposal by itself, where an admin decides it; work of play's it proposes
naming the intent, code it ships by pull request (*Accept ships it*, above). Work
proposed without `intent` is a new intent at Proposal of its own, with no spec. No tool approves, accepts or rejects an
intent; an agent archives only its own intents at Proposal put there over MCP (`archive_intent`: one it no longer
stands by; Samuel 2026-11-04). An intent is named by its own UUID (the old proposals' ids went with migration 0032). **Every agent connected over MCP is avenMAIA** (play/SPEC.md
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
