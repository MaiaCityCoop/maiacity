/**
 * THE SANDBOX KIT — what a sandbox world is made with (taken out of Sandbox 4). A world imports what it uses from
 * here or from the kit's modules directly; README.md says how to build a new sandbox with it.
 */
export { createWorldRenderer as createStage } from '$lib/content/render/world.js';
export { createSky } from './sky.js';
export { disposeObject } from '$lib/content/render/core.js';
export { createOrbitRig } from './orbit.js';
export { default as WorldPage } from './WorldPage.svelte';
