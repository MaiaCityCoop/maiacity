-- A sandbox's layout is a document (play/SPEC.md §4.6, Samuel 2026-11-06; intent d2f50bf1): sandbox:<uuid>, its v1 its
-- pins and configs as they are. A Loro document can't be written in SQL, so this keeps every intent's sandbox change
-- (the columns sandbox_id, sandbox_base, sandbox_change and sandbox_diff) in play.sandbox_changes_kept, names its
-- layout on the intent (doc_id), and drops the columns; ensureLayouts (src/sandboxes.ts), at the end of migrate(),
-- then makes each layout's v1 and each kept change an intent variant of it, each intent keeping its stage.
ALTER TABLE play.sandboxes ADD COLUMN created TIMESTAMPTZ NOT NULL DEFAULT now();
-- what a change made before its document changed, kept as its variant's review (a sandbox's, from 0016)
ALTER TABLE play.doc_variants ADD COLUMN review JSONB;
CREATE TABLE play.sandbox_changes_kept (
  intent_id  UUID PRIMARY KEY REFERENCES play.intents(id) ON DELETE CASCADE,
  sandbox_id UUID NOT NULL REFERENCES play.sandboxes(id),
  edits      JSONB,
  diff       JSONB,
  moved      BOOLEAN NOT NULL DEFAULT false   -- made an intent variant of its layout (ensureLayouts)
);
INSERT INTO play.sandbox_changes_kept (intent_id, sandbox_id, edits, diff)
  SELECT id, sandbox_id, sandbox_change, sandbox_diff FROM play.intents WHERE work = 'sandbox_change';
ALTER TABLE play.intents DROP CONSTRAINT intents_work_names_what;
ALTER TABLE play.intents DROP CONSTRAINT intents_work_check;
UPDATE play.intents SET work = 'sandbox_version', doc_id = 'sandbox:' || sandbox_id::text WHERE work = 'sandbox_change';
ALTER TABLE play.intents DROP COLUMN sandbox_id, DROP COLUMN sandbox_base, DROP COLUMN sandbox_change, DROP COLUMN sandbox_diff;
ALTER TABLE play.intents ADD CONSTRAINT intents_work_check CHECK (work ~ '^[a-z][a-z_]{0,31}_version$');
ALTER TABLE play.intents ADD CONSTRAINT intents_work_names_what CHECK (
  (work IS NULL AND doc_id IS NULL AND doc_variant IS NULL AND asset_id IS NULL AND version IS NULL AND story_id IS NULL AND story_version IS NULL)
  OR (work IS NOT NULL AND doc_id IS NOT NULL AND doc_id ~ '^[a-z][a-z_]{0,31}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'));
