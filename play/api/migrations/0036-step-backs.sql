
      ALTER TABLE play.intents ADD COLUMN steps JSONB NOT NULL DEFAULT '[]'::jsonb;
    