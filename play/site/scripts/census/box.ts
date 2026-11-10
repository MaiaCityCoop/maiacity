/*
 * THE ASSET BOX, HEADLESS — the frame the shell (kernel/sandbox/frame.js) makes for the asset box, as a window that
 * does what the frame's one script does (kernel/sandbox/policy.js SHELL_SCRIPT).
 */
import type { El } from './dom';
import { atWork, keyOf, type Kept } from './kept';

// Math.random as one fixed sequence, as the Mac's runs seed every page and frame (../macjob/determinism.js): run in
// the page by the census's setup and in every worker of the box before its engine, so whatever a world picks at random
// it picks alike every run.
import { SEEDED_RANDOM } from '../macjob/determinism.js';
export { SEEDED_RANDOM };

// what a Bun worker lacks of a browser's: `importScripts` of a blob, and an OffscreenCanvas (its 2D context draws nothing)
const PRELUDE = `(() => {
	const texts = new Map();
	const B = self.Blob;
	self.Blob = class Blob extends B { constructor(parts, o) { super(parts, o); this.__text = Array.isArray(parts) && parts.every((p) => typeof p === 'string') ? parts.join('') : null; } };
	const make = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
	URL.createObjectURL = (b) => { const u = make(b); if (b && b.__text != null) texts.set(u, b.__text); return u; };
	URL.revokeObjectURL = (u) => { texts.delete(u); revoke(u); };
	// what a browser transfers that a Bun worker can't (an ImageBitmap of ours is a plain object): cloned instead
	const post = self.postMessage.bind(self);
	self.postMessage = (m, t) => post(m, Array.isArray(t) ? t.filter((x) => x instanceof ArrayBuffer || (typeof MessagePort !== 'undefined' && x instanceof MessagePort)) : t);
	self.importScripts = (...urls) => { for (const u of urls) { const t = texts.get(String(u)); if (t == null) throw new Error('census box: importScripts of ' + u); (0, eval)(t); } };
	const noop = () => {};
	class Bitmap { constructor(w, h) { this.width = w; this.height = h; } close() {} }
	self.ImageBitmap ??= Bitmap;
	const ctx = (canvas) => new Proxy({ canvas, getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }), createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }), measureText: (t) => ({ width: String(t).length * 8 }), createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }), createPattern: () => ({}), getLineDash: () => [] }, { get: (t, k) => (k in t ? t[k] : typeof k === 'string' && /^[a-z]/.test(k) && !/(Style|Width|Alpha|Operation|font|Align|Baseline|filter|Smoothing|Cap|Join|Limit|Offset|Blur|Color|direction)$/.test(k) ? noop : undefined), set: (t, k, v) => ((t[k] = v), true) });
	self.OffscreenCanvas ??= class OffscreenCanvas { constructor(w, h) { this.width = w; this.height = h; } getContext(k) { if (k !== '2d') return null; if (!this.__ctx) Object.defineProperty(this, '__ctx', { value: ctx(this), enumerable: false }); return this.__ctx; } convertToBlob() { return Promise.resolve(new B([])); } transferToImageBitmap() { return new Bitmap(this.width, this.height); } };
	self.ImageData ??= class ImageData { constructor(a, b, c) { if (typeof a === 'number') { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); } else { this.data = a; this.width = b; this.height = c ?? a.length / 4 / b; } } };
	self.createImageBitmap ??= async (s) => new Bitmap(s?.width || 1, s?.height || 1);
})();
`;

/** the box's frame; every build it is asked for is kept (`kept`, ./kept.ts): built once, then read */
export function frameWindow(frame: El, kept: Kept) {
	let url: string | null = null;
	/** the box's whole script (its engine in it), hashed: the code every build's key starts with */
	let code = '';
	/** the builds asked of a worker and not yet answered: each job's id, the key its answer is kept under, its worker
	 *  and its place in `atWork` (./kept.ts), left when it is answered or its worker ends */
	const building = new Map<unknown, { key: string; w: Worker; held: object }>();
	const built = (id: unknown) => {
		const b = building.get(id);
		building.delete(id);
		if (b) atWork.delete(b.held);
		return b?.key;
	};
	const ended = (w: Worker | undefined) => {
		for (const [id, b] of [...building]) if (b.w === w) built(id);
	};
	let warm = false;
	let spare: Worker | null = null;
	const rooms = new Map<number, Worker>();
	const roomOf = new WeakMap<Worker, number>();
	const win: { postMessage: (m: any) => void } = { postMessage: () => {} };
	const toPage = (data: unknown) => {
		const e = new Event('message');
		Object.defineProperties(e, { data: { value: data }, source: { value: win }, origin: { value: 'null' } });
		globalThis.dispatchEvent(e);
	};
	const fresh = () => {
		const w = new Worker(url!);
		w.onmessage = (x: MessageEvent) => {
			const answer = x.data[0], key = built(answer?.id);
			if (key && answer.ok === true) {
				const { id: _, ...data } = answer;
				kept.put(key, data);
			}
			toPage([answer, roomOf.get(w) ?? null]);
		};
		w.onerror = (x: ErrorEvent) => {
			x.preventDefault?.();
			ended(w);
			toPage([{ op: 'crash', error: String(x.message) }, roomOf.get(w) ?? null]);
		};
		return w;
	};
	win.postMessage = (m: any) => {
		// the frame's script listens to its parent only: what the shell posts, a turn later, as a browser delivers it
		setTimeout(() => {
			if (m && m.op === 'boot' && !url) {
				code = keyOf(SEEDED_RANDOM, PRELUDE, m.code);
				url = URL.createObjectURL(new Blob([SEEDED_RANDOM, PRELUDE, m.code], { type: 'text/javascript' }));
				warm = m.spare === true;
				spare = fresh();
				return;
			}
			if (!url || !m) return;
			if (m.op === 'leave') {
				rooms.get(m.room)?.terminate();
				ended(rooms.get(m.room));
				rooms.delete(m.room);
				return;
			}
			if (m.op !== 'job') return;
			let key: string | undefined;
			// a build is its recipe, its values and its engine, whole: one built before is answered as it was then
			if (m.job.op === 'build') {
				const { id, ...asked } = m.job;
				key = keyOf(code, JSON.stringify(asked));
				const data = kept.get(key);
				if (data !== undefined) return toPage([{ ...(data as object), id }, m.room]);
			}
			let w = rooms.get(m.room);
			if (!w) {
				w = spare ?? fresh();
				spare = warm ? fresh() : null;
				rooms.set(m.room, w);
				roomOf.set(w, m.room);
			}
			if (key) {
				const held = {};
				building.set(m.job.id, { key, w, held });
				atWork.add(held);
			}
			w.postMessage(m.job);
		}, 0);
	};
	const remove = frame.remove.bind(frame);
	frame.remove = () => {
		for (const w of rooms.values()) w.terminate(), ended(w);
		spare?.terminate();
		rooms.clear();
		remove();
	};
	return win;
}
