
      -- an imported version (and each variant of it) may be given its readable source once (Samuel 2026-11-03): the
      -- library its recipe file was bundled from, legacy's own code made again from it and checked against the file's
      -- hash (play/api/import/legacy/sources). Its source_hash is set where it had none, and nothing else of it
      -- changes; a source once given is never changed or taken back, and a version's other fields stay as frozen.
      CREATE OR REPLACE FUNCTION play.version_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'asset versions are never deleted'; END IF;
        IF NEW.source_hash IS DISTINCT FROM OLD.source_hash THEN
          IF OLD.source_hash IS NOT NULL OR NEW.source_hash IS NULL
             OR NEW.number IS DISTINCT FROM OLD.number OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
          THEN RAISE EXCEPTION 'asset version %: its source is given once, alone', OLD.id; END IF;
        ELSIF OLD.number IS NOT NULL THEN RAISE EXCEPTION 'asset version % is frozen', OLD.id;
        END IF;
        IF NEW.id <> OLD.id OR NEW.asset_id <> OLD.asset_id OR NEW.parents <> OLD.parents
           OR NEW.recipe_hash IS DISTINCT FROM OLD.recipe_hash OR NEW.default_variant IS DISTINCT FROM OLD.default_variant
           OR NEW.card IS DISTINCT FROM OLD.card
           OR NEW.engine IS DISTINCT FROM OLD.engine OR NEW.author IS DISTINCT FROM OLD.author
           OR NEW.note <> OLD.note OR NEW.imported IS DISTINCT FROM OLD.imported OR NEW.created <> OLD.created
        THEN RAISE EXCEPTION 'asset version % is frozen', OLD.id; END IF;
        RETURN NEW;
      END $$;
      CREATE OR REPLACE FUNCTION play.variant_is_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.source_hash IS NULL AND NEW.source_hash IS NOT NULL
           AND NEW.version_id = OLD.version_id AND NEW.name = OLD.name AND NEW.recipe_hash = OLD.recipe_hash
           AND NEW.card = OLD.card
        THEN RETURN NEW; END IF;
        RAISE EXCEPTION 'asset variants are never changed';
      END $$;
    