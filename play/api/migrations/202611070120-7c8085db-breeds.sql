-- Breeds (play/SPEC.md "Breeds", intent 7c8085db-ccdb-44cf-8d6c-0ff984d71f41, Samuel 2026-11-06): an asset's
-- variants become breeds, variants of its document beside Main (type 'breed', each with its name, only shown) that
-- keep tracking Main on every field they do not override (`overrides`, its paths). An intent variant grows from Main or from a breed
-- (`breed`), or makes a new breed (`makes`, its name); `main_seed` is Main's point it was made at, so a variant
-- grown from a breed still knows the version it was seeded from. The asset's frozen versions and their variants'
-- rows stay as they are; each document's variants are turned into breeds by the import (play/api/src/assetdocs.ts breedsFromVariants).
ALTER TABLE play.doc_variants DROP CONSTRAINT doc_variants_type_check;
ALTER TABLE play.doc_variants ADD CONSTRAINT doc_variants_type_check CHECK (type IN ('main', 'intent', 'breed'));
ALTER TABLE play.doc_variants ADD COLUMN name TEXT CHECK (name IS NULL OR name ~ '^[a-z0-9][a-z0-9-]{0,79}$');
ALTER TABLE play.doc_variants ADD COLUMN breed BIGINT REFERENCES play.doc_variants(id);
ALTER TABLE play.doc_variants ADD COLUMN makes TEXT CHECK (makes IS NULL OR makes ~ '^[a-z0-9][a-z0-9-]{0,79}$');
ALTER TABLE play.doc_variants ADD COLUMN main_seed JSONB;
ALTER TABLE play.doc_variants ADD COLUMN overrides JSONB NOT NULL DEFAULT '[]';
ALTER TABLE play.doc_variants ADD CONSTRAINT doc_variants_breed_shape CHECK (
  (type = 'breed' AND name IS NOT NULL AND breed IS NULL AND makes IS NULL)
  OR (type = 'main' AND name IS NULL AND breed IS NULL AND makes IS NULL)
  OR (type = 'intent' AND name IS NULL AND (breed IS NULL OR makes IS NULL)));
CREATE UNIQUE INDEX doc_variants_breed_name ON play.doc_variants (doc_id, name) WHERE type = 'breed';
