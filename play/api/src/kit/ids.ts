// The few things play's code names itself (Samuel 2026-11-04: every reference is a UUID or a hash; a name, a slug or a
// route is only shown). Each was once named by a readable id; migration 0017-uuids gave it the UUID it is known by from
// then on, uuidOf("<kind>:<old id>") (./uuid.ts), and these are those UUIDs, written out. play/site's
// src/lib/content/assets/sandboxes.js names the sandboxes by the same ones.

/** the Maia City coop, which owns every asset (once 'maia-city') */
export const COOP = "12f8d4e7-701f-8727-a327-de9b240ea867";

/** the sandboxes, and the Factories, which keep their pins the same way (once 'sandbox-1' … 'factories') */
export const SANDBOX = {
  one: "ec08b07d-6ec0-8f65-92b2-3efe7d91df5d",
  two: "7a7894a9-f37a-8181-9164-920389ee7675",
  three: "a2af9568-53c6-8917-a816-da88d3ff66ff",
  factories: "9862777e-04c2-8362-b028-27ff7e0591b8",
  /** Sandbox 4, the dome cassette joint: made after 0017, so a random UUID, the one migration 0021-sandbox-4 gives it */
  four: "4d72a048-ccc1-476b-b60f-c5eb0914fa47",
  /** Sandbox 5, the forest dome alone in its own food forest: a random UUID, the one migration 0022-sandbox-5 gives it */
  five: "ac154784-c938-47ee-ac74-d61fc91583b3",
} as const;

/** the factories' first versions, made by the deploy's import (../../import/factories.ts): each uuidOf("factory:<its first name>") */
export const FACTORY = {
  /** the LifeTrac line (once 'lifetrac-line') */
  lifetrac: "bb437f73-48c6-8dd9-82c6-07ce2630e43e",
} as const;

/** the game's configs (the Game editor, ../../import/gameconfigs.ts), each made with a random UUID when it was first written */
export const GAME_CONFIG = {
  /** the levelling: how a village grows, level by level (Samuel 2026-11-04) */
  levelling: "a392ce93-f60e-4d67-8f96-19ba866c7710",
} as const;

/** the skills (../../import/skills.ts, play/SPEC.md §4.14): what play teaches its agents, kept once in Postgres, each made with a
 * random UUID when it was first written (Samuel 2026-11-06). The two system skills make the system prompt, in this order. */
export const SKILL = {
  /** avenMAIA: who every MCP agent is and what it does on play */
  avenmaia: "28454738-e3a5-4443-ba7f-05fd14644b3f",
  /** the Intents skill: the lifecycle, and what to do at each of an intent's stages */
  intents: "a1d69c1b-4e2c-4516-bb6f-9b68ad29f06f",
} as const;

/** avenMAIA, the one identity of every agent connected over MCP (play/SPEC.md §4.13, Samuel 2026-11-06): uuidOf("agent:avenmaia"),
 * the row migration 0027-artifacts makes. Its name is only shown. */
export const AVENMAIA = "86090f35-1937-8d5d-bd28-194b80430f25";

/** the schemas (play/SPEC.md "Version control", Samuel 2026-11-06): each a document `schema:<uuid>` of the meta-schema, in
 * play's Postgres, its v1 seeded from ../../migrations/schemas by ensureSchemas (../docs/schemas.ts); each made with a random
 * UUID when it became a document. Their labels and old names (story/1 …) are only shown. */
export const SCHEMA = {
  /** the meta-schema: what every schema is, itself included */
  meta: "42094937-2aec-46f0-a813-81f7c4c970ca",
  story: "35c770ae-adb3-4890-8d0d-e93fb5aa26ec",
  asset: "7c441fca-1903-45d8-8627-e5cdd54fc3eb",
  factory: "2ea8a9c7-2c38-44a3-9455-9856d77c95df",
  /** the game's levelling (a game config) */
  levels: "856e2039-a608-4e9e-bd9d-ab77ae93db8e",
  skill: "82d9780a-d18d-4df5-995a-962fe63d2580",
  /** a sandbox's layout (play/SPEC.md §4.6): its pins and configs */
  sandbox: "0b202f27-0682-47b5-a819-4ac6bec07ff2",
  /** an artifact (../artifacts.ts): a link from the net Maia City keeps, its texts and its authors */
  artifact: "e09c47a2-e3eb-4d9c-89dd-0e95843b7c26",
  /** the auto-accept rules (../rules.ts, play/SPEC.md §4.12 "Auto-accept rules"): which intents pass Approve spec or Accept with no person */
  rules: "d07ab5fe-26e6-486e-b6f3-8a1cc383dfee",
  /** a piece (../pieces.ts, play/SPEC.md §4.5, intent 5a15e468): readable source a recipe names by its hash */
  piece: "96890044-5e4b-4fbc-97c8-361d1ad618ea",
} as const;

/** the one rule set, `rules:<RULES>` (play/SPEC.md §4.12 "Auto-accept rules", intent de24f1c5): its Main is the rules in
 *  force, its v1 made at migrate's end where absent (../rules.ts ensureRules), every later version a person's Accept */
export const RULES = "04af594a-fcfb-4770-b208-35e224e00d2a";

/** the rules play's code names (each only as the rule set's v1 holds it; Main is what is in force) */
export const RULE = {
  /** the first rule (Samuel 2026-11-07): an artifact added or corrected over MCP needs no tap */
  artifacts: "0f05a3ee-1aa8-43a2-a3e8-958456f04128",
} as const;
