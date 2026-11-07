
      CREATE TABLE play.agents (
        id      UUID PRIMARY KEY,
        coop_id UUID NOT NULL REFERENCES play.coops(id),
        name    TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),   -- only shown: an agent is named by its id
        created TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO play.agents (id, coop_id, name) VALUES (play.uuid_of('agent:avenmaia'), play.uuid_of('coop:maia-city'), 'avenMAIA');

      CREATE TABLE play.artifacts (
        id          UUID PRIMARY KEY,
        coop_id     UUID NOT NULL REFERENCES play.coops(id),
        url         TEXT NOT NULL CHECK (url ~ '^https?://' AND length(url) <= 2000),   -- normalised (./artifacts.ts urlOf)
        title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 70),
        description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 280),
        summary     TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 20000),          -- Markdown, 500–1,500 words
        kind        TEXT NOT NULL CHECK (kind IN ('page', 'article', 'paper', 'video', 'post', 'book', 'podcast', 'code', 'other')),
        tags        TEXT[] NOT NULL DEFAULT '{}',
        published   DATE,
        text_hash   TEXT REFERENCES play.files(hash),        -- the page's text as it was fetched, if it was given
        agent_id    UUID NOT NULL REFERENCES play.agents(id),
        origin      TEXT NOT NULL CHECK (origin IN ('human', 'agent')),
        operator_id TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        token_id    UUID REFERENCES play.api_tokens(id) ON DELETE SET NULL,
        created     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by  TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        updated_at  TIMESTAMPTZ,
        UNIQUE (coop_id, url)
      );
      CREATE INDEX ix_artifacts_created ON play.artifacts(coop_id, created DESC);
      CREATE INDEX ix_artifacts_tags ON play.artifacts USING gin(tags);

      CREATE TABLE play.authors (
        id          UUID PRIMARY KEY,
        coop_id     UUID NOT NULL REFERENCES play.coops(id),
        name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),   -- only shown: two may share it
        kind        TEXT NOT NULL CHECK (kind IN ('person', 'organization')),
        url         TEXT CHECK (url IS NULL OR (url ~ '^https?://' AND length(url) <= 2000)),
        note        TEXT CHECK (note IS NULL OR length(note) <= 600),
        agent_id    UUID NOT NULL REFERENCES play.agents(id),
        operator_id TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        created     TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE play.artifact_authors (
        artifact_id UUID NOT NULL REFERENCES play.artifacts(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES play.authors(id),
        position  INT NOT NULL CHECK (position >= 0),
        PRIMARY KEY (artifact_id, author_id),
        UNIQUE (artifact_id, position)
      );
      CREATE INDEX ix_artifact_authors_author ON play.artifact_authors(author_id);
    