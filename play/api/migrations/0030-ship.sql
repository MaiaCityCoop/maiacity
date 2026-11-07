
      ALTER TABLE play.intents DROP CONSTRAINT intents_stage_check;
      ALTER TABLE play.intents ADD CONSTRAINT intents_stage_check
        CHECK (stage IN ('idea', 'specify', 'prototype', 'proposal', 'ship', 'accepted', 'archived'));
      ALTER TABLE play.intents
        ADD COLUMN pull_request INTEGER CHECK (pull_request > 0),   -- its pull request into main, by its number
        ADD COLUMN ship         JSONB;                              -- its way to production: the merge, each step, a red one's report
      ALTER TABLE play.intents ADD CONSTRAINT intents_ship_is_code CHECK (stage <> 'ship' OR work IS NULL);
      CREATE INDEX ix_intents_shipping ON play.intents(id) WHERE stage = 'ship';
    