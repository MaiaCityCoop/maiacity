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
		expect(parameters.isRawShaderMaterial).toBe(true);
		expect(parameters.vertexShader).toMatch(/void main\s*\(/);
		expect(parameters.fragmentShader).toMatch(/void main\s*\(/);
		// the colour node's uniform is in the program, and the renderer's tone mapping is applied in it
		expect(Object.values(parameters.uniforms).some((u) => u === tint || u?.value === tint.value)).toBe(true);
		expect(parameters.fragmentShader).toContain('vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 )'); // AgX's inset matrix
		expect(parameters.fragmentShader).toMatch(/DiffuseColor = vec4\( mix\(/);
	});

	test('a compile draws no extra shadow pass and is handed every material, the kit’s node materials too (660ad67f)', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, shadows: 'pcf' }));
		const scene = new THREE.Scene();
		const classic = new THREE.MeshStandardMaterial(), node = /** @type {any} */ (new MeshStandardNodeMaterial());
		node.isKit = true;
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), classic));
		r.compile(scene, new THREE.PerspectiveCamera());
		expect(r.shadowsAtCompile).toEqual([false]);
		expect(r.shadowMap.autoUpdate).toBe(true);
		// a kit node material, hidden or not, is built now: each build is paired with its program as three acquires it
		// (./nodes/nodes.test.ts, on the fake context), so none meets another build's uniforms later (cb16b7a5)
		const shown = new THREE.Mesh(new THREE.BoxGeometry(), node), hidden = new THREE.Mesh(new THREE.BoxGeometry(), [classic, node]);
		hidden.visible = false;
		scene.add(shown, hidden);
		r.compile(scene, new THREE.PerspectiveCamera());
		expect(r.shadowsAtCompile).toEqual([false, false]);
		expect(r.compiled).toContain(node);
		expect(shown.material).toBe(node);
		expect(hidden.material).toEqual([classic, node]);
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

	test('precompile compiles everything and waits until each program is linked, never past its cap', async () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1 }));
		const asset = new THREE.MeshStandardMaterial(), sky = new MeshStandardNodeMaterial();
		let polls = 0;
		const ready = new Map([[asset, () => true], [sky, () => ++polls > 2]]);
		r.compile = () => new Set([asset, sky]);
		r.properties = { get: (/** @type {any} */ m) => ({ currentProgram: { isReady: ready.get(m) } }) };
		await precompile(r, new THREE.Scene(), new THREE.PerspectiveCamera());
		expect(polls).toBe(3);
		// a program that never says it is linked holds the warm-up no longer than its cap (then it links at its first draw)
		vi.useFakeTimers();
		try {
			ready.set(sky, () => false);
			let settled = false;
			precompile(r, new THREE.Scene(), new THREE.PerspectiveCamera()).then(() => (settled = true));
			await vi.advanceTimersByTimeAsync(4100);
			expect(settled).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
