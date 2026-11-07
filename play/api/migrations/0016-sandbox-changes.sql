
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
    