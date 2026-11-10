// @ts-nocheck — plain JS
/*
 * A PLANT GROWING ON A VIEWER'S STAGE — as the plants page always grew one: on to its last stage at half a stage a second
 * (seed to ripe in 18 s) by the wall clock, smoothly between stages. A viewer builds it where it has grown to whenever
 * its last build is shown (./VaultAsset.svelte); a build between stages is not cached, as no one asks for it again.
 */

/** how fast it grows, in stages a second */
export const PACE = 0.5;

/** a stage as a build is named by it: to a thousandth, so its name stays short @param {number} g */
export const stageAt = (g) => Math.round(g * 1000) / 1000;

/** whether a stage is one of its own (a whole one), not one on the way between two @param {unknown} g */
export const whole = (g) => Number.isInteger(g);

/**
 * A plant growing by its stage parameter `p` (`min` … `max`) from `from` (its first if at its last): `on(wall)` grows it
 * `wall` seconds and says where to; `done` at its last. @param {{ min: number, max: number }} p @param {number} from
 */
export function growth(p, from) {
	let at = Number.isFinite(from) && from < p.max ? Math.max(p.min, from) : p.min;
	return {
		on: (wall) => (at = Math.min(p.max, at + Math.max(0, wall) * PACE)),
		get at() {
			return at;
		},
		get done() {
			return at >= p.max;
		}
	};
}
