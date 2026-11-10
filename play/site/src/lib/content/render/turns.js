/*
 * THE PAGE'S TURNS — the one line everything that works beside the page waits in (intent 7a6c3f1b): a recipe's build
 * (../assets/box/pool.js) and a kind's lower levels (../assets/render/lower.js) each take a turn, never more at once
 * than the device's budget lets work (./budget.js `builds`). The most wanted first, asked again each time a turn is
 * free; alike, the first asked. **A build before a level**: a build shows a plant, a level only makes one drawn
 * lighter, and a level job holds its turn for as long as a big tree takes (tens of seconds), so a level is begun only
 * on a turn no build waits for.
 *
 * Before it the order was written four times (the renderer's reads, the pool, the level maker, and the turns
 * themselves, first come first served), and they did not agree: each turn a build gave back went to the level maker,
 * which always stood in the line, while the box asked for its next a moment later. So the level jobs took every turn,
 * and the builds a world waits for stood still behind them (Sandbox 1 in avenBOX: 18, 14, 35 builds in its first
 * three 10 s, then 5, 5, 0, 3, 3, 0).
 */
import { budget } from './budget.js';

/**
 * A line of turns, `most()` at once. Its function asks for one: `rank` how much it is wanted while it waits (a number,
 * or a function asked again each time a turn is free), `level` a level's (after every build), `when` whether it can be
 * taken now (asked each time; one that cannot is passed over). Resolves with the function that gives the turn back
 * (call it once, when the work is done or failed). `waiting()`: how many wait.
 * @param {() => number} most
 * @returns {((o?: { rank?: number | (() => number), level?: boolean, when?: () => boolean }) => Promise<() => void>) & { waiting: () => number }}
 */
export function lineOf(most) {
	let working = 0, pumping = false;
	/** @type {{ rank?: number | (() => number), level?: boolean, when?: () => boolean, ok: (back: () => void) => void }[]} */
	const line = [];
	const wanted = (q) => {
		const r = typeof q.rank === 'function' ? q.rank() : q.rank;
		return typeof r === 'number' && !Number.isNaN(r) ? r : 0;
	};
	function pump() {
		pumping = false;
		while (working < most()) {
			let best = -1, rank = 0;
			for (let j = 0; j < line.length; j++) {
				const q = line[j];
				if (q.when && !q.when()) continue;
				const r = wanted(q);
				if (best < 0 || (!q.level && line[best].level) || (!q.level === !line[best].level && r > rank)) (best = j), (rank = r);
			}
			if (best < 0) return;
			const q = line.splice(best, 1)[0];
			working++;
			let back = false;
			q.ok(() => {
				if (back) return;
				back = true;
				working--;
				pump();
			});
		}
	}
	const turn = (o = {}) =>
		new Promise((ok) => {
			line.push({ ...o, ok });
			// (taken a moment after it is asked: of all asked together, the most wanted, not the first)
			if (!pumping) (pumping = true), queueMicrotask(pump);
		});
	turn.waiting = () => line.length;
	return turn;
}

/** A turn to work beside the page: as many at once as the device's budget lets build (./budget.js). */
export const turn = lineOf(() => budget().builds);
