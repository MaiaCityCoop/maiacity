// A REEL OF SHOTS — the one shot player's timeline: world shots (./shot.js specs) one after another, each its `seconds`.
// The studio's viewer, the Mac's plate renderer and a game playing its own film (MaiaCity V1's intro) pick their frame
// here and evaluate it with ./shot.js `evaluate`, so a shot plays the same everywhere. A reel is the shots' data alone,
// checked by ./shot.js. Plain JavaScript, shared by the browser, the API and the scripts.
import { evaluate } from './shot.js';

/** @typedef {import('./shot.js').Spec} Spec @typedef {import('./shot.js').Shape} Shape */
/** @typedef {{ spec: Spec, start: number, end: number }} Placed */
/** @typedef {{ shots: Placed[], seconds: number }} Reel */

/**
 * The shot on screen at reel time t (s) and t in it: before the first, its first frame; after the last, its last held;
 * null for an empty reel. @param {Reel} reel @param {number} t @returns {{ index: number, spec: Spec, t: number } | null}
 */
export function shotAt(reel, t) {
	const n = reel.shots.length;
	if (!n) return null;
	let i = 0;
	while (i < n - 1 && t >= reel.shots[i].end) i++;
	const s = reel.shots[i];
	return { index: i, spec: s.spec, t: Math.min(s.spec.seconds, Math.max(0, t - s.start)) };
}

/** The reel's frame at t for one shape: which shot, its time, and ./shot.js `evaluate` of it. @param {Reel} reel @param {number} t @param {Shape} [shape] */
export function frameAt(reel, t, shape) {
	const at = shotAt(reel, t);
	return at ? { ...at, ...evaluate(at.spec, at.t, shape) } : null;
}
