// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * The device's asset cache (builds ./builds.js, levels ./levels.js, play's files ./files.js) in OPFS, a folder of its own
 * (DIR) bounded at LIMIT bytes. Never the truth (the recipe is): it may be emptied any time. Written in its own worker
 * (./cache.worker.js) once builds stop coming in (`quiet`), so a loading world has the GPU for its frames. Nothing in
 * IndexedDB (Samuel 2026-10-20): the old database is deleted once on each device (`OLD`).
 */
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { HEX } from '../../../kernel/hash.js';
import { budget } from '../../render/budget.js';

export const LIMIT = 512 * 1024 * 1024;
const DIR = 'asset-cache';
/** a build's file is named BUILD + its key, one of play's files FILE + its hash, a level LEVEL + its key */
export const BUILD = 'build-', FILE = 'recipe-', LEVEL = 'level-';
const ENTRY = new RegExp(`^(build|recipe|level)-${HEX}$`);
/** the file where when each entry was last used is noted, by its file's name */
const USED = 'used.json';
/** the IndexedDB database the cache was kept in until 2026-10-20: deleted (Samuel 2026-10-20, "ok for deleting indexdb") */
const OLD = 'maiacity-asset-cache';

/** the cache's worker (./cache.worker.js), started when it is first asked; null where there is none, or it stopped */
let worker;
let job = 1;
/** @type {Map<number, { ok: (answer: any) => void, no: (e: Error) => void }>} */
const asked = new Map();
export function workerOf() {
	if (worker !== undefined) return worker;
	worker = null;
	if (typeof Worker === 'undefined') return null;
	try {
		const w = new Worker(new URL('./cache.worker.js', import.meta.url), { type: 'module' });
		w.onmessage = (e) => {
			const j = asked.get(e.data.id);
			asked.delete(e.data.id);
			if (e.data.error) j?.no(new Error(e.data.error));
			else j?.ok(e.data);
		};
		// a worker that cannot start: the page writes the pictures and the files itself
		w.onerror = (e) => {
			e.preventDefault?.();
			w.terminate();
			worker = null;
			for (const j of asked.values()) j.no(new Error("the cache's worker stopped"));
			asked.clear();
		};
		worker = w;
	} catch {
		// (a browser that starts no module worker: the page writes the files itself)
		worker = null;
	}
	return worker;
}

/** @param {Worker} w @param {object} message @param {Transferable[]} moved */
export const ask = (w, message, moved) =>
	new Promise((ok, no) => {
		const id = job++;
		asked.set(id, { ok, no });
		w.postMessage({ id, ...message }, moved);
	});

let opened;
/** The cache's folder, or null where none (a private window, storage off); first opened, the old database (`OLD`) is deleted. */
export function folder() {
	return (opened ??= (async () => {
		try {
			globalThis.indexedDB?.deleteDatabase(OLD);
		} catch {
			// (none, or none to delete here)
		}
		try {
			return await (await navigator.storage.getDirectory()).getDirectoryHandle(DIR, { create: true });
		} catch {
			// (a private window, storage turned off: nothing is kept)
			return null;
		}
	})());
}

export async function read(d, name) {
	try {
		return new Uint8Array(await (await (await d.getFileHandle(name)).getFile()).arrayBuffer());
	} catch (e) {
		if (e?.name === 'NotFoundError') return undefined;
		throw e;
	}
}

/** the file written, and taken away again, to learn how this page writes the cache's files */
const CAN = 'can';
let writer;
/**
 * How this page writes the cache's files, learnt once by writing one: 'worker' (OPFS's synchronous files there), else
 * 'page', else null (no folder, or a WebKit with OPFS in neither): it keeps nothing and every asset builds.
 */
function writerOf() {
	return (writer ??= (async () => {
		const d = await folder();
		if (!d) return null;
		const w = workerOf();
		// (a worker that never answers is one that can't)
		const can = w && Promise.race([ask(w, { op: 'can', dir: DIR, name: CAN }, []), new Promise((ok) => setTimeout(ok, 5000, {}))]);
		if (can && (await can.then((a) => a.can === true, () => false))) return 'worker';
		try {
			const file = await (await d.getFileHandle(CAN, { create: true })).createWritable();
			await file.write(new Uint8Array(1));
			await file.close();
			await removed(d, CAN);
			return 'page';
		} catch {
			// (WebKit's pages write no file of OPFS either)
			return null;
		}
	})());
}

/** Whether this device keeps builds at all (a folder and a writer, `writerOf`); else nothing is kept and every asset builds in the box. */
export const keeps = async () => !!(await writerOf());

