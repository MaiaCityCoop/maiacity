// play's database, in its own schema `play` (play/SPEC.md §3, §4). Each migration runs once, in order, in one
// transaction; a migration is never edited after it has shipped, only followed by another.
import type { Db } from "./pg";

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
    // A story changes only by proposal (over MCP), decided by an admin on the Proposals page.
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
    // Sandbox 1's papayas on their newest version (Samuel 2026-11-04): every pin of plants/papaya there moved to its
    // newest accepted version (v4), its variant left unset so it draws v4's default (Both, the v2 plant with pollen)
    id: "0016-sandbox-1-papaya-latest",
    sql: `
      UPDATE play.sandbox_pins p SET version_id = n.id, variant = NULL
        FROM play.asset_versions v, play.assets a,
             (SELECT DISTINCT ON (asset_id) asset_id, id FROM play.asset_versions WHERE number IS NOT NULL ORDER BY asset_id, number DESC) n
       WHERE p.sandbox_id = 'sandbox-1' AND v.id = p.version_id AND a.id = v.asset_id AND a.grp = 'plants' AND a.slug = 'papaya'
         AND n.asset_id = a.id AND p.version_id <> n.id;
    `,
  },
];

/** Runs every migration not yet run, each in its own transaction. */
export async function migrate(db: Db): Promise<string[]> {
  // In production the role play owns the schema but may not create one in the database (play/deploy/setup.sql makes
  // it), and CREATE SCHEMA IF NOT EXISTS checks that right even when the schema is there: so only create it if missing.
  await db.exec(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'play') THEN CREATE SCHEMA play; END IF;
    END $$;
    CREATE TABLE IF NOT EXISTS play.migrations (id TEXT PRIMARY KEY, ran TIMESTAMPTZ NOT NULL DEFAULT now());`);
  const { rows } = await db.query<{ id: string }>("SELECT id FROM play.migrations");
  const done = new Set(rows.map((r) => r.id));
  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.transaction(async (tx) => {
      await tx.query(m.sql);
      await tx.query("INSERT INTO play.migrations (id) VALUES ($1)", [m.id]);
    });
    ran.push(m.id);
  }
  return ran;
}
