
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
    