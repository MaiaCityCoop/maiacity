-- Only the box's run is evidence (play/SPEC.md §4.12; intent 4ea6b2ed, Samuel 2026-11-06): one of an admin's access
-- tokens marked, on play's profile page, as avenBOX's, the token the GitHub runs of the intents' checks hold
-- (intents-pr.yml, intents.yml). Results that can decide a code intent (on a commit, on main, with its pull request)
-- come from it alone.
ALTER TABLE play.api_tokens ADD COLUMN avenbox BOOLEAN NOT NULL DEFAULT false;
