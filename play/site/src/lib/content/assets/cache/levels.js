// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT THIS DEVICE MADE FROM A BUILD, KEPT — each derived level (../render/simplify.js) and picture (../render/impostors.js)
 * in the device's cache (./store.js) under the build, the level and its maker's version, so a second visit or world
 * makes none again (play/SPEC.md §4.5). A declared level is a build, kept as builds are (./builds.js).
 */
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { BUILD_START } from '../../../kernel/builds.js';
import { isHash } from '../../../kernel/hash.js';
import { packed, unpacked } from './packed.js';
import { LEVEL, LIMIT, added, folder, inLine, keeps, lost, quiet, read, removed, touch, write } from './store.js';

/** the context a level's key is derived in: another than a build's, so no level's key is ever a build's */
const LEVELS_CONTEXT = 'maiaCITY 2026-11-07 asset levels';

/**
 * The cache key of what is made from a build here (play/SPEC.md §4.5, ../lodcard.js): `build` (`<recipe hash>?values`,
 * canonical as ../load.js names it), `level` (1, 2 … or 'picture'), `plan` (budget, error …, or pixels), `deriver` its
 * maker's `VERSION` (../render/simplify.js, ../render/impostors.js): the same inputs make the same level, once a device.
 * @param {{ build: string, level: number | string, plan?: unknown, deriver: number | string }} o @returns {string} 64 hex digits
 */
export function levelKeyOf({ build, level, plan, deriver }) {
	if (typeof build !== 'string' || !BUILD_START.test(build)) throw new Error('no build');
	if (deriver === undefined || deriver === null) throw new Error("no deriver's version");
	return bytesToHex(blake3(utf8ToBytes(JSON.stringify([build, level, plan ?? null, deriver])), { context: utf8ToBytes(LEVELS_CONTEXT) }));
}

/** What was made from a build and kept under `key` (`levelKeyOf`), plain data as kept; undefined if none or unreadable
 * (then dropped). Its maker's caller checks it. @param {string} key @returns {Promise<any>} */
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

/** Keeps what was made under `key` as a build is kept (when builds stop coming, oldest past LIMIT let go); false if not. @param {string} key @param {any} value plain data */
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
