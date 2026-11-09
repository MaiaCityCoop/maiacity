/*
 * OUR EURO PALLET IN A FACTORY — the Things' own (`things/euro-pallet@1`), by its slot of the Factories' pins: the page
 * gets it built in the asset box like any asset (./assets.js), and the kit stacks product on it (`K.europallet`,
 * `K.palletLayout`) at its height, EPAL's 144 mm. Where it could not be built the kit draws the EPAL measures itself
 * (`K.palletPieces`).
 */
import { slotRef } from '$lib/content/assets/catalog.js';
import { SANDBOX } from '$lib/content/assets/sandboxes.js';

/** our Euro pallet, by its slot of the Factories' pins */
export const PALLET = slotRef(SANDBOX.factories, 'pallet');
/** its height (m) */
export const PALLET_H = 0.144;
