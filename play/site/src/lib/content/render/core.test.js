// The one renderer (intent b03f9fb4, c5): createRenderer installs three's WebGLNodesHandler, so a TSL node material is
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
				scene.traverse((/** @type {any} */ o) => o.material && this.compiled.push(...[o.material].flat()));
				this.shadowsAtCompile.push(this.handler !== null && this.shadowMap.enabled && (this.shadowMap.autoUpdate || this.shadowMap.needsUpdate));
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
const { OwnBasic, OwnStandard } = await import('./tsl.js');
const { color, uniform, mix, positionLocal } = await import('three/tsl');
const { createRenderer, setExposure, setTone, withTone, TONE } = await import('./core.js');

describe('the one renderer', () => {
	test('it installs three’s WebGLNodesHandler', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1 }));
		expect(r.handler).toBeInstanceOf(WebGLNodesHandler);
	});

	test('a MeshStandardNodeMaterial with a TSL colour node is built into GLSL through it', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, toneMapping: 'aces' }));
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
		expect(parameters.fragmentShader).toContain('mat3( 0.59719, 0.076, 0.0284'); // ACES's input matrix
		expect(parameters.fragmentShader).toMatch(/DiffuseColor = vec4\( mix\(/);
	});

	test('a compile draws no extra shadow pass and is never handed one of our node materials, hidden or not', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, shadows: 'pcf' }));
		const scene = new THREE.Scene();
		const classic = new THREE.MeshStandardMaterial(), sky = new MeshStandardNodeMaterial();
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), classic), new THREE.Mesh(new THREE.BoxGeometry(), sky));
		const node = new THREE.Mesh(new THREE.BoxGeometry(), new OwnStandard());
		const hidden = new THREE.Mesh(new THREE.BoxGeometry(), [new OwnBasic()]);
		hidden.visible = false;
		scene.add(node, hidden);
		r.compile(scene, new THREE.PerspectiveCamera());
		expect(r.shadowsAtCompile).toEqual([false]);
		expect(r.shadowMap.autoUpdate).toBe(true);
		// three's own, and a node material not ours (a sky), warm up as on main
		expect(r.compiled).toEqual([classic, sky]);
		// and each is given back its material
		expect(node.material.isNodeMaterial).toBe(true);
		expect(hidden.material[0].isNodeMaterial).toBe(true);
	});

	test('tone mapping and exposure are set through the core', () => {
		const r = /** @type {any} */ (createRenderer({ pixelRatio: 1, toneMapping: 'aces', exposure: 0.42 }));
		expect(r.toneMapping).toBe(THREE.ACESFilmicToneMapping);
		expect(r.toneMappingExposure).toBe(0.42);
		setExposure(r, 0.88);
		expect(r.toneMappingExposure).toBe(0.88);
		const back = withTone(r, 'neutral');
		expect(r.toneMapping).toBe(TONE.neutral);
		back();
		expect(r.toneMapping).toBe(THREE.ACESFilmicToneMapping);
		setTone(r, 'none', 1);
		expect([r.toneMapping, r.toneMappingExposure]).toEqual([THREE.NoToneMapping, 1]);
	});
});
