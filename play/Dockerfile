# play.maia.city: one image, the site and its API (play/SPEC.md §2). Built from the repo root:
#   docker build -f play/Dockerfile -t maia-city-play .
# The site is built in the first stage; the API serves it beside /api (PLAY_SITE). The import (bun import/run.ts)
# runs from the same image, once, against legacy's public feed and Postgres (play/deploy/README.md).
FROM oven/bun:1.4.4-alpine AS site
WORKDIR /src/play/site
COPY play/site/package.json play/site/bun.lock ./
# an optional extra CA (a build behind a TLS-inspecting proxy: --secret id=ca,src=<bundle>); none elsewhere
RUN --mount=type=secret,id=ca,required=false NODE_EXTRA_CA_CERTS=/run/secrets/ca bun install --frozen-lockfile
COPY play/site ./
RUN bun run build

FROM oven/bun:1.4.4-alpine
WORKDIR /app/api
COPY play/api/package.json play/api/bun.lock ./
RUN --mount=type=secret,id=ca,required=false NODE_EXTRA_CA_CERTS=/run/secrets/ca bun install --frozen-lockfile --production
COPY play/api/src ./src
COPY play/api/import ./import
# the import reads legacy Sandbox 4's configs and the repo's table of avenDB pins (import/run.ts), where the repo keeps them
COPY maia/content/code/configs/sandbox-4 /app/maia/content/code/configs/sandbox-4
COPY maia/content/assets/pins.fixture.json /app/maia/content/assets/pins.fixture.json
# …and the media play's site names by hash (its covers and sounds), found in its sources
COPY play/site/src /app/play/site/src
COPY --from=site /src/play/site/build /app/site
ENV PORT=3000 PLAY_SITE=/app/site PLAY_REPO=/app
EXPOSE 3000
USER bun
CMD ["bun", "src/index.ts"]
