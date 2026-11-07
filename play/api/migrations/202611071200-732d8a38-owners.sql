-- Owners (play/SPEC.md "Owners"; intent 732d8a38, the first slice of Ownership 8fc46819; Samuel 2026-11-07): every
-- asset and every file belongs to an account, a person's own (their human's UUID) or the Maia City coop's (its UUID).
-- Everything there was stays the coop's. What a person owns is private to its owner: to anyone else it is as what never
-- was (play/api/src/owners.ts decides, the one place).
--
-- An asset has one owner. A file is named by its hash, so the same bytes may be in several libraries at once: each
-- library holding a file is a row of play.file_owners, its label that library's own (the coop's label stays
-- play.files.label, as before). A file is everyone's (as every file was) while the coop's library holds it or no
-- library row names it.
ALTER TABLE play.assets ADD COLUMN owner UUID NOT NULL DEFAULT '12f8d4e7-701f-8727-a327-de9b240ea867';
CREATE INDEX ix_assets_owner ON play.assets (owner) WHERE owner <> '12f8d4e7-701f-8727-a327-de9b240ea867';

CREATE TABLE play.file_owners (
  hash    TEXT NOT NULL REFERENCES play.files(hash),
  owner   UUID NOT NULL,
  label   TEXT,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hash, owner)
);
CREATE INDEX ix_file_owners_owner ON play.file_owners (owner, created DESC);
INSERT INTO play.file_owners (hash, owner, created) SELECT hash, '12f8d4e7-701f-8727-a327-de9b240ea867', created FROM play.files;