/** Writes `bytes` as file `name` of folder `d`, whole: in the worker (handed over, so the caller keeps no use of them), else here. */
export async function write(d, name, bytes) {
	const how = await writerOf();
	const w = how === 'worker' && workerOf();
	if (w) {
		await ask(w, { op: 'write', dir: DIR, name, bytes }, [bytes.buffer]);
		return;
	}
	if (!how) throw new Error('this browser writes no file of the cache');
	const file = await (await d.getFileHandle(name, { create: true })).createWritable();
	try {
		await file.write(bytes);
		await file.close();
	} catch (e) {
		if (file.abort) await lost(file.abort());
		throw e;
	}
}

export const removed = (d, name) => d.removeEntry(name).then(() => true, (e) => e?.name === 'NotFoundError');

/** the cache's entries: each one's file's name, its bytes and when it was written (ms) */
async function entries(d) {
	const found = [];
	for await (const [name, handle] of d.entries()) {
		if (handle.kind !== 'file' || !ENTRY.test(name)) continue;
		try {
			const f = await handle.getFile();
			found.push({ name, bytes: f.size, at: f.lastModified });
		} catch {
			// (one being written: counted next time)
		}
	}
	return found;
}

/** when each entry was last used, as USED notes it: by its file's name, ms */
async function usedIn(d) {
	try {
		const noted = JSON.parse(new TextDecoder().decode(await read(d, USED)));
		return Object.fromEntries(Object.entries(noted).filter(([k, t]) => ENTRY.test(k) && Number.isFinite(t)));
	} catch {
		// (none noted yet, or a note spoiled: every entry by when it was written)
		return {};
	}
}

/** the entries this page used, by their file's name, and when (ms), not yet noted in USED */
const touched = new Map();
let noting = 0;
/** an entry used: noted in USED with the others used meanwhile, once none was used for QUIET ms */
export function touch(name) {
	touched.set(name, Date.now());
	clearTimeout(noting);
	noting = setTimeout(() => lost(inLine(note)), QUIET);
}
async function note() {
	const d = await folder();
	if (!d || !touched.size) return;
	const used = await usedIn(d);
	for (const [k, t] of touched) used[k] = Math.max(used[k] ?? 0, t);
	touched.clear();
	await write(d, USED, utf8ToBytes(JSON.stringify(used)));
}

/** What the cache could not do, settled as not done (false): only a copy is lost, as the cache is never the truth. Every kept failure goes here. */
export const lost = (p) => Promise.resolve(p).then(undefined, () => false);

let line = Promise.resolve();
/** `work` once everything written before it is: its own result, the line going on whether it failed or not */
export function inLine(work) {
	const turn = line.then(work);
	line = turn.then(
		() => undefined,
		() => undefined
	);
	return turn;
}

/** how long no build must come in before they are kept (ms), and the longest wait: a little on a small device (../../render/budget.js), each build waiting holds its data */
const QUIET = 2000, LATEST = 20000;
const waits = () => (budget().small ? { quiet: 300, latest: 2000 } : { quiet: QUIET, latest: LATEST });
let calm = [], timer = 0;
/** settles once nothing has been handed in for QUIET ms (each one handed in starts that wait again), or LATEST ms on */
export function quiet() {
	clearTimeout(timer);
	const w = waits();
	timer = setTimeout(() => {
		for (const ok of calm.splice(0)) ok();
	}, w.quiet);
	return new Promise((ok) => {
		calm.push(ok);
		setTimeout(ok, w.latest);
	});
}

/** the bytes the cache holds as this page last counted, plus what it kept since; null: to be counted */
let held = null;

/** `bytes` more written: the entries used longest ago go once it may be over LIMIT (counted once a visit, then by what is added) */
export async function added(d, bytes) {
	if (held !== null) held += bytes;
	if (held === null || held > LIMIT) held = await trim(d);
}

export const recount = () => {
	held = null;
};

/** the entries used longest ago out until the cache fits LIMIT; the bytes it holds then */
async function trim(d) {
	const files = await entries(d);
	const used = await usedIn(d);
	for (const f of files) f.at = Math.max(f.at, used[f.name] ?? 0, touched.get(f.name) ?? 0);
	files.sort((a, b) => a.at - b.at);
	let total = files.reduce((n, f) => n + f.bytes, 0);
	const left = new Set(files.map((f) => f.name));
	for (const f of files) {
		if (total <= LIMIT) break;
		if (await removed(d, f.name)) (total -= f.bytes), left.delete(f.name);
	}
	// what USED notes of entries no longer there goes with them (a note not written is written again by the next)
	const noted = Object.keys(used);
	if (noted.some((k) => !left.has(k))) await lost(write(d, USED, utf8ToBytes(JSON.stringify(Object.fromEntries(noted.filter((k) => left.has(k)).map((k) => [k, used[k]]))))));
	return total;
}

export async function clear() {
	const d = await folder();
	if (!d) return;
	const names = [];
	for await (const [name, handle] of d.entries()) if (handle.kind === 'file' && (ENTRY.test(name) || name === USED)) names.push(name);
	await Promise.all(names.map((n) => removed(d, n)));
	touched.clear();
	held = null;
}
