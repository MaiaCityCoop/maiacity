
      ALTER TABLE play.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
      UPDATE play.proposals SET status = 'proposed' WHERE status = 'open';
      ALTER TABLE play.proposals ALTER COLUMN status SET DEFAULT 'proposed';
      ALTER TABLE play.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('proposed', 'accepted', 'archived'));
    