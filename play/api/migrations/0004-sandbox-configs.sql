
      -- what a sandbox is laid out by beyond its pins (Sandbox 1's garden: its layers, plantings, spacing, drifts and
      -- fields). An asset in it is named only by a slot of the sandbox's pins (play.sandbox_pins), never by a readable
      -- ref; the API hands each slot out as the build it pins, <hash>?values.
      CREATE TABLE play.sandbox_configs (
        sandbox_id TEXT NOT NULL REFERENCES play.sandboxes(id),
        name       TEXT NOT NULL CHECK (name ~ '^[a-z][a-z0-9-]*$' AND name <> 'assets'),
        data       JSONB NOT NULL,
        updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (sandbox_id, name)
      );
    