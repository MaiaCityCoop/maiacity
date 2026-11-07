-- A document retired by an intent (intent 08566782, Samuel 2026-11-07): an accepted document taken off every list by an
-- intent's work and an admin's Accept, nothing deleted (./src/retire.ts). Its history stays, read by its UUID; when it
-- was retired and by which intent are kept on its row.
ALTER TABLE play.docs ADD COLUMN retired_at TIMESTAMPTZ;
ALTER TABLE play.docs ADD COLUMN retired_by UUID REFERENCES play.intents(id);
