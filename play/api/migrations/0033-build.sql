
      ALTER TABLE play.intents DROP CONSTRAINT intents_stage_check;
      UPDATE play.intents SET stage = 'build' WHERE stage = 'prototype';
      ALTER TABLE play.intents ADD CONSTRAINT intents_stage_check
        CHECK (stage IN ('idea', 'specify', 'build', 'proposal', 'ship', 'accepted', 'archived'));
    