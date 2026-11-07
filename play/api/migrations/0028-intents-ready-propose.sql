
      UPDATE play.intents i SET stage = 'proposal'
       WHERE i.stage = 'prototype' AND i.spec IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE(i.spec->'checks', '[]'::jsonb)) c
            WHERE COALESCE((c->>'must')::boolean, true)
              AND (i.results->(c->>'id')->>'pass') IS DISTINCT FROM 'true');
    