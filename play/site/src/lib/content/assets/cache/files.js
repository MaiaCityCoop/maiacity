// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * PLAY'S FILES, ON THIS DEVICE — a file of play's (a recipe, a piece) by its hash, the BLAKE3 of its bytes: read from play's
 * own origin (never another, ../../../kernel/files.js) and held to that hash, then kept in the device's cache
 * (./store.js) under it, so a second visit reads it from here. Held to its hash again whenever it is read back.
 */
import { fileUrl } from '../../../kernel/files.js';
import { holds, isHash } from '../../../kernel/hash.js';
import { FILE, LIMIT, added, folder, lost, read, touch, write } from './store.js';

/**
 * A file kept on this device by its hash; undefined if there is none (or no cache). Not held to its hash here: the
 * reader does that (`playFile`).
 * @param {string} hash @returns {Promise<Uint8Array | undefined>}
 */
export async function fileAt(hash) {
	if (!isHash(hash)) return undefined;
	const d = await folder();
	if (!d) return undefined;
	try {
		const file = await read(d, FILE + hash);
		if (file) touch(FILE + hash);
		return file;
	} catch {
		// (a file this browser won't hand back: as good as none)
		return undefined;
	}
}

/**
 * Keeps a file under its hash (what was read from play and held to it), then lets the entries used longest ago go until
 * the cache fits, as a build kept does. False if it was not kept.
 * @param {string} hash @param {Uint8Array} bytes
 */
export async function keepFile(hash, bytes) {
	if (!isHash(hash) || !(bytes instanceof Uint8Array) || bytes.byteLength > LIMIT) return false;
	const d = await folder();
	if (!d) return false;
	try {
		// a copy of its own goes to the worker: the caller keeps its bytes
		await write(d, FILE + hash, bytes.slice());
		await added(d, bytes.byteLength);
		return true;
	} catch {
		// (not kept: read from play again next time)
		return false;
	}
}

/**
 * A file of play's by its hash, held to it: this device's copy, else play's (`fileUrl`), kept here once it holds.
 * Null where play doesn't hold it (404); throws `failed(status)` for any other answer.
 * @param {string} hash @param {(status: number) => Error} failed
 * @returns {Promise<Uint8Array | null>}
 */
export async function playFile(hash, failed) {
	const kept = await fileAt(hash);
	if (holds(kept, hash)) return kept;
	const res = await fetch(fileUrl(hash), { credentials: 'same-origin' });
	if (res.status === 404) return null;
	if (!res.ok) throw failed(res.status);
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (holds(bytes, hash)) lost(keepFile(hash, bytes));
	return bytes;
}
