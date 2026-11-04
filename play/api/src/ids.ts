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
} as const;
