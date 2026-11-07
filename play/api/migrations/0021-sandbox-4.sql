
      -- Sandbox 4, the dome cassette joint (Samuel 2026-11-05): one cast cassette of the 100 m dome's lowest rows,
      -- seated, keyed, capped and clamped, a scene of play's site with no data of its own (no pins, no configs). Something
      -- new, so a random UUID (SPEC §4.7), written out in ./ids.ts and play/site's sandboxes.js.
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('4d72a048-ccc1-476b-b60f-c5eb0914fa47', 'Sandbox 4', '/sandbox-4/', 'The dome cassette joint: a cast cassette of the 100 m dome seated, keyed, capped and clamped')
      ON CONFLICT (id) DO NOTHING;
    