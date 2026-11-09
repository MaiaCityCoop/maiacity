-- Sandbox 6, one village at its real size (Samuel 2026-11-09, intent 67f0404a): the old Sandbox 6's seven hexes back
-- in play, laid out as its village config says and counted as its audit config says, both in its layout document
-- (sandbox:<uuid>, play/SPEC.md §4.6), changed only by proposal. Something new, so a random UUID (SPEC §4.7), written
-- out once more in ../src/ids.ts SANDBOX.six (play/site re-exports it).
INSERT INTO play.sandboxes (id, title, route, note) VALUES
  ('80f37471-b59c-4a23-8278-2ad062b37939', 'Sandbox 6', '/sandbox-6/', 'One village at its real size: six living hexes round the tower hex')
ON CONFLICT (id) DO NOTHING;
