/*
 * THE PAGE'S MAKING — one frame budget for everything a world makes on the page's thread while it is walked (intent
 * 095bc67c): a dome's inside built, baked and joined, and whatever else is cut into steps. Each maker asks `slice()`
 * between its steps; it goes on at once while this frame's making (every maker's together) stays under `ms` (4) with
 * room for a step as long as its last one, else it waits for a frame of its own, the most wanted first. Before it, each
 * maker decided its own share (a dome 24 ms a stretch near the walker, 70 ms hurried, 7 far off), so two frames in a
 * row could be held 70 ms, and a dome finished whole in one: Samuel's 5–8 s stutters walking (GitHub's runner: stalls
 * of 7.6 s in Sandbox 1, 6.5 s in Sandbox 5, cold).
 *
 * A stretch over 2 ms is named in the page's timeline (`performance.measure('make:<name>')`), so a walk's slow frames
 * say what was being made in them (scripts/stroll.ts).
 */

/** the most making a frame (ms) */
export const SLICE = 4;
/** how long (ms) a maker waits for a frame before it goes on all the same: WebKit holds frames back from a page it takes for unseen */
const HELD = 100;

/** the page's next frame, or `HELD` ms where none comes */
const nextFrame = (/** @type {() => void} */ go) => {
	if (typeof requestAnimationFrame !== 'function') return void setTimeout(go, 0);
	let done = false;
	const once = () => {
		if (done) return;
		done = true;
		clearTimeout(t);
		cancelAnimationFrame(id);
		go();
	};
	const id = requestAnimationFrame(once);
	const t = setTimeout(once, HELD);
};

/** a stretch of making named in the page's timeline, where it held the page long enough to matter */
const named = (/** @type {string} */ name, /** @type {number} */ start, /** @type {number} */ end) => {
	if (end - start < 2 || typeof performance === 'undefined' || !performance.measure) return;
	try {
		performance.measure(`make:${name}`, { start, end });
	} catch {
		// a timeline that takes no start and end (an old engine): unnamed
	}
};

/** a part of a frame's work since `start` named in the page's timeline, where it took 2 ms or more (`make:<name>`) */
export const spanned = (/** @type {string} */ name, /** @type {number} */ start) => named(name, start, performance.now());

/**
 * @param {{ ms?: number, now?: () => number, frame?: (go: () => void) => void }} [o]
 *   ms: the frame's budget; now and frame: the clock and the frames (a test's own)
 */
export function createMaking(o = {}) {
	const ms = o.ms ?? SLICE, now = o.now ?? (() => performance.now()), frame = o.frame ?? nextFrame;
	/** this frame's making so far (ms), and whether a frame is asked for */
	let spent = 0, asked = false;
	/** @type {{ rank: () => number, ok: () => void }[]} */
	const waiting = [];

	function onFrame() {
		asked = false;
		spent = 0;
		grant();
	}
	/** the frame's budget to the most wanted waiting maker, while there is budget */
	function grant() {
		if (!waiting.length) return;
		if (spent >= ms) {
			if (!asked) (asked = true), frame(onFrame);
			return;
		}
		let best = 0;
		for (let i = 1; i < waiting.length; i++) if (waiting[i].rank() > waiting[best].rank()) best = i;
		waiting.splice(best, 1)[0].ok();
	}

	/**
	 * One maker: `slice()` between its steps, `done()` once it is finished (or stops).
	 * @param {string} name what it makes (its spans `make:<name>`)
	 * @param {() => number} [rank] how much it is wanted while it waits (more first)
	 */
	function maker(name, rank = () => 0) {
		/** when it last took the page, and its last step's length */
		let since = /** @type {number | null} */ (null), step = 0, last = 0;
		const charge = (t) => {
			if (since !== null) {
				spent += t - since;
				named(name, since, t);
			}
			since = null;
		};
		return {
			/** @returns {Promise<void> | void} at once while this frame has room for another step, else on a frame of its own */
			slice() {
				const t = now();
				if (since === null) since = t;
				else (step = t - last);
				last = t;
				// full: no room this frame for a step as long as the last; else it goes on, unless another maker waits
				const full = spent + (t - since) + step > ms;
				if (!full && !waiting.length) return;
				charge(t);
				if (full) spent = Math.max(spent, ms);
				return new Promise((ok) => {
					waiting.push({ rank, ok: () => ((since = last = now()), ok()) });
					queueMicrotask(grant);
				});
			},
			/** finished: its time charged to the frame, the frame's rest handed on */
			done() {
				charge(now());
				queueMicrotask(grant);
			}
		};
	}
	return { maker, spent: () => spent, waiting: () => waiting.length };
}

/** the page's one making: every world's makers take from it */
export const making = createMaking();

/** the pipelines being compiled beside the page (`drawWhenReady`), every renderer's, and the objects held back a frame for their uploads */
let compiling = 0, holding = 0, held = 0;
/** how much a walked world still makes beside the page: pipelines compiling, objects waiting for their corners to be
 *  sent. A world is not settled while any is (../../../../scripts/lib/quiet.js) */
export const pipelinesPending = () => compiling + Math.max(holding, held);
if (typeof window !== 'undefined') /** @type {any} */ (window).__pipelinesPending = pipelinesPending;

