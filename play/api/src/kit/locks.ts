// Every Postgres advisory lock play takes, each its own number, so no two features wait on each other by accident
// (Ship's queue once waited on the schemas' seed, both 4711030). Each is taken for one transaction
// (pg_advisory_xact_lock): play-api and the deploy's import start together and both migrate and seed.
export const LOCK = {
  /** every migration step (../migrations.ts) */
  migrations: 4_711_029,
  /** Ship's queue: its order read and its head started one at a time (../ship.ts startIfReady) */
  shipQueue: 4_711_030,
  /** an intent's dependencies: two edges added at once could close a cycle (../intents.ts) */
  intentEdges: 4_711_031,
  /** the seed schemas made documents (../docs/schemas.ts ensureSchemas) */
  schemaSeed: 4_711_032,
  /** the rule set's v1 (../rules.ts ensureRules) */
  rulesSeed: 4_711_033,
  /** the sandboxes' layouts made documents from their rows (../sandboxes.ts ensureLayouts) */
  layoutsMove: 4_711_034,
  /** the tests' template database, made by one test file while the others wait (../../test/kit.ts); a session lock */
  testTemplate: 4_711_035,
} as const;

/** the SQL that takes lock `n` for the caller's transaction */
export const lockSql = (n: (typeof LOCK)[keyof typeof LOCK]) => `SELECT pg_advisory_xact_lock(${n})`;
