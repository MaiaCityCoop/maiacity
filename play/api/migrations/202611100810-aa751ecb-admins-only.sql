-- Everything on play is admins' only by default (Samuel 2026-11-10, intent aa751ecb: "by default it is admin only for all
-- things, and we unlock one thing after another with specific roles that we come up with later"): the traveler's and
-- the citizen's rules give nothing (they read sandboxes and assets, and a citizen the game and proposing an asset
-- version, since 0001-ownership); the admin's stays as it is. Unlocking a page or a read for a level later is giving
-- its rule that right (`read: ["assets"]` …), the site's table of rights and the API's routes naming it already.
UPDATE play.level_rules SET rule = '{}'::jsonb WHERE level IN ('traveler', 'citizen');
