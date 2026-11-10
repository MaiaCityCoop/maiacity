/*
 * WHAT A CENSUS BUILT, KEPT — a world's kinds are built in workers: each recipe in the asset box (./box.ts), each
 * lower level in the simplifying worker (assets/render/lower.js). Both answer a question whole: the same code asked
 * the same thing answers the same. So the census keeps each answer on disk under the hash of its code and its
 * question, and a kind is built once, whichever commit, world or run asks for it next (intent 629840f2): main's
 * census and the head's share every kind neither changed, and only what a change touches is built again.
 *
 * Nothing is looked up by a name, a version or a time: a key is the SHA-256 of the code that answers (`codeOf`: a
 * module and every module it imports, or the box's whole script) and of the question's own bytes. A changed recipe,
 * engine, value, plan or simplifier is another key. `CENSUS_KEPT=0` keeps nothing (every kind built, as before).
 */
import { deserialize, serialize } from 'bun:jsc';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type Kept = {
	/** the answer kept under `key`, or undefined */
	get(key: string): unknown;
	/** keeps `answer` (anything a worker can post) under `key` */
	put(key: string, answer: unknown): void;
	/** how many answers were read, and how many made and kept, since it was opened */
	counted: { read: number; made: number };
};

/** a key: the SHA-256 of its parts, each one's length before it, so no two lists of parts share a key */
export function keyOf(...parts: (string | Uint8Array)[]) {
	const h = createHash('sha256');
	for (const p of parts) {
		const bytes = typeof p === 'string' ? Buffer.from(p) : p;
		h.update(`${bytes.byteLength}:`).update(bytes);
	}
	return h.digest('hex');
}

/** a question's own bytes: what a worker is posted, as the structured clone would carry it */
export const bytesOf = (question: unknown) => new Uint8Array(serialize(question));

/** the answers kept in `dir`; none kept (every get undefined, every put dropped) where dir is null */
export function keptIn(dir: string | null): Kept {
	const counted = { read: 0, made: 0 };
	if (!dir) return { get: () => undefined, put: () => {}, counted };
	const at = (key: string) => join(dir, key.slice(0, 2), key);
	return {
		counted,
		get(key) {
			const file = at(key);
			if (!existsSync(file)) return undefined;
			try {
				const answer = deserialize(Bun.zstdDecompressSync(readFileSync(file)));
				// used now: what a store lets go first is what was used longest ago (`trim`)
				utimesSync(file, new Date(), new Date());
				counted.read++;
				return answer;
			} catch {
				// (a file cut short: as good as none, and written again)
				return undefined;
			}
		},
		put(key, answer) {
			const file = at(key);
			mkdirSync(dirname(file), { recursive: true });
			// whole or not at all: another census may read it meanwhile (main's and the head's side by side)
			const part = `${file}.${process.pid}.part`;
			writeFileSync(part, Bun.zstdCompressSync(new Uint8Array(serialize(answer)), { level: 1 }));
			renameSync(part, file);
			counted.made++;
		}
	};
}

/**
 * Lets go of every answer in `dir` not used (read or made) in the `days` before `now` (ms): a recipe no world draws any
 * more, a simplifier since changed. How many went. `bun kept.ts --trim <days> [dir]` before a store is saved.
 */
export function trimmed(dir: string, days: number, now: number) {
	if (!existsSync(dir)) return 0;
	let gone = 0;
	for (const sub of readdirSync(dir)) {
		for (const name of readdirSync(join(dir, sub))) {
			const file = join(dir, sub, name);
			if (statSync(file).mtimeMs < now - days * 86_400_000) rmSync(file), gone++;
		}
	}
	return gone;
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"\n]+)['"]/g;
const real = (f: string) => [f, `${f}.js`, `${f}.ts`, join(f, 'index.js'), join(f, 'index.ts')].find((x) => existsSync(x) && !x.endsWith('/'));

/**
 * The code a module is: the hash of its text and of every module it imports by a relative path, and for each package
 * it imports the version installed in `modules` (node_modules). Two trees whose simplifier reads the same answer alike.
 */
export function codeOf(file: string, modules: string) {
	const seen = new Map<string, string>(), packages = new Map<string, string>();
	const follow = (f: string) => {
		if (seen.has(f)) return;
		const text = readFileSync(f, 'utf8');
		seen.set(f, text);
		for (const m of text.matchAll(IMPORT)) {
			const s = m[1];
			if (s.startsWith('.')) {
				const to = real(resolve(dirname(f), s));
				if (!to) throw new Error(`census: ${f} imports ${s}, which is no file`);
				follow(to);
			} else {
				const name = s.split('/').slice(0, s.startsWith('@') ? 2 : 1).join('/');
				const pkg = join(modules, name, 'package.json');
				packages.set(name, existsSync(pkg) ? String(JSON.parse(readFileSync(pkg, 'utf8')).version) : '');
			}
		}
	};
	follow(resolve(file));
	// by each module's place from the first one, so the same code in another checkout is the same code
	const from = dirname(resolve(file));
	const parts = [...seen].map(([f, text]) => `${f.startsWith(from) ? f.slice(from.length) : f}\n${text}`).sort();
	return keyOf(...parts, JSON.stringify([...packages].sort()));
}

type Listener = ((e: { data: any }) => void) | null;

/**
 * A worker that answers each message `{ id, …question }` once with `{ id, …answer }` (or `{ id, error }`), its answers
 * kept: a question asked before is answered from `kept`, and the real worker (`make`) starts only for one that is new.
 */
export function keptWorker(make: () => Worker, kept: Kept, code: string) {
	let worker: Worker | null = null;
	const asked = new Map<unknown, string>();
	const self = {
		onmessage: null as Listener,
		onerror: null as ((e: ErrorEvent) => void) | null,
		postMessage(m: { id: unknown }) {
			const { id, ...question } = m;
			const key = keyOf(code, bytesOf(question));
			const answer = kept.get(key);
			// a turn later, as a worker answers
			if (answer !== undefined) return void setTimeout(() => self.onmessage?.({ data: { ...(answer as object), id } }), 0);
			if (!worker) {
				worker = make();
				worker.onmessage = (e: MessageEvent) => {
					const k = asked.get(e.data?.id);
					asked.delete(e.data?.id);
					if (k && !e.data.error) {
						const { id: _, ...made } = e.data;
						kept.put(k, made);
					}
					self.onmessage?.(e);
				};
				worker.onerror = (e: ErrorEvent) => self.onerror?.(e);
			}
			asked.set(id, key);
			worker.postMessage(m);
		},
		terminate() {
			worker?.terminate();
			worker = null;
			asked.clear();
		}
	};
	return self;
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const days = Number(argv[argv.indexOf('--trim') + 1]);
	if (!argv.includes('--trim') || !(days > 0)) throw new Error('usage: bun kept.ts --trim <days> [<folder>]');
	const { CACHE } = await import('./tree');
	const dir = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--trim') ?? join(CACHE, 'kept');
	console.log(`kept: ${trimmed(dir, days, Date.now())} answers not used for ${days} days let go (${dir})`);
}
