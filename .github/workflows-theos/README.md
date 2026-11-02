# theOS's workflows, parked

theOS's release (`theos.yml`), its undo (`theos-undo.yml`) and avenSANDBOX's image (`avensandbox-image.yml`) live here and
don't run (Samuel 2026-11-02: the release pipelines' ownership is back in this repository, with play). What releases now
is `.github/workflows/main.yml` (play's checks on main) and `.github/workflows/production.yml` (production takes main
only; a push to production deploys play to play.maia.city). Nothing theOS deployed is taken down.
