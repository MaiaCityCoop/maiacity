/**
 * The frozen box engine as Bun workers (intent 90de96fb, kept apart by 4f7a2178 for its checks): its bytes held to their
 * BLAKE3 hash, and Bun's worker given what a browser worker has that the engine uses (importScripts of a blob: URL, an
 * OffscreenCanvas whose 2D drawing is a no-op). Used by scripts/world-shot.ts and src/lib/stories/old-city.bun.test.ts (run by Bun: it needs its Worker).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { enginesOf } from '../src/lib/kernel/engines.js';
import { hashBytes } from '../src/lib/content/game/hash.js';
import type { WorkerLike } from '../src/lib/stories/world-build';

const SHIM = `const __B = Blob, __t = new Map();
self.Blob = class extends __B { constructor(p, o) { super(p, o); this.__t = p.map(String).join(''); } };
const __c = URL.createObjectURL; URL.createObjectURL = (b) => { const u = __c(b); if (b.__t != null) __t.set(u, b.__t); return u; };
self.importScripts = (u) => (0, eval)(__t.get(u));
const __none = () => new Proxy(function () {}, { get: (t, k) => (k === 'data' ? new Uint8ClampedArray(4) : __none()), apply: () => __none(), set: () => true });
globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { const c = this; return new Proxy({}, { get: (t, k) => (k === 'canvas' ? c : k === 'getImageData' ? (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(4 * w * h) }) : __none()), set: () => true }); } };
`;

/** a maker of workers of box engine `v`; `alive` told +1 as each starts and −1 as it is ended. Throws if `v` is not
 *  frozen or its bytes are not its hash's. */
export function boxWorker(v: number, alive: (n: number) => void = () => {}): () => WorkerLike {
	const e = enginesOf('box').find((x: { v: number }) => x.v === v);
	if (!e) throw new Error(`no box engine ${v} is frozen`);
	const bytes = readFileSync(resolve(import.meta.dir, `../static/engines/engine-v${v}.js`));
	if (hashBytes(bytes) !== e.blake3) throw new Error(`engine ${v} does not hash to its name`);
	const url = URL.createObjectURL(new Blob([SHIM + new TextDecoder().decode(bytes)], { type: 'text/javascript' }));
	return () => {
		const w = new Worker(url) as unknown as WorkerLike;
		alive(1);
		const end = w.terminate.bind(w);
		let ended = false;
		w.terminate = () => (ended || ((ended = true), alive(-1)), end());
		return w;
	};
}
