-- Skills are records (play/SPEC.md §4.14; intent 1d9995c3, Samuel 2026-11-07): a skill is a kind whose rows are
-- play.records', as a schema's and a piece's are, so a new skill is made over MCP as any document of a kind that is a
-- schema alone (doc_edit with kind 'skill' and its whole, then propose_doc_version). play.skills held only each skill's
-- id, coop, label and group, the group only shown and already its document's `group`; nothing names a skill by a
-- column but its document's id since 0032. Every row moves with its id, label and times, and the table goes.
INSERT INTO play.records (id, coop_id, kind, label, created, updated)
  SELECT id, coop_id, 'skill', label, created, updated FROM play.skills;
DROP TABLE play.skills;
