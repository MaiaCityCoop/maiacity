# api2: the re-audit's fixes in play/api (re-api.md, step 4)

Branch `intent/5884ade4-u-api2`. Each move: what, the problems it removes (`re-api#n`), how behaviour is pinned.
Not done here, on purpose: re-api#2 (the "not both" order) and re-api#6 (doc_edit through the gate) change behaviour:
left for Samuel.

## 1. The watcher hands its file store to an auto-accept rule (re-api#1)

- `watchPulls(db, gh, store, at)`; `autoMove` and `autoAfter` take `Ctx` (store required); decide.ts' `ctx.store as
  BlobStore` cast and `o.commit === undefined ? undefined : o.commit` are gone.
- Pinned first by a new rules.test case (its own commit): a code intent a rule matches, refused while a draft, is taken
  into Ship by the watcher's look once GitHub finds it ready. No test path through the watcher had existed.
- What the re-audit said and what is so: the store was **not reachable** from the watcher today, so no test could fail
  before the fix. Every intent watchPulls reads names a pull request, so decideOne takes it to acceptAndShip (no store),
  and matchRule refuses any intent holding code and play's work (`f.both`, rules.ts, not a rule a person can change).
  The fix stands as a type made true: the next path that would reach the store from there is caught by tsc.
