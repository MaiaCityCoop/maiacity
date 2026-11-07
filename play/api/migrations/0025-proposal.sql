
      ALTER TABLE play.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
      UPDATE play.proposals SET status = 'proposal' WHERE status IN ('proposed', 'open');
      ALTER TABLE play.proposals ALTER COLUMN status SET DEFAULT 'proposal';
      ALTER TABLE play.proposals ADD CONSTRAINT proposals_status_check CHECK (status IN ('proposal', 'accepted', 'archived'));
    