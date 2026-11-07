
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
    