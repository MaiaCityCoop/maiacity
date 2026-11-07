
      -- the legacy import runs once (Samuel 2026-11-03): play's Postgres is the source of truth for its assets, members
      -- and sandboxes, and a later run of the import (every deploy runs it) writes none of it again. Kept here: that it
      -- ran. Where play already holds what it imported, it did.
      CREATE TABLE play.imports (
        name   TEXT PRIMARY KEY,
        ran    TIMESTAMPTZ NOT NULL DEFAULT now(),
        report JSONB
      );
      INSERT INTO play.imports (name, ran)
        SELECT 'legacy', min(created) FROM play.asset_versions WHERE imported IS NOT NULL HAVING count(*) > 0;
      -- and every asset's head on its newest accepted version again, where a run of the import had set it back (it
      -- set each imported asset's head to its last imported version: papaya's back from v2 to v1)
      UPDATE play.assets a SET head = n.id
        FROM (SELECT DISTINCT ON (asset_id) asset_id, id FROM play.asset_versions WHERE number IS NOT NULL ORDER BY asset_id, number DESC) n
       WHERE n.asset_id = a.id AND a.head IS DISTINCT FROM n.id;
    