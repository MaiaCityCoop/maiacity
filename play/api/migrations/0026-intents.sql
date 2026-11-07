
      ALTER TABLE play.inbox RENAME TO intents;
      ALTER INDEX play.ix_inbox_status RENAME TO ix_intents_stage;
      -- the spec (a goal, a scope and its checks), in place of the free definition and metric: a definition and metric
      -- written before are kept in the note, and the intent is specified again, its checks this time
      ALTER TABLE play.intents ADD COLUMN spec JSONB;
      UPDATE play.intents SET note = concat_ws(E'

', NULLIF(btrim(note), ''), E'### Definition (before its spec)

' || definition, E'### Metric of what is good (before its spec)

' || metric),
                              specified_by = NULL, specified_at = NULL
        WHERE definition IS NOT NULL;
      ALTER TABLE play.intents DROP COLUMN definition, DROP COLUMN metric;
      ALTER TABLE play.intents
        ADD COLUMN results     JSONB,   -- each check's last result while it is prototyped: { "<check>": { pass, evidence, by, at } }
        ADD COLUMN approved_by TEXT REFERENCES play.humans(id) ON DELETE SET NULL,
        ADD COLUMN approved_at TIMESTAMPTZ;
      ALTER TABLE play.intents DROP CONSTRAINT IF EXISTS inbox_status_check;
      ALTER TABLE play.intents RENAME COLUMN status TO stage;
      UPDATE play.intents SET stage = CASE stage WHEN 'inbox' THEN 'idea' WHEN 'done' THEN 'accepted' ELSE stage END;
      UPDATE play.intents SET stage = 'idea' WHERE stage = 'specify';
      ALTER TABLE play.intents ALTER COLUMN stage SET DEFAULT 'idea';
      ALTER TABLE play.intents ADD CONSTRAINT intents_stage_check CHECK (stage IN ('idea', 'specify', 'prototype', 'proposal', 'accepted', 'archived'));
      ALTER TABLE play.intents ADD CONSTRAINT intents_spec_before_build CHECK (stage IN ('idea', 'specify', 'archived', 'accepted', 'proposal') OR approved_at IS NOT NULL);
      ALTER TABLE play.proposals RENAME COLUMN inbox_id TO intent_id;
      ALTER INDEX play.ix_proposals_inbox RENAME TO ix_proposals_intent;
      -- an intent with a proposal still waiting is at the proposal stage, and follows it as it is decided
      UPDATE play.intents i SET stage = 'proposal'
        WHERE stage = 'idea' AND EXISTS (SELECT 1 FROM play.proposals p WHERE p.intent_id = i.id AND p.status = 'proposal');

      -- the intent a proposal made without one is: its title what it proposes (an asset's or story's label and the version
      -- it would be, a sandbox's change), its note the proposal's, its stage the proposal's status
      CREATE FUNCTION play.intent_for(p play.proposals) RETURNS uuid LANGUAGE plpgsql AS $f$
      DECLARE i uuid := gen_random_uuid(); t text; k text := 'improve';
      BEGIN
        IF p.kind = 'asset_version' THEN
          SELECT a.label || ' v' || COALESCE(v.number, COALESCE(b.number, 0) + 1), CASE WHEN p.base IS NULL THEN 'idea' ELSE 'improve' END INTO t, k
            FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = p.version LEFT JOIN play.asset_versions b ON b.id = p.base WHERE a.id = p.asset_id;
        ELSIF p.kind = 'story_version' THEN
          SELECT sv.title || ' v' || COALESCE(sv.number, COALESCE(sb.number, 0) + 1), CASE WHEN p.story_base IS NULL THEN 'idea' ELSE 'improve' END INTO t, k
            FROM play.story_versions sv LEFT JOIN play.story_versions sb ON sb.id = p.story_base WHERE sv.id = p.story_version;
        ELSIF p.kind = 'sandbox_change' THEN
          SELECT sx.title || ': ' || jsonb_array_length(COALESCE(p.sandbox_diff, '[]'::jsonb)) || ' changes' INTO t FROM play.sandboxes sx WHERE sx.id = p.sandbox_id;
        ELSIF p.kind = 'factory_version' THEN
          SELECT fx.label INTO t FROM play.factories fx WHERE fx.id = p.factory_id;
        ELSIF p.kind = 'game_config_version' THEN
          SELECT gc.label INTO t FROM play.game_configs gc WHERE gc.id = p.game_config_id;
        END IF;
        INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, created, decided_by, decided_at)
        VALUES (i, p.coop_id, COALESCE(k, 'improve'), left(COALESCE(NULLIF(btrim(t), ''), 'A proposal'), 200), COALESCE(p.note, ''),
                CASE p.status WHEN 'accepted' THEN 'accepted' WHEN 'archived' THEN 'archived' ELSE 'proposal' END,
                p.author, CASE WHEN p.via IN ('web', 'mcp') THEN p.via ELSE 'web' END, COALESCE(p.created, now()), p.decided_by, p.decided_at);
        RETURN i;
      END $f$;
      UPDATE play.proposals p SET intent_id = play.intent_for(p) WHERE p.intent_id IS NULL;
      ALTER TABLE play.proposals ALTER COLUMN intent_id SET NOT NULL;

      -- every proposal is an intent's: one inserted without one gets its own; one made for an intent in Prototype brings
      -- it to the proposal stage
      CREATE FUNCTION play.proposal_intent() RETURNS trigger LANGUAGE plpgsql AS $f$
      BEGIN
        IF NEW.intent_id IS NULL THEN NEW.intent_id := play.intent_for(NEW);
        ELSE UPDATE play.intents SET stage = 'proposal' WHERE id = NEW.intent_id AND stage = 'prototype';
        END IF;
        RETURN NEW;
      END $f$;
      CREATE TRIGGER proposals_intent BEFORE INSERT ON play.proposals FOR EACH ROW EXECUTE FUNCTION play.proposal_intent();

      -- an intent at the proposal stage follows its proposals as they are decided
      CREATE FUNCTION play.intent_follows() RETURNS trigger LANGUAGE plpgsql AS $f$
      DECLARE open int; acc int; st text; approved timestamptz;
      BEGIN
        IF NEW.status = OLD.status THEN RETURN NEW; END IF;
        SELECT stage, approved_at INTO st, approved FROM play.intents WHERE id = NEW.intent_id;
        IF st IS DISTINCT FROM 'proposal' THEN RETURN NEW; END IF;
        SELECT count(*) FILTER (WHERE status = 'proposal'), count(*) FILTER (WHERE status = 'accepted') INTO open, acc
          FROM play.proposals WHERE intent_id = NEW.intent_id;
        IF open > 0 THEN RETURN NEW; END IF;
        IF acc > 0 THEN
          UPDATE play.intents SET stage = 'accepted', decided_by = NEW.decided_by, decided_at = now() WHERE id = NEW.intent_id;
        ELSIF approved IS NOT NULL THEN
          UPDATE play.intents SET stage = 'prototype', results = NULL WHERE id = NEW.intent_id;
        ELSE
          UPDATE play.intents SET stage = 'archived', decided_by = NEW.decided_by, decided_at = now() WHERE id = NEW.intent_id;
        END IF;
        RETURN NEW;
      END $f$;
      CREATE TRIGGER proposals_move_intent AFTER UPDATE OF status ON play.proposals FOR EACH ROW EXECUTE FUNCTION play.intent_follows();
    