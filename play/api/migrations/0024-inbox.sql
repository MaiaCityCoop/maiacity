
      CREATE TABLE play.inbox (
        id             UUID PRIMARY KEY,
        coop_id        UUID NOT NULL REFERENCES play.coops(id),
        kind           TEXT NOT NULL DEFAULT 'idea' CHECK (kind IN ('idea', 'fix', 'improve')),
        title          TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),  -- only shown: an item is named by its id
        note           TEXT NOT NULL DEFAULT '',
        status         TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'specify', 'done', 'archived')),
        author         TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        via            TEXT NOT NULL DEFAULT 'mcp' CHECK (via IN ('web', 'mcp')),
        created        TIMESTAMPTZ NOT NULL DEFAULT now(),
        -- its spec: what is to be made, precisely, and the metric of what is good (how a proposal for it is judged)
        definition     TEXT,
        metric         TEXT,
        specified_by   TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        specified_at   TIMESTAMPTZ,
        decided_by     TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        decided_at     TIMESTAMPTZ,
        CHECK ((definition IS NULL) = (metric IS NULL)),
        CHECK (status <> 'specify' OR definition IS NOT NULL)
      );
      CREATE INDEX ix_inbox_status ON play.inbox(status, created);
      ALTER TABLE play.proposals ADD COLUMN inbox_id UUID REFERENCES play.inbox(id);
      CREATE INDEX ix_proposals_inbox ON play.proposals(inbox_id) WHERE inbox_id IS NOT NULL;
    