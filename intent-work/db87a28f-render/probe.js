/*
 * THE PROBE (intent bba9c796's audit; intent db87a28f counts compressed textures at their real size): injected into a page after the frame meter (play/site/src/lib/content/render/
 * meter.js), it splits what the page draws and lets the audit leave parts of it out, so a win's saving is measured
 * rather than guessed. Plain script, no imports; `window.__probe`.
 *
 * Every draw call is put in one bucket, by what is bound when it is made:
 *   shadow     a depth or distance material (three's MeshDepthMaterial, MeshDistanceMaterial) into a framebuffer of
 *              its own: the shadow maps' passes
 *   blend      blending on (transparent materials), wherever drawn
 *   offscreen  any other draw into a framebuffer of its own (impostor pictures, transmission, post)
 *   screen     the rest: opaque draws to the canvas
 * and counted by its material (three's `#define SHADER_TYPE`, and `:name` where the material has a name; else 'custom'). It also keeps the bytes of every texture
 * level 0 uploaded and not deleted: 4 bytes a pixel uncompressed, a compressed one at its format's own size (BC1, ETC1/2 RGB,
 * EAC R11 half a byte; BC2/3/7, ETC2 RGBA, EAC RG11, ASTC 4x4 one byte; compressedTexImage its own byte count).
 *
 *   __probe.reset()                      counters to 0
 *   __probe.read()                       { frames, buckets: { shadow: { calls, tris } … }, shaders: [[name, calls, tris]…], texture_mib }
 *   __probe.skip = { shadow, blend }     draws of these buckets not made (the ablations)
 */
