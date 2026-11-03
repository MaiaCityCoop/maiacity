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
frame; proposed code never runs on the server or on play's origin) before they decide. No tool accepts or rejects. Admins only for now:
a token opens nothing once its owner is no admin.

Claude Code sessions get it from the repository's `.mcp.json` (server `play`), which reads the token from the environment
variable `PLAY_MCP_TOKEN`: in a cloud environment it is set in the environment's settings (never in git), and
`play.maia.city` must be allowed by its network access. Without the variable the server only fails to connect.
