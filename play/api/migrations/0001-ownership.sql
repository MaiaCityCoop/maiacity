
      -- who: a human signs in by passkey alone (copied once from the legacy founders, or signed up here)
      CREATE TABLE play.humans (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        founder_number BIGINT UNIQUE,          -- their number in the legacy founders' line, if they came from there
        created        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE play.passkeys (
        id         TEXT PRIMARY KEY,
        human_id   TEXT NOT NULL REFERENCES play.humans(id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        counter    BIGINT NOT NULL DEFAULT 0,
        transports TEXT,
        created    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX ix_passkeys_human ON play.passkeys(human_id);

      -- the coop that owns every asset; its admins are its owners
      CREATE TABLE play.coops (
        id      TEXT PRIMARY KEY,
        name    TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE play.memberships (
        coop_id    TEXT NOT NULL REFERENCES play.coops(id),
        human_id   TEXT NOT NULL REFERENCES play.humans(id) ON DELETE CASCADE,
        level      TEXT NOT NULL CHECK (level IN ('admin', 'citizen', 'traveler')),
        granted_by TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        via_invite TEXT,
        PRIMARY KEY (coop_id, human_id)
      );
      -- what each level may do, as data: { "read": [...], "propose": [...], "decide": [...], "manage": [...] }
      CREATE TABLE play.level_rules (
        coop_id TEXT NOT NULL REFERENCES play.coops(id),
        level   TEXT NOT NULL CHECK (level IN ('admin', 'citizen', 'traveler')),
        rule    JSONB NOT NULL,
        PRIMARY KEY (coop_id, level)
      );
      CREATE TABLE play.invites (
        code       TEXT PRIMARY KEY,
        coop_id    TEXT NOT NULL REFERENCES play.coops(id),
        level      TEXT NOT NULL DEFAULT 'citizen' CHECK (level IN ('citizen')),
        made_by    TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        created    TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_by    TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        used_at    TIMESTAMPTZ
      );
      CREATE TABLE play.secrets (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO play.coops (id, name) VALUES ('maia-city', 'Maia City');
      INSERT INTO play.level_rules (coop_id, level, rule) VALUES
        ('maia-city', 'traveler', '{"read": ["sandboxes", "assets"]}'),
        ('maia-city', 'citizen',  '{"read": ["sandboxes", "assets", "game"], "propose": ["asset_version"]}'),
        ('maia-city', 'admin',    '{"read": ["*"], "propose": ["*"], "decide": ["*"], "manage": ["members", "invites"]}');
    