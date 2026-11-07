-- No work without an intent (intent 706ed873, Samuel 2026-11-07; play/SPEC.md §4.12): every propose path needs an
-- intent in Build or at Proposal, and add_intent is the only way one comes in, so every intent with work has a spec.
-- An intent in Build, at Proposal or in Ship without a spec (only one proposed without an intent before this, none
-- known on play) is archived first, its work's variants closed as archived and kept in the history, its note saying
-- why; Accepted and Archived intents without a spec, from before, stay as they are. Then Postgres holds it.
UPDATE play.doc_variants v SET status = 'archived', decided_at = now()
  FROM play.intent_variants iv JOIN play.intents i ON i.id = iv.intent_id
 WHERE v.id = iv.variant_id AND v.status IN ('open', 'proposed')
   AND i.stage IN ('build', 'proposal', 'ship') AND i.spec IS NULL;
UPDATE play.intents SET stage = 'archived', decided_at = now(),
       note = btrim(COALESCE(note, '') || E'\n\n' || 'Archived: no work without an intent: propose it again for an intent.')
 WHERE stage IN ('build', 'proposal', 'ship') AND spec IS NULL;
ALTER TABLE play.intents ADD CONSTRAINT intents_specified CHECK (stage NOT IN ('build', 'proposal', 'ship') OR spec IS NOT NULL);
