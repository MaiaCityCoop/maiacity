
      -- a person's access tokens, for an agent working for them over MCP (/api/mcp): the token itself shown once, only
      -- its SHA-256 kept; revoked, it opens nothing. Admins alone make them for now (Samuel 2026-11-02), and a token
      -- opens nothing once its owner is no admin.
      CREATE TABLE play.api_tokens (
        id         UUID PRIMARY KEY,
        human_id   TEXT NOT NULL REFERENCES play.humans(id) ON DELETE CASCADE,
        name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
        token_hash TEXT NOT NULL UNIQUE,
        created    TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_used  TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      );
      -- where a proposal came from: the site, or an agent over MCP
      ALTER TABLE play.proposals ADD COLUMN via TEXT NOT NULL DEFAULT 'web' CHECK (via IN ('web', 'mcp'));
    