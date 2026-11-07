
      CREATE TABLE play.intent_depends (
        intent_id  UUID NOT NULL REFERENCES play.intents(id) ON DELETE CASCADE,
        depends_on UUID NOT NULL REFERENCES play.intents(id) ON DELETE CASCADE,
        by         TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (intent_id, depends_on),
        CHECK (intent_id <> depends_on)
      );
      CREATE INDEX ix_intent_depends_on ON play.intent_depends (depends_on);
    