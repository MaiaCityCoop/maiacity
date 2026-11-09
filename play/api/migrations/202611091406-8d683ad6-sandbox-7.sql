-- Sandbox 7, the hex planet (Samuel 2026-11-09, intent 8d683ad6): the old Sandbox 2's globe of 51,842 hex cards back in
-- play, drawn from the Earth's maps its planet config names by hash, painted and raised as its biomes config says, with
-- the candidate regions for a new city its sites config holds; all three in its layout document (sandbox:<uuid>,
-- play/SPEC.md §4.6), changed only by proposal. Something new, so a random UUID (SPEC §4.7), written out once more in
-- ../src/ids.ts SANDBOX.seven (play/site re-exports it).
INSERT INTO play.sandboxes (id, title, route, note) VALUES
  ('27c1e07e-ad8f-4996-9d1a-c5c12b9aaaff', 'Sandbox 7', '/sandbox-7/', 'The hex planet: the Earth in 51,842 cards, with the places a new city could grow')
ON CONFLICT (id) DO NOTHING;
