
      CREATE TABLE play.stories (
        id      TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
        coop_id TEXT NOT NULL REFERENCES play.coops(id),
        title   TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),  -- its head's title (a new story's: as proposed)
        head    TEXT,                                                    -- its newest accepted version; none until one is
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE play.story_versions (
        id          TEXT PRIMARY KEY CHECK (id ~ '^[0-9a-f]{64}$'),  -- BLAKE3 of its content (story, parents, title, body)
        story_id    TEXT NOT NULL REFERENCES play.stories(id),
        number      INT CHECK (number >= 1),                        -- v1, v2…: set once, when it is accepted
        parents     TEXT[] NOT NULL DEFAULT '{}',
        title       TEXT NOT NULL,
        body        JSONB NOT NULL,                                 -- { schema: 'story/1', format, fps, duration, tracks }
        note        TEXT NOT NULL DEFAULT '',
        author      TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        approved_by TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        created     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (story_id, number)
      );
      ALTER TABLE play.stories ADD CONSTRAINT stories_head_fkey FOREIGN KEY (head) REFERENCES play.story_versions(id);
      -- a story version is written once: only its number and approver may be set, once, when it is accepted
      CREATE FUNCTION play.story_version_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'story versions are never deleted'; END IF;
        IF OLD.number IS NOT NULL
           OR NEW.id <> OLD.id OR NEW.story_id <> OLD.story_id OR NEW.parents <> OLD.parents OR NEW.title <> OLD.title
           OR NEW.body IS DISTINCT FROM OLD.body OR NEW.note <> OLD.note OR NEW.author IS DISTINCT FROM OLD.author
           OR NEW.created <> OLD.created
        THEN RAISE EXCEPTION 'story version % is frozen', OLD.id; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER story_version_is_frozen BEFORE UPDATE OR DELETE ON play.story_versions
        FOR EACH ROW EXECUTE FUNCTION play.story_version_is_frozen();

      -- a proposal is of an asset version or of a story version, and names the one it is of
      ALTER TABLE play.proposals
        ALTER COLUMN asset_id DROP NOT NULL,
        ALTER COLUMN version DROP NOT NULL,
        ADD COLUMN story_id      TEXT REFERENCES play.stories(id),
        ADD COLUMN story_base    TEXT REFERENCES play.story_versions(id),  -- the story's head it was made from
        ADD COLUMN story_version TEXT REFERENCES play.story_versions(id),
        DROP CONSTRAINT proposals_kind_check,
        ADD CONSTRAINT proposals_kind_check CHECK (kind IN ('asset_version', 'story_version')),
        ADD CONSTRAINT proposals_names_what CHECK (
          (kind = 'asset_version' AND asset_id IS NOT NULL AND version IS NOT NULL AND story_id IS NULL AND story_version IS NULL)
          OR (kind = 'story_version' AND story_id IS NOT NULL AND story_version IS NOT NULL AND asset_id IS NULL AND version IS NULL));
    