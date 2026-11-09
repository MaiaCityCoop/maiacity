// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * PLAY'S FILES, ON THIS DEVICE — a file of play's (a recipe, a piece) by its BLAKE3 hash: read from play's own origin
 * (../../../kernel/files.js), held to the hash, kept in the device's cache (./store.js), held again whenever read back.
 */
import { fileUrl } from '../../../kernel/files.js';
import { holds, isHash } from '../../../kernel/hash.js';
import { FILE, LIMIT, added, folder, lost, read, touch, write } from './store.js';

/** A file kept here by hash; undefined if none. Not held to it here (`playFile` does). @param {string} hash @returns {Promise<Uint8Array | undefined>} */
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

/** Keeps a file (read from play and held) under its hash, as a build is kept; false if not kept. @param {string} hash @param {Uint8Array} bytes */
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
 * A file of play's by hash, held to it: this device's copy, else play's (`fileUrl`), kept once it holds; null where play
 * has none (404); throws `failed(status)` otherwise.
 * @param {string} hash @param {(status: number) => Error} failed @returns {Promise<Uint8Array | null>}
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
