-- Sub-states (play/SPEC.md §4.12; intent 2bf8af96, Samuel 2026-11-07): Ship's watcher reads each open intent's named
-- pull request and keeps it here, so the board's request makes no GitHub call and one function (src/substate.ts) says
-- whether it is failed, waiting, working or idle: { pr, head, draft, mergeable, state, merged, base, checks: { <name>:
-- queued|running|success|failure }, at }.
ALTER TABLE play.intents ADD COLUMN pr_seen JSONB;
