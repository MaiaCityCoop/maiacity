
      -- Sandbox 5, the forest dome in its own food forest (Samuel 2026-11-05): Sandbox 1's world without its domes, the
      -- forest dome of the library alone in its middle at its newest accepted version. A scene of play's site with no
      -- data of its own (no pins, no configs: it reads Sandbox 1's garden). Something new, so a random UUID (SPEC §4.7),
      -- written out in ./ids.ts and play/site's sandboxes.js.
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('ac154784-c938-47ee-ac74-d61fc91583b3', 'Sandbox 5', '/sandbox-5/', 'The forest dome alone in its own food forest: Sandbox 1''s world without its domes')
      ON CONFLICT (id) DO NOTHING;
    