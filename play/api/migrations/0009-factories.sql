
      -- the Factories page (Samuel 2026-11-03): its lines draw our assets the way a sandbox does, by the slots of its
      -- pins (the LifeTrac the LifeTrac line builds, the Euro pallets its raw stock stands on), so it is kept as one
      INSERT INTO play.sandboxes (id, title, route, note) VALUES
        ('factories', 'Factories', '/factories/', 'The production lines that build our assets, each a live simulation (first: the LifeTrac line)')
      ON CONFLICT (id) DO NOTHING;
    