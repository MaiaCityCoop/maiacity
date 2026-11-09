// The one renderer (intent b03f9fb4, c5; precompile's node materials, intent 2214e661): createRenderer installs three's WebGLNodesHandler, so a TSL node material is
// built into GLSL by it; a compile of classic materials draws no shadow pass the handler would add; tone mapping and
// exposure set through the core alone. Three's WebGLRenderer is swapped (vi.mock, so vitest only) for a stand-in with a stubbed WebGL2 context (as
// ./meter.test.js stubs one): no graphics card needed.
import { describe, expect, test, vi } from 'vitest';

vi.mock('three', async () => {
	const real = await vi.importActual('three');
	/** the WebGL2 context as far as the handler's capabilities read it */
	const gl = {
		getParameter: () => 16,
		getExtension: () => null,
		getSupportedExtensions: () => [],
		getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 })
	};
	class WebGLRenderer {
		constructor(p = {}) {
			this.parameters = p;
			this.domElement = { addEventListener() {}, remove() {} };
			this.shadowMap = { enabled: false, autoUpdate: true, needsUpdate: false, type: real.PCFShadowMap };
			Object.assign(this, { toneMapping: real.NoToneMapping, toneMappingExposure: 1 });
			this.outputColorSpace = real.SRGBColorSpace;
			this.localClippingEnabled = false;
			this.extensions = { has: () => false, get: () => null };
			this.capabilities = { isWebGL2: true, maxTextures: 16, maxVertexTextures: 16, precision: 'highp' };
			this.info = { render: { frame: 0 } };
			this.debug = { checkShaderErrors: true, diagnostics: { keywords: false }, onShaderError: null };
			this.handler = null;
			/** the shadow pass three's compile would draw with a handler: whether it was let */
			this.shadowsAtCompile = [];
			this.pixelRatio = 1;
			// as three's own: an instance function, which the core wraps
			/** the materials three's compile was handed */
			this.compiled = [];
			this.compile = function (scene) {
				this.shadowsAtCompile.push(this.handler !== null && this.shadowMap.enabled && (this.shadowMap.autoUpdate || this.shadowMap.needsUpdate));
				scene.traverse((o) => o.material && this.compiled.push(...[o.material].flat()));
				return new Set();
			};
		}
		getContext() {
			return gl;
		}
		getRenderTarget() {
			return null;
		}
		getActiveCubeFace() {
			return 0;
		}
		getActiveMipmapLevel() {
			return 0;
		}
		setPixelRatio(v) {
			this.pixelRatio = v;
		}
		setNodesHandler(h) {
			h.setRenderer(this);
			this.handler = h;
		}
	}
	return { ...real, WebGLRenderer };
});

const THREE = await import('three');
const { WebGLNodesHandler } = await import('three/addons/tsl/WebGLNodesHandler.js');
const { MeshStandardNodeMaterial } = await import('three/webgpu');
const { color, uniform, mix, positionLocal } = await import('three/tsl');
const { createRenderer, precompile, setExposure, setTone, withTone, TONE } = await import('./core.js');

