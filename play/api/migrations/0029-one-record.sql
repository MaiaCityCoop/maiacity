
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
    