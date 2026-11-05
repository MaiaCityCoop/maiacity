// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE WORLD CONTRACT v1 (play/SPEC.md §4.11) — what a world's build says by the names of its nodes, read here and
 * nowhere else. A world is an asset of the group `worlds`: its recipe builds its land and names everything else it
 * stands by hash (`use:<recipe hash>?values`, ../assets/plantings.js); a world that moves is a build kept running in
 * the box (`root.userData.tick`), whose steps move its own `use:` nodes. Besides those, it says:
 *
 *   mood:<preset>?k=v          its sky and light: a preset (MOODS) and its keys over it: sun (the sun's height, °),
 *                              (fog is the density at street level; the page thins it with the eye's height, ./sky.js)
 *                              az (its bearing, ° from +z toward +x), fog (density a metre), haze (the fog's colour,
 *                              hex), lamps (1: street lamps and vehicles' head and tail lights lit), shadows (1: the
 *                              sun casts them; off under smog and overcast by default)
 *   sound:<file hash>?for=x&gain=g   a recording of play's (by its BLAKE3 hash) and what it is for: `bed` the
 *                              world's ambient loop; any other name sounds at each guest whose `state:<name>` is on
 *                              (`horn`: once each time it comes on; anything else looped while it is on)
 *   state:<name>               under a `use:` node: one of that guest's states, on while the node is visible
 *                              (STATES); `state:<i>:<colour>` a signal's head i (0-based, its heads in tree order)
 *
 * and the guests name their own parts the page drives: `light:<name>` (LIGHTS) and a signal's `lamp:<colour>`, one
 * set per head, each modelled dark (its lens off): the page draws the lit one over it, copy by copy (./lights.js). The
 * name is on the mesh itself or on a group holding it (every mesh under a named group is that light). A building's
 * `light:window` cells fall into WINDOW_SETS sets by their order, and each copy lights some of them by its seed. A
 * `light:sign` (a shop's lit sign) is lit always, unless its guest's `state:sign` says otherwise.
 */

/** a recording's or a recipe's hash */
const HASH = /^[0-9a-f]{64}$/;

/** the moods a world may be in, each its sky's numbers; a world's keys are laid over its preset */
export const MOODS = {
	'smog-dusk': { sun: 6, az: 250, fog: 0.0026, haze: '8e9396', lamps: 1, shadows: 0, zenith: '5d636b', horizon: 'b0a682', sunColor: 'd8b088', light: 0.85 },
	overcast: { sun: 30, az: 200, fog: 0.003, haze: 'a7a9a8', lamps: 0, shadows: 0, zenith: '7d8389', horizon: 'b9bbb8', sunColor: 'e6e3dc', light: 0.9 },
	'clear-day': { sun: 40, az: 220, fog: 0.0012, haze: 'd4e0ea', lamps: 0, shadows: 1, zenith: '5a8ccc', horizon: 'dde7ee', sunColor: 'fff1d6', light: 1.2 },
	night: { sun: -12, az: 250, fog: 0.004, haze: '20232a', lamps: 1, shadows: 0, zenith: '07080c', horizon: '1d2028', sunColor: '8090b0', light: 0.12 },
	// inside (a shop, a checkout): no sky, no sun, no fog, a flat soft light from everywhere, its lamps and signs lit
	indoor: { sun: -90, az: 0, fog: 0, haze: 'd8d8d4', lamps: 1, shadows: 0, zenith: 'e8e8e4', horizon: 'd8d8d4', sunColor: 'ffffff', light: 0.9, indoor: 1 }
};
export const DEFAULT_MOOD = 'overcast';

/** the lights a guest's parts may be named for, and the state each follows */
export const LIGHTS = {
	head: 'head',
	tail: 'tail',
	brake: 'brake',
	'indicator-l': 'indicator-l',
	'indicator-r': 'indicator-r',
	'beacon-blue': 'beacon',
	'beacon-red': 'beacon',
	'beacon-amber': 'beacon',
	reverse: 'reverse',
	lamp: 'lamp',
	window: 'window',
	sign: 'sign'
};
/** how many sets a building's windows fall into, each lit or dark by the guest's seed (so no two blocks are lit alike) */
export const WINDOW_SETS = 4;
/** a signal head's lamps */
export const LAMPS = ['red', 'amber', 'green'];
/** the lights lit by the mood where a guest says nothing of them */
export const BY_MOOD = new Set(['head', 'tail', 'lamp', 'window']);
/** the lights lit whatever the mood, unless a guest's state says otherwise: a shop's sign */
export const ALWAYS = new Set(['sign']);

/** `k=v&…` as an object of strings (bounded: a node's name is at most 120 characters) */
export function query(q) {
	const out = {};
	for (const part of String(q ?? '').split('&')) {
		if (!part) continue;
		const i = part.indexOf('=');
		const k = decodeURIComponent(i < 0 ? part : part.slice(0, i));
		if (/^[a-z][a-z0-9-]{0,23}$/.test(k)) out[k] = decodeURIComponent(i < 0 ? '' : part.slice(i + 1)).slice(0, 40);
	}
	return out;
}

const num = (v, lo, hi, d) => {
	const x = Number(v);
	return v !== undefined && v !== '' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d;
};
const hex = (v, d) => (/^[0-9a-f]{6}$/i.test(String(v ?? '')) ? String(v).toLowerCase() : d);

/** a mood node's name read: its preset with its keys over it (unknown presets are the default's) */
export function moodOf(name) {
	const m = /^mood:([a-z-]{1,24})(?:\?(.*))?$/.exec(String(name ?? ''));
	const preset = m && Object.hasOwn(MOODS, m[1]) ? m[1] : DEFAULT_MOOD;
	const base = MOODS[preset];
	const q = m ? query(m[2]) : {};
	return {
		preset,
		sun: num(q.sun, -30, 90, base.sun),
		az: num(q.az, -360, 360, base.az),
		fog: num(q.fog, 0, 0.05, base.fog),
		haze: hex(q.haze, base.haze),
		lamps: num(q.lamps, 0, 1, base.lamps) >= 0.5,
		// the sun's shadows: none under an overcast or smoggy sky (no sun to cast them, and every caster drawn twice), a
		// clear day's; `shadows=1` asks for them anyway
		shadows: num(q.shadows, 0, 1, base.shadows) >= 0.5,
		zenith: hex(q.zenith, base.zenith),
		horizon: hex(q.horizon, base.horizon),
		sunColor: base.sunColor,
		light: base.light,
		indoor: base.indoor === 1
	};
}

/** a sound node's name read: `{ hash, for, gain }`, or null */
export function soundOf(name) {
	const m = /^sound:([0-9a-f]{64})(?:\?(.*))?$/.exec(String(name ?? ''));
	if (!m) return null;
	const q = query(m[2]);
	const what = /^[a-z][a-z0-9-]{0,23}$/.test(q.for ?? '') ? q.for : 'bed';
	return { hash: m[1], for: what, gain: num(q.gain, 0, 2, 1), once: what === 'horn' || q.once === '1' };
}

/** a state node's name read: `{ name, head }` (head the signal head it is for, or -1), or null */
export function stateOf(name) {
	const m = /^state:(?:(\d{1,2}):)?([a-z][a-z0-9-]{0,23})$/.exec(String(name ?? ''));
	return m ? { name: m[2], head: m[1] === undefined ? -1 : Number(m[1]) } : null;
}

/** a guest's part named for a light: `{ light, state }` or `{ lamp }`, or null */
export function lightOf(name) {
	const s = String(name ?? '');
	let m = /^light:([a-z-]{1,24})$/.exec(s);
	if (m && Object.hasOwn(LIGHTS, m[1])) return { light: m[1], state: LIGHTS[m[1]] };
	m = /^lamp:([a-z]{1,8})$/.exec(s);
	if (m && LAMPS.includes(m[1])) return { lamp: m[1] };
	return null;
}

/**
 * What a world's build says of itself (its root, as rebuilt in the page): its mood, its sounds, and whether it moves.
 * @param {import('three').Object3D} root
 */
export function worldOf(root) {
	let mood = null;
	const sounds = [];
	root.traverse((o) => {
		const n = o.name ?? '';
		if (!mood && n.startsWith('mood:')) mood = moodOf(n);
		else if (n.startsWith('sound:')) {
			const s = soundOf(n);
			if (s && HASH.test(s.hash) && sounds.length < 32) sounds.push(s);
		}
	});
	return { mood: mood ?? moodOf(''), sounds, moves: root.userData?.view?.ticks === true };
}

/**
 * A guest's states now: by name, on or off; and by signal head, its lamps. Read off its node's `state:` children.
 * @param {import('three').Object3D} node
 * @returns {{ on: Map<string, boolean>, heads: Map<number, Map<string, boolean>> }}
 */
export function statesOf(node, out = { on: new Map(), heads: new Map() }) {
	out.on.clear();
	out.heads.clear();
	for (const c of node.children) {
		const s = stateOf(c.name);
		if (!s) continue;
		if (s.head < 0) out.on.set(s.name, c.visible);
		else {
			let h = out.heads.get(s.head);
			if (!h) out.heads.set(s.head, (h = new Map()));
			h.set(s.name, c.visible);
		}
	}
	return out;
}

/** how fast the page blinks and flashes (Hz): an indicator, a beacon's two colours turn about */
export const BLINK = 1.5;
export const FLASH = 2.5;

/**
 * Whether one light of a guest is lit now: by its state where the guest has one, else by the mood; an indicator
 * blinks and a beacon's two colours turn about, on the page's clock `t` (s), each guest at its own phase.
 * @param {{ light?: string, state?: string, lamp?: string, head?: number, set?: number }} part
 * @param {{ on: Map<string, boolean>, heads: Map<number, Map<string, boolean>> }} states
 * @param {{ lamps: boolean }} mood @param {number} t @param {number} [phase] 0..1
 */
export function litNow(part, states, mood, t, phase = 0) {
	if (part.lamp) {
		const h = states.heads.get(part.head ?? 0);
		if (h?.has(part.lamp)) return h.get(part.lamp);
		return states.on.get(part.lamp) === true;
	}
	const on = states.on.has(part.state) ? states.on.get(part.state) : ALWAYS.has(part.state) || (BY_MOOD.has(part.state) && mood.lamps);
	if (!on) return false;
	if (part.state === 'indicator-l' || part.state === 'indicator-r') return (t * BLINK + phase) % 1 < 0.5;
	if (part.state === 'beacon') return ((t * FLASH + phase) % 1 < 0.5) === (part.light !== 'beacon-red');
	// a building's windows: each set of them lit or dark by the copy's seed, about two in three lit
	if (part.state === 'window') return ((Math.sin((part.set ?? 0) * 12.9898 + phase * 78.233) * 43758.5453) % 1 + 1) % 1 < 0.68;
	return true;
}
