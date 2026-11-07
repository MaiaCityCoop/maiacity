
      -- an asset's sound (an animal's call): a recording among play's files, by its hash, and the gain that brings it to
      -- the others' level. The asset's, not a version's: versions are frozen, and the sound is not part of the recipe.
      ALTER TABLE play.assets ADD COLUMN sound TEXT REFERENCES play.files(hash),
                              ADD COLUMN sound_gain REAL NOT NULL DEFAULT 1 CHECK (sound_gain > 0 AND sound_gain <= 50);
    