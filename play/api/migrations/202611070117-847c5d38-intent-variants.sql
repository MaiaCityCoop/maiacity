-- Every change an intent variant (play/SPEC.md "Version control"; intent 847c5d38, Samuel 2026-11-06): an intent may
-- change several documents at once, each by an intent variant of its own, accepted together in one transaction or
-- archived together. play.intent_variants holds them, in place of the intent's one doc_id and doc_variant.
-- Artifacts become documents like any other (artifact:<uuid>, each kept one its v1, made from its row the first
-- time it is read): their row is what Main's newest version says, written only by an Accept, so a row whose
-- artifact is not yet accepted holds nothing but its id; its authors are a list on it, in their order.
CREATE TABLE play.intent_variants (
  intent_id  UUID NOT NULL REFERENCES play.intents(id) ON DELETE CASCADE,
  doc_id     TEXT NOT NULL REFERENCES play.docs(id),
  variant_id BIGINT NOT NULL UNIQUE REFERENCES play.doc_variants(id),
  seed       JSONB NOT NULL DEFAULT '[]',          -- the frontiers of Main it grew from
  position   INT NOT NULL DEFAULT 0,               -- its order in the intent: the first is its work's own
  PRIMARY KEY (intent_id, doc_id)
);
INSERT INTO play.intent_variants (intent_id, doc_id, variant_id, seed, position)
  SELECT i.id, i.doc_id, i.doc_variant, v.seed, 0 FROM play.intents i JOIN play.doc_variants v ON v.id = i.doc_variant
   WHERE i.doc_id IS NOT NULL AND i.doc_variant IS NOT NULL;
UPDATE play.doc_variants v SET intent_id = iv.intent_id FROM play.intent_variants iv WHERE iv.variant_id = v.id AND v.intent_id IS NULL;

ALTER TABLE play.intents DROP CONSTRAINT intents_work_names_what;
DROP INDEX IF EXISTS play.ix_intents_doc;
DROP INDEX IF EXISTS play.ix_intents_doc_variant;
ALTER TABLE play.intents DROP COLUMN doc_id, DROP COLUMN doc_variant;
ALTER TABLE play.intents ADD CONSTRAINT intents_work_names_what CHECK (
  (work IS NULL AND sandbox_id IS NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND story_version IS NULL)
  OR (work = 'sandbox_change' AND sandbox_id IS NOT NULL AND sandbox_change IS NOT NULL AND asset_id IS NULL AND story_id IS NULL)
  OR (work <> 'sandbox_change' AND sandbox_id IS NULL));

-- artifacts as documents: the row only what is accepted
ALTER TABLE play.artifacts ALTER COLUMN url DROP NOT NULL, ALTER COLUMN title DROP NOT NULL, ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN summary DROP NOT NULL, ALTER COLUMN kind DROP NOT NULL, ALTER COLUMN agent_id DROP NOT NULL, ALTER COLUMN origin DROP NOT NULL;
ALTER TABLE play.artifacts ADD COLUMN author_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE play.artifacts s SET author_ids = COALESCE((SELECT array_agg(sa.author_id ORDER BY sa.position) FROM play.artifact_authors sa WHERE sa.artifact_id = s.id), '{}');
DROP TABLE play.artifact_authors;
CREATE VIEW play.artifact_authors AS
  SELECT s.id AS artifact_id, a.author_id, (a.n - 1)::int AS position
    FROM play.artifacts s, unnest(s.author_ids) WITH ORDINALITY AS a(author_id, n);