/** the most new geometry (bytes) sent to the graphics card in one of the walker's frames */
export const UPLOAD = 2 * 1024 * 1024;
/** three's RenderObjectRefreshType.FULL: an object's nodes, corners and bindings all made again */
const FULL = 2;

/**
 * A renderer that, while `renderer.drawWhenReady` is true (the walker's frames), never holds a frame for what it meets
 * the first time (intent 095bc67c; GitHub's runner, WebKit: the walk's frames held 2 to 6 s in `make:render`, all but
 * milliseconds of it three's geometry uploads):
 * - its new pipelines are compiled beside the page (`createRenderPipelineAsync`, compileAsync's path, taken instead of
 *   `render()`'s `createRenderPipeline`, which WebKit compiles there and then);
 * - its new corners go to the graphics card `UPLOAD` bytes a frame at most (one object's whatever its size, first): an
 *   object whose corners wait is held back that frame and drawn once they are sent, a few frames on.
 * three's own render skips an object until it is ready (Renderer `_renderObjectDirect`: `isReady`); a held one is made
 * whole again the next frame (`needsRefresh` FULL). A film's frames (`drawWhenReady` false) wait for everything: no
 * shot misses a thing. After the renderer's `init` (its pipelines, geometries and nodes are made there).
 * @param {any} renderer
 */
export function drawWhenReady(renderer) {
	const pipelines = renderer._pipelines, geometries = renderer._geometries, nodes = renderer._nodes;
	if (!pipelines || pipelines.__drawWhenReady) return;
	pipelines.__drawWhenReady = true;
	const now = pipelines.updateForRender.bind(pipelines);
	pipelines.updateForRender = (/** @type {any} */ renderObject) => {
		if (!renderer.drawWhenReady) return now(renderObject);
		/** @type {Promise<void>[]} */
		const made = [];
		pipelines.getForRender(renderObject, made);
		for (const p of made) {
			compiling++;
			p.then(
				() => compiling--,
				() => compiling--
			);
		}
	};
	if (!geometries || !nodes) return;
	/** the attributes already sent, the objects held back, and this frame's bytes */
	const sent = new WeakSet(), back = new WeakSet();
	let bytes = 0, frame = -1;
	const attributesOf = (/** @type {any} */ ro) => {
		const out = ro.getAttributes().map((/** @type {any} */ a) => renderer.backend.getBufferAttribute?.(a) ?? a);
		const index = geometries.getIndex(ro);
		if (index) out.push(index);
		return out;
	};
	const upload = geometries.updateForRender.bind(geometries);
	geometries.updateForRender = (/** @type {any} */ ro) => {
		// a frame is the page's animation frame: one stamp for every render call in it (the shadows', the picture's)
		const stamp = (typeof document !== 'undefined' && /** @type {number | null} */ (document.timeline?.currentTime)) || 0;
		if (stamp !== frame) (frame = stamp), (bytes = 0), (held = holding), (holding = 0);
		const fresh = attributesOf(ro).filter((/** @type {any} */ a) => !sent.has(a));
		const size = fresh.reduce((/** @type {number} */ n, /** @type {any} */ a) => n + (a.array?.byteLength ?? 0), 0);
		if (renderer.drawWhenReady && size && bytes && bytes + size > UPLOAD) {
			back.add(ro);
			holding++;
			return;
		}
		bytes += size;
		back.delete(ro);
		upload(ro);
		for (const a of fresh) sent.add(a);
	};
	const ready = pipelines.isReady.bind(pipelines);
	pipelines.isReady = (/** @type {any} */ ro) => !back.has(ro) && ready(ro);
	const refresh = nodes.needsRefresh.bind(nodes);
	nodes.needsRefresh = (/** @type {any} */ ro) => (back.has(ro) ? FULL : refresh(ro));
}

/** three's own steps inside a draw, timed (`timeRender`): each kind's milliseconds this frame */
const inside = new Map();
/**
 * A renderer's own steps inside its draw timed by kind, so a slow `make:render` says which (intent 095bc67c): `objects`
 * (a new object's node material built, its shader code written), `uploads` (its corners sent), `bindings` (its uniforms
 * and textures sent), `pipelines` (its shader modules and pipeline made). Each kind's frame total is named by
 * `renderParts`.
 * @param {any} renderer
 */
export function timeRender(renderer) {
	if (renderer.__timed) return;
	renderer.__timed = true;
	const wrap = (/** @type {any} */ o, /** @type {string} */ method, /** @type {string} */ kind) => {
		if (!o?.[method]) return;
		const was = o[method].bind(o);
		o[method] = (/** @type {any[]} */ ...a) => {
			const t = performance.now();
			try {
				return was(...a);
			} finally {
				inside.set(kind, (inside.get(kind) ?? 0) + performance.now() - t);
			}
		};
	};
	wrap(renderer._objects, 'get', 'objects');
	wrap(renderer._geometries, 'updateForRender', 'uploads');
	wrap(renderer._bindings, 'updateForRender', 'bindings');
	wrap(renderer._pipelines, 'getForRender', 'pipelines');
	wrap(renderer._textures, 'updateTexture', 'textures');
}
/** this frame's steps inside the draw named, each `make:render <kind>` laid from `start` (where it took 2 ms or more), and cleared */
export function renderParts(/** @type {number} */ start) {
	for (const [kind, ms] of inside) named(`render ${kind}`, start, start + ms);
	inside.clear();
}
