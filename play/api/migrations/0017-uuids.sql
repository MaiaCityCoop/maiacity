
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
    