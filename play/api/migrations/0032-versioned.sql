
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
    