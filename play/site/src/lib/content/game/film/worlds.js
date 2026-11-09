// THE WORLDS A SHOT CAN BE IN — every world the film camera can shoot and its page, the one registry (Samuel 2026-10-18:
// every world from one pattern), read by ./shot.js. A shot names its world (`spec.world.sandbox`) by the sandbox's UUID
// (Samuel 2026-11-04: every reference a UUID or a hash), or `worlds` for play's asset group worlds (then its asset's
// UUID and version's recipe hash), and its place (`world.area`, the first by default). A world's page hands it to the
// film camera (../../sandbox-kit/film.js `connectFilm`). Plain JavaScript, shared by the browser and the scripts.
import { SANDBOX } from '../../../kernel/sandboxes.js';

/**
 * @typedef {string} Sandbox  a world as a shot names it (`world.sandbox`): a sandbox's UUID, or `worlds`
 * @typedef {{ label: string, range: [number, number], unit?: string }} Channel
 *   one way a world's part moves (a van along its road, a door): its name, the values it takes (a shot's kept to them), its unit
 * @typedef {{ id: string, label: string, channels: Record<string, Channel> }} Part
 *   a moving part a shot can move (`spec.parts`): a vehicle, actor, machine, door; left out, it moves as the world moves it
 * @typedef {{ label: string, route: string, areas: string[] | null, areaNames?: Record<string, string>, domes?: number, sets?: string[], parts: Part[] }} World
 *   label; route: its page (from the site's root); areas: the places a shot can be in (first the default), null for one
 *   place, named by areaNames; domes: how many a shot can name (world.dome); sets: world.props; parts: its moving parts
 */

/** a dome cell's: thirteen domes, the tired land's set */
const DOME_CELL = { areas: null, domes: 13, sets: ['tired-land'], parts: [] };
/** the moving parts of Sandbox 3's story */
const ROAD = [
	{ id: 'van', label: 'The van', channels: { along: { label: 'Along the highway', range: [0, 1], unit: '0 far out on the steppe · 1 at the bus stop' } } },
	{ id: 'pickup', label: 'The pickup', channels: { along: { label: 'Along the track', range: [0, 1], unit: '0 the gas station · 1 home' } } },
	{ id: 'tent', label: 'The bell tent', channels: { pitch: { label: 'Pitched', range: [0, 1], unit: '0 in its bag · 1 standing' } } }
];

/** @type {Record<Sandbox, World>} */
export const WORLDS = {
	[SANDBOX.one]: { label: 'Sandbox 1 · a dome cell grown from our plants', route: '/sandbox-1/', ...DOME_CELL },
	[SANDBOX.three]: { label: 'Sandbox 3 · the tired land', route: '/sandbox-3/', areas: ['A', 'B', 'C'], areaNames: { A: 'Player 1', B: 'Player 2', C: 'Player 3' }, parts: ROAD },
	[SANDBOX.five]: { label: 'Sandbox 5 · the forest dome in its own food forest', route: '/sandbox-5/', ...DOME_CELL },
	[SANDBOX.seven]: { label: 'Sandbox 7 · the planet', route: '/sandbox-7/', areas: ['planet'], parts: [] },
	worlds: { label: 'Worlds · a world of play, by its UUID and version', route: '/worlds/', areas: null, parts: [] }
};

/** Whether `id` names a world of the registry. @param {unknown} id @returns {id is Sandbox} */
export const isWorld = (id) => typeof id === 'string' && Object.hasOwn(WORLDS, id);

/** Where a shot is when it names no world: Sandbox 1. */
export const DEFAULT_SANDBOX = SANDBOX.one;

/** The film page of a shot's world, from the site's root (prefix the base path). @param {{ sandbox?: string, area?: string, asset?: string, recipe?: string }} world */
export function filmPath(world) {
	const sandbox = world.sandbox ?? DEFAULT_SANDBOX;
	// a world of play's asset group worlds: its page in film mode, the world by its asset's UUID and recipe hash
	if (sandbox === 'worlds') return `/worlds/?film&asset=${encodeURIComponent(world.asset ?? '')}&recipe=${encodeURIComponent(world.recipe ?? '')}`;
	const at = isWorld(sandbox) ? WORLDS[sandbox] : undefined;
	const area = world.area ?? at?.areas?.[0];
	return `${at?.route ?? '/'}?film${area ? `&area=${encodeURIComponent(area)}` : ''}`;
}

/** Which world a film page is, from its address (what `filmPath` made). @param {string} href
 * @returns {{ sandbox: string, area?: string, asset?: string, recipe?: string } | null} */
export function worldOfPath(href) {
	const u = new URL(href, 'http://x');
	if (!u.searchParams.has('film')) return null;
	if (/\/worlds\/?$/.test(u.pathname)) return { sandbox: 'worlds', asset: u.searchParams.get('asset') ?? '', recipe: u.searchParams.get('recipe') ?? '' };
	const sandbox = Object.keys(WORLDS).find((id) => u.pathname.endsWith(WORLDS[id].route));
	if (!sandbox) return null;
	const area = u.searchParams.get('area') ?? WORLDS[sandbox].areas?.[0];
	return { sandbox, ...(area ? { area } : {}) };
}
