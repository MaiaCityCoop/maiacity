-- An intent's detail opens fast (intent 2df30a21, Samuel 2026-11-07): a document's intent variant in brief (its label
-- and group, how many fields it changes and which, the piece hash it is and the pieces it requires), kept on its row for
-- the edits it holds (`seq`, its newest edit's), so the detail lists every document an intent changes without reading
-- each one again. Only a cache: worked out again whenever the variant has a newer edit (./src/gist.ts).
ALTER TABLE play.doc_variants ADD COLUMN gist JSONB;
