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

/** the pipelines being compiled beside the page (`drawWhenReady`), every renderer's */
let compiling = 0;
/** how many pipelines are being compiled beside the page: a world is not settled while any is (../../../../scripts/lib/quiet.js) */
export const pipelinesPending = () => compiling;
if (typeof window !== 'undefined') /** @type {any} */ (window).__pipelinesPending = pipelinesPending;

/**
 * A renderer whose new pipelines are compiled beside the page while `renderer.drawWhenReady` is true (the walker's
 * frames): what is met for the first time (a plant's level, a dome's inside, its shadow) is drawn from the frame its
 * pipeline is ready, a few frames on, and no frame waits for it. three's `render()` makes a new pipeline at once
 * (`device.createRenderPipeline`), which WebKit compiles there and then: the walk's frames held 0.7 to 6.6 s in
 * `make:render` (GitHub's runner, intent 095bc67c). Its async path (`createRenderPipelineAsync`, compileAsync's) is
 * taken instead, and three's own render skips an object until its pipeline is ready (Renderer `_renderObjectDirect`,
 * Pipelines `isReady`). A film's frames (`drawWhenReady` false) still wait for every pipeline: no shot misses a thing.
 * After the renderer's `init` (its pipelines are made there).
 * @param {any} renderer
 */
export function drawWhenReady(renderer) {
	const pipelines = renderer._pipelines;
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
}
