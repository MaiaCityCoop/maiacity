
      DO $$ DECLARE c record; BEGIN
        FOR c IN SELECT conrelid::regclass AS t, conname FROM pg_constraint
                  WHERE conrelid IN ('play.proposals'::regclass, 'play.doc_branches'::regclass) AND contype = 'c'
                    AND pg_get_constraintdef(oid) LIKE '%rejected%'
        LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.t, c.conname); END LOOP;
      END $$;
      UPDATE play.proposals SET status = 'archived', decided_by = COALESCE(decided_by, CASE WHEN status = 'withdrawn' THEN author END)
        WHERE status IN ('rejected', 'withdrawn', 'stale');
      UPDATE play.doc_branches SET status = 'archived' WHERE status IN ('rejected', 'withdrawn', 'stale');
      ALTER TABLE play.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('open', 'accepted', 'archived'));
      ALTER TABLE play.doc_branches ADD CONSTRAINT doc_branches_status_check CHECK (status IN ('open', 'proposed', 'accepted', 'archived'));