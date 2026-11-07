
      -- documents kept in Loro (play/SPEC.md §4.4): one Loro document per story (and later per asset and other types),
      -- its every edit a step with its author, message and time; the server is the only writer
      CREATE TABLE play.docs (
        id           TEXT PRIMARY KEY,                 -- story:<slug>, asset:<uuid> …
        type         TEXT NOT NULL,                    -- story, asset
        schema       TEXT NOT NULL,                    -- story/1, asset/1
        head         JSONB NOT NULL DEFAULT '[]',      -- the main line's frontiers
        snapshot     BYTEA,                            -- a full snapshot of the main line (its whole history) …
        snapshot_seq BIGINT NOT NULL DEFAULT 0,        -- … holding every main step up to this one
        created_by   TEXT REFERENCES play.humans(id),
        created      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      -- a proposal is a branch: forked at the head's frontiers, its own steps, merged when accepted
      CREATE TABLE play.doc_branches (
        id          BIGSERIAL PRIMARY KEY,
        doc_id      TEXT NOT NULL REFERENCES play.docs(id),
        base        JSONB NOT NULL,                    -- the frontiers it was forked at
        head        JSONB NOT NULL,                    -- its latest frontiers
        status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'proposed', 'accepted', 'rejected', 'withdrawn', 'stale')),
        note        TEXT NOT NULL DEFAULT '',
        created_by  TEXT REFERENCES play.humans(id),
        created     TIMESTAMPTZ NOT NULL DEFAULT now(),
        proposed_at TIMESTAMPTZ,
        decided_by  TEXT REFERENCES play.humans(id),
        decided_at  TIMESTAMPTZ,
        version     INT                                -- the version it was accepted as
      );
      CREATE INDEX doc_branches_doc ON play.doc_branches (doc_id, status);
      -- who writes as which Loro peer: a peer per author on the main line, a fresh one per author on each branch, so
      -- two branches never write the same operation ids
      CREATE TABLE play.doc_peers (
        peer    TEXT PRIMARY KEY,
        doc_id  TEXT NOT NULL REFERENCES play.docs(id),
        branch  BIGINT REFERENCES play.doc_branches(id),
        author  TEXT REFERENCES play.humans(id),
        via     TEXT NOT NULL,                         -- site, mcp, import, system
        created TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX doc_peers_one ON play.doc_peers (doc_id, COALESCE(branch, 0), COALESCE(author, ''), via);
      -- every step, append only: its Loro update, who, why, when, and the frontiers after it
      CREATE TABLE play.doc_updates (
        seq       BIGSERIAL PRIMARY KEY,
        doc_id    TEXT NOT NULL REFERENCES play.docs(id),
        branch    BIGINT REFERENCES play.doc_branches(id),  -- NULL: the main line
        kind      TEXT NOT NULL CHECK (kind IN ('seed', 'edit', 'import', 'merge')),
        bytes     BYTEA NOT NULL,
        peer      TEXT,
        author    TEXT REFERENCES play.humans(id),
        via       TEXT NOT NULL,
        message   TEXT NOT NULL DEFAULT '',
        frontiers JSONB NOT NULL,
        created   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX doc_updates_line ON play.doc_updates (doc_id, branch, seq);
      -- named versions: a point of the main line, the BLAKE3 of its canonical JSON recorded; never changed
      CREATE TABLE play.doc_versions (
        doc_id       TEXT NOT NULL REFERENCES play.docs(id),
        number       INT NOT NULL,
        frontiers    JSONB NOT NULL,
        content_hash TEXT NOT NULL,
        note         TEXT NOT NULL DEFAULT '',
        author       TEXT REFERENCES play.humans(id),
        branch       BIGINT REFERENCES play.doc_branches(id),
        created      TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (doc_id, number)
      );
      CREATE OR REPLACE FUNCTION play.doc_history_is_kept() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION '% is append only: its rows are never changed', TG_TABLE_NAME; END $$;
      CREATE TRIGGER doc_updates_kept BEFORE UPDATE OR DELETE ON play.doc_updates FOR EACH ROW EXECUTE FUNCTION play.doc_history_is_kept();
      CREATE TRIGGER doc_versions_kept BEFORE UPDATE OR DELETE ON play.doc_versions FOR EACH ROW EXECUTE FUNCTION play.doc_history_is_kept();
      -- a story's proposal is a branch of its document, its steps there
      ALTER TABLE play.proposals ADD COLUMN doc_branch BIGINT REFERENCES play.doc_branches(id);
    