
      -- every document names the schema it was written against, by its UUID, and that schema's version
      ALTER TABLE play.docs ADD COLUMN schema_id UUID, ADD COLUMN schema_version INT;
      COMMENT ON COLUMN play.docs.schema IS 'the schema''s old name (story/1 …): only shown; a document names its schema by schema_id';
      CREATE INDEX ix_docs_schema ON play.docs (schema_id);
      -- the rows of the kinds no table of their own holds: the schemas, and every kind that is a schema alone
      CREATE TABLE play.records (
        id      UUID PRIMARY KEY,
        coop_id UUID NOT NULL REFERENCES play.coops(id),
        kind    TEXT NOT NULL CHECK (kind ~ '^[a-z][a-z_]{0,31}$'),
        label   TEXT NOT NULL,
        created TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX ix_records_kind ON play.records (kind);
    