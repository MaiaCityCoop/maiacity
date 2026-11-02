# maiacity

Two apps, one server.

| Folder | What | Where it runs |
| --- | --- | --- |
| `play/` | The three sandboxes and Maia City's asset library: a SvelteKit site and its Bun API on Postgres (`play/SPEC.md`) | play.maia.city |
| `website/` | The public site: the manifesto, the legal pages, how to join (`website/README.md`) | maia.city |

Everything else the server needs to serve them: `deploy/` (the Caddyfile, the website's publish script, the backup
script), `docker-compose.yml` and `docker-compose.prod.yml` (the server's containers; play adds
`play/docker-compose.play.yml`), `.github/` (the checks and the deploys).

## How a change ships

A pull request to `main` runs play's and the website's checks (`.github/workflows/main.yml`). Merged, `main` goes to
`production` by a pull request (`production` takes `main` only); the push to `production` deploys both
(`.github/workflows/production.yml`): play's image and the server, the website's build. Nothing is deployed by hand.

Sign-up is by invite only: an admin's invite link (play's members page) lets one person in, as a traveler; an admin
makes a citizen.

Everything that was here before (avenDB, theOS, the old app, the blog) is on the branch `SNAPSHOT_2611101`.
