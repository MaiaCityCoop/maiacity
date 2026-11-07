// play's database, in its own schema `play` (play/SPEC.md §3, §4). Each migration runs once, in order, in one
// transaction; a migration is never edited after it has shipped, only followed by another.

export type Migration = { id: string; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    id: "0001-ownership",
    sql: `
      -- who: a human signs in by passkey alone (copied once from the legacy founders, or signed up here)
      CREATE TABLE play.humans (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        founder_number BIGINT UNIQUE,          -- their number in the legacy founders' line, if they came from there
        created        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE play.passkeys (
        id         TEXT PRIMARY KEY,
        human_id   TEXT NOT NULL REFERENCES play.humans(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        counter    BIGINT NOT NULL DEFAULT 0,
        transports TEXT,
        created    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX ix_passkeys_human ON play.passkeys(human_id);

      -- the coop that owns every asset; its admins are its owners
      CREATE TABLE play.coops (
        id      TEXT PRIMARY KEY,
        name    TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE play.memberships (
        coop_id    TEXT NOT NULL REFERENCES play.coops(id),
        human_id   TEXT NOT NULL REFERENCES play.humans(id) ON DELETE CASCADE,
        level      TEXT NOT NULL CHECK (level IN ('admin', 'citizen', 'traveler')),
        granted_by TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        via_invite TEXT,
        PRIMARY KEY (coop_id, human_id)
      );
      -- what each level may do, as data: { "read": [...], "propose": [...], "decide": [...], "manage": [...] }
      CREATE TABLE play.level_rules (
        coop_id TEXT NOT NULL REFERENCES play.coops(id),
        level   TEXT NOT NULL CHECK (level IN ('admin', 'citizen', 'traveler')),
        rule    JSONB NOT NULL,
        PRIMARY KEY (coop_id, level)
      );
      CREATE TABLE play.invites (
        code       TEXT PRIMARY KEY,
        coop_id    TEXT NOT NULL REFERENCES play.coops(id),
        level      TEXT NOT NULL DEFAULT 'citizen' CHECK (level IN ('citizen')),
        made_by    TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        created    TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_by    TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        used_at    TIMESTAMPTZ
      );
      CREATE TABLE play.secrets (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO play.coops (id, name) VALUES ('maia-city', 'Maia City');
      INSERT INTO play.level_rules (coop_id, level, rule) VALUES
        ('maia-city', 'traveler', '{"read": ["sandboxes", "assets"]}'),
        ('maia-city', 'citizen',  '{"read": ["sandboxes", "assets", "game"], "propose": ["asset_version"]}'),
        ('maia-city', 'admin',    '{"read": ["*"], "propose": ["*"], "decide": ["*"], "manage": ["members", "invites"]}');
    `,
  },
  {
    id: "0002-assets",
    sql: `
      -- a blob in the bucket, named by the BLAKE3 hash of its bytes
      CREATE TABLE play.files (
        hash       TEXT PRIMARY KEY CHECK (hash ~ '^[0-9a-f]{64}$'),
        size       BIGINT NOT NULL CHECK (size >= 0),
        media_type TEXT NOT NULL,
        bucket_key TEXT NOT NULL,
        created    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE play.assets (
        id      UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- its identity; never a name that could repeat
        coop_id TEXT NOT NULL REFERENCES play.coops(id),     -- its owner and authority
        grp     TEXT NOT NULL CHECK (grp ~ '^[a-z]+$'),       -- its group and slug: a label, shown and renameable
        slug    TEXT NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
        label   TEXT NOT NULL,
        head    TEXT,                                   -- its newest accepted version (FK added below)
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (grp, slug)
      );

      -- one version of an asset, never changed: id = BLAKE3 of its canonical content (src/versions.ts)
      CREATE TABLE play.asset_versions (
        id          TEXT PRIMARY KEY CHECK (id ~ '^[0-9a-f]{64}$'),
        asset_id    UUID NOT NULL REFERENCES play.assets(id),
        parents     TEXT[] NOT NULL DEFAULT '{}',
        number      INT CHECK (number BETWEEN 1 AND 100000), -- @v, given when it is accepted; NULL while proposed
        recipe_hash TEXT REFERENCES play.files(hash),        -- the version's own recipe; NULL for a kind of variants
        default_variant TEXT,                                 -- for a kind of variants: the one a ref without a variant names
        card        JSONB,                                    -- the version's record (card, contract, engine, params …)
        engine      INT,
        author      TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        approved_by TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        note        TEXT NOT NULL DEFAULT '',
        imported    JSONB,                                    -- where an imported version came from (avenDB entry …)
        created     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (asset_id, number),
        CHECK ((recipe_hash IS NULL) <> (default_variant IS NULL))
      );
      CREATE INDEX ix_versions_asset ON play.asset_versions(asset_id);
      ALTER TABLE play.assets ADD CONSTRAINT fk_assets_head FOREIGN KEY (head) REFERENCES play.asset_versions(id);

      -- a named variant of a version, with its own recipe file
      CREATE TABLE play.asset_variants (
        version_id  TEXT NOT NULL REFERENCES play.asset_versions(id),
        name        TEXT NOT NULL CHECK (name ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
        recipe_hash TEXT NOT NULL REFERENCES play.files(hash),
        card        JSONB NOT NULL,                           -- the variant's own record
        PRIMARY KEY (version_id, name)
      );

      -- a version is written once: only its number and approver may be set, once, when it is accepted
      CREATE FUNCTION play.version_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'asset versions are never deleted'; END IF;
        IF OLD.number IS NOT NULL
           OR NEW.id <> OLD.id OR NEW.asset_id <> OLD.asset_id OR NEW.parents <> OLD.parents
           OR NEW.recipe_hash IS DISTINCT FROM OLD.recipe_hash OR NEW.default_variant IS DISTINCT FROM OLD.default_variant
           OR NEW.card IS DISTINCT FROM OLD.card
           OR NEW.engine IS DISTINCT FROM OLD.engine OR NEW.author IS DISTINCT FROM OLD.author
           OR NEW.note <> OLD.note OR NEW.imported IS DISTINCT FROM OLD.imported OR NEW.created <> OLD.created
        THEN RAISE EXCEPTION 'asset version % is frozen', OLD.id; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER version_is_frozen BEFORE UPDATE OR DELETE ON play.asset_versions
        FOR EACH ROW EXECUTE FUNCTION play.version_is_frozen();
      CREATE FUNCTION play.variant_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'asset variants are never changed'; END $$;
      CREATE TRIGGER variant_is_frozen BEFORE UPDATE OR DELETE ON play.asset_variants
        FOR EACH ROW EXECUTE FUNCTION play.variant_is_frozen();

      -- a proposed new version of an asset: citizens propose, admins decide
      CREATE TABLE play.proposals (
        id          TEXT PRIMARY KEY,
        coop_id     TEXT NOT NULL REFERENCES play.coops(id),
        kind        TEXT NOT NULL CHECK (kind IN ('asset_version')),
        asset_id    UUID NOT NULL REFERENCES play.assets(id),
        base        TEXT REFERENCES play.asset_versions(id),  -- the head it was made from
        version     TEXT NOT NULL REFERENCES play.asset_versions(id),
        author      TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'withdrawn', 'stale')),
        decided_by  TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        decided_at  TIMESTAMPTZ,
        note        TEXT NOT NULL DEFAULT '',
        created     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX ix_proposals_open ON play.proposals(status, created);
    `,
  },
  {
    id: "0003-sandboxes",
    sql: `
      CREATE TABLE play.sandboxes (
        id    TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        route TEXT NOT NULL,
        note  TEXT NOT NULL DEFAULT ''
      );
      -- what a sandbox draws, at which version (a pin_change proposal later; SPEC §4.5)
      CREATE TABLE play.sandbox_pins (
        sandbox_id TEXT NOT NULL REFERENCES play.sandboxes(id),
        slot       TEXT NOT NULL,
        version_id TEXT NOT NULL REFERENCES play.asset_versions(id),
        variant    TEXT,
        params     JSONB,
        PRIMARY KEY (sandbox_id, slot)
      );
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('sandbox-1', 'Sandbox 1', '/sandbox-1/', 'The dome cell, its food forest grown from our plants (from legacy Sandbox 4)'),
        ('sandbox-2', 'Sandbox 2', '/sandbox-2/', 'The physical world lab: buildings from their parts, physics, wind (from legacy Sandbox 7)'),
        ('sandbox-3', 'Sandbox 3', '/sandbox-3/', 'The tired land, its van and its things (from legacy MaiaCity V2, without the economy)');
    `,
  },
  {
    id: "0004-sandbox-configs",
    sql: `
      -- what a sandbox is laid out by beyond its pins (Sandbox 1's garden: its layers, plantings, spacing, drifts and
      -- fields). An asset in it is named only by a slot of the sandbox's pins (play.sandbox_pins), never by a readable
      -- ref; the API hands each slot out as the build it pins, <hash>?values.
      CREATE TABLE play.sandbox_configs (
        sandbox_id TEXT NOT NULL REFERENCES play.sandboxes(id),
        name       TEXT NOT NULL CHECK (name ~ '^[a-z][a-z0-9-]*$' AND name <> 'assets'),
        data       JSONB NOT NULL,
        updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (sandbox_id, name)
      );
    `,
  },
  {
    id: "0005-asset-sounds",
    sql: `
      -- an asset's sound (an animal's call): a recording among play's files, by its hash, and the gain that brings it to
      -- the others' level. The asset's, not a version's: versions are frozen, and the sound is not part of the recipe.
      ALTER TABLE play.assets ADD COLUMN sound TEXT REFERENCES play.files(hash),
                              ADD COLUMN sound_gain REAL NOT NULL DEFAULT 1 CHECK (sound_gain > 0 AND sound_gain <= 50);
    `,
  },
  {
    id: "0006-invite-only",
    sql: `
      -- sign-up is by invite only (Samuel 2026-11-02): an invite makes a traveler, used up as they sign up; becoming a
      -- citizen comes later, by an admin's hand. Invites made before keep the level they were made with.
      ALTER TABLE play.invites DROP CONSTRAINT IF EXISTS invites_level_check;
      ALTER TABLE play.invites ALTER COLUMN level SET DEFAULT 'traveler';
      ALTER TABLE play.invites ADD CONSTRAINT invites_level_check CHECK (level IN ('traveler', 'citizen'));
    `,
  },
  {
    id: "0007-api-tokens",
    sql: `
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
    `,
  },
  {
    id: "0008-readable-source",
    sql: `
      -- every proposed version brings its readable source (Samuel 2026-11-02): the library its recipe file wraps, kept
      -- as a file of its own, which people read before they decide. Imported versions have none (their files came
      -- bundled and minified from legacy).
      ALTER TABLE play.asset_versions ADD COLUMN source_hash TEXT REFERENCES play.files(hash);
      ALTER TABLE play.asset_variants ADD COLUMN source_hash TEXT REFERENCES play.files(hash);
    `,
  },
  {
    id: "0009-factories",
    sql: `
      -- the Factories page (Samuel 2026-11-03): its lines draw our assets the way a sandbox does, by the slots of its
      -- pins (the LifeTrac the LifeTrac line builds, the Euro pallets its raw stock stands on), so it is kept as one
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('factories', 'Factories', '/factories/', 'The production lines that build our assets, each a live simulation (first: the LifeTrac line)')
      ON CONFLICT (id) DO NOTHING;
    `,
  },
  {
    id: "0010-legacy-sources",
    sql: `
      -- an imported version (and each variant of it) may be given its readable source once (Samuel 2026-11-03): the
      -- library its recipe file was bundled from, legacy's own code made again from it and checked against the file's
      -- hash (play/api/import/legacy/sources). Its source_hash is set where it had none, and nothing else of it
      -- changes; a source once given is never changed or taken back, and a version's other fields stay as frozen.
      CREATE OR REPLACE FUNCTION play.version_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'asset versions are never deleted'; END IF;
        IF NEW.source_hash IS DISTINCT FROM OLD.source_hash THEN
          IF OLD.source_hash IS NOT NULL OR NEW.source_hash IS NULL
             OR NEW.number IS DISTINCT FROM OLD.number OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
          THEN RAISE EXCEPTION 'asset version %: its source is given once, alone', OLD.id; END IF;
        ELSIF OLD.number IS NOT NULL THEN RAISE EXCEPTION 'asset version % is frozen', OLD.id;
        END IF;
        IF NEW.id <> OLD.id OR NEW.asset_id <> OLD.asset_id OR NEW.parents <> OLD.parents
           OR NEW.recipe_hash IS DISTINCT FROM OLD.recipe_hash OR NEW.default_variant IS DISTINCT FROM OLD.default_variant
           OR NEW.card IS DISTINCT FROM OLD.card
           OR NEW.engine IS DISTINCT FROM OLD.engine OR NEW.author IS DISTINCT FROM OLD.author
           OR NEW.note <> OLD.note OR NEW.imported IS DISTINCT FROM OLD.imported OR NEW.created <> OLD.created
        THEN RAISE EXCEPTION 'asset version % is frozen', OLD.id; END IF;
        RETURN NEW;
      END $$;
      CREATE OR REPLACE FUNCTION play.variant_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.source_hash IS NULL AND NEW.source_hash IS NOT NULL
           AND NEW.version_id = OLD.version_id AND NEW.name = OLD.name AND NEW.recipe_hash = OLD.recipe_hash
           AND NEW.card = OLD.card
        THEN RETURN NEW; END IF;
        RAISE EXCEPTION 'asset variants are never changed';
      END $$;
    `,
  },
  {
    id: "0011-import-once",
    sql: `
      -- the legacy import runs once (Samuel 2026-11-03): play's Postgres is the source of truth for its assets, members
      -- and sandboxes, and a later run of the import (every deploy runs it) writes none of it again. Kept here: that it
      -- ran. Where play already holds what it imported, it did.
      CREATE TABLE play.imports (
        name   TEXT PRIMARY KEY,
        ran    TIMESTAMPTZ NOT NULL DEFAULT now(),
        report JSONB
      );
      INSERT INTO play.imports (name, ran)
        SELECT 'legacy', min(created) FROM play.asset_versions WHERE imported IS NOT NULL HAVING count(*) > 0;
      -- and every asset's head on its newest accepted version again, where a run of the import had set it back (it
      -- set each imported asset's head to its last imported version: papaya's back from v2 to v1)
      UPDATE play.assets a SET head = n.id
        FROM (SELECT DISTINCT ON (asset_id) asset_id, id FROM play.asset_versions WHERE number IS NOT NULL ORDER BY asset_id, number DESC) n
       WHERE n.asset_id = a.id AND a.head IS DISTINCT FROM n.id;
    `,
  },
  {
    // Stories (Samuel 2026-11-03): a film as one timeline of tracks and clips (format story/1, play/SPEC.md §12), versioned
    // like the assets: each version written once and numbered when accepted, the story's head its newest accepted one.
    // A story changes only by proposal (over MCP), decided by an admin on the intents' board.
    id: "0012-stories",
    sql: `
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
    `,
  },
  {
    id: "0013-docs",
    sql: `
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
    `,
  },
  {
    // one film, one timeline (Samuel 2026-11-03): a story whose versions were brought into another as that one's next
    // versions (import/stories/folds.json) is kept, its history whole, but listed no more and takes no proposal
    id: "0014-story-folds",
    sql: `ALTER TABLE play.stories ADD COLUMN folded_into TEXT REFERENCES play.stories(id);`,
  },
  {
    // a proposal ends accepted or archived, nothing else (Samuel 2026-11-04): what was rejected, withdrawn or stale is archived
    id: "0015-accepted-or-archived",
    // the old checks go first: they would refuse 'archived' (the first try of this migration failed so in production)
    sql: `
      DO $$ DECLARE c record; BEGIN
        FOR c IN SELECT conrelid::regclass AS t, conname FROM pg_constraint
                  WHERE conrelid IN ('play.proposals'::regclass, 'play.doc_branches'::regclass) AND contype = 'c'
                    AND pg_get_constraintdef(oid) LIKE '%rejected%'
        LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.t, c.conname); END LOOP;
      END $$;
      UPDATE play.proposals SET status = 'archived', decided_by = COALESCE(decided_by, CASE WHEN status = 'withdrawn' THEN author END)
        WHERE status IN ('rejected', 'withdrawn', 'stale');
      UPDATE play.doc_branches SET status = 'archived' WHERE status IN ('rejected', 'withdrawn', 'stale');
      ALTER TABLE play.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('open', 'accepted', 'archived'));
      ALTER TABLE play.doc_branches ADD CONSTRAINT doc_branches_status_check CHECK (status IN ('open', 'proposed', 'accepted', 'archived'));`,
  },
  {
    // a sandbox's layout changes only by proposal (Samuel 2026-11-04): what it draws (its pins) and how it lays them out
    // (its configs), proposed over MCP as edits and accepted by an admin on the intents' board (./sandboxes.ts)
    id: "0016-sandbox-changes",
    sql: `
      ALTER TABLE play.proposals
        ADD COLUMN sandbox_id     TEXT REFERENCES play.sandboxes(id),
        ADD COLUMN sandbox_base   TEXT,   -- the BLAKE3 of the sandbox's pins and configs it was made on
        ADD COLUMN sandbox_change JSONB,  -- its edits, in order
        ADD COLUMN sandbox_diff   JSONB,  -- what they change, before and after (as accepted, once accepted)
        DROP CONSTRAINT proposals_kind_check,
        ADD CONSTRAINT proposals_kind_check CHECK (kind IN ('asset_version', 'story_version', 'sandbox_change')),
        DROP CONSTRAINT proposals_names_what,
        ADD CONSTRAINT proposals_names_what CHECK (
          (kind = 'asset_version' AND asset_id IS NOT NULL AND version IS NOT NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL)
          OR (kind = 'story_version' AND story_id IS NOT NULL AND story_version IS NOT NULL AND asset_id IS NULL AND version IS NULL AND sandbox_id IS NULL)
          OR (kind = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL));
    `,
  },
  {
    // every reference is a UUID or a hash; a name is only shown (Samuel 2026-11-04). The coop, the sandboxes and the
    // stories were named by readable ids ('maia-city', 'sandbox-1', 'papaya-v2-devlog'): each becomes the UUID
    // play.uuid_of('<kind>:<old id>') (./uuid.ts uuidOf, the same in TypeScript), everywhere it is named, its story
    // documents ('story:<id>') with it. The old name stays as what it is, a title (stories, sandboxes) or a name (the
    // coop). An asset was its UUID already; its slug is now only a name, which two assets may share.
    id: "0017-uuids",
    sql: `
      CREATE FUNCTION play.uuid_of(name text) RETURNS uuid LANGUAGE plpgsql IMMUTABLE STRICT AS $f$
      DECLARE b bytea := substring(sha256(convert_to('play:' || name, 'UTF8')) FROM 1 FOR 16);
      BEGIN
        b := set_byte(b, 6, (get_byte(b, 6) & 15) | 128);
        b := set_byte(b, 8, (get_byte(b, 8) & 63) | 128);
        RETURN encode(b, 'hex')::uuid;
      END $f$;

      -- every foreign key onto what changes its id, dropped, and made again once both ends are UUIDs
      CREATE TABLE play.fks_0017 AS
        SELECT conrelid::regclass::text AS t, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
         WHERE contype = 'f' AND confrelid IN ('play.coops'::regclass, 'play.sandboxes'::regclass, 'play.stories'::regclass, 'play.docs'::regclass);
      DO $$ DECLARE c record; BEGIN
        FOR c IN SELECT * FROM play.fks_0017 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.t, c.conname); END LOOP;
      END $$;
      ALTER TABLE play.stories DROP CONSTRAINT IF EXISTS stories_id_check;

      ALTER TABLE play.coops ALTER COLUMN id TYPE uuid USING play.uuid_of('coop:' || id);
      ALTER TABLE play.memberships ALTER COLUMN coop_id TYPE uuid USING play.uuid_of('coop:' || coop_id);
      ALTER TABLE play.level_rules ALTER COLUMN coop_id TYPE uuid USING play.uuid_of('coop:' || coop_id);
      ALTER TABLE play.invites ALTER COLUMN coop_id TYPE uuid USING play.uuid_of('coop:' || coop_id);
      ALTER TABLE play.assets ALTER COLUMN coop_id TYPE uuid USING play.uuid_of('coop:' || coop_id);
      ALTER TABLE play.stories ALTER COLUMN coop_id TYPE uuid USING play.uuid_of('coop:' || coop_id);
      ALTER TABLE play.proposals ALTER COLUMN coop_id TYPE uuid USING play.uuid_of('coop:' || coop_id);

      ALTER TABLE play.sandboxes ALTER COLUMN id TYPE uuid USING play.uuid_of('sandbox:' || id);
      ALTER TABLE play.sandboxes ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE play.sandbox_pins ALTER COLUMN sandbox_id TYPE uuid USING play.uuid_of('sandbox:' || sandbox_id);
      ALTER TABLE play.sandbox_configs ALTER COLUMN sandbox_id TYPE uuid USING play.uuid_of('sandbox:' || sandbox_id);
      ALTER TABLE play.proposals ALTER COLUMN sandbox_id TYPE uuid USING play.uuid_of('sandbox:' || sandbox_id);

      ALTER TABLE play.stories ALTER COLUMN id TYPE uuid USING play.uuid_of('story:' || id);
      ALTER TABLE play.stories ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE play.stories ALTER COLUMN folded_into TYPE uuid USING play.uuid_of('story:' || folded_into);
      ALTER TABLE play.story_versions ALTER COLUMN story_id TYPE uuid USING play.uuid_of('story:' || story_id);
      ALTER TABLE play.proposals ALTER COLUMN story_id TYPE uuid USING play.uuid_of('story:' || story_id);

      -- the story documents, story:<slug> → story:<uuid>; their kept history is append only, so its guard steps aside
      -- for this one rename and no other change
      ALTER TABLE play.doc_updates DISABLE TRIGGER doc_updates_kept;
      ALTER TABLE play.doc_versions DISABLE TRIGGER doc_versions_kept;
      UPDATE play.docs SET id = 'story:' || play.uuid_of('story:' || substr(id, 7)) WHERE id LIKE 'story:%';
      UPDATE play.doc_branches SET doc_id = 'story:' || play.uuid_of('story:' || substr(doc_id, 7)) WHERE doc_id LIKE 'story:%';
      UPDATE play.doc_peers SET doc_id = 'story:' || play.uuid_of('story:' || substr(doc_id, 7)) WHERE doc_id LIKE 'story:%';
      UPDATE play.doc_updates SET doc_id = 'story:' || play.uuid_of('story:' || substr(doc_id, 7)) WHERE doc_id LIKE 'story:%';
      UPDATE play.doc_versions SET doc_id = 'story:' || play.uuid_of('story:' || substr(doc_id, 7)) WHERE doc_id LIKE 'story:%';
      ALTER TABLE play.doc_updates ENABLE TRIGGER doc_updates_kept;
      ALTER TABLE play.doc_versions ENABLE TRIGGER doc_versions_kept;
      ALTER TABLE play.docs ADD CONSTRAINT docs_id_check CHECK (id ~ '^(story|asset):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

      DO $$ DECLARE c record; BEGIN
        FOR c IN SELECT * FROM play.fks_0017 LOOP EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', c.t, c.conname, c.def); END LOOP;
      END $$;
      DROP TABLE play.fks_0017;

      -- an asset's group and slug are a label: shown, never its identity, and two assets may share them
      ALTER TABLE play.assets DROP CONSTRAINT IF EXISTS assets_grp_slug_key;
    `,
  },
  {
    // the Factories on Loro (Samuel 2026-11-04, ./factories.ts): each production line a document `factory:<uuid>`,
    // changed only by proposal (`factory_version`, its draft a branch of the document), as a story is. A factory is its
    // UUID (the first, the LifeTrac line, uuidOf('factory:lifetrac-line')); its label is only shown.
    id: "0018-factories-on-loro",
    sql: `
      CREATE TABLE play.factories (
        id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coop_id UUID NOT NULL REFERENCES play.coops(id),
        label   TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE play.docs DROP CONSTRAINT docs_id_check,
        ADD CONSTRAINT docs_id_check CHECK (id ~ '^(story|asset|factory):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
      ALTER TABLE play.proposals
        ADD COLUMN factory_id UUID REFERENCES play.factories(id),
        DROP CONSTRAINT proposals_kind_check,
        ADD CONSTRAINT proposals_kind_check CHECK (kind IN ('asset_version', 'story_version', 'sandbox_change', 'factory_version')),
        DROP CONSTRAINT proposals_names_what,
        ADD CONSTRAINT proposals_names_what CHECK (
          (kind = 'asset_version' AND asset_id IS NOT NULL AND version IS NOT NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL)
          OR (kind = 'story_version' AND story_id IS NOT NULL AND story_version IS NOT NULL AND asset_id IS NULL AND version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL)
          OR (kind = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND factory_id IS NULL)
          OR (kind = 'factory_version' AND factory_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL));
    `,
  },
  {
    // the Game editor (Samuel 2026-11-04, ./gameconfigs.ts): each of the game's configs (first the levelling: how a
    // village grows, level by level) a Loro document `game:<uuid>`, changed only by proposal (`game_config_version`, its
    // draft a branch of the document), as a factory is. A config is its UUID; its label is only shown.
    id: "0019-game-configs",
    sql: `
      CREATE TABLE play.game_configs (
        id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coop_id UUID NOT NULL REFERENCES play.coops(id),
        label   TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE play.docs DROP CONSTRAINT docs_id_check,
        ADD CONSTRAINT docs_id_check CHECK (id ~ '^(story|asset|factory|game):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
      ALTER TABLE play.proposals
        ADD COLUMN game_config_id UUID REFERENCES play.game_configs(id),
        DROP CONSTRAINT proposals_kind_check,
        ADD CONSTRAINT proposals_kind_check CHECK (kind IN ('asset_version', 'story_version', 'sandbox_change', 'factory_version', 'game_config_version')),
        DROP CONSTRAINT proposals_names_what,
        ADD CONSTRAINT proposals_names_what CHECK (
          (kind = 'asset_version' AND asset_id IS NOT NULL AND version IS NOT NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL)
          OR (kind = 'story_version' AND story_id IS NOT NULL AND story_version IS NOT NULL AND asset_id IS NULL AND version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL)
          OR (kind = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL)
          OR (kind = 'factory_version' AND factory_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND game_config_id IS NULL)
          OR (kind = 'game_config_version' AND game_config_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND factory_id IS NULL));
    `,
  },
  {
    id: "0020-file-labels",
    sql: `
      -- a file's label in the Library (Samuel 2026-11-04): only shown, never looked up by; a file is named by its hash
      ALTER TABLE play.files ADD COLUMN label TEXT CHECK (label IS NULL OR length(label) BETWEEN 1 AND 200);
    `,
  },
  {
    id: "0021-sandbox-4",
    sql: `
      -- Sandbox 4, the dome cassette joint (Samuel 2026-11-05): one cast cassette of the 100 m dome's lowest rows,
      -- seated, keyed, capped and clamped, a scene of play's site with no data of its own (no pins, no configs). Something
      -- new, so a random UUID (SPEC §4.7), written out in ./ids.ts and play/site's sandboxes.js.
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('4d72a048-ccc1-476b-b60f-c5eb0914fa47', 'Sandbox 4', '/sandbox-4/', 'The dome cassette joint: a cast cassette of the 100 m dome seated, keyed, capped and clamped')
      ON CONFLICT (id) DO NOTHING;
    `,
  },
  {
    id: "0022-sandbox-5",
    sql: `
      -- Sandbox 5, the forest dome in its own food forest (Samuel 2026-11-05): Sandbox 1's world without its domes, the
      -- forest dome of the library alone in its middle at its newest accepted version. A scene of play's site with no
      -- data of its own (no pins, no configs: it reads Sandbox 1's garden). Something new, so a random UUID (SPEC §4.7),
      -- written out in ./ids.ts and play/site's sandboxes.js.
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('ac154784-c938-47ee-ac74-d61fc91583b3', 'Sandbox 5', '/sandbox-5/', 'The forest dome alone in its own food forest: Sandbox 1''s world without its domes')
      ON CONFLICT (id) DO NOTHING;
    `,
  },
  {
    // what waits for a decision is proposed (Samuel 2026-11-05): a proposal is proposed, accepted or archived, the
    // Proposals board's columns Inbox (0024), Proposed, Accepted and Archived
    id: "0023-proposed",
    sql: `
      ALTER TABLE play.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
      UPDATE play.proposals SET status = 'proposed' WHERE status = 'open';
      ALTER TABLE play.proposals ALTER COLUMN status SET DEFAULT 'proposed';
      ALTER TABLE play.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('proposed', 'accepted', 'archived'));
    `,
  },
  {
    // the Inbox (Samuel 2026-11-05, play/SPEC.md §4.12): the stages before a proposal, what Maia City wants made, fixed
    // or improved, each item named by its UUID, added by agents over MCP: in the Inbox as it came, then specified (its
    // definition, and its metric of what is good) before anything is proposed for it; a proposal made for one names it
    id: "0024-inbox",
    sql: `
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
    `,
  },
  {
    // what waits for a decision is a proposal (Samuel 2026-11-06): a proposal is a proposal, accepted or archived, as an
    // intent's stage is (0026)
    id: "0025-proposal",
    sql: `
      ALTER TABLE play.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
      UPDATE play.proposals SET status = 'proposal' WHERE status IN ('proposed', 'open');
      ALTER TABLE play.proposals ALTER COLUMN status SET DEFAULT 'proposal';
      ALTER TABLE play.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('proposal', 'accepted', 'archived'));
    `,
  },
  {
    // everything is an intent (Samuel 2026-11-06, play/SPEC.md §4.12): the Inbox's items are intents, an intent goes
    // Idea → Specify → Prototype → Proposal → Accepted or Archived, its spec (a goal, a scope and checks: test, measure or
    // look, must or nice) approved by an admin before it is built, its checks' results recorded while it is prototyped,
    // and every proposal is an intent's: one made without an intent gets one of its own, by the database itself, and the
    // proposals made before are given theirs here. An intent at the proposal stage follows its proposals: accepted once
    // one is, back to Prototype (a spec'd one) or archived once none is left.
    id: "0026-intents",
    sql: `
      ALTER TABLE play.inbox RENAME TO intents;
      ALTER INDEX play.ix_inbox_status RENAME TO ix_intents_stage;
      -- the spec (a goal, a scope and its checks), in place of the free definition and metric: a definition and metric
      -- written before are kept in the note, and the intent is specified again, its checks this time
      ALTER TABLE play.intents ADD COLUMN spec JSONB;
      UPDATE play.intents SET note = concat_ws(E'\n\n', NULLIF(btrim(note), ''), E'### Definition (before its spec)\n\n' || definition, E'### Metric of what is good (before its spec)\n\n' || metric),
                              specified_by = NULL, specified_at = NULL
        WHERE definition IS NOT NULL;
      ALTER TABLE play.intents DROP COLUMN definition, DROP COLUMN metric;
      ALTER TABLE play.intents
        ADD COLUMN results     JSONB,   -- each check's last result while it is prototyped: { "<check>": { pass, evidence, by, at } }
        ADD COLUMN approved_by TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        ADD COLUMN approved_at TIMESTAMPTZ;
      ALTER TABLE play.intents DROP CONSTRAINT IF EXISTS inbox_status_check;
      ALTER TABLE play.intents RENAME COLUMN status TO stage;
      UPDATE play.intents SET stage = CASE stage WHEN 'inbox' THEN 'idea' WHEN 'done' THEN 'accepted' ELSE stage END;
      UPDATE play.intents SET stage = 'idea' WHERE stage = 'specify';
      ALTER TABLE play.intents ALTER COLUMN stage SET DEFAULT 'idea';
      ALTER TABLE play.intents ADD CONSTRAINT intents_stage_check CHECK (stage IN ('idea', 'specify', 'prototype', 'proposal', 'accepted', 'archived'));
      ALTER TABLE play.intents ADD CONSTRAINT intents_spec_before_build CHECK (stage IN ('idea', 'specify', 'archived', 'accepted', 'proposal') OR approved_at IS NOT NULL);
      ALTER TABLE play.proposals RENAME COLUMN inbox_id TO intent_id;
      ALTER INDEX play.ix_proposals_inbox RENAME TO ix_proposals_intent;
      -- an intent with a proposal still waiting is at the proposal stage, and follows it as it is decided
      UPDATE play.intents i SET stage = 'proposal'
        WHERE stage = 'idea' AND EXISTS (SELECT 1 FROM play.proposals p WHERE p.intent_id = i.id AND p.status = 'proposal');

      -- the intent a proposal made without one is: its title what it proposes (an asset's or story's label and the version
      -- it would be, a sandbox's change), its note the proposal's, its stage the proposal's status
      CREATE FUNCTION play.intent_for(p play.proposals) RETURNS uuid LANGUAGE plpgsql AS $f$
      DECLARE i uuid := gen_random_uuid(); t text; k text := 'improve';
      BEGIN
        IF p.kind = 'asset_version' THEN
          SELECT a.label || ' v' || COALESCE(v.number, COALESCE(b.number, 0) + 1), CASE WHEN p.base IS NULL THEN 'idea' ELSE 'improve' END INTO t, k
            FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = p.version LEFT JOIN play.asset_versions b ON b.id = p.base WHERE a.id = p.asset_id;
        ELSIF p.kind = 'story_version' THEN
          SELECT sv.title || ' v' || COALESCE(sv.number, COALESCE(sb.number, 0) + 1), CASE WHEN p.story_base IS NULL THEN 'idea' ELSE 'improve' END INTO t, k
            FROM play.story_versions sv LEFT JOIN play.story_versions sb ON sb.id = p.story_base WHERE sv.id = p.story_version;
        ELSIF p.kind = 'sandbox_change' THEN
          SELECT sx.title || ': ' || jsonb_array_length(COALESCE(p.sandbox_diff, '[]'::jsonb)) || ' changes' INTO t FROM play.sandboxes sx WHERE sx.id = p.sandbox_id;
        ELSIF p.kind = 'factory_version' THEN
          SELECT fx.label INTO t FROM play.factories fx WHERE fx.id = p.factory_id;
        ELSIF p.kind = 'game_config_version' THEN
          SELECT gc.label INTO t FROM play.game_configs gc WHERE gc.id = p.game_config_id;
        END IF;
        INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, created, decided_by, decided_at)
        VALUES (i, p.coop_id, COALESCE(k, 'improve'), left(COALESCE(NULLIF(btrim(t), ''), 'A proposal'), 200), COALESCE(p.note, ''),
                CASE p.status WHEN 'accepted' THEN 'accepted' WHEN 'archived' THEN 'archived' ELSE 'proposal' END,
                p.author, CASE WHEN p.via IN ('web', 'mcp') THEN p.via ELSE 'web' END, COALESCE(p.created, now()), p.decided_by, p.decided_at);
        RETURN i;
      END $f$;
      UPDATE play.proposals p SET intent_id = play.intent_for(p) WHERE p.intent_id IS NULL;
      ALTER TABLE play.proposals ALTER COLUMN intent_id SET NOT NULL;

      -- every proposal is an intent's: one inserted without one gets its own; one made for an intent in Prototype brings
      -- it to the proposal stage
      CREATE FUNCTION play.proposal_intent() RETURNS trigger LANGUAGE plpgsql AS $f$
      BEGIN
        IF NEW.intent_id IS NULL THEN NEW.intent_id := play.intent_for(NEW);
        ELSE UPDATE play.intents SET stage = 'proposal' WHERE id = NEW.intent_id AND stage = 'prototype';
        END IF;
        RETURN NEW;
      END $f$;
      CREATE TRIGGER proposals_intent BEFORE INSERT ON play.proposals FOR EACH ROW EXECUTE FUNCTION play.proposal_intent();

      -- an intent at the proposal stage follows its proposals as they are decided
      CREATE FUNCTION play.intent_follows() RETURNS trigger LANGUAGE plpgsql AS $f$
      DECLARE open int; acc int; st text; approved timestamptz;
      BEGIN
        IF NEW.status = OLD.status THEN RETURN NEW; END IF;
        SELECT stage, approved_at INTO st, approved FROM play.intents WHERE id = NEW.intent_id;
        IF st IS DISTINCT FROM 'proposal' THEN RETURN NEW; END IF;
        SELECT count(*) FILTER (WHERE status = 'proposal'), count(*) FILTER (WHERE status = 'accepted') INTO open, acc
          FROM play.proposals WHERE intent_id = NEW.intent_id;
        IF open > 0 THEN RETURN NEW; END IF;
        IF acc > 0 THEN
          UPDATE play.intents SET stage = 'accepted', decided_by = NEW.decided_by, decided_at = now() WHERE id = NEW.intent_id;
        ELSIF approved IS NOT NULL THEN
          UPDATE play.intents SET stage = 'prototype', results = NULL WHERE id = NEW.intent_id;
        ELSE
          UPDATE play.intents SET stage = 'archived', decided_by = NEW.decided_by, decided_at = now() WHERE id = NEW.intent_id;
        END IF;
        RETURN NEW;
      END $f$;
      CREATE TRIGGER proposals_move_intent AFTER UPDATE OF status ON play.proposals FOR EACH ROW EXECUTE FUNCTION play.intent_follows();
    `,
  },
  {
    // Artifacts (play/SPEC.md §4.13, Samuel 2026-11-06): every link from the net Maia City keeps, kept once by avenMAIA,
    // the one identity of every agent connected over MCP (./artifacts.ts). avenMAIA is a row of its own, named by
    // play.uuid_of('agent:avenmaia') (AVENMAIA in ./ids.ts): no human, no member, acting only through an admin's token.
    // An artifact keeps its compact title, its two-sentence description and its summary (a small report on its topic), who
    // brought it (the operator, the admin whose token was used, and its origin: the operator pasted it, or avenMAIA found
    // it in its own research) and its authors, each a row of its own, n:m with the artifacts, in their order. One link,
    // one artifact: its link is kept normalised, unique in the coop; an artifact and an author are named by their UUIDs.
    id: "0027-artifacts",
    sql: `
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
    `,
  },
  {
    // an intent moves to Proposal by itself once every must check has passed (Samuel 2026-11-06, ./intents.ts
    // recordChecks): the one gate after the spec is the decision at Proposal, none in Prototype. An intent already in
    // Prototype with every must check passed moves there now (a check with no must is one).
    id: "0028-intents-ready-propose",
    sql: `
      UPDATE play.intents i SET stage = 'proposal'
       WHERE i.stage = 'prototype' AND i.spec IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(i.spec->'checks', '[]'::jsonb)) c
            WHERE COALESCE((c->>'must')::boolean, true)
              AND (i.results->(c->>'id')->>'pass') IS DISTINCT FROM 'true');
    `,
  },
  {
    // proposal and intent are the same (Samuel 2026-11-06: "not a proposal belongs to an intent: the intent has a state,
    // proposal"): one record, the intent. The work a proposal held (what it changes, its refs, base and version, its
    // note, who proposed it, how, and when) moves onto the intent it was, and Proposal is only that intent's stage: its
    // work done and checked, waiting for the decision. Nothing is lost:
    //   - an intent and its one proposal (0026 or its trigger made the intent) become one intent;
    //   - an intent with several keeps the newest live one whose status is its stage (waiting, else accepted, else the
    //     newest), and each other proposal becomes an intent of its own at its own stage, named by the proposal's own
    //     UUID, `came_with` the intent it was proposed for;
    //   - every proposal's id is kept in play.proposal_ids beside the intent it is now, so an old link (/proposals/#…,
    //     /api/proposals/<id>) still finds it; the doc branches name their intent (doc_branches.intent_id), and a
    //     proposal id written in an intent's or a branch's text is written as its intent's.
    // Then play.proposals goes, with its triggers: the intent is moved by what decides it (./work.ts), not by another row.
    id: "0029-one-record",
    sql: `
      DROP TRIGGER IF EXISTS proposals_intent ON play.proposals;
      DROP TRIGGER IF EXISTS proposals_move_intent ON play.proposals;

      ALTER TABLE play.intents
        ADD COLUMN work           TEXT CHECK (work IN ('asset_version', 'story_version', 'sandbox_change', 'factory_version', 'game_config_version')),
        ADD COLUMN asset_id       UUID REFERENCES play.assets(id),
        ADD COLUMN base           TEXT REFERENCES play.asset_versions(id),   -- the asset's head it was made on
        ADD COLUMN version        TEXT REFERENCES play.asset_versions(id),
        ADD COLUMN story_id       UUID REFERENCES play.stories(id),
        ADD COLUMN story_base     TEXT REFERENCES play.story_versions(id),   -- the story's head it was made on
        ADD COLUMN story_version  TEXT REFERENCES play.story_versions(id),
        ADD COLUMN sandbox_id     UUID REFERENCES play.sandboxes(id),
        ADD COLUMN sandbox_base   TEXT,    -- the BLAKE3 of the sandbox's pins and configs it was made on
        ADD COLUMN sandbox_change JSONB,   -- its edits, in order
        ADD COLUMN sandbox_diff   JSONB,   -- what they change, before and after (as accepted, once accepted)
        ADD COLUMN factory_id     UUID REFERENCES play.factories(id),
        ADD COLUMN game_config_id UUID REFERENCES play.game_configs(id),
        ADD COLUMN doc_branch     BIGINT REFERENCES play.doc_branches(id),   -- its branch of the document it changes
        ADD COLUMN work_note      TEXT,    -- what the work says of itself (its version's message)
        ADD COLUMN proposed_by    TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        ADD COLUMN proposed_via   TEXT CHECK (proposed_via IN ('web', 'mcp')),
        ADD COLUMN proposed_at    TIMESTAMPTZ,
        ADD COLUMN came_with      UUID REFERENCES play.intents(id);         -- the intent it was proposed for, where it was one of several
      ALTER TABLE play.doc_branches ADD COLUMN intent_id UUID REFERENCES play.intents(id);

      -- an old proposal's id, and the intent it is now: 'its' (the intent's own work) or 'own' (an intent of its own)
      CREATE TABLE play.proposal_ids (
        proposal_id TEXT PRIMARY KEY,
        intent_id   UUID NOT NULL REFERENCES play.intents(id),
        how         TEXT NOT NULL CHECK (how IN ('its', 'own'))
      );
      CREATE INDEX ix_proposal_ids_intent ON play.proposal_ids(intent_id);

      -- each intent keeps the proposal whose status is its stage: waiting, else accepted, else the newest
      WITH ranked AS (
        SELECT p.id, p.intent_id,
               row_number() OVER (PARTITION BY p.intent_id ORDER BY (p.status = 'proposal') DESC, (p.status = 'accepted') DESC, p.created DESC, p.id) AS r
          FROM play.proposals p JOIN play.intents i ON i.id = p.intent_id
         WHERE p.status = i.stage
      )
      INSERT INTO play.proposal_ids (proposal_id, intent_id, how) SELECT id, intent_id, 'its' FROM ranked WHERE r = 1;
      UPDATE play.intents i
         SET work = p.kind, asset_id = p.asset_id, base = p.base, version = p.version,
             story_id = p.story_id, story_base = p.story_base, story_version = p.story_version,
             sandbox_id = p.sandbox_id, sandbox_base = p.sandbox_base, sandbox_change = p.sandbox_change, sandbox_diff = p.sandbox_diff,
             factory_id = p.factory_id, game_config_id = p.game_config_id, doc_branch = p.doc_branch,
             work_note = p.note, proposed_by = p.author, proposed_via = p.via, proposed_at = p.created,
             decided_by = COALESCE(i.decided_by, p.decided_by), decided_at = COALESCE(i.decided_at, p.decided_at)
        FROM play.proposals p JOIN play.proposal_ids m ON m.proposal_id = p.id
       WHERE m.intent_id = i.id;

      -- every other proposal an intent of its own, at its own stage, named by the proposal's UUID
      DO $$ DECLARE p play.proposals; made uuid; target uuid;
      BEGIN
        FOR p IN SELECT * FROM play.proposals x WHERE NOT EXISTS (SELECT 1 FROM play.proposal_ids m WHERE m.proposal_id = x.id) ORDER BY x.created, x.id LOOP
          target := CASE WHEN p.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN lower(p.id)::uuid ELSE play.uuid_of('proposal:' || p.id) END;
          IF EXISTS (SELECT 1 FROM play.intents WHERE id = target) THEN target := gen_random_uuid(); END IF;
          made := play.intent_for(p);
          UPDATE play.intents
             SET id = target, came_with = p.intent_id,
                 work = p.kind, asset_id = p.asset_id, base = p.base, version = p.version,
                 story_id = p.story_id, story_base = p.story_base, story_version = p.story_version,
                 sandbox_id = p.sandbox_id, sandbox_base = p.sandbox_base, sandbox_change = p.sandbox_change, sandbox_diff = p.sandbox_diff,
                 factory_id = p.factory_id, game_config_id = p.game_config_id, doc_branch = p.doc_branch,
                 work_note = p.note, proposed_by = p.author, proposed_via = p.via, proposed_at = p.created
           WHERE id = made;
          INSERT INTO play.proposal_ids (proposal_id, intent_id, how) VALUES (p.id, target, 'own');
        END LOOP;
      END $$;

      -- the doc branches name the intent they were proposed for
      UPDATE play.doc_branches b SET intent_id = m.intent_id
        FROM play.proposals p JOIN play.proposal_ids m ON m.proposal_id = p.id
       WHERE b.id = p.doc_branch;

      -- a proposal's id written in an intent's or a branch's text, written as its intent's
      DO $$ DECLARE m play.proposal_ids;
      BEGIN
        FOR m IN SELECT * FROM play.proposal_ids WHERE proposal_id <> intent_id::text LOOP
          UPDATE play.intents SET note = replace(note, m.proposal_id, m.intent_id::text) WHERE strpos(note, m.proposal_id) > 0;
          UPDATE play.intents SET work_note = replace(work_note, m.proposal_id, m.intent_id::text) WHERE strpos(work_note, m.proposal_id) > 0;
          UPDATE play.intents SET spec = (replace(spec::text, m.proposal_id, m.intent_id::text))::jsonb WHERE strpos(spec::text, m.proposal_id) > 0;
          UPDATE play.intents SET results = (replace(results::text, m.proposal_id, m.intent_id::text))::jsonb WHERE strpos(results::text, m.proposal_id) > 0;
          UPDATE play.doc_branches SET note = replace(note, m.proposal_id, m.intent_id::text) WHERE strpos(note, m.proposal_id) > 0;
        END LOOP;
      END $$;

      -- what an intent's work names, for the kind of work it is (as the proposals' check said it)
      ALTER TABLE play.intents ADD CONSTRAINT intents_work_names_what CHECK (
        (work IS NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL AND doc_branch IS NULL)
        OR (work = 'asset_version' AND asset_id IS NOT NULL AND version IS NOT NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL)
        OR (work = 'story_version' AND story_id IS NOT NULL AND story_version IS NOT NULL AND asset_id IS NULL AND version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL)
        OR (work = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL)
        OR (work = 'factory_version' AND factory_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND game_config_id IS NULL)
        OR (work = 'game_config_version' AND game_config_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND factory_id IS NULL));
      CREATE INDEX ix_intents_work ON play.intents(work, stage) WHERE work IS NOT NULL;
      CREATE INDEX ix_intents_asset ON play.intents(asset_id) WHERE asset_id IS NOT NULL;
      CREATE INDEX ix_intents_story ON play.intents(story_id) WHERE story_id IS NOT NULL;
      CREATE INDEX ix_intents_version ON play.intents(version) WHERE version IS NOT NULL;
      CREATE INDEX ix_intents_story_version ON play.intents(story_version) WHERE story_version IS NOT NULL;
      CREATE INDEX ix_intents_doc_branch ON play.intents(doc_branch) WHERE doc_branch IS NOT NULL;

      -- every proposal is in an intent now: the table and what moved intents after it go
      DROP FUNCTION play.intent_for(play.proposals);
      DROP TABLE play.proposals;
      DROP FUNCTION play.proposal_intent();
      DROP FUNCTION play.intent_follows();
    `,
  },
  {
    // Accept ships it (play/SPEC.md §4.12, Samuel 2026-11-06): an intent whose work is code names its pull request
    // (check_intent's `pr`), and an admin's Accept at Proposal merges it into main at once (./ship.ts): the intent is in
    // Ship, between Proposal and Accepted, while play's ship watcher follows the merge to production (main's checks,
    // the release, the deploy's jobs), each step kept on the intent (`ship`); all green, Accepted; any red, back to
    // Proposal with its report. Work of play's own never ships: it is accepted straight to Accepted.
    id: "0030-ship",
    sql: `
      ALTER TABLE play.intents DROP CONSTRAINT intents_stage_check;
      ALTER TABLE play.intents ADD CONSTRAINT intents_stage_check
        CHECK (stage IN ('idea', 'specify', 'prototype', 'proposal', 'ship', 'accepted', 'archived'));
      ALTER TABLE play.intents
        ADD COLUMN pull_request INTEGER CHECK (pull_request > 0),   -- its pull request into main, by its number
        ADD COLUMN ship         JSONB;                              -- its way to production: the merge, each step, a red one's report
      ALTER TABLE play.intents ADD CONSTRAINT intents_ship_is_code CHECK (stage <> 'ship' OR work IS NULL);
      CREATE INDEX ix_intents_shipping ON play.intents(id) WHERE stage = 'ship';
    `,
  },
  {
    // Skills (play/SPEC.md §4.14, Samuel 2026-11-06): what play teaches its agents (the system prompt every MCP agent
    // gets, what to do at each of an intent's stages), kept once, each a Loro document `skill:<uuid>` (./skills.ts),
    // changed only by proposal (`skill_version`, its branch the draft), as a game config is.
    id: "0031-skills",
    sql: `
      CREATE TABLE play.skills (
        id      UUID PRIMARY KEY,
        coop_id UUID NOT NULL REFERENCES play.coops(id),
        label   TEXT NOT NULL,                       -- only shown
        grp     TEXT NOT NULL,                       -- only shown: skills / <grp>
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE play.docs DROP CONSTRAINT docs_id_check,
        ADD CONSTRAINT docs_id_check CHECK (id ~ '^(story|asset|factory|game|skill):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
      ALTER TABLE play.intents ADD COLUMN skill_id UUID REFERENCES play.skills(id);
      ALTER TABLE play.intents DROP CONSTRAINT intents_work_check;
      ALTER TABLE play.intents ADD CONSTRAINT intents_work_check
        CHECK (work IN ('asset_version', 'story_version', 'sandbox_change', 'factory_version', 'game_config_version', 'skill_version'));
      ALTER TABLE play.intents DROP CONSTRAINT intents_work_names_what;
      ALTER TABLE play.intents ADD CONSTRAINT intents_work_names_what CHECK (
        (work IS NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL AND skill_id IS NULL AND doc_branch IS NULL)
        OR (work = 'asset_version' AND asset_id IS NOT NULL AND version IS NOT NULL AND story_id IS NULL AND story_version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL AND skill_id IS NULL)
        OR (work = 'story_version' AND story_id IS NOT NULL AND story_version IS NOT NULL AND asset_id IS NULL AND version IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL AND skill_id IS NULL)
        OR (work = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL AND skill_id IS NULL)
        OR (work = 'factory_version' AND factory_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND game_config_id IS NULL AND skill_id IS NULL)
        OR (work = 'game_config_version' AND game_config_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND skill_id IS NULL)
        OR (work = 'skill_version' AND skill_id IS NOT NULL AND doc_branch IS NOT NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND sandbox_id IS NULL AND factory_id IS NULL AND game_config_id IS NULL));
      CREATE INDEX ix_intents_skill ON play.intents(skill_id) WHERE skill_id IS NOT NULL;
    `,
  },
  {
    // One version control (play/SPEC.md "Version control", Samuel 2026-11-06): every versioned kind is one entry of
    // ../src/versioned.ts, and the store says its words. A document's Main is a variant of its own (type 'main'), every
    // other an intent variant (type 'intent'), each grown from its seed (the frontiers it was made at); an edit is a
    // row of doc_edits on its variant. An intent's work names its document and variant (doc_id, doc_variant) in place
    // of a column per kind; an asset's frozen version and base and a story's stay, and a sandbox's change until its
    // own intent. What a document's id and an intent's work may be is one rule each, so a kind registered in
    // versioned.ts needs no migration. The old proposals' ids go: an intent is named by its own id.
    id: "0032-versioned",
    sql: `
      ALTER TABLE play.doc_branches RENAME TO doc_variants;
      ALTER TABLE play.doc_variants RENAME COLUMN base TO seed;
      ALTER TABLE play.doc_variants ADD COLUMN type TEXT NOT NULL DEFAULT 'intent' CHECK (type IN ('main', 'intent'));
      ALTER INDEX play.doc_branches_doc RENAME TO doc_variants_doc;
      ALTER TABLE play.doc_updates RENAME TO doc_edits;
      ALTER TABLE play.doc_edits RENAME COLUMN branch TO variant;
      ALTER INDEX play.doc_updates_line RENAME TO doc_edits_line;
      ALTER TABLE play.doc_peers RENAME COLUMN branch TO variant;
      ALTER TABLE play.doc_versions RENAME COLUMN branch TO variant;
      ALTER TRIGGER doc_updates_kept ON play.doc_edits RENAME TO doc_edits_kept;

      -- each document's Main, a variant of its own: its edits and peers on it
      INSERT INTO play.doc_variants (doc_id, type, seed, head, status, note, created_by, created)
        SELECT id, 'main', '[]', head, 'open', 'Main', created_by, created FROM play.docs ORDER BY created, id;
      CREATE UNIQUE INDEX doc_variants_one_main ON play.doc_variants (doc_id) WHERE type = 'main';
      ALTER TABLE play.doc_edits DISABLE TRIGGER doc_edits_kept;
      UPDATE play.doc_edits e SET variant = v.id FROM play.doc_variants v WHERE v.doc_id = e.doc_id AND v.type = 'main' AND e.variant IS NULL;
      ALTER TABLE play.doc_edits ENABLE TRIGGER doc_edits_kept;
      ALTER TABLE play.doc_edits ALTER COLUMN variant SET NOT NULL;
      UPDATE play.doc_peers p SET variant = v.id FROM play.doc_variants v WHERE v.doc_id = p.doc_id AND v.type = 'main' AND p.variant IS NULL;
      DROP INDEX play.doc_peers_one;
      ALTER TABLE play.doc_peers ALTER COLUMN variant SET NOT NULL;
      CREATE UNIQUE INDEX doc_peers_one ON play.doc_peers (doc_id, variant, COALESCE(author, ''), via);

      -- a document's id is its kind's prefix and its UUID, whatever kind versioned.ts names
      ALTER TABLE play.docs DROP CONSTRAINT docs_id_check,
        ADD CONSTRAINT docs_id_check CHECK (id ~ '^[a-z][a-z_]{0,31}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

      -- an intent's work names its document and its variant
      ALTER TABLE play.intents DROP CONSTRAINT intents_work_names_what;
      ALTER TABLE play.intents RENAME COLUMN doc_branch TO doc_variant;
      ALTER INDEX play.ix_intents_doc_branch RENAME TO ix_intents_doc_variant;
      ALTER TABLE play.intents ADD COLUMN doc_id TEXT;
      UPDATE play.intents SET doc_id = CASE work
          WHEN 'asset_version' THEN 'asset:' || asset_id::text
          WHEN 'story_version' THEN 'story:' || story_id::text
          WHEN 'factory_version' THEN 'factory:' || factory_id::text
          WHEN 'game_config_version' THEN 'game:' || game_config_id::text
          WHEN 'skill_version' THEN 'skill:' || skill_id::text END
        WHERE work IS NOT NULL AND work <> 'sandbox_change';
      ALTER TABLE play.intents DROP COLUMN factory_id, DROP COLUMN game_config_id, DROP COLUMN skill_id;
      ALTER TABLE play.intents DROP CONSTRAINT intents_work_check;
      ALTER TABLE play.intents ADD CONSTRAINT intents_work_check CHECK (work = 'sandbox_change' OR work ~ '^[a-z][a-z_]{0,31}_version$');
      ALTER TABLE play.intents ADD CONSTRAINT intents_work_names_what CHECK (
        (work IS NULL AND doc_id IS NULL AND doc_variant IS NULL AND sandbox_id IS NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND story_version IS NULL)
        OR (work = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND doc_id IS NULL AND doc_variant IS NULL AND asset_id IS NULL AND story_id IS NULL)
        OR (work <> 'sandbox_change' AND doc_id IS NOT NULL AND doc_id ~ '^[a-z][a-z_]{0,31}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND sandbox_id IS NULL));
      CREATE INDEX ix_intents_doc ON play.intents (doc_id) WHERE doc_id IS NOT NULL;

      -- the old proposals' ids: an intent is named by its own
      DROP TABLE play.proposal_ids;
    `,
  },
  {
    // The intents' third stage is Build (intent 60f4f75c-666a-4eca-9bb2-4a29311afa6c, Samuel 2026-11-06): what is
    // made there is the real change, built and checked in avenBOX. Every intent at 'prototype' moves to 'build' as it
    // is (its spec, approval, results, pull request and work), and the stage 'prototype' is no more; no alias is kept.
    // The Intents skill's text for the stage moves by its own proposal (play/SPEC.md §4.14), never here.
    id: "0033-build",
    sql: `
      ALTER TABLE play.intents DROP CONSTRAINT intents_stage_check;
      UPDATE play.intents SET stage = 'build' WHERE stage = 'prototype';
      ALTER TABLE play.intents ADD CONSTRAINT intents_stage_check
        CHECK (stage IN ('idea', 'specify', 'build', 'proposal', 'ship', 'accepted', 'archived'));
    `,
  },
  {
    // Schemas as documents (play/SPEC.md "Version control", Samuel 2026-11-06): every schema a document schema:<uuid>
    // of the meta-schema, made by ensureSchemas (src/docs/schemas.ts) at the end of migrate(); here only what it needs.
    id: "0034-schemas",
    sql: `
      -- every document names the schema it was written against, by its UUID, and that schema's version
      ALTER TABLE play.docs ADD COLUMN schema_id UUID, ADD COLUMN schema_version INT;
      COMMENT ON COLUMN play.docs.schema IS 'the schema''s old name (story/1 …): only shown; a document names its schema by schema_id';
      CREATE INDEX ix_docs_schema ON play.docs (schema_id);
      -- the rows of the kinds no table of their own holds: the schemas, and every kind that is a schema alone
      CREATE TABLE play.records (
        id      UUID PRIMARY KEY,
        coop_id UUID NOT NULL REFERENCES play.coops(id),
        kind    TEXT NOT NULL CHECK (kind ~ '^[a-z][a-z_]{0,31}$'),
        label   TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX ix_records_kind ON play.records (kind);
    `,
  },
  {
    // Every change an intent variant (play/SPEC.md "Version control"; intent 847c5d38, Samuel 2026-11-06): an intent may
    // change several documents at once, each by an intent variant of its own, accepted together in one transaction or
    // archived together. play.intent_variants holds them, in place of the intent's one doc_id and doc_variant.
    // Artifacts become documents like any other (artifact:<uuid>, each kept one its v1, made from its row the first
    // time it is read): their row is what Main's newest version says, written only by an Accept, so a row whose
    // artifact is not yet accepted holds nothing but its id; its authors are a list on it, in their order.
    id: "0035-intent-variants",
    sql: `
      CREATE TABLE play.intent_variants (
        intent_id  UUID NOT NULL REFERENCES play.intents(id) ON DELETE CASCADE,
        doc_id     TEXT NOT NULL REFERENCES play.docs(id),
        variant_id BIGINT NOT NULL UNIQUE REFERENCES play.doc_variants(id),
        seed       JSONB NOT NULL DEFAULT '[]',          -- the frontiers of Main it grew from
        position   INT NOT NULL DEFAULT 0,               -- its order in the intent: the first is its work's own
        PRIMARY KEY (intent_id, doc_id)
      );
      INSERT INTO play.intent_variants (intent_id, doc_id, variant_id, seed, position)
        SELECT i.id, i.doc_id, i.doc_variant, v.seed, 0 FROM play.intents i JOIN play.doc_variants v ON v.id = i.doc_variant
         WHERE i.doc_id IS NOT NULL AND i.doc_variant IS NOT NULL;
      UPDATE play.doc_variants v SET intent_id = iv.intent_id FROM play.intent_variants iv WHERE iv.variant_id = v.id AND v.intent_id IS NULL;

      ALTER TABLE play.intents DROP CONSTRAINT intents_work_names_what;
      DROP INDEX IF EXISTS play.ix_intents_doc;
      DROP INDEX IF EXISTS play.ix_intents_doc_variant;
      ALTER TABLE play.intents DROP COLUMN doc_id, DROP COLUMN doc_variant;
      ALTER TABLE play.intents ADD CONSTRAINT intents_work_names_what CHECK (
        (work IS NULL AND sandbox_id IS NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND story_version IS NULL)
        OR (work = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND story_id IS NULL)
        OR (work <> 'sandbox_change' AND sandbox_id IS NULL));

      -- artifacts as documents: the row only what is accepted
      ALTER TABLE play.artifacts ALTER COLUMN url DROP NOT NULL, ALTER COLUMN title DROP NOT NULL, ALTER COLUMN description DROP NOT NULL,
        ALTER COLUMN summary DROP NOT NULL, ALTER COLUMN kind DROP NOT NULL, ALTER COLUMN agent_id DROP NOT NULL, ALTER COLUMN origin DROP NOT NULL;
      ALTER TABLE play.artifacts ADD COLUMN author_ids UUID[] NOT NULL DEFAULT '{}';
      UPDATE play.artifacts s SET author_ids = COALESCE((SELECT array_agg(sa.author_id ORDER BY sa.position) FROM play.artifact_authors sa WHERE sa.artifact_id = s.id), '{}');
      DROP TABLE play.artifact_authors;
      CREATE VIEW play.artifact_authors AS
        SELECT s.id AS artifact_id, a.author_id, (a.n - 1)::int AS position
          FROM play.artifacts s, unnest(s.author_ids) WITH ORDINALITY AS a(author_id, n);
    `,
  },
];