(function () {
	const w = window;
	if (w.__probe) return;
	const P = w.WebGL2RenderingContext && w.WebGL2RenderingContext.prototype;
	if (!P) return;
	const BLEND = 0x0be2,
		FRAMEBUFFER = 0x8d40,
		DRAW_FRAMEBUFFER = 0x8ca9,
		TRIANGLES = 4,
		STRIP = 5,
		FAN = 6;
	const sources = new WeakMap(); // shader -> source
	const programs = new WeakMap(); // program -> { name, depth }
	const state = new WeakMap(); // gl -> { program, fb, blend, texture }
	const textures = new Map(); // texture -> bytes
	const st = (gl) => {
		let s = state.get(gl);
		if (!s) state.set(gl, (s = { program: null, fb: null, blend: false, texture: null }));
		return s;
	};
	let buckets, shaders, frames = 0;
	// frames counted by the time requestAnimationFrame hands its callbacks, as the meter does
	const raf = w.requestAnimationFrame.bind(w);
	let last = null;
	w.requestAnimationFrame = (cb) => raf((t) => { if (t !== last) (last = t), frames++; return cb(t); });
	const reset = () => {
		frames = 0;
		buckets = { shadow: { calls: 0, tris: 0 }, blend: { calls: 0, tris: 0 }, offscreen: { calls: 0, tris: 0 }, screen: { calls: 0, tris: 0 } };
		shaders = new Map();
	};
	reset();
	const wrap = (name, f) => {
		const g = P[name];
		if (typeof g === 'function') P[name] = f(g);
	};
	wrap('shaderSource', (g) => function (sh, src) { sources.set(sh, src); return g.call(this, sh, src); });
	wrap('attachShader', (g) => function (p, sh) {
		const src = sources.get(sh) || '';
		// three's prefix: SHADER_TYPE the material's type, SHADER_NAME its name (often empty)
		const type = /#define SHADER_TYPE (\w+)/.exec(src), name = /#define SHADER_NAME ([^\n]+)/.exec(src);
		const prev = programs.get(p) || { name: 'custom', depth: false };
		if (type) prev.name = type[1] + (name && name[1].trim() ? `:${name[1].trim()}` : '');
		if (/^(MeshDepthMaterial|MeshDistanceMaterial)/.test(prev.name)) prev.depth = true;
		programs.set(p, prev);
		return g.call(this, p, sh);
	});
	wrap('useProgram', (g) => function (p) { st(this).program = p; return g.call(this, p); });
	wrap('bindFramebuffer', (g) => function (t, fb) { if (t === FRAMEBUFFER || t === DRAW_FRAMEBUFFER) st(this).fb = fb; return g.call(this, t, fb); });
	wrap('enable', (g) => function (c) { if (c === BLEND) st(this).blend = true; return g.call(this, c); });
	wrap('disable', (g) => function (c) { if (c === BLEND) st(this).blend = false; return g.call(this, c); });
	wrap('bindTexture', (g) => function (t, tex) { st(this).texture = tex; return g.call(this, t, tex); });
	wrap('deleteTexture', (g) => function (tex) { textures.delete(tex); return g.call(this, tex); });
	const sized = (gl, bytes) => { const t = st(gl).texture; if (t) textures.set(t, bytes); };
	// bytes a pixel of an internal format: compressed ones at their block size, else 4
	const HALF = new Set([0x83f0, 0x83f1, 0x8c4c, 0x8c4d, 0x8d64, 0x9274, 0x9275, 0x9276, 0x9277, 0x9270, 0x9271]);
	const COMP = (f) => (f >= 0x83f0 && f <= 0x83f3) || (f >= 0x8c4c && f <= 0x8c4f) || f === 0x8d64 || (f >= 0x9270 && f <= 0x9279) || (f >= 0x8e8c && f <= 0x8e8f) || (f >= 0x93b0 && f <= 0x93dd);
	const bpp = (f) => (HALF.has(f) ? 0.5 : COMP(f) ? 1 : 4);
	wrap('texImage2D', (g) => function (...a) {
		if (a[1] === 0) {
			const wd = a.length >= 9 ? a[3] : a[5] && a[5].width, ht = a.length >= 9 ? a[4] : a[5] && a[5].height;
			if (wd && ht) sized(this, wd * ht * 4);
		}
		return g.apply(this, a);
	});
	wrap('texStorage2D', (g) => function (t, levels, fmt, wd, ht) { sized(this, wd * ht * bpp(fmt) * (levels > 1 ? 4 / 3 : 1)); return g.call(this, t, levels, fmt, wd, ht); });
	wrap('texStorage3D', (g) => function (t, levels, fmt, wd, ht, d) { sized(this, wd * ht * d * bpp(fmt) * (levels > 1 ? 4 / 3 : 1)); return g.call(this, t, levels, fmt, wd, ht, d); });
	// compressed uploads without storage: level 0's own bytes, its mipmaps a third more
	wrap('compressedTexImage2D', (g) => function (...a) { if (a[1] === 0) sized(this, (typeof a[6] === 'number' ? a[6] : a[6]?.byteLength ?? 0) * 4 / 3); return g.apply(this, a); });
	wrap('compressedTexImage3D', (g) => function (...a) { if (a[1] === 0) sized(this, (typeof a[7] === 'number' ? a[7] : a[7]?.byteLength ?? 0) * 4 / 3); return g.apply(this, a); });

	const tris = (mode, n, inst) => (mode === TRIANGLES ? Math.floor(n / 3) : mode === STRIP || mode === FAN ? Math.max(0, n - 2) : 0) * Math.max(1, inst);
	const DRAWS = { drawArrays: [2, -1], drawElements: [1, -1], drawArraysInstanced: [2, 3], drawElementsInstanced: [1, 4], drawRangeElements: [3, -1] };
	const probe = {
		skip: { shadow: false, blend: false },
		reset,
		read: () => ({
			frames,
			buckets: JSON.parse(JSON.stringify(buckets)),
			shaders: [...shaders].map(([k, v]) => [k, v.calls, v.tris]).sort((a, b) => b[2] - a[2] || b[1] - a[1]),
			texture_mib: Math.round([...textures.values()].reduce((a, b) => a + b, 0) / 2 ** 20)
		})
	};
	for (const [name, [at, inst]] of Object.entries(DRAWS)) {
		wrap(name, (g) => function (...a) {
			const s = st(this);
			const prog = (s.program && programs.get(s.program)) || { name: 'custom', depth: false };
			const b = prog.depth && s.fb ? 'shadow' : s.blend ? 'blend' : s.fb ? 'offscreen' : 'screen';
			if ((b === 'shadow' && probe.skip.shadow) || (b === 'blend' && probe.skip.blend)) return;
			const t = tris(a[0], a[at], inst < 0 ? 1 : a[inst]);
			buckets[b].calls++;
			buckets[b].tris += t;
			const k = shaders.get(prog.name) || { calls: 0, tris: 0 };
			k.calls++;
			k.tris += t;
			shaders.set(prog.name, k);
			return g.apply(this, a);
		});
	}
	w.__probe = probe;
})();