describe('the one renderer', () => {
	test('it installs three’s WebGLNodesHandler', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1 }));
		expect(r.handler).toBeInstanceOf(WebGLNodesHandler);
	});

	test('a MeshStandardNodeMaterial with a TSL colour node is built into GLSL through it', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, toneMapping: 'agx' }));
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera();
		const tint = uniform(new THREE.Color('#3a7d2c'));
		const material = new MeshStandardNodeMaterial();
		material.colorNode = mix(color('#d9c9a3'), tint, positionLocal.y.clamp(0, 1));
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
		scene.add(mesh);
		const h = r.handler;
		h.renderStart(scene, camera);
		h.updateLights([]);
		/** @type {any} */
		const parameters = {};
		h.build(material, mesh, parameters);
		h.renderEnd();
		// handed to three as a raw GLSL3 program
		expect(parameters.glslVersion).toBe(THREE.GLSL3);
		expect(parameters.vertexShader).toMatch(/void main\s*\(/);
		expect(parameters.fragmentShader).toMatch(/void main\s*\(/);
		// the colour node's uniform is in the program, and the renderer's tone mapping is applied in it
		expect(Object.values(parameters.uniforms).some((u) => u === tint || u?.value === tint.value)).toBe(true);
		expect(parameters.fragmentShader).toContain('vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 )'); // AgX's inset matrix
		expect(parameters.fragmentShader).toMatch(/DiffuseColor = vec4\( mix\(/);
	});

	test('a compile draws no extra shadow pass and is never handed a kit node material (cb16b7a5)', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, shadows: 'pcf' }));
		const scene = new THREE.Scene();
		const classic = new THREE.MeshStandardMaterial(), node = /** @type {any} */ (new MeshStandardNodeMaterial());
		node.isKit = true;
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), classic));
		r.compile(scene, new THREE.PerspectiveCamera());
		expect(r.shadowsAtCompile).toEqual([false]);
		expect(r.shadowMap.autoUpdate).toBe(true);
		// a kit node material, hidden or not, is built at its first frame: a program three's compile built for it would be
		// met later with another build's uniforms (the sky's PMREM in a vec3, cb16b7a5)
		const shown = new THREE.Mesh(new THREE.BoxGeometry(), node), hidden = new THREE.Mesh(new THREE.BoxGeometry(), [classic, node]);
		hidden.visible = false;
		scene.add(shown, hidden);
		r.compile(scene, new THREE.PerspectiveCamera());
		expect(r.shadowsAtCompile).toEqual([false, false]);
		expect(r.compiled.filter((/** @type {any} */ m) => m.isNodeMaterial)).toEqual([]);
		expect(shown.material).toBe(node);
		expect(hidden.material).toEqual([classic, node]);
		// any other node material (a sky) is warmed up as on main, under the tone of the moment: drawn first into an
		// environment bake (no tone, linear), it would otherwise keep that program for the frame (cb16b7a5: the viewer's
		// sky raw and bloomed, a haze over everything)
		const sky = new MeshStandardNodeMaterial();
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), sky));
		r.compile(scene, new THREE.PerspectiveCamera());
		expect(r.compiled).toContain(sky);
		expect(r.compiled).not.toContain(node);
	});

	test('tone mapping and exposure are set through the core', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, toneMapping: 'agx', exposure: 0.42 }));
		expect(r.toneMapping).toBe(THREE.AgXToneMapping);
		expect(r.toneMappingExposure).toBe(0.42);
		setExposure(r, 0.88);
		expect(r.toneMappingExposure).toBe(0.88);
		const back = withTone(r, 'none');
		expect(r.toneMapping).toBe(TONE.none);
		back();
		expect(r.toneMapping).toBe(THREE.AgXToneMapping);
		setTone(r, 'none', 1);
		expect([r.toneMapping, r.toneMappingExposure]).toEqual([THREE.NoToneMapping, 1]);
	});

	test('precompile leaves node materials out (compileAsync never settles for them) and settles itself', async () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1 }));
		/** @type {string[][]} */
		const gathered = [];
		r.compileAsync = (/** @type {THREE.Object3D} */ root) => {
			const seen = [];
			root.traverseVisible((o) => /** @type {any} */ (o).isMesh && seen.push(o.name));
			gathered.push(seen);
			// as three's under WebGLNodesHandler: one that gathered a node material never settles
			return seen.includes('sky') ? new Promise(() => {}) : Promise.resolve();
		};
		const scene = new THREE.Scene();
		const sky = Object.assign(new THREE.Mesh(new THREE.BoxGeometry(), new MeshStandardNodeMaterial()), { name: 'sky' });
		scene.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()), { name: 'asset' }), sky);
		await precompile(r, scene, new THREE.PerspectiveCamera());
		expect(gathered).toEqual([['asset']]);
		expect(sky.visible).toBe(true);
	});
});

