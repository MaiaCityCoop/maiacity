
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
    