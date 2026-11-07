/**
 * THE FRAME METER (intent bba9c796; the three-performance skill's "Measure first"): what a page's frames cost, from
 * WebGL2 itself, whatever drew them. Installed once on a window, before or after its renderers are made, it counts
 * every draw call and the triangles it draws, the CPU time the frame's animation callbacks take, and the GPU time of
 * the frame's commands (EXT_disjoint_timer_query_webgl2, where the browser offers it; null where not), frame by frame,
 * and says which of them bounds the frame.
 *
 *   const m = installMeter(window);   // the bench, at its start (routes/worlds/bench)
 *   const s = await m.sample(1);      // { frames, frame_ms, frame_p95, cpu_ms, gpu_ms, calls, triangles, bound }
 *   meterLine(s)                      // the line scripts/render.mjs prints for a view
 *
 * It imports nothing and touches no DOM beyond the window it is given, so a job can inject it whole as a page's init script
 * (intent-work/bba9c796-render: its `export ` taken out, then `window.__meter = installMeter(window)`).
 */

/** the draw calls WebGL2 has, and where each one's vertex count and instance count are among its arguments */
const DRAWS = {
	drawArrays: [2, -1],
	drawElements: [1, -1],
	drawArraysInstanced: [2, 3],
	drawElementsInstanced: [1, 4],
	drawRangeElements: [3, -1]
};
const TRIANGLES = 4;
const TRIANGLE_STRIP = 5;
const TRIANGLE_FAN = 6;

/** the triangles a draw of `count` vertices in `mode` makes */
export function trianglesOf(mode, count, instances = 1) {
	const n = mode === TRIANGLES ? Math.floor(count / 3) : mode === TRIANGLE_STRIP || mode === TRIANGLE_FAN ? Math.max(0, count - 2) : 0;
	return n * Math.max(1, instances);
}

/** the q-quantile of a list of numbers (0 for an empty one) */
export function quantile(xs, q) {
	if (!xs.length) return 0;
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/**
 * What bounds frames this long: `vsync` when the CPU's and the GPU's work both fit well inside the display's own
 * interval (`display`: the shortest frames seen, at most 60 Hz's, as a page that drops every frame never shows it),
 * else whichever of them is the longer. Without a GPU time it can say
 * only `cpu` (the CPU's work fills the interval) or nothing (null).
 */
export function boundOf({ display, cpu_ms, gpu_ms }) {
	const slack = 0.9 * display;
	if (gpu_ms == null) return cpu_ms >= slack ? 'cpu' : null;
	if (Math.max(cpu_ms, gpu_ms) < slack) return 'vsync';
	return gpu_ms >= cpu_ms ? 'gpu' : 'cpu';
}

/** a number to a tenth */
const tenth = (x) => (x == null ? null : Math.round(x * 10) / 10);

/**
 * The meter on a window (its WebGL2RenderingContext, requestAnimationFrame and performance): installed once, a second
 * install giving the first. Frames are told apart by the time requestAnimationFrame hands its callbacks.
 */
export function installMeter(win) {
	if (win.__frameMeter) return win.__frameMeter;
	const now = () => win.performance.now();
	/** each finished frame: { at, cpu, calls, triangles, gpu (null until its query answers, or never) } */
	const done = [];
	let frame = null;
	/** per context: its timer extension (or null), its query running, the queries waiting for their answers */
	const contexts = new Map();
	const context = (gl) => {
		let c = contexts.get(gl);
		if (!c) {
			const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
			contexts.set(gl, (c = { gl, ext, running: null, waiting: [] }));
		}
		return c;
	};
	const begin = (at) => {
		frame = { at, cpu: 0, calls: 0, triangles: 0, gpu: null, timed: 0, answered: 0 };
	};
	/** a context's commands of the frame timed: its query ended, kept to be read, its answer added to its frame */
	const close = (c) => {
		if (!c.running) return;
		c.gl.endQuery(c.ext.TIME_ELAPSED_EXT);
		c.waiting.push(c.running);
		c.running = null;
	};
	const poll = () => {
		for (const c of contexts.values()) {
			if (!c.ext) continue;
			const disjoint = c.gl.getParameter(c.ext.GPU_DISJOINT_EXT);
			while (c.waiting.length) {
				const w = c.waiting[0];
				if (!disjoint && !c.gl.getQueryParameter(w.query, c.gl.QUERY_RESULT_AVAILABLE)) break;
				c.waiting.shift();
				if (!disjoint) {
					w.frame.gpu = (w.frame.gpu ?? 0) + c.gl.getQueryParameter(w.query, c.gl.QUERY_RESULT) / 1e6;
					w.frame.answered++;
				}
				c.gl.deleteQuery(w.query);
			}
		}
	};
	const finish = () => {
		if (!frame) return;
		for (const c of contexts.values()) close(c);
		done.push(frame);
		if (done.length > 600) done.shift();
		frame = null;
	};

	const proto = win.WebGL2RenderingContext?.prototype;
	if (proto) {
		for (const [name, [at, inst]] of Object.entries(DRAWS)) {
			const draw = proto[name];
			if (typeof draw !== 'function') continue;
			proto[name] = function (...a) {
				if (frame) {
					frame.calls++;
					frame.triangles += trianglesOf(a[0], a[at], inst < 0 ? 1 : a[inst]);
					const c = context(this);
					if (c.ext && !c.running) {
						const query = this.createQuery();
						this.beginQuery(c.ext.TIME_ELAPSED_EXT, query);
						c.running = { query, frame };
						frame.timed++;
					}
				}
				return draw.apply(this, a);
			};
		}
	}
	const raf = win.requestAnimationFrame.bind(win);
	win.requestAnimationFrame = (cb) =>
		raf((t) => {
			if (!frame || frame.at !== t) {
				finish();
				poll();
				begin(t);
			}
			const f = frame;
			const t0 = now();
			try {
				return cb(t);
			} finally {
				f.cpu += now() - t0;
			}
		});

	const meter = {
		/**
		 * The frames of the next `seconds` (by the page's clock), summed: frames counted, their mean and p95 interval,
		 * mean CPU and GPU ms (GPU null where no frame was timed), mean draw calls and triangles, and the bound.
		 */
		async sample(seconds = 1) {
			const from = done.length ? done[done.length - 1].at : -Infinity;
			const until = now() + seconds * 1000;
			await new Promise((ok) => {
				const step = () => (now() >= until ? ok() : raf(step));
				raf(step);
			});
			// the last frames' GPU answers come a frame or two late
			for (let i = 0; i < 4; i++) await new Promise((ok) => raf(() => ok()));
			poll();
			const fs = done.filter((f) => f.at > from && f.at <= until);
			return meter.summary(fs);
		},
		/** the frames given, summed (sample's sums) */
		summary(fs) {
			const gaps = fs.slice(1).map((f, i) => f.at - fs[i].at);
			const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
			const timed = fs.filter((f) => f.timed > 0 && f.answered === f.timed);
			const s = {
				frames: fs.length,
				frame_ms: tenth(mean(gaps)),
				frame_p95: tenth(quantile(gaps, 0.95)),
				cpu_ms: tenth(mean(fs.map((f) => f.cpu))),
				gpu_ms: timed.length ? tenth(mean(timed.map((f) => f.gpu))) : null,
				calls: Math.round(mean(fs.map((f) => f.calls))),
				triangles: Math.round(mean(fs.map((f) => f.triangles)))
			};
			return { ...s, bound: boundOf({ display: Math.min(quantile(gaps, 0.1) || 1000 / 60, 1000 / 60), cpu_ms: s.cpu_ms, gpu_ms: s.gpu_ms }) };
		},
		/** whether any context offers GPU timing */
		timed: () => [...contexts.values()].some((c) => c.ext)
	};
	win.__frameMeter = meter;
	return meter;
}

/** a sample as one line: what scripts/render.mjs prints for each view */
export function meterLine(s) {
	const ms = (x) => (x == null ? '–' : x.toFixed(1));
	return `${s.triangles.toLocaleString('en')} triangles, ${s.calls} calls · frame_ms ${ms(s.frame_ms)} (p95 ${ms(s.frame_p95)}) · cpu_ms ${ms(s.cpu_ms)} · gpu_ms ${ms(s.gpu_ms)} · bound ${s.bound ?? '?'}`;
}

/**
 * Where a scene's drawings go (the bench's split): the meshes under `root` (the world's own), under the group named
 * 'world lights', under 'assets' (the guests, by kind: a mesh's name before ' · '), and the rest; each visible mesh
 * counted once a material group. The top kinds by drawings, at most `top`.
 */
export function drawingsOf(scene, root, top = 12) {
	const cut = { world: 0, guests: 0, lights: 0, other: 0 };
	const kinds = new Map();
	const seen = (o) => {
		for (let x = o; x; x = x.parent) if (!x.visible) return false;
		return true;
	};
	scene.traverse((o) => {
		if ((!o.isMesh && !o.isPoints) || !seen(o) || (o.isInstancedMesh && o.count === 0)) return;
		let a = o;
		while (a.parent && a.parent !== scene) a = a.parent;
		const n = Array.isArray(o.material) ? Math.max(1, o.geometry.groups.length) : 1;
		if (a === root) cut.world += n;
		else if (a.name === 'world lights') cut.lights += n;
		else if (a.name === 'assets') {
			cut.guests += n;
			const k = String(o.name).split(' · ')[0];
			kinds.set(k, (kinds.get(k) ?? 0) + n);
		} else cut.other += n;
	});
	return { ...cut, kinds: kinds.size, top: [...kinds].sort((x, y) => y[1] - x[1]).slice(0, top) };
}