// THE SWITCH (intent c1bee1f8, c2): createRenderer makes a WebGPURenderer behind `backend`, initialised before its first
// draw; with `webgl2` (forceWebGL) its WebGL 2 backend builds the same node materials, a skinned and a clipped one too,
// here on a context that only answers (./nodes/fakegl.js), no graphics card needed.
describe('the switch to WebGPU', async () => {
	// what three's frame loop and textures look for in a page
	const g = /** @type {any} */ (globalThis);
	g.self ??= g;
	g.requestAnimationFrame ??= () => 0;
	g.cancelAnimationFrame ??= () => {};
	g.ImageBitmap ??= class {};
	const { fakeGL } = await import('./nodes/fakegl.js');
	const { WebGPURenderer, ClippingGroup } = await import('three/webgpu');
	const { backend, createRenderer: make, makeRenderer, ready, isWebGPU, DEFAULT_BACKEND } = await import('./core.js');
	/** a canvas whose WebGL 2 context is the fake one; WebGPU it has none */
	const canvas = () => {
		const { gl, shaders } = fakeGL();
		const c = /** @type {any} */ (gl.canvas);
		c.getContext = (/** @type {string} */ kind) => (kind === 'webgl2' ? gl : null);
		return { c, shaders };
	};

	test('the backend is the page’s, else the default', () => {
		expect(backend('webgpu')).toBe('webgpu');
		expect(backend()).toBe(DEFAULT_BACKEND);
	});

	test('`webgpu` makes a WebGPURenderer, set as the WebGL one is, and not yet initialised', () => {
		const r = /** @type {any} */ (make({ backend: 'webgpu', pixelRatio: 1.5, toneMapping: 'agx', exposure: 0.8, shadows: 'pcf', canvas: canvas().c }));
		expect(r).toBeInstanceOf(WebGPURenderer);
		expect(isWebGPU(r)).toBe(true);
		expect(r.getPixelRatio()).toBe(1.5);
		expect(r.toneMapping).toBe(TONE.agx);
		expect(r.toneMappingExposure).toBe(0.8);
		expect(r.shadowMap.enabled).toBe(true);
		expect(r.shadowMap.type).toBe(THREE.PCFShadowMap);
		expect(r.initialized).toBe(false);
	});

	test('`webgl2` is WebGPURenderer on its WebGL 2 backend; makeRenderer hands it over initialised', async () => {
		const { c } = canvas();
		const r = /** @type {any} */ (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c }));
		expect(r).toBeInstanceOf(WebGPURenderer);
		expect(r.backend.isWebGLBackend).toBe(true);
		expect(r.initialized).toBe(true);
		expect(await ready(r)).toBe(r);
	});

	test('a lost device is the page’s onLost', () => {
		let lost = 0;
		const r = /** @type {any} */ (make({ backend: 'webgl2', pixelRatio: 1, canvas: canvas().c, onLost: () => lost++ }));
		r.onDeviceLost({ api: 'WebGL', message: 'gone' });
		expect(lost).toBe(1);
	});

	test('on the fallback the same node materials are built, a skinned one and a clipped one included', async () => {
		const { c, shaders } = canvas();
		const r = /** @type {any} */ (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c, shadows: true, toneMapping: 'agx' }));
		r.setSize(64, 64, false);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
		camera.position.set(0, 1, 4);
		camera.lookAt(0, 0, 0);
		scene.add(new THREE.AmbientLight('#fff', 0.5));
		const tint = uniform(new THREE.Color('#3a7d2c'));
		const plain = new MeshStandardNodeMaterial();
		plain.colorNode = mix(color('#ffffff'), tint, positionLocal.y.clamp(0, 1));
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), plain));
		// skinned: two bones
		const g = new THREE.BoxGeometry(0.5, 2, 0.5, 1, 4, 1);
		const n = g.attributes.position.count;
		g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? (Math.floor(i / 4) % 2) : 0)), 4));
		g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
		const bones = [new THREE.Bone(), new THREE.Bone()];
		bones[0].add(bones[1]);
		bones[1].position.y = 1;
		const skinned = new THREE.SkinnedMesh(g, new MeshStandardNodeMaterial());
		skinned.add(bones[0]);
		skinned.bind(new THREE.Skeleton(bones));
		scene.add(skinned);
		// clipped: a ClippingGroup, WebGPU's way to cut
		const cut = new ClippingGroup();
		cut.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.25)];
		cut.add(new THREE.Mesh(new THREE.SphereGeometry(0.5), new MeshStandardNodeMaterial()));
		scene.add(cut);
		r.render(scene, camera);
		const fragments = shaders.filter((s) => /\bout\s+(highp\s+)?vec4\b|gl_FragColor|fragColor/.test(s ?? ''));
		expect(fragments.length).toBeGreaterThanOrEqual(3);
		// the skinned one's vertex shader reads its bones, the clipped one's fragment shader discards
		expect(shaders.some((s) => /skinIndex/.test(s ?? ''))).toBe(true);
		expect(shaders.some((s) => /discard/.test(s ?? ''))).toBe(true);
	});

	// the phone's memory release (./budget.js dropOnUpload) needs the upload told, which WebGPU never does by itself
	test('an attribute’s upload is told on WebGPU, as on WebGL: first, and again after a change, not each frame', async () => {
		const r = /** @type {any} */ (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: canvas().c }));
		r.setSize(16, 16, false);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
		camera.position.z = 4;
		const geo = new THREE.BoxGeometry();
		const uploads = { position: 0, index: 0 };
		geo.attributes.position.onUpload(() => uploads.position++);
		/** @type {any} */ (geo.index).onUpload(() => uploads.index++);
		scene.add(new THREE.Mesh(geo, new MeshStandardNodeMaterial()));
		r.render(scene, camera);
		r.render(scene, camera);
		expect(uploads).toEqual({ position: 1, index: 1 });
		geo.attributes.position.needsUpdate = true;
		r.render(scene, camera);
		expect(uploads.position).toBe(2);
		// an array let go of once it is uploaded: drawn on without it
		geo.attributes.normal.onUpload(function () {
			this.array = new Float32Array(0);
		});
		const mesh2 = new THREE.Mesh(geo.clone(), new MeshStandardNodeMaterial());
		mesh2.geometry.attributes.normal.onUpload(function () {
			this.array = new Float32Array(0);
		});
		scene.add(mesh2);
		r.render(scene, camera);
		expect(mesh2.geometry.attributes.normal.array.length).toBe(0);
		expect(() => r.render(scene, camera)).not.toThrow();
	});

	test('an environment baked as a page is made waits for WebGPU’s init, with three/webgpu’s PMREM generator', async () => {
		const { environmentFrom, pmremFor } = await import('./core.js');
		const { PMREMGenerator } = await import('three/webgpu');
		const r = /** @type {any} */ (make({ backend: 'webgl2', pixelRatio: 1, canvas: canvas().c }));
		expect(pmremFor(r)).toBeInstanceOf(PMREMGenerator);
		const room = new THREE.Scene().add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
		/** @type {any} */
		let got = null;
		const done = environmentFrom(r, room, 0.04, (t) => (got = t));
		expect(got).toBeNull();
		expect(r.initialized).toBe(false);
		await done;
		expect(r.initialized).toBe(true);
		expect(got?.isTexture).toBe(true);
	});

	test('WebGPU’s warm-ups on one renderer run one at a time, in order (three’s compileAsync is not reentrant)', async () => {
		const { precompile } = await import('./core.js');
		let running = 0, most = 0;
		const order = [];
		const r = {
			isWebGPURenderer: true,
			compileAsync: async (/** @type {any} */ o) => {
				most = Math.max(most, ++running);
				await new Promise((ok) => setTimeout(ok, 5));
				order.push(o.name);
				running--;
				if (o.name === 'b') throw new Error('a material that fails to build');
			}
		};
		const obj = (/** @type {string} */ name) => Object.assign(new THREE.Object3D(), { name });
		await Promise.all(['a', 'b', 'c'].map((n) => precompile(/** @type {any} */ (r), obj(n), new THREE.PerspectiveCamera(), new THREE.Scene())));
		expect(most).toBe(1);
		// a warm-up that fails lets the next one run
		expect(order).toEqual(['a', 'b', 'c']);
	});

	test('the largest picture a renderer takes, on either', async () => {
		const { maxTextureSize } = await import('./core.js');
		const r = /** @type {any} */ (make({ backend: 'webgl2', pixelRatio: 1, canvas: canvas().c }));
		expect(maxTextureSize(r)).toBe(8192); // before init: WebGPU's least
		await ready(r);
		expect(typeof maxTextureSize(r)).toBe('number');
		expect(maxTextureSize({ capabilities: { maxTextureSize: 4096 } })).toBe(4096);
	});

	// WebGLRenderer's own shadow switch (`shadowMap.autoUpdate`, `needsUpdate`) kept on WebGPU: the sky keys its
	// shadows by it, and WebGPU's ShadowNode reads only each light's
	test('the renderer’s shadow switch holds on WebGPU: off draws none, needsUpdate draws one frame', async () => {
		const { ShadowNode } = await import('three/webgpu');
		const r = /** @type {any} */ (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: canvas().c, shadows: 'pcf' }));
		r.setSize(32, 32, false);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
		camera.position.set(0, 2, 4);
		camera.lookAt(0, 0, 0);
		const sun = new THREE.DirectionalLight('#fff', 2);
		sun.castShadow = true;
		sun.position.set(2, 4, 1);
		scene.add(sun);
		const box = new THREE.Mesh(new THREE.BoxGeometry(), new MeshStandardNodeMaterial());
		box.castShadow = box.receiveShadow = true;
		scene.add(box);
		const drawn = vi.spyOn(ShadowNode.prototype, 'updateShadow');
		// a frame as three's own loop makes one (its node frame moved on), then drawn
		const frames = (/** @type {number} */ n) => {
			for (let i = 0; i < n; i++) {
				r._nodes.nodeFrame.update();
				r.render(scene, camera);
			}
		};
		frames(3);
		expect(drawn).toHaveBeenCalledTimes(3);
		drawn.mockClear();
		r.shadowMap.autoUpdate = false;
		frames(3);
		expect(drawn).toHaveBeenCalledTimes(0);
		r.shadowMap.needsUpdate = true;
		frames(3);
		expect(drawn).toHaveBeenCalledTimes(1);
		expect(r.shadowMap.needsUpdate).toBe(false);
		r.shadowMap.autoUpdate = true;
		drawn.mockClear();
		frames(2);
		expect(drawn).toHaveBeenCalledTimes(2);
		drawn.mockRestore();
	});
});
