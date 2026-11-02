# website

maia.city: the public site. The manifesto, the legal pages and the way in, which is play (play.maia.city), by
invite only. A plain SvelteKit app, prerendered, nothing from beside this folder.

    bun install && bun run dev      # http://localhost:5173
    bun run build                   # into build/

It ships like play: a pull request to main runs its checks (.github/workflows/website-checks.yml), main merged into
production deploys it (.github/workflows/production.yml, the website job): the build is copied to the server's
site/releases/<commit> and site/current switched to it, which Caddy serves at maia.city.
