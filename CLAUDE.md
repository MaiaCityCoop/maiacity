# Working rules for agents in this repository

## The repository is play and the website (Samuel 2026-11-02)

- `play/` is play.maia.city: the sandboxes and the asset library, its site (`play/site`) and its API (`play/api`, Bun on
  Postgres). Read `play/SPEC.md` first.
- `website/` is maia.city: a plain prerendered SvelteKit site. No avenDB, nothing imported from beside it.
- `deploy/`, `docker-compose*.yml` and `.github/` are what the server and the deploys need.
- Everything from before (avenDB, theOS, the old app, the blog, the universe) is on the branch `SNAPSHOT_2611101`.
  Nothing here may import from it; bring back what is needed as code of play or the website.

## How changes ship

Changes go to `main` by pull request; `.github/workflows/main.yml` runs play's checks (`play-checks.yml`: the API's
tests against Postgres, its types, the site's build) and the website's (`website-checks.yml`: its types and build).
`main` is then merged into `production` by a pull request (`production.yml`: `Only from main`, and `Main is green`
reads main's checks for that commit instead of running them again). The push to `production` deploys play (image, DNS,
server, import, Caddy) and the website (its build into the server's `site/releases/<commit>`, `site/current` switched).

Before you push, run the checks of what you touched: in `play/api` `bunx tsc --noEmit && bun test` (with
`TEST_DATABASE_URL`), in `play/site` `bun run build`, in `website` `bun run check && bun run build`.

**Ship without asking** (Samuel 2026-11-03): once a change is done and its checks pass, mark its pull request ready,
merge it into `main` (a merge commit), open the pull request `main` → `production` and merge it when its gates are
green, so it deploys. Do not ask first; say what shipped, and report a failing check or deploy instead of merging past
it.

## Backups

Every deploy first backs up play to the bucket `maiacity` (`BACKUPS/play/…`: its schema dump, a full copy of its files,
the image): `deploy/backup.sh`. Nothing on a schedule. Restoring, as a check or a rollback, is by hand only:
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
**stories** (`list_stories`, `get_story`, `propose_story`, `propose_story_version`, `add_story_frame`, `add_story_audio`, `story_edit`,
`story_history`; play/SPEC.md §12): a film as one timeline of tracks and clips (storyboard shots, voice, notes, and
the sound: voice takes, music, sfx and beds, each a recording on its clip, played in the Stories player),
versioned like the assets (one film, one story: its rewrites are its next versions, never stories of their own), every field of every clip editable only this way, shown on the Proposals page played in the
Stories player beside what changed. Every story is also a Loro document (play/SPEC.md §4.4): every step kept with its
author, message and time, a proposal a branch of it; an agent drafts a change step by step with `story_edit` and
proposes the draft with `propose_story_version`'s `branch`. So is every **asset** (play/SPEC.md §4.4): its source,
card and variants, its history made from its versions (and the work kept between them, `play/api/import/history`);
an agent drafts an asset step by step with `asset_edit` (a replace by its text, a range, a card field, each step with
its message), reads it with `asset_history` and `get_asset`'s `step`, and proposes the draft with `propose_version`'s
`branch`, its steps shown on the Proposals page; admins play an asset's making in the asset viewer's history bar. A
version can be a kind of **variants** (`propose_version`'s `variants`: a plant's kinds, an animal's breeds), each its own
recipe and a chip in the asset viewer. No tool accepts; an agent archives only its own open proposals made over MCP
(`archive_proposal`: one it has replaced or no longer stands by; Samuel 2026-11-04). The same token also opens play's **read-only world routes** (`GET /api/me`, `/api/catalog`,
`/api/files/<hash>`, `/api/sandboxes/<id>/config`, `/api/assets…`) as its admin, so an agent can load a sandbox in its own
browser (sending the header to play only) and film it for a storyboard; nothing else, and nothing that writes. Admins
only for now: a token opens nothing once its owner is no admin.
