-- Auto-accept rules (play/SPEC.md §4.12 "Auto-accept rules"; intent de24f1c5, Samuel 2026-11-07). The rule set is a
-- document, rules:<RULES> of its own schema (src/rules.ts, made at migrate's end), so nothing of it is here: only what
-- an intent keeps of it.
--   work_kind: the kinds of work the intent declares up front (add_intent, specify_intent): schemas' UUIDs and/or
--              'code'; NULL declares nothing (any kind, as before, and no rule naming work_kind matches it)
--   auto:      each decision a rule made, { approve?: { rule, label, rules, reason, at }, accept?: { … } }: the rule's
--              UUID and the BLAKE3 content hash of the rule set's Main version it was decided by; approved_by and
--              decided_by stay NULL for those
ALTER TABLE play.intents ADD COLUMN work_kind TEXT[];
ALTER TABLE play.intents ADD COLUMN auto JSONB NOT NULL DEFAULT '{}'::jsonb;
