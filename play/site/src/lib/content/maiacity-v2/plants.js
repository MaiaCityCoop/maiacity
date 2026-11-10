// @ts-nocheck — plain JS, kept loose on purpose
import { slotRef } from '$lib/content/assets/catalog.js';
import { SANDBOX } from '$lib/kernel/sandboxes.js';

/** a tree's plant by its slot of Sandbox 3's pins (`plant-<id>`), at its stage and seed: play's Sandbox 3 plants none for now */
export const plantRef = (p, stage, seed) => slotRef(SANDBOX.three, `plant-${p.id}`, `stage=${stage}&seed=${encodeURIComponent(seed)}`);
