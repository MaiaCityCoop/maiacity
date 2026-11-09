/*
 * The dome cell's garden, play's Sandbox 1 (./village.ts): its food forest of our own plants (./flora.js), each at a
 * stage of its life, a config of Sandbox 1's layout (`GARDEN`). Every plant is anchored to the version it was planted
 * with (its pin; Samuel 2026-10-20), so a plant changed later grows here only once planted again on purpose.
 */
import { SANDBOX } from '$lib/kernel/sandboxes.js';

import { configAt, configKey, loadConfig } from '../../game/code/index.js';

/**
 * @typedef {{ id: string, v: number, asset?: string, stages: number[], weight?: number }} Planting a library plant at its
 *   version (`pin`, else `v`), at one of `stages` (0 … 9, 9 the ripe fruit), drawn `weight` times as often as weight 1
 */
/**
 * @typedef {{ trees: Planting[], shrubs: Planting[], climbers: Planting[], cover: Planting[] }} Garden a forest garden's
 *   layers: trees (canopy and sub-canopy), shrubs, climbers, and the cover under them (herbs, vegetables, ground, fungi)
 */

/** @typedef {{ id: string, v: number, asset?: string, stage: number, seed: string }} Kind a plant at its version, stage and seed */

/** A planting's plant as a kind is anchored to it: its pin where it has one. @param {{ asset?: string }} p */
export const assetOf = (p) => (p.asset ? { asset: p.asset } : {});

/** how finely the picked plant's card (./PlantLook.svelte) grows its one plant, finer than any in the forest */
export const TIERS = {
	look: { level: 0.5, roots: false, thin: 0.6, fill: 1.2, finest: 0.0008 }
};

/** where Sandbox 1's garden is kept: a config of its layout */
const GARDEN = configKey(SANDBOX.one, 'garden');

/**
 * The garden a config holds as Sandbox 4 grows it. Outside, a temperate forest garden layer under layer (Martin
 * Crawford's at Dartington, the syntropic plantings), each layer at its own `spacing`; inside under the glass, the
 * plants that need the warmth. Below the trees plants grow in drifts (`drift`: 5 to 15 of one kind, `gap` m apart), and
 * between them mini fields in rows (`fields`: each crop `size` m, rows `row` and plants `gap` apart, on `tilled` soil;
 * `reach` how far off the forest draws it). @param {any} c the config's JSON
 * @returns {{ seed: string, outside: Garden & { canopy: Planting[], herbs: Planting[], ground: Planting[], roots: Planting[], fungi: Planting[] },
 *   inside: Garden, spacing: Record<string, number>, drift: { least: number, most: number, gap: Record<string, number> },
 *   fields: { id: string, v: number, asset?: string, stages: number[], size: [number, number], row: number, gap: number, fields: number, reach: 'cover' | 'shrub' | 'tree', tilled: boolean }[] }}
 */
function floraOf(c) {
	const outside = {
		...c.outside,
		get cover() {
			return [...this.herbs, ...this.ground, ...this.roots, ...this.fungi];
		}
	};
	return { seed: c.seed, outside, inside: c.inside, spacing: c.spacing, drift: c.drift, fields: c.fields };
}

/** play's Sandbox 1: the village of ./village.ts, its forest the garden play's database keeps (`flora`) */
export async function sandbox5() {
	await loadConfig(SANDBOX.one);
	return { sandbox: /** @type {const} */ ('sandbox-5'), flora: floraOf(configAt(GARDEN)) };
}

/** @typedef {ReturnType<typeof floraOf>} Flora */

/** One planting of a layer drawn by its weight, at one of its stages. @param {Planting[]} layer @param {() => number} r @param {string} seed @returns {Kind} */
export function pick(layer, r, seed) {
	return stageOf(planting(layer, r), r, seed);
}

/** One planting of a layer, drawn by its weight. @param {Planting[]} layer @param {() => number} r */
export function planting(layer, r) {
	const total = layer.reduce((a, p) => a + (p.weight ?? 1), 0);
	let x = r() * total;
	let p = layer[layer.length - 1];
	for (const q of layer) if ((x -= q.weight ?? 1) < 0) {
		p = q;
		break;
	}
	return p;
}

/** A planting at one of its stages. @param {Planting} p @param {() => number} r @param {string} seed @returns {Kind} */
export function stageOf(p, r, seed) {
	// the later stages a little more often: a food forest is mostly grown
	const k = Math.min(p.stages.length - 1, Math.floor(Math.pow(r(), 0.8) * p.stages.length));
	return { id: p.id, v: p.v, ...assetOf(p), stage: p.stages[k], seed };
}
