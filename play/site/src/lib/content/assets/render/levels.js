// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * EVERY LEVEL MADE ONCE A DEVICE — the levels of detail a renderer (./index.js) makes from a build, kept on this device
 * by the build they are made from, the level and the version of their maker (play/SPEC.md §4.5, intent a2935147):
 *
 * - a level derived by simplifying (./simplify.js, beside the page: ./lower.js), kept as what the simplifier made of
 *   each of the build's drawings (plain arrays), and a level again (./lower.js `levelOf`) on the build it came from;
 * - a picture (./impostors.js), kept as its two images' pixels (its views' colours; their normals and depth),
 *   deflated, lossless (`packFrames`), laid on a page again with nothing baked.
 *
 * Each under its key (../cache.js `levelKeyOf`): the build's name (`<recipe hash>?values`, which holds its recipe, its
 * engine and its values), the level (or 'picture'), what it is made to (its plan: its budget, how far it may stray …;
 * a picture's pixels a side) and the maker's version (./simplify.js `VERSION`, ./impostors.js `VERSION`). So a second
 * visit, or a second world on the same device, makes none of them again; a maker changed makes them anew. A declared
 * level (a recipe's own, ../lodcard.js) is a build, kept by the cache as builds are.
 *
 * Nothing kept is trusted further than a build read from the cache is: a level whose drawings don't fit its build, or
 * pictures of another size, are refused, dropped from use and made again.
 */
import { VERSION as SIMPLIFIER } from './simplify.js';
import { VERSION as PHOTOGRAPHER } from './impostors.js';
import { levelOf } from './lower.js';
import * as cache from '../cache.js';

/** the versions of what makes a build's levels, as their keys hold them */
export const DERIVER = { simplify: SIMPLIFIER, picture: PHOTOGRAPHER };

/** the key a level made from `build` to `plan` is kept by @param {string} build @param {number} L @param {object} plan */
export const levelKey = (build, L, plan, deriver = DERIVER.simplify) => cache.levelKeyOf({ build, level: L, plan, deriver });
/** the key a build's picture, `px` pixels a side, is kept by @param {string} build @param {number} px */
export const pictureKey = (build, px, deriver = DERIVER.picture, views) => cache.levelKeyOf({ build, level: 'picture', plan: views ? { px, views } : { px }, deriver });

/**
 * A picture's images as kept: one run of their pixels, deflated where this browser can (CompressionStream: what
 * is not the thing is see-through and empty, so a picture keeps a fraction of its bytes), lossless.
 * @param {Uint8Array[]} frames @returns {Promise<{ frames: number, bytes: number, deflated: boolean, data: Uint8Array }>}
 */
export async function packFrames(frames) {
	const bytes = frames.reduce((n, f) => n + f.length, 0);
	const all = new Uint8Array(bytes);
	let at = 0;
	for (const f of frames) all.set(f, at), (at += f.length);
	if (typeof CompressionStream !== 'function') return { frames: frames.length, bytes, deflated: false, data: all };
	const data = new Uint8Array(await new Response(new Blob([all]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
	return { frames: frames.length, bytes, deflated: true, data };
}

/** the other way: the frames again, or undefined for what doesn't read as kept pictures */
export async function unpackFrames(kept) {
	if (!kept || typeof kept !== 'object' || !(kept.data instanceof Uint8Array) || !Number.isInteger(kept.frames) || kept.frames < 1 || !Number.isInteger(kept.bytes) || kept.bytes % kept.frames) return undefined;
	let all = kept.data;
	if (kept.deflated) {
		if (typeof DecompressionStream !== 'function') return undefined;
		try {
			all = new Uint8Array(await new Response(new Blob([kept.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
		} catch {
			return undefined;
		}
	}
	if (all.length !== kept.bytes) return undefined;
	const each = kept.bytes / kept.frames;
	return Array.from({ length: kept.frames }, (_, f) => all.slice(f * each, (f + 1) * each));
}

/** whether what the simplifier made, kept, fits the build it was made from: one entry for each of its drawings */
function fits(source, made) {
	if (!made || typeof made !== 'object' || !Array.isArray(made.draws) || made.draws.length !== source.draws.length) return false;
	return made.draws.every((r, i) => {
		if (r === 'same' || r === null) return true;
		if (!r || typeof r !== 'object') return false;
		if (r.copies && !(r.copies instanceof Uint32Array || Array.isArray(r.copies) || ArrayBuffer.isView(r.copies))) return false;
		if (r.copies && Array.from(r.copies).some((c) => !Number.isInteger(c) || c < 0 || c >= source.draws[i].n)) return false;
		if (!r.index) return true;
		if (!ArrayBuffer.isView(r.index) || r.index.length % 3) return false;
		const pos = r.attributes?.position;
		if (!pos || !ArrayBuffer.isView(pos.array) || pos.itemSize !== 3) return false;
		const corners = pos.array.length / 3;
		for (const a of Object.values(r.attributes)) if (!ArrayBuffer.isView(a?.array) || !(a.itemSize > 0) || a.array.length !== corners * a.itemSize) return false;
		for (let j = 0; j < r.index.length; j++) if (r.index[j] >= corners) return false;
		return true;
	});
}

/**
 * A renderer's keeper of the levels it makes.
 * @param {{ lowering: ReturnType<import('./lower.js').createLowering>, store?: { getLevel: (key: string) => Promise<any>, putLevel: (key: string, value: any) => Promise<boolean> }, of?: typeof levelOf, keep?: boolean }} o
 *   `store` this device's cache (../cache.js), `of` how a level is made of what the simplifier made (./lower.js
 *   `levelOf`), `keep: false` keeps nothing and reads nothing (a renderer told `cache: false`)
 */
export function createKept(o) {
	const store = o.store ?? cache;
	const of = o.of ?? levelOf;
	const keep = o.keep !== false;
	/** what was made here, and what was read from this device's cache instead */
	const counted = { derived: 0, keptLevels: 0, taken: 0, keptPictures: 0, unkept: 0, why: '', keeping: 0 };
	/** what was made and could not be kept (its picture not read back, its file not written): counted, its reason the last */
	const lost = (why) => {
		counted.unkept++;
		counted.why = String(why?.message ?? why).slice(0, 200);
	};

	const read = async (key) => (keep ? await Promise.resolve(store.getLevel(key)).catch(() => undefined) : undefined);
	const put = (key, value) =>
		keep
			? Promise.resolve(store.putLevel(key, value))
					.catch(() => false)
					.then((ok) => (ok || lost('not written to the cache'), ok))
			: Promise.resolve(false);
	/** what is being kept now (read back, packed, written): counted until it is (`counted.keeping`) */
	const keeping = (p) => {
		counted.keeping++;
		return p.finally(() => counted.keeping--);
	};

	return {
		counted,
		/**
		 * The levels of `source` (a build's, named `build`) each plan asks for, each read from this device's cache by its
		 * key, else made by the simplifier (together, its corners welded once for all) and kept. `later`: as
		 * ./lower.js's. In the order of `plans`.
		 * @param {string} build @param {import('./prepare.js').Level} source @param {{ L: number, plan: object }[]} plans @param {boolean} [later]
		 */
		async lower(build, source, plans, later = false) {
			const keys = plans.map(({ L, plan }) => levelKey(build, L, plan));
			const got = await Promise.all(keys.map(read));
			const out = new Array(plans.length);
			const missing = [];
			got.forEach((made, i) => {
				if (made !== undefined && fits(source, made)) {
					out[i] = of(source, made);
					out[i].kept = true;
					counted.keptLevels++;
				} else missing.push(i);
			});
			if (missing.length) {
				const made = await o.lowering.lower(source, missing.map((i) => plans[i].plan), later, true);
				missing.forEach((i, n) => {
					out[i] = of(source, made[n]);
					counted.derived++;
					keeping(put(keys[i], made[n]));
				});
			}
			return out;
		},
		/**
		 * A build's picture: laid on a page from this device's cache by its key, else taken (`take`) and, once read back
		 * off the graphics card (`frames`), kept. `pictures` the renderer's (./impostors.js). Gives its slot, and
		 * whether it was photographed now (`taken`).
		 * @param {string} build @param {import('./prepare.js').Level} level @param {ReturnType<import('./impostors.js').createImpostors>} pictures
		 */
		async picture(build, level, pictures) {
			// kept by the version its renderer's pictures are made by (WebGPU's apart from WebGL's: ./impostors.js `deriver`)
			const key = pictureKey(build, pictures.px, pictures.deriver ?? DERIVER.picture, pictures.views);
			const frames = await unpackFrames(await read(key));
			if (frames !== undefined) {
				try {
					const slot = pictures.put(level, frames);
					counted.keptPictures++;
					return { slot, taken: false };
				} catch {
					// (of another size, or spoiled: taken again)
				}
			}
			const slot = pictures.add(level);
			counted.taken++;
			if (keep)
				keeping(
					Promise.resolve(pictures.read?.(slot))
						.then(async (f) => (f ? put(key, await packFrames(f)) : lost('no pictures read back')))
						.catch(lost)
				);
			return { slot, taken: true };
		}
	};
}
