// What a story's film needs from play besides its body, read before it is composed (./compose.ts) and while its frame
// plays: the compositions its shots name, what play knows of each live shot's asset version and each world shot's world
// (intents f270269e, 65d04790), and every file the sealed frame asks for. Every file of play's is held to its hash.
// An input play cannot give is left out with a warning naming it: its shot then shows its still (./compose.ts).
import { api, fileBlob, fileText, siteBlob } from '$lib/api';
import { enginesOf, pathOf } from '$lib/kernel/engines.js';
import { LIVE_BEFORE, VENDOR } from './compose';
import { clipsOf, type Links, type Shot, type StoryBody } from './timeline';
import type { Live, LiveAsset, World, WorldAsset } from './live';
import fontUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';

/** HyperFrames' runtime and GSAP come with the site as text, fetched when a film first plays (@hyperframes/core's
 *  package exports leave its runtime out, so it is read from its folder) */
const CODE: Record<string, () => Promise<{ default: string }>> = {
	[VENDOR.runtime.hash]: () => import('../../../node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js?raw'),
	[VENDOR.gsap.hash]: () => import('gsap/dist/gsap.min.js?raw')
};
/** a live shot's code the site serves, held to its hash by feed: the frozen box engines, as every asset viewer loads
 *  them, and the live runtime, frozen beside them (scripts/live-runtime.ts --check rebuilds it) */
const SERVED: Record<string, string> = {
	...Object.fromEntries(enginesOf('box').map((e: { v: number; blake3: string }) => [e.blake3, pathOf('box', e.v)])),
	[VENDOR.live.hash]: '/live/live-runtime.js',
	...Object.fromEntries(LIVE_BEFORE.map((h) => [h, `/live/${h}.js`])),
	[VENDOR.font.hash]: fontUrl
};

/** a file the frame asks for by its hash: the site's own where it serves it, else play's */
export const fileOf = (h: string): Promise<Blob> => (CODE[h] ? CODE[h]().then((m) => new Blob([m.default])) : SERVED[h] ? siteBlob(SERVED[h]) : fileBlob(h));

const warn = (what: string, e: unknown) => console.warn(`${what}: ${(e as Error)?.message ?? e}`);
const bodiesOf = (s: StoryBody, links: Links) => [s, ...Object.values(links).map((l) => l.body)].filter(Boolean) as StoryBody[];

/** the compositions the story's shots (and its links') name, by hash, each held to it */
export async function compositions(s: StoryBody, links: Links): Promise<Record<string, string>> {
	const want = [...new Set(bodiesOf(s, links).flatMap((b) => clipsOf<Shot>(b, 'shots')).map((x) => x.composition).filter((h): h is string => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)))];
	const got = await Promise.all(want.map((h) => fileText(h).then((text) => [[h, text]], (e) => (warn(`composition ${h.slice(0, 10)}…`, e), []))));
	return Object.fromEntries(got.flat());
}

const piecesIn = (v: any): string[] => (Array.isArray(v?.pieces) ? v.pieces.map((p: any) => (typeof p === 'string' ? p : p?.hash)).filter((p: unknown) => typeof p === 'string') : []);

/** what play knows of each asset version a live shot draws (GET /api/assets/<its UUID>): its recipe, pieces and engine */
export async function liveAssets(bodies: StoryBody[]): Promise<Record<string, LiveAsset>> {
	const lives = bodies.flatMap((b) => clipsOf<Shot>(b, 'shots')).map((x) => x.live as Live | undefined).filter((l): l is Live => !!l && typeof l.asset === 'string');
	const out: Record<string, LiveAsset> = {};
	await Promise.all([...new Set(lives.map((l) => l.asset))].map(async (id) => {
		const a = await api<{ versions?: any[] }>(`/assets/${encodeURIComponent(id)}`).catch((e) => warn(`live shot's asset ${id.slice(0, 8)}`, e));
		for (const v of a?.versions ?? [])
			if (v.recipe || v.variants?.length)
				out[v.id] = { asset: id, version: v.id, recipe: v.recipe ?? v.variants.find((x: any) => x.name === v.defaultVariant)?.recipe, pieces: piecesIn(v), engine: v.engine ?? 1, variants: Object.fromEntries((v.variants ?? []).map((x: any) => [x.name, { recipe: x.recipe, pieces: piecesIn(v) }])) };
	}));
	return out;
}

/** every piece a recipe's code requires, to any depth (../content/assets/box/pieces.js MOST_DEEP) */
async function piecesDeep(code: string, depth = 0, seen = new Set<string>()): Promise<string[]> {
	const { piecesOf, MOST_DEEP } = await import('$lib/content/assets/box/pieces.js');
	if (depth >= MOST_DEEP) return [...seen];
	for (const h of piecesOf(code) as string[]) if (!seen.has(h)) seen.add(h), await piecesDeep(await fileText(h), depth + 1, seen);
	return [...seen];
}

/** what play knows of each world version a world shot plays (GET /api/assets/<its UUID>): its recipe, pieces and engine,
 *  and the guests it plants, read off its build made once here in the page's own box; `told` hears how far it is */
export async function worldAssets(bodies: StoryBody[], told: (text: string) => void = () => {}): Promise<Record<string, WorldAsset>> {
	const worlds = bodies.flatMap((b) => clipsOf<Shot>(b, 'shots')).map((x) => x.world as World | undefined).filter((w): w is World => !!w && typeof w.asset === 'string' && typeof w.version === 'string');
	const out: Record<string, WorldAsset> = {};
	const once = new Map(worlds.map((w) => [w.version, w]));
	await Promise.all([...once.values()].map(async (w) => {
		try {
			told('Reading the world');
			const v = ((await api<{ versions?: any[] }>(`/assets/${encodeURIComponent(w.asset)}`)).versions ?? []).find((x: any) => x.id === w.version);
			if (!v?.recipe) return;
			const code = await fileText(v.recipe), pieces = await piecesDeep(code), engine = v.engine ?? 1;
			const [{ boxOf }, { rebuild }, { plantingsOf }] = await Promise.all([import('$lib/content/assets/load.js'), import('$lib/content/assets/box/rebuild.js'), import('$lib/content/assets/uses.js')]);
			const m = await boxOf(engine).build({ hash: v.recipe, code, pieces }, {});
			const guests: Record<string, string[]> = {};
			const kinds = [...new Set(plantingsOf(rebuild(m.data)).map((u: { ref: string }) => u.ref.slice(0, 64)))] as string[];
			let read = 0;
			await Promise.all(kinds.map(async (g) => {
				guests[g] = await piecesDeep(await fileText(g)).catch((e) => (warn(`guest ${g.slice(0, 10)}…`, e), []));
				told(`Reading its guests: ${++read} of ${kinds.length}`);
			}));
			out[w.version] = { asset: w.asset, version: w.version, recipe: v.recipe, pieces, engine, guests };
		} catch (e) {
			warn(`world ${w.asset.slice(0, 8)}`, e);
		}
	}));
	return out;
}

export async function inputsOf(s: StoryBody, links: Links, told?: (text: string) => void) {
	const bodies = bodiesOf(s, links);
	const [comps, assets, worlds] = await Promise.all([compositions(s, links), liveAssets(bodies), worldAssets(bodies, told)]);
	return { compositions: comps, assets, worlds };
}
