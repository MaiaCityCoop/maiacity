// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE SOILS UNDER THE BIOMES — what a plant's ground is made of below its surface, as a soil scientist reads it on the
 * face of a pit: its horizons from the top down, each at its real depth, its colour (moist, as the Munsell chart has
 * it), its structure (crumbs, blocks, plates, prisms, loose grains, layered litter), its stones, its roots, its worm
 * burrows, and what marks it (rust mottles and grey where water stands, white lime, black charcoal, white fungal
 * threads). ./ground.js paints a pit's faces with them, worked out in the world's own metres.
 *
 * A biome names its soil (`SOIL_OF`): the floor of a forest garden lies on a deep, dark garden humus, the beech wood's
 * on a brown earth, the spruce wood's on a podzol bleached grey under its needles, the meadow's on a black earth, the
 * warm food forest's on a red tropical earth under the humus its mulch keeps, the lawn's on a ploughed garden loam.
 *
 * A horizon: `name`, `to` its lower boundary (m below the surface), `col`/`col2` its matrix colours (sRGB, moist) and
 * `ped` its structure: { kind, size (m), dark (how dark its pores and cracks are, 0…1), vary (how far one ped's shade
 * strays) }; and as it has them: `stones` { share 0…1, size m }, `roots` 0…1, `worms` 0…1 (burrows), `mottles` 0…1
 * (redox: rust and grey), `lime` 0…1 (carbonate nodules and threads), `charcoal` 0…1, `hyphae` 0…1, `krotovina` 0…1
 * (old animal burrows filled with another horizon's earth), and its lower boundary's `wave` (m, how far it rises and
 * falls), `sharp` (m, how wide it runs into the next: abrupt < 2 cm, clear 2–5, gradual 5–15, diffuse > 15) and
 * `tongue` (m, how far it reaches down in tongues).
 */

/** a ped's kind, as the shader reads it */
export const PED = { crumb: 0, blocky: 1, platy: 2, prismatic: 3, massive: 4, grain: 5, litter: 6, peat: 7 };

/** @typedef {{ name: string, to: number, col: string, col2: string, ped: { kind: keyof typeof PED, size: number, dark: number, vary: number },
 *   stones?: { share: number, size: number }, roots?: number, worms?: number, mottles?: number, lime?: number, charcoal?: number,
 *   hyphae?: number, krotovina?: number, wave?: number, sharp?: number, tongue?: number }} Horizon */
/** @typedef {{ id: string, label: string, kind: string, note: string, stone: string, horizons: Horizon[] }} Soil */

/** @type {Record<string, Soil>} */
const SOILS = {
	'garden-humus': {
		id: 'garden-humus',
		label: 'Garden humus',
		kind: 'Hortic Anthrosol',
		note: 'A forest garden’s soil, fed for years with mulch, compost and leaves: a deep, near-black, crumbly humus alive with worms and roots, charcoal in it, over the brown earth it was made from.',
		stone: '#8c8478',
		horizons: [
			{ name: 'Oi', to: 0.025, col: '#6b4e30', col2: '#9a7a4c', ped: { kind: 'litter', size: 0.012, dark: 0.55, vary: 0.5 }, hyphae: 0.35, wave: 0.008, sharp: 0.006 },
			{ name: 'Oa', to: 0.045, col: '#2e231a', col2: '#3d2e21', ped: { kind: 'crumb', size: 0.0025, dark: 0.5, vary: 0.25 }, roots: 0.6, hyphae: 0.6, worms: 0.6, wave: 0.008, sharp: 0.01 },
			{ name: 'Ah', to: 0.45, col: '#3a2d22', col2: '#4b3a2b', ped: { kind: 'crumb', size: 0.005, dark: 0.55, vary: 0.3 }, roots: 0.7, worms: 1, charcoal: 0.35, hyphae: 0.25, stones: { share: 0.03, size: 0.03 }, wave: 0.05, sharp: 0.07 },
			{ name: 'AB', to: 0.65, col: '#55412e', col2: '#6a523a', ped: { kind: 'blocky', size: 0.014, dark: 0.45, vary: 0.25 }, roots: 0.35, worms: 0.55, charcoal: 0.08, stones: { share: 0.06, size: 0.035 }, wave: 0.06, sharp: 0.1, tongue: 0.08 },
			{ name: 'Bw', to: 1.15, col: '#7d5b3a', col2: '#8f6c47', ped: { kind: 'blocky', size: 0.026, dark: 0.4, vary: 0.22 }, roots: 0.15, worms: 0.3, stones: { share: 0.1, size: 0.045 }, wave: 0.07, sharp: 0.12 },
			{ name: 'C', to: 9, col: '#927b58', col2: '#a38c68', ped: { kind: 'massive', size: 0.05, dark: 0.3, vary: 0.15 }, roots: 0.03, worms: 0.1, stones: { share: 0.28, size: 0.07 } }
		]
	},
	'tropical-red': {
		id: 'tropical-red',
		label: 'Red tropical earth',
		kind: 'Ferralsol / Ultisol under a mulched humus',
		note: 'A warm forest’s soil: old, deeply weathered red earth of iron and clay in fine strong crumbs, with only the dark humus the mulch and the leaf fall keep on top, where nearly all its roots feed.',
		stone: '#a0624a',
		horizons: [
			{ name: 'Oi', to: 0.02, col: '#6e4c2c', col2: '#a07c4a', ped: { kind: 'litter', size: 0.02, dark: 0.55, vary: 0.55 }, hyphae: 0.3, wave: 0.006, sharp: 0.006 },
			{ name: 'Ah', to: 0.2, col: '#4a3125', col2: '#5c3e2d', ped: { kind: 'crumb', size: 0.0045, dark: 0.55, vary: 0.3 }, roots: 0.9, worms: 0.65, hyphae: 0.35, charcoal: 0.15, wave: 0.03, sharp: 0.05 },
			{ name: 'AB', to: 0.38, col: '#7a4630', col2: '#8a5236', ped: { kind: 'crumb', size: 0.006, dark: 0.45, vary: 0.25 }, roots: 0.4, worms: 0.35, wave: 0.05, sharp: 0.1, tongue: 0.06 },
			{ name: 'Bo', to: 1.5, col: '#93462a', col2: '#a65432', ped: { kind: 'crumb', size: 0.0035, dark: 0.35, vary: 0.18 }, roots: 0.15, worms: 0.15, stones: { share: 0.03, size: 0.02 }, wave: 0.08, sharp: 0.2 },
			{ name: 'BC', to: 9, col: '#b05a2e', col2: '#c27a44', ped: { kind: 'blocky', size: 0.03, dark: 0.3, vary: 0.2 }, mottles: 0.55, stones: { share: 0.06, size: 0.03 } }
		]
	},
	'brown-earth': {
		id: 'brown-earth',
		label: 'Brown earth',
		kind: 'Cambisol / Luvisol',
		note: 'A beech wood’s soil: coppery leaf litter over a thin dark humus, then the warm brown, blocky earth weathered out of the rock below, stones growing more and bigger towards it.',
		stone: '#8a847c',
		horizons: [
			{ name: 'Oi', to: 0.03, col: '#7b5531', col2: '#ad7d4a', ped: { kind: 'litter', size: 0.018, dark: 0.55, vary: 0.55 }, wave: 0.01, sharp: 0.006 },
			{ name: 'Oe', to: 0.05, col: '#3c2b1d', col2: '#4e3923', ped: { kind: 'peat', size: 0.004, dark: 0.5, vary: 0.25 }, hyphae: 0.75, roots: 0.5, wave: 0.01, sharp: 0.01 },
			{ name: 'Ah', to: 0.14, col: '#463629', col2: '#57442f', ped: { kind: 'crumb', size: 0.004, dark: 0.55, vary: 0.3 }, roots: 0.8, worms: 0.6, hyphae: 0.45, wave: 0.03, sharp: 0.04 },
			{ name: 'Bw', to: 0.62, col: '#99683a', col2: '#a97a48', ped: { kind: 'blocky', size: 0.016, dark: 0.42, vary: 0.22 }, roots: 0.35, worms: 0.3, stones: { share: 0.1, size: 0.04 }, wave: 0.06, sharp: 0.06 },
			{ name: 'BC', to: 0.92, col: '#94764f', col2: '#a3855c', ped: { kind: 'blocky', size: 0.03, dark: 0.35, vary: 0.2 }, roots: 0.1, worms: 0.1, stones: { share: 0.26, size: 0.06 }, wave: 0.08, sharp: 0.1 },
			{ name: 'C', to: 9, col: '#a8946e', col2: '#b8a47c', ped: { kind: 'massive', size: 0.05, dark: 0.3, vary: 0.15 }, roots: 0.02, stones: { share: 0.45, size: 0.09 } }
		]
	},
	podzol: {
		id: 'podzol',
		label: 'Podzol',
		kind: 'Podzol / Spodosol',
		note: 'A spruce wood’s soil: rust needles over a black, matted mor humus white with fungal threads, an ash-grey bleached sand the acid water has washed clean, then the black and rust bands where it left the humus and the iron.',
		stone: '#9a948a',
		horizons: [
			{ name: 'Oi', to: 0.025, col: '#6b4a2d', col2: '#8f6a45', ped: { kind: 'litter', size: 0.006, dark: 0.6, vary: 0.5 }, wave: 0.008, sharp: 0.005 },
			{ name: 'Oa', to: 0.09, col: '#251b14', col2: '#33261b', ped: { kind: 'peat', size: 0.003, dark: 0.45, vary: 0.2 }, roots: 0.7, hyphae: 1, wave: 0.02, sharp: 0.01 },
			{ name: 'E', to: 0.21, col: '#a49b8d', col2: '#b8af9f', ped: { kind: 'grain', size: 0.0006, dark: 0.25, vary: 0.2 }, roots: 0.2, stones: { share: 0.05, size: 0.02 }, wave: 0.04, sharp: 0.012, tongue: 0.08 },
			{ name: 'Bh', to: 0.27, col: '#3d271c', col2: '#4c3020', ped: { kind: 'massive', size: 0.02, dark: 0.3, vary: 0.15 }, roots: 0.15, wave: 0.03, sharp: 0.015 },
			{ name: 'Bs', to: 0.56, col: '#9c5b2a', col2: '#b56c32', ped: { kind: 'grain', size: 0.0007, dark: 0.3, vary: 0.25 }, roots: 0.12, stones: { share: 0.08, size: 0.03 }, wave: 0.06, sharp: 0.05 },
			{ name: 'C', to: 9, col: '#b09a72', col2: '#c0ab84', ped: { kind: 'grain', size: 0.0008, dark: 0.25, vary: 0.2 }, stones: { share: 0.32, size: 0.06 } }
		]
	},
	'black-earth': {
		id: 'black-earth',
		label: 'Black earth',
		kind: 'Chernozem / Mollisol',
		note: 'A meadow’s soil: a dense mat of grass roots, then a deep black topsoil of round crumbs worked over and over by worms and burrowing animals, its old burrows filled with pale loess from below, over loess white with lime.',
		stone: '#a49c8e',
		horizons: [
			{ name: 'Ah1', to: 0.05, col: '#2d251d', col2: '#3c3024', ped: { kind: 'crumb', size: 0.003, dark: 0.55, vary: 0.25 }, roots: 1, worms: 0.7, wave: 0.01, sharp: 0.02 },
			{ name: 'Ah', to: 0.6, col: '#2b2520', col2: '#362c24', ped: { kind: 'crumb', size: 0.0055, dark: 0.55, vary: 0.28 }, roots: 0.6, worms: 1, krotovina: 0.5, wave: 0.06, sharp: 0.12, tongue: 0.12 },
			{ name: 'AC', to: 0.9, col: '#4b3d2f', col2: '#6a5a44', ped: { kind: 'blocky', size: 0.02, dark: 0.4, vary: 0.3 }, roots: 0.2, worms: 0.5, krotovina: 0.9, lime: 0.2, wave: 0.08, sharp: 0.12 },
			{ name: 'Ck', to: 9, col: '#a8987a', col2: '#b9a98a', ped: { kind: 'massive', size: 0.04, dark: 0.3, vary: 0.15 }, roots: 0.05, worms: 0.2, krotovina: 0.6, lime: 0.8 }
		]
	},
	'garden-loam': {
		id: 'garden-loam',
		label: 'Garden loam',
		kind: 'Ploughed loam (Ap over Bw)',
		note: 'A lawn’s soil: a turf of clover and grass roots, a dug or ploughed dark loam that ends on a straight line where the spade or plough stopped, over the brown subsoil.',
		stone: '#8e877c',
		horizons: [
			{ name: 'turf', to: 0.04, col: '#3a3024', col2: '#4b3e2e', ped: { kind: 'crumb', size: 0.0025, dark: 0.55, vary: 0.25 }, roots: 1, worms: 0.6, wave: 0.006, sharp: 0.015 },
			{ name: 'Ap', to: 0.28, col: '#54412e', col2: '#634c36', ped: { kind: 'crumb', size: 0.0045, dark: 0.5, vary: 0.28 }, roots: 0.55, worms: 0.85, stones: { share: 0.03, size: 0.025 }, wave: 0.008, sharp: 0.012 },
			{ name: 'Bw', to: 0.7, col: '#8a6c48', col2: '#9a7b55', ped: { kind: 'blocky', size: 0.018, dark: 0.42, vary: 0.22 }, roots: 0.2, worms: 0.3, stones: { share: 0.08, size: 0.035 }, wave: 0.05, sharp: 0.08 },
			{ name: 'C', to: 9, col: '#a68a62', col2: '#b59a70', ped: { kind: 'massive', size: 0.05, dark: 0.3, vary: 0.15 }, roots: 0.03, stones: { share: 0.22, size: 0.06 } }
		]
	}
};

/** the soil under each biome of the library, by its id; a biome not named here lies on a brown earth */
const SOIL_OF = {
	'food-forest': 'garden-humus',
	'warm-food-forest': 'tropical-red',
	'beech-forest': 'brown-earth',
	'spruce-forest': 'podzol',
	meadow: 'black-earth',
	'clover-lawn': 'garden-loam'
};

/** the soil a biome lies on @param {string} [biome] its id @returns {Soil} */
export const soilOf = (biome) => SOILS[SOIL_OF[biome ?? ''] ?? 'brown-earth'];

/** the most horizons a soil has, as the shader holds them */
export const MOST = 8;
