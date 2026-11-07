
      -- a file's label in the Library (Samuel 2026-11-04): only shown, never looked up by; a file is named by its hash
      ALTER TABLE play.files ADD COLUMN label TEXT CHECK (label IS NULL OR length(label) BETWEEN 1 AND 200);
    