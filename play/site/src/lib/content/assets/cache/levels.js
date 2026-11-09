// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT THIS DEVICE MADE FROM A BUILD, KEPT — each level of detail derived by simplifying a build
 * (../render/simplify.js) and each picture taken of it (../render/impostors.js), in the device's cache (./store.js)
 * under the build, the level and the version of its maker, so a second visit, or a second world, makes none of them
 * again (play/SPEC.md §4.5). A declared level is a build, kept as builds are (./builds.js).
 */
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { BUILD_START } from '../../../kernel/builds.js';
import { isHash } from '../../../kernel/hash.js';
import { packed, unpacked } from './packed.js';
import { LEVEL, LIMIT, added, folder, inLine, keeps, lost, quiet, read, removed, touch, write } from './store.js';

/** the context a level's key is derived in: another than a build's, so no level's key is ever a build's */
export const LEVELS_CONTEXT = 'maiaCITY 2026-11-07 asset levels';

/**
 * The cache key of what is made from a build on this device (play/SPEC.md §4.5, ../lodcard.js): a level derived from it
 * by simplifying, or its picture. `build` the build it is made from (`<recipe hash>?values`, as ../load.js names it
 * canonically), `level` which (1, 2 … or 'picture'), `plan` what it is made to (its budget, its error …, or the
 * picture's pixels), `deriver` the version of what makes it (../render/simplify.js `VERSION`, ../render/impostors.js
 * `VERSION`): the same build made the same way by the same maker is the same level, so it is made once a device.
 * @param {{ build: string, level: number | string, plan?: unknown, deriver: number | string }} o @returns {string} 64 hex digits
 */
export function levelKeyOf({ build, level, plan, deriver }) {
	if (typeof build !== 'string' || !BUILD_START.test(build)) throw new Error('no build');
	if (deriver === undefined || deriver === null) throw new Error("no deriver's version");
	return bytesToHex(blake3(utf8ToBytes(JSON.stringify([build, level, plan ?? null, deriver])), { context: utf8ToBytes(LEVELS_CONTEXT) }));
}

/**
 * What was made from a build and kept under `key` (`levelKeyOf`): a level or a picture, plain data (typed arrays,
 * numbers, strings) as it was kept; undefined if there is none (or no cache), or it doesn't read (then dropped). Its
 * maker's caller checks it is what it asked for.
 * @param {string} key @returns {Promise<any>}
 */
export async function getLevel(key) {
	if (!isHash(key)) return undefined;
	const d = await folder();
	if (!d) return undefined;
	let file;
	try {
		file = await read(d, LEVEL + key);
	} catch {
		// (a file this browser won't hand back: as good as none)
		return undefined;
	}
	if (!file) return undefined;
	touch(LEVEL + key);
	try {
		return unpacked(file);
	} catch {
		await removed(d, LEVEL + key);
		return undefined;
	}
}

/**
 * Keeps what was made from a build under `key` (`levelKeyOf`), as a build is kept: once the builds stop coming in, one
 * after another, the entries used longest ago let go past the cache's LIMIT. False if it was not kept.
 * @param {string} key @param {any} value plain data
 */
export function putLevel(key, value) {
	const turn = lost(
		quiet()
			.then(() => keeps())
			.then(async (yes) => {
				const d = yes && (await folder());
				if (!d || !isHash(key)) return false;
				const file = packed(value);
				if (file.byteLength > LIMIT) return false;
				await write(d, LEVEL + key, file);
				await added(d, file.byteLength);
				return true;
			})
	);
	return inLine(() => turn);
}
