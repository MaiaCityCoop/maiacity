
      -- every proposed version brings its readable source (Samuel 2026-11-02): the library its recipe file wraps, kept
      -- as a file of its own, which people read before they decide. Imported versions have none (their files came
      -- bundled and minified from legacy).
      ALTER TABLE play.asset_versions ADD COLUMN source_hash TEXT REFERENCES play.files(hash);
      ALTER TABLE play.asset_variants ADD COLUMN source_hash TEXT REFERENCES play.files(hash);
    