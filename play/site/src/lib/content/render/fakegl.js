// A WebGL2 context that only answers, for compiling node materials in tests: a copy of intent cb16b7a5's
// render/nodes/fakegl.js, used until that lands (then this file goes and the tests import theirs).
// a WebGL2 context that does nothing but answer, and keeps every shader's source
export function fakeGL() {
	const shaders = [];
	const sources = new Map();
	let n = 1;
	const C = { VERSION: 0x1f02, SHADING_LANGUAGE_VERSION: 0x8b8c, COMPILE_STATUS: 0x8b81, LINK_STATUS: 0x8b82, ACTIVE_UNIFORMS: 0x8b86, ACTIVE_ATTRIBUTES: 0x8b89, MAX_TEXTURE_SIZE: 0x0d33 };
	const target = {
		canvas: { width: 300, height: 150, addEventListener() {}, removeEventListener() {}, style: {} },
		drawingBufferWidth: 300, drawingBufferHeight: 150,
		getContextAttributes: () => ({ alpha: true, antialias: false, depth: true, stencil: false, premultipliedAlpha: true }),
		getExtension: (name) => (name === 'WEBGL_lose_context' ? { loseContext() {}, restoreContext() {} } : {}),
		getSupportedExtensions: () => [],
		getParameter: (p) => (p === C.VERSION ? 'WebGL 2.0' : p === C.SHADING_LANGUAGE_VERSION ? 'WebGL GLSL ES 3.00' : p === 0x0ba2 || p === 0x0c10 ? new Int32Array([0, 0, 300, 150]) : 4096),
		getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
		createShader: () => ({ id: n++ }),
		shaderSource: (s, src) => sources.set(s, src),
		compileShader: (s) => shaders.push(sources.get(s)),
		getShaderParameter: () => true,
		getProgramParameter: (_p, k) => (k === C.ACTIVE_UNIFORMS || k === C.ACTIVE_ATTRIBUTES ? 0 : true),
		getShaderInfoLog: () => '', getProgramInfoLog: () => '', getShaderSource: (s) => sources.get(s),
		getUniformBlockIndex: () => 0, getActiveUniformBlockParameter: () => 0,
		checkFramebufferStatus: () => 0x8cd5,
		isContextLost: () => false
	};
	const gl = new Proxy(target, {
		get(t, k) {
			if (k in t) return t[k];
			if (typeof k === 'string' && /^[A-Z0-9_]+$/.test(k)) return C[k] ?? 0x1000 + k.length;
			return () => ({});
		}
	});
	return { gl, shaders };
}
