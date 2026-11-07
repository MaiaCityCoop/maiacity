
      -- sign-up is by invite only (Samuel 2026-11-02): an invite makes a traveler, used up as they sign up; becoming a
      -- citizen comes later, by an admin's hand. Invites made before keep the level they were made with.
      ALTER TABLE play.invites DROP CONSTRAINT IF EXISTS invites_level_check;
      ALTER TABLE play.invites ALTER COLUMN level SET DEFAULT 'traveler';
      ALTER TABLE play.invites ADD CONSTRAINT invites_level_check CHECK (level IN ('traveler', 'citizen'));
    