-- One intent holds all its work (play/SPEC.md §4.12 and §4.15; intent 7c8986c5, Samuel 2026-11-07): any number of
-- documents, an asset's or a story's version among them, each its own intent variant, and a pull request beside them.
-- What an asset's or story's version names (its asset or story, the version it was made on, its frozen version) is
-- kept on its own intent variant, so two assets' versions sit side by side; the intent's own columns name its first.
-- Code beside play's work goes through Ship, so an intent in Ship may hold work: its work is accepted when its code is live.
ALTER TABLE play.intent_variants ADD COLUMN refs JSONB NOT NULL DEFAULT '{}';
UPDATE play.intent_variants iv SET refs = jsonb_strip_nulls(jsonb_build_object(
    'kind', i.work, 'asset_id', i.asset_id, 'base', i.base, 'version', i.version,
    'story_id', i.story_id, 'story_base', i.story_base, 'story_version', i.story_version))
  FROM play.intents i
 WHERE i.id = iv.intent_id AND i.work IS NOT NULL
   AND iv.position = (SELECT min(position) FROM play.intent_variants x WHERE x.intent_id = iv.intent_id);
ALTER TABLE play.intents DROP CONSTRAINT IF EXISTS intents_ship_is_code;
