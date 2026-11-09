// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * Builds kept on this device (./store.js), so a page shows an asset again without running its recipe; each read back
 * through a box answer's checks (../load.js), a spoiled entry dropped and built again. Each kept by
 *   key = BLAKE3 in its key-derivation mode, context CONTEXT, of [engine, recipe, values]
 * (the frozen engine's hash, the recipe file's hash, and the values sorted: `seed=maia&stage=9`).
 */
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { isHash } from '../../../kernel/hash.js';
import { queryOf } from '../../../kernel/builds.js';
import { packed, unpacked } from './packed.js';
import { BUILD, LIMIT, added, ask, folder, inLine, keeps, lost, quiet, read, recount, removed, touch, workerOf, write } from './store.js';

const CONTEXT = 'maiaCITY 2026-10-15 asset cache';

/** The cache key of a build. @param {{ engine: string, recipe: string, params?: Record<string, unknown> }} build @returns {string} 64 hex digits */
export function keyOf({ engine, recipe, params }) {
	if (!isHash(engine)) throw new Error('no engine hash');
	if (!isHash(recipe)) throw new Error('no recipe hash');
	return bytesToHex(blake3(utf8ToBytes(JSON.stringify([engine, recipe, queryOf(params)])), { context: utf8ToBytes(CONTEXT) }));
}

/** a picture drawn on a canvas of its size @param {ImageBitmap} bitmap */
function canvasOf(bitmap) {
	const c = new OffscreenCanvas(bitmap.width, bitmap.height);
	const g = c.getContext('2d', { willReadFrequently: true });
	g.drawImage(bitmap, 0, 0);
	return { c, g };
}

/** where a build's pictures are: on its textures in format 0 (engine 1), in `images` from format 1 on */
const LISTS = ['textures', 'images'];

/** A build's data with every box-handed ImageBitmap as `picture` (as `encode` makes it); undefined without an offscreen canvas. */
async function pictures(data, encode) {
	const lists = LISTS.filter((k) => Array.isArray(data[k]) && data[k].some((t) => t?.bitmap));
	if (!lists.length) return data;
	if (typeof OffscreenCanvas !== 'function') return undefined;
	const out = { ...data };
	for (const k of lists)
		out[k] = await Promise.all(
			data[k].map(async (t) => {
				if (!t?.bitmap) return t;
				const { bitmap, ...rest } = t;
				return { ...rest, picture: { ...(await encode(bitmap)), width: bitmap.width, height: bitmap.height } };
			})
		);
	return out;
}

/** a picture as a PNG file, written in the page (where there is no worker) @param {ImageBitmap} bitmap */
const pngHere = async (bitmap) => new Uint8Array(await (await canvasOf(bitmap).c.convertToBlob({ type: 'image/png' })).arrayBuffer());

/** a picture as a PNG file, written in the cache's worker from a copy of it (the page keeps its own), else here */
async function pngOf(bitmap) {
	const w = typeof createImageBitmap === 'function' ? workerOf() : null;
	if (w) {
		try {
			const copy = await createImageBitmap(bitmap);
			return (await ask(w, { op: 'png', bitmap: copy }, [copy])).png;
		} catch {
			// (not written there: written here)
		}
	}
	return pngHere(bitmap);
}

/** A build's data as it is stored: its pictures (ImageBitmaps, which no file holds) as PNG files, kept as their bytes. */
const storable = (data) => pictures(data, async (bitmap) => ({ png: await pngOf(bitmap) }));

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** a stored picture as a PNG file: its bytes, refused if they are not one */
function pngFile(png) {
	if (png instanceof Uint8Array && png.length > 8 && PNG.every((b, i) => png[i] === b)) return new Blob([png], { type: 'image/png' });
	throw new Error('refused: a stored picture that is no PNG');
}

/** the other way: each stored picture an ImageBitmap again, as the box hands it over (../box/rebuild.js checks it) */
async function revive(data) {
	const lists = LISTS.filter((k) => Array.isArray(data?.[k]) && data[k].some((t) => t?.picture));
	if (!lists.length) return data;
	const out = { ...data };
	for (const k of lists)
		out[k] = await Promise.all(
			data[k].map(async (t) => {
				if (!t?.picture) return t;
				const { png, width, height } = t.picture;
				const bitmap = await createImageBitmap(pngFile(png));
				if (bitmap.width !== width || bitmap.height !== height) throw new Error('refused: a stored picture of another size');
				const { picture, ...rest } = t;
				return { ...rest, bitmap };
			})
		);
	return out;
}

/** A build kept under `key`, its pictures ImageBitmaps again; undefined if none. Unchecked: ../load.js checks it as a
 * box's. @param {string} key @returns {Promise<{ data: any, card: any } | undefined>} */
export async function get(key) {
	if (!isHash(key)) return undefined;
	const d = await folder();
	if (!d) return undefined;
	let file;
	try {
		file = await read(d, BUILD + key);
	} catch {
		// (a file this browser won't hand back: as good as none)
		return undefined;
	}
	if (!file) return undefined;
	touch(BUILD + key);
	// a file that doesn't read, or a picture that will not open, is spoiled, refused like any other (../load.js drops it)
	let got;
	try {
		got = unpacked(file);
	} catch {
		return { data: null, card: null };
	}
	if (!got || typeof got !== 'object') return { data: null, card: null };
	try {
		return { ...got, data: await revive(got.data) };
	} catch {
		return { ...got, data: null };
	}
}

/** Keeps a build under `key`, the entries used longest ago going until it fits; false if not kept (no cache, an
 * unreadable picture, larger than the cache). Pictures written once builds stop coming (`quiet`), one build at a time
 * in order handed in. @param {string} key @param {{ data: any, card: any }} build */
export function put(key, { data, card }) {
	const plain = quiet()
		.then(() => keeps())
		.then((yes) => yes && storable(data));
	lost(plain);
	return inLine(() => keep(key, plain, card));
}

async function keep(key, written, card) {
	const d = await folder();
	const plain = d && isHash(key) && (await written);
	if (!plain) return false;
	try {
		const file = packed({ data: plain, card });
		// its size counted before its bytes are handed to the worker
		const bytes = file.byteLength;
		if (bytes > LIMIT) return false;
		await write(d, BUILD + key, file);
		await added(d, bytes);
		return true;
	} catch {
		// (not written: a page that finds it not kept builds it)
		return false;
	}
}

/** drops one entry (one that was refused) @param {string} key */
export async function drop(key) {
	const d = await folder();
	if (!d || !isHash(key)) return;
	await removed(d, BUILD + key);
	recount();
}
