-- Pieces proposed together (play/SPEC.md §4.5; intent 02e3a85f, Samuel 2026-11-07): one intent may carry several
-- versions of one piece (v1 and v2, each pinned by different recipes), each its own intent variant, in order. An
-- intent holds one variant of every other document, as before: the key is its variant, and (intent, document) stays
-- unique for every kind but pieces.
ALTER TABLE play.intent_variants DROP CONSTRAINT intent_variants_pkey;
ALTER TABLE play.intent_variants ADD PRIMARY KEY (intent_id, variant_id);
CREATE UNIQUE INDEX ux_intent_variants_doc ON play.intent_variants (intent_id, doc_id) WHERE doc_id NOT LIKE 'piece:%';
CREATE INDEX ix_intent_variants_intent_doc ON play.intent_variants (intent_id, doc_id);
