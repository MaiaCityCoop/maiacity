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

/** the factories' first versions, made by the deploy's import (../import/factories.ts): each uuidOf("factory:<its first name>") */
export const FACTORY = {
  /** the LifeTrac line (once 'lifetrac-line') */
  lifetrac: "bb437f73-48c6-8dd9-82c6-07ce2630e43e",
} as const;

/** the game's configs (the Game editor, ../import/gameconfigs.ts), each made with a random UUID when it was first written */
export const GAME_CONFIG = {
  /** the levelling: how a village grows, level by level (Samuel 2026-11-04) */
  levelling: "a392ce93-f60e-4d67-8f96-19ba866c7710",
} as const;

/** the skills (../import/skills.ts, play/SPEC.md §4.14): what play teaches its agents, kept once in Postgres, each made with a
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
