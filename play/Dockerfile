# play.maia.city: one image, the site and its API (play/SPEC.md §2). Built from the repo root, on the bun .bun-version
# names (production.yml passes it):
#   docker build -f play/Dockerfile --build-arg BUN_VERSION=$(cat .bun-version) -t maia-city-play .
# The site is built in the first stage; the API serves it beside /api (PLAY_SITE). The import (bun import/run.ts)
# runs from the same image with every deploy, against play's Postgres and store (deploy/server-up.sh).
ARG BUN_VERSION
FROM oven/bun:${BUN_VERSION}-alpine AS site
WORKDIR /src/play/site
COPY play/site/package.json play/site/bun.lock ./
# an optional extra CA (a build behind a TLS-inspecting proxy: --secret id=ca,src=<bundle>); none elsewhere
RUN --mount=type=secret,id=ca,required=false NODE_EXTRA_CA_CERTS=/run/secrets/ca bun install --frozen-lockfile
COPY play/site ./
# the site's own code imports play's id table from the API (src/lib/content/assets/sandboxes.js: a sandbox's UUID is
# written only there), at its place in the repository; play/api/test/image.test.ts holds this stage to every such import
COPY play/api/src/ids.ts /src/play/api/src/ids.ts
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine
WORKDIR /app/api
COPY play/api/package.json play/api/bun.lock ./
RUN --mount=type=secret,id=ca,required=false NODE_EXTRA_CA_CERTS=/run/secrets/ca bun install --frozen-lockfile --production
COPY play/api/src ./src
COPY play/api/migrations ./migrations
COPY play/api/import ./import
# the media play's site names by hash (its covers and sounds), found in its sources, at the repo's place
COPY play/site/src /app/play/site/src
COPY play/media /app/play/media
# the required checks' names, read by src/substate.ts
COPY .github/required-checks.json /app/.github/required-checks.json
COPY --from=site /src/play/site/build /app/site
ENV PORT=3000 PLAY_SITE=/app/site PLAY_REPO=/app
# the commit this image is built from (production.yml: --build-arg PLAY_COMMIT=$GITHUB_SHA): GET /api/version answers
# it, and the reconcile (src/ship.ts) holds every code intent's stage to it; last, so no layer above is built again
ARG PLAY_COMMIT=
ENV PLAY_COMMIT=$PLAY_COMMIT
EXPOSE 3000
USER bun
CMD ["bun", "src/index.ts"]
