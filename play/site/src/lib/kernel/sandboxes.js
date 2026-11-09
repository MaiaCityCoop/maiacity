// @ts-nocheck — plain JS, runs in the page
/*
 * The sandboxes by their ids (Samuel 2026-11-04: every reference is a UUID or a hash; a name, a slug or a route is
 * only shown). A slot of a sandbox's pins is `pin:<its id>/<slot>` (./catalog.js) and its config is read at
 * /api/sandboxes/<its id>/config. These are the UUIDs play's migration 0017-uuids gave them, the same as play/api's
 * src/ids.ts `SANDBOX`.
 */
export const SANDBOX = Object.freeze({
	/** Sandbox 1: the dome cell and its food forest */
	one: 'ec08b07d-6ec0-8f65-92b2-3efe7d91df5d',
	/** Sandbox 2: the physical world lab */
	two: '7a7894a9-f37a-8181-9164-920389ee7675',
	/** Sandbox 3: the tired land */
	three: 'a2af9568-53c6-8917-a816-da88d3ff66ff',
	/** the Factories, which keep their pins as a sandbox does */
	factories: '9862777e-04c2-8362-b028-27ff7e0591b8',
	/** Sandbox 4: the dome cassette joint (no pins, no configs; a random UUID, play/api's migration 0021-sandbox-4) */
	four: '4d72a048-ccc1-476b-b60f-c5eb0914fa47',
	/** Sandbox 5: the forest dome alone in Sandbox 1's world (no pins, no configs: it reads Sandbox 1's garden and draws
	 *  the forest dome at its newest version; a random UUID, play/api's migration 0022-sandbox-5) */
	five: 'ac154784-c938-47ee-ac74-d61fc91583b3'
});
