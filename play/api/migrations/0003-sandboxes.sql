
      CREATE TABLE play.sandboxes (
        id    TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        route TEXT NOT NULL,
        note  TEXT NOT NULL DEFAULT ''
      );
      -- what a sandbox draws, at which version (a pin_change proposal later; SPEC §4.5)
      CREATE TABLE play.sandbox_pins (
        sandbox_id TEXT NOT NULL REFERENCES play.sandboxes(id),
        slot       TEXT NOT NULL,
        version_id TEXT NOT NULL REFERENCES play.asset_versions(id),
        variant    TEXT,
        params     JSONB,
        PRIMARY KEY (sandbox_id, slot)
      );
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('sandbox-1', 'Sandbox 1', '/sandbox-1/', 'The dome cell, its food forest grown from our plants (from legacy Sandbox 4)'),
        ('sandbox-2', 'Sandbox 2', '/sandbox-2/', 'The physical world lab: buildings from their parts, physics, wind (from legacy Sandbox 7)'),
        ('sandbox-3', 'Sandbox 3', '/sandbox-3/', 'The tired land, its van and its things (from legacy MaiaCity V2, without the economy)');
    