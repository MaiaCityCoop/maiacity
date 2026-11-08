// a WebGL2 context that does nothing but answer, and keeps every shader's source
export function fakeGL() {
	const shaders = [];
	const sources = new Map();
	let n = 1;
	const T = { float: 0x1406, int: 0x1404, uint: 0x1405, bool: 0x8b56, vec2: 0x8b50, vec3: 0x8b51, vec4: 0x8b52, ivec2: 0x8b53, ivec3: 0x8b54, ivec4: 0x8b55, uvec2: 0x8dc6, uvec3: 0x8dc7, uvec4: 0x8dc8, mat2: 0x8b5a, mat3: 0x8b5b, mat4: 0x8b5c, sampler2D: 0x8b5e, sampler3D: 0x8b5f, samplerCube: 0x8b60, sampler2DShadow: 0x8b62, sampler2DArray: 0x8dc1, sampler2DArrayShadow: 0x8dc4, samplerCubeShadow: 0x8dc5, isampler2D: 0x8dca, usampler2D: 0x8dd2 };
	/** what a linked program declares, read off its two shaders as a driver would report them */
	const linked = new Map();
	const declared = (prog) => {
		if (linked.has(prog)) return linked.get(prog);
		const [vs, fs] = (prog.shaders ?? []).map((sh) => sources.get(sh) ?? '');
		const strip = (src) => src.replace(/\/\/.*$/gm, '').replace(/^\s*#.*$/gm, '').replace(/uniform\s+\w+\s*\{[^}]*\}\s*\w*\s*;/g, '');
		const uniforms = new Map(), attributes = [];
		for (const src of [vs, fs]) for (const m of strip(src).matchAll(/\buniform\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+(\w+)\s*(\[\s*(\d+)\s*\])?\s*;/g)) if (T[m[1]]) uniforms.set(m[2], { name: m[4] ? `${m[2]}[0]` : m[2], type: T[m[1]], size: m[4] ? +m[4] : 1 });
		for (const m of strip(vs ?? '').matchAll(/(?:^|;|\n)\s*(?:layout\s*\([^)]*\)\s*)?(?:in|attribute)\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+(\w+)\s*;/g)) if (T[m[1]]) attributes.push({ name: m[2], type: T[m[1]], size: 1 });
		const d = { uniforms: [...uniforms.values()], attributes };
		linked.set(prog, d);
		return d;
	};
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
		createProgram: () => ({ shaders: [] }),
		attachShader: (p, sh) => p.shaders.push(sh),
		getProgramParameter: (p, k) => (k === C.ACTIVE_UNIFORMS ? declared(p).uniforms.length : k === C.ACTIVE_ATTRIBUTES ? declared(p).attributes.length : true),
		getActiveUniform: (p, i) => declared(p).uniforms[i] ?? null,
		getActiveAttrib: (p, i) => declared(p).attributes[i] ?? null,
		getUniformLocation: (_p, name) => ({ name }),
		getAttribLocation: (p, name) => declared(p).attributes.findIndex((a) => a.name === name),
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
