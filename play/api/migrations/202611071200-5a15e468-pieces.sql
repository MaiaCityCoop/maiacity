-- Pieces (play/SPEC.md §4.5; intent 5a15e468, Samuel 2026-11-07): a recipe names a shared piece by its hash. A piece
-- is a document `piece:<uuid>` of the schema `schema:<SCHEMA.piece>` (seeded from ./schemas/piece.json, its row in
-- play.records); each accepted version's source is kept among play's files by its BLAKE3 hash and listed here, with
-- the pieces it requires and how deep it goes, so a proposal naming a piece is held to an accepted version of one.
-- Append only: a version once listed never changes.
CREATE TABLE play.piece_versions (
  hash      TEXT NOT NULL REFERENCES play.files(hash),
  piece_id  UUID NOT NULL,
  number    INT NOT NULL CHECK (number >= 1),
  requires  TEXT[] NOT NULL DEFAULT '{}',
  depth     INT NOT NULL CHECK (depth BETWEEN 1 AND 4),
  created   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (piece_id, number)
);
CREATE INDEX ix_piece_versions_hash ON play.piece_versions (hash);
CREATE FUNCTION play.piece_version_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'a piece''s version is frozen: it is never changed or taken away';
END $$;
CREATE TRIGGER piece_version_frozen BEFORE UPDATE OR DELETE ON play.piece_versions FOR EACH ROW EXECUTE FUNCTION play.piece_version_is_frozen();
