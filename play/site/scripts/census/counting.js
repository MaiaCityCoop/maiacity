// @ts-nocheck — plain JS, run under Bun by the census
/*
 * THE COUNTING RENDERER — three.js's WebGLRenderer as the census sees it (intent bba45d6e): every frame walked the way
 * three's own `render` walks it (r187: `projectObject`, `renderBufferDirect`), and every draw it
 * would send counted as `WebGLInfo.update` counts it, with no graphics context at all. What it does:
 *
 * - The scene's `onBeforeRender`, its matrices (`matrixWorldAutoUpdate`), the camera's, the frustum from the camera.
 * - `projectObject`: hidden, off the camera's layers, LODs updated, lights (and their shadows) gathered, sprites,
 *   meshes, lines and points kept where they are not `frustumCulled` or meet the frustum (`intersectsFrustum`, which
 *   holds an InstancedMesh or BatchedMesh to its own bounds), each material (each group's for an array) drawn if visible.
 * - No shadow pass: play draws with WebGPU only, whose shadows the counting WebGPU renderer below draws.
 * - Each draw as `renderBufferDirect` sends it: drawRange, group, index or position count, instances (InstancedMesh's
 *   `count`, an InstancedBufferGeometry's `instanceCount`), multi-draw for a BatchedMesh; triangles counted only for
 *   triangle draws (meshes, sprites), as three counts them; `onBeforeRender`/`onAfterRender` called round each draw of
 *   the main pass.
 * - Render targets, clears, compiles, copies and reads do nothing but keep their state: no pixel is ever made.
 *
 * `info.render` is three's (reset each `render` when `info.autoReset`); `tally` adds up every draw since `tally.reset()`
 * by pass (main or shadow, to the screen or a target) and keeps what culling removed, for the census (../census.ts).
 */
import * as THREE from 'three';
import { context } from 'three/tsl';

/** the scene passes made (./tsl.js `pass`) since a pipeline was last made, which takes them as its own (./webgpu.js) */
export const madePasses = [];

const _frustum = new THREE.Frustum();
const _proj = new THREE.Matrix4();

/** what a frame drew, as the census reads it: every draw since the last reset */
function newTally() {
	return {
		calls: 0, tris: 0, meshes: 0, instanced: 0, instances: 0,
		/** indirect draws (their instances the GPU's: counted only where the geometry says, `userData.indirectInstances`), and compute passes */
		indirect: 0, computes: 0,
		shadowCalls: 0, shadowTris: 0, shadowPasses: 0,
		targetCalls: 0, targetTris: 0,
		culledObjects: 0, culledTris: 0,
		/** every draw to the screen: [object, triangles] */
		draws: []
	};
}

/** how many triangles one draw of `object` with `geometry` (and `group`) sends, and how many instances: as three */
export function drawOf(object, geometry, material, group) {
	if (!(object.isMesh || object.isSprite)) return { tris: 0, instances: 0, prims: 0 };
	if (material?.wireframe === true) return { tris: 0, instances: 0, prims: 0 };
	const index = geometry.index, position = geometry.attributes.position;
	const range = geometry.drawRange;
	let start = range.start, end = range.start + range.count;
	if (group) {
		start = Math.max(start, group.start);
		end = Math.min(end, group.start + group.count);
	}
	if (index) (start = Math.max(start, 0)), (end = Math.min(end, index.count));
	else if (position) (start = Math.max(start, 0)), (end = Math.min(end, position.count));
	const count = end - start;
	if (count < 0 || count === Infinity) return { tris: 0, instances: 0, prims: 0 };
	if (object.isBatchedMesh) {
		let n = 0;
		const counts = object._multiDrawCounts, k = object._multiDrawCount ?? 0;
		for (let i = 0; i < k; i++) n += counts[i];
		return { tris: n / 3, instances: 1, prims: n };
	}
	// an indirect draw (WebGPU): one draw an offset, its instances counted by a compute on the GPU (intent e85a5860)
	if (geometry.indirect) {
		const calls = Array.isArray(geometry.indirectOffset) ? geometry.indirectOffset.length : 1;
		const instances = geometry.userData?.indirectInstances ?? 0;
		return { tris: (instances * count) / 3, instances, prims: count, calls, indirect: true };
	}
	let instances = 1;
	if (object.isInstancedMesh) instances = object.count;
	else if (geometry.isInstancedBufferGeometry) instances = Math.min(geometry.instanceCount, geometry._maxInstanceCount ?? Infinity);
	return { tris: (instances * count) / 3, instances, prims: count };
}

/** triangles one copy of the object would draw from every material it has (for what culling removed) */
function trianglesOf(object) {
	const g = object.geometry;
	if (!g) return 0;
	const m = object.material;
	if (Array.isArray(m)) return g.groups.reduce((a, gr) => a + (m[gr.materialIndex]?.visible ? drawOf(object, g, m[gr.materialIndex], gr).tris : 0), 0);
	return m?.visible === false ? 0 : drawOf(object, g, m, null).tris;
}

export class CountingRenderer {
	constructor(parameters = {}) {
		this.isWebGLRenderer = true;
		this.coordinateSystem = THREE.WebGLCoordinateSystem;
		this.parameters = parameters;
		this.domElement = parameters.canvas ?? globalThis.document.createElement('canvas');
		this.debug = { checkShaderErrors: false, diagnostics: { keywords: false }, onShaderError: null };
		this.autoClear = this.autoClearColor = this.autoClearDepth = this.autoClearStencil = true;
		this.sortObjects = true;
		this.clippingPlanes = [];
		this.localClippingEnabled = false;
		this.outputColorSpace = THREE.SRGBColorSpace;
		this.toneMapping = THREE.NoToneMapping;
		this.toneMappingExposure = 1;
		this.transmissionResolutionScale = 1;
		this.info = {
			autoReset: true,
			memory: { geometries: 0, textures: 0 },
			render: { frame: 0, calls: 0, triangles: 0, points: 0, lines: 0 },
			programs: [],
			reset() {
				this.render.calls = this.render.triangles = this.render.points = this.render.lines = 0;
			}
		};
		this.shadowMap = { enabled: false, autoUpdate: true, needsUpdate: false, type: THREE.PCFShadowMap, cullFace: undefined };
		this.capabilities = { isWebGL2: true, maxTextureSize: 16384, maxCubemapSize: 16384, maxSamples: 4, samples: 4, maxAnisotropy: 16, getMaxAnisotropy: () => 16, precision: 'highp', logarithmicDepthBuffer: false, reversedDepthBuffer: false, maxTextures: 16, maxVertexTextures: 16, maxAttributes: 16, maxVertexUniforms: 4096, maxVaryings: 30, maxFragmentUniforms: 1024, vertexTextures: true, getMaxPrecision: () => 'highp', textureFormatReadable: () => true, textureTypeReadable: () => true };
		this.extensions = { has: () => true, get: () => ({}), init() {} };
		this.xr = Object.assign(new THREE.EventDispatcher(), { enabled: false, isPresenting: false, cameraAutoUpdate: true, getCamera: () => null, setAnimationLoop() {}, dispose() {}, getSession: () => null, setSession: () => Promise.resolve(), setReferenceSpaceType() {} });
		this.state = { reset() {}, buffers: { depth: { getReversed: () => false, setTest() {}, setMask() {}, setClear() {} }, color: { setClear() {}, setMask() {} }, stencil: { setTest() {} } }, setBlending() {}, setScissorTest() {}, viewport() {}, setMaterial() {} };
		this.properties = { get: () => ({}), remove() {}, update() {} };
		this._pixelRatio = 1;
		this._width = this.domElement.width;
		this._height = this.domElement.height;
		this._viewport = new THREE.Vector4(0, 0, this._width, this._height);
		this._scissor = new THREE.Vector4(0, 0, this._width, this._height);
		this._target = null;
		this._face = 0;
		this._mip = 0;
		this._clear = new THREE.Color(0x000000);
		this._clearAlpha = parameters.alpha ? 0 : 1;
		this._loop = null;
		this._tally = newTally();
		this._tally.reset = () => Object.assign(this._tally, newTally(), { reset: this._tally.reset });
		/** every counting renderer made (the census holds them to one) */
		CountingRenderer.made.push(this);
	}

	/**
	 * What the frame drew, for the census; to a page, the sign that it is counted, not drawn (the grass then counts its
	 * blades on the CPU, seconds a frame while its ground streams in: grass-compute.js `mirror`). Undefined on a frame the
	 * census only turns and reads nothing of (`CountingRenderer.unread`: a world building or settling), so the page pays
	 * for the count only where it is read (intent 629840f2).
	 */
	get tally() {
		return CountingRenderer.unread ? undefined : this._tally;
	}

	// ── the canvas and its size ──
	getContext() {
		return null;
	}
	getContextAttributes() {
		return { alpha: !!this.parameters.alpha, antialias: this.parameters.antialias ?? true, depth: true, stencil: false, preserveDrawingBuffer: !!this.parameters.preserveDrawingBuffer, xrCompatible: false };
	}
	forceContextLoss() {}
	forceContextRestore() {}
	getPixelRatio() {
		return this._pixelRatio;
	}
	setPixelRatio(v) {
		if (v === undefined) return;
		this._pixelRatio = v;
		this.setSize(this._width, this._height, false);
	}
	getSize(t) {
		return t.set(this._width, this._height);
	}
	setSize(w, h, style = true) {
		this._width = w;
		this._height = h;
		this.domElement.width = Math.floor(w * this._pixelRatio);
		this.domElement.height = Math.floor(h * this._pixelRatio);
		if (style) (this.domElement.style.width = `${w}px`), (this.domElement.style.height = `${h}px`);
		this.setViewport(0, 0, w, h);
	}
	getDrawingBufferSize(t) {
		return t.set(this._width * this._pixelRatio, this._height * this._pixelRatio).floor();
	}
	setDrawingBufferSize(w, h, pr) {
		this._width = w;
		this._height = h;
		this._pixelRatio = pr;
	}
	getCurrentViewport(t) {
		return t.copy(this._viewport);
	}
	getViewport(t) {
		return t.copy(this._viewport);
	}
	setViewport(x, y, w, h) {
		if (x.isVector4) this._viewport.copy(x);
		else this._viewport.set(x, y, w, h);
	}
	getScissor(t) {
		return t.copy(this._scissor);
	}
	setScissor(x, y, w, h) {
		if (x.isVector4) this._scissor.copy(x);
		else this._scissor.set(x, y, w, h);
	}
	getScissorTest() {
		return false;
	}
	setScissorTest() {}
	setOpaqueSort() {}
	setTransparentSort() {}
	setEffects() {}

	// ── clearing ──
	getClearColor(t) {
		return t.copy(this._clear);
	}
	setClearColor(c, a = 1) {
		this._clear.set(c);
		this._clearAlpha = a;
	}
	getClearAlpha() {
		return this._clearAlpha;
	}
	setClearAlpha(a) {
		this._clearAlpha = a;
	}
	clear() {}
	clearColor() {}
	clearDepth() {}
	clearStencil() {}

	// ── what is drawn into ──
	getRenderTarget() {
		return this._target;
	}
	getActiveCubeFace() {
		return this._face;
	}
	getActiveMipmapLevel() {
		return this._mip;
	}
	setRenderTarget(t, face = 0, mip = 0) {
		this._target = t ?? null;
		this._face = face;
		this._mip = mip;
		if (t) this._viewport.copy(t.viewport);
	}
	initRenderTarget() {}
	initTexture() {}
	copyFramebufferToTexture() {}
	copyTextureToTexture() {}
	copyTextureToTexture3D() {}
	readRenderTargetPixels() {}
	readRenderTargetPixelsAsync(_t, _x, _y, _w, _h, buffer) {
		return Promise.resolve(buffer);
	}
	resetState() {}
	dispose() {}

	/** node materials (TSL) built by three's WebGLNodesHandler, which createRenderer installs: nothing to build here */
	setNodesHandler(handler) {
		this.nodesHandler = handler;
	}

	// ── compiling: nothing to compile ──
	compile(scene) {
		return new Set();
	}
	compileAsync(object, camera, scene) {
		return Promise.resolve(scene ?? object);
	}

	// ── the loop ──
	setAnimationLoop(cb) {
		this._loop = cb;
		const tick = (t) => {
			if (this._loop !== cb) return;
			cb(t);
			requestAnimationFrame(tick);
		};
		if (cb) requestAnimationFrame(tick);
	}
	get animation() {
		return { start() {}, stop() {}, setAnimationLoop() {}, setContext() {} };
	}

	// ── drawing ──
	render(scene, camera) {
		if (camera !== undefined && camera.isCamera !== true) return;
		if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
		if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();
		if (scene.isScene === true) scene.onBeforeRender(this, scene, camera, this._target);
		_proj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		_frustum.setFromProjectionMatrix(_proj, THREE.WebGLCoordinateSystem, camera.reversedDepth);
		const list = [], lights = [], shadows = [];
		// the picture: the screen, or the target a pipeline's scene pass draws the scene into (the WebGPU renderer below)
		const toScreen = this._target === null || this._target === this._pass;
		// r187 counts the frame before the walk (three #35099): a LOD or anything else that reads it sees this frame's
		this.info.render.frame++;
		this.#project(scene, camera, list, lights, shadows, toScreen);
		// the background, as three's WebGLBackground adds it: a box for a cube map or an environment, a plane for a texture
		const bg = scene.background;
		const bgTris = bg && (bg.isCubeTexture || bg.mapping === THREE.CubeUVReflectionMapping || bg.mapping === THREE.EquirectangularReflectionMapping || bg.mapping === THREE.EquirectangularRefractionMapping) ? 12 : bg?.isTexture ? 2 : 0;
		if (this.info.autoReset === true) this.info.reset();
		this._shadows(shadows, scene, camera, list);
		if (bgTris) this.#count(bgTris, 1, toScreen, false, null);
		for (const d of list) {
			const { object, geometry, material, group } = d;
			object.onBeforeRender(this, scene, camera, geometry, material, group);
			material.onBeforeRender?.(this, scene, camera, geometry, object, group);
			const n = drawOf(object, geometry, material, group);
			// a see-through material drawn from both sides is drawn twice, its back then its front (three's renderObject)
			const passes = material.transparent === true && material.side === THREE.DoubleSide && material.forceSinglePass === false ? 2 : 1;
			for (let p = 0; p < passes; p++) this.#count(n.tris, n.calls ?? 1, toScreen, false, object, n);
			object.onAfterRender(this, scene, camera, geometry, material, group);
		}
		if (scene.isScene === true) scene.onAfterRender(this, scene, camera);
	}

	/** one draw counted: in three's info, and in the census's tally by pass */
	#count(tris, calls, toScreen, shadow, object, n) {
		this.info.render.calls += calls;
		this.info.render.triangles += tris;
		const t = this._tally;
		if (shadow) (t.shadowCalls += calls), (t.shadowTris += tris);
		else if (!toScreen) (t.targetCalls += calls), (t.targetTris += tris);
		else {
			t.calls += calls;
			t.tris += tris;
			if (object) {
				if (n?.indirect) (t.indirect += calls), (t.instances += n.instances);
				else if (object.isInstancedMesh || object.isBatchedMesh || object.geometry?.isInstancedBufferGeometry) (t.instanced += 1), (t.instances += n?.instances ?? 0);
				else t.meshes += 1;
				t.draws.push([object, tris]);
			}
		}
	}

	#project(object, camera, list, lights, shadows, toScreen) {
		if (object.visible === false) return;
		if (object.layers.test(camera.layers)) {
			if (object.isGroup) {
				/* a group's order sorts, it does not count */
			} else if (object.isLOD) {
				if (object.autoUpdate === true) object.update(camera);
			} else if (object.isLight) {
				lights.push(object);
				if (object.castShadow) shadows.push(object);
			} else if (object.isSprite || object.isMesh || object.isLine || object.isPoints) {
				if (!object.frustumCulled || object.intersectsFrustum(_frustum)) {
					const geometry = object.geometry, material = object.material;
					if (Array.isArray(material)) {
						for (const group of geometry.groups) {
							const m = material[group.materialIndex];
							if (m && m.visible) list.push({ object, geometry, material: m, group });
						}
					} else if (material.visible) list.push({ object, geometry, material, group: null });
				} else if (toScreen) {
					this._tally.culledObjects++;
					this._tally.culledTris += trianglesOf(object);
				}
			}
		}
		const kids = object.children;
		for (let i = 0, l = kids.length; i < l; i++) this.#project(kids[i], camera, list, lights, shadows, toScreen);
	}

	/** the frame's shadow passes: the WebGPU renderer's below. No page draws with the classic one (intent 009e04d3) */
	_shadows() {}
}
/** every counting renderer made in this process */
CountingRenderer.made = [];
/** whether the census reads nothing of the frames it turns now (`tally`) */
CountingRenderer.unread = false;

/** triangles of the sphere WebGPU's Background draws a texture or node background on (SphereGeometry(1, 32, 32)) */
export const BACKGROUND_SPHERE_TRIS = 32 * 32 * 2 - 2 * 32;

/**
 * THE COUNTING WEBGPU RENDERER — three's WebGPURenderer as the census sees it (intent c1bee1f8, c4): the same walk and
 * the same draws as the WebGL one above, where r187's common Renderer does as WebGLRenderer does (`_projectObject`,
 * `renderObject`'s back and front of a see-through double-sided material, `Info.update`'s triangles), and its own
 * where it does otherwise:
 *
 * - Initialised before its first draw (`init()`, `initialized`), as the core's `ready` waits for.
 * - The background: a texture or a node on a sphere (Background.js: SphereGeometry(1, 32, 32), 1,984 triangles); a
 *   colour only clears.
 * - The output: a frame drawn to the screen with tone mapping or out of the working colour space is drawn into the
 *   renderer's frame buffer target and then onto the canvas by one more draw of a single triangle (`_renderOutput`).
 * - Shadows are ShadowNode's: a light's shadow map is drawn only in a frame where something lit by it that receives
 *   shadows is drawn (AnalyticLightNode's `receiveShadow`), when the light's own `shadow.autoUpdate` or `needsUpdate`
 *   says so and, as the core keeps it (../../src/lib/content/render/core.js `keepShadowSwitch`), the renderer's
 *   `shadowMap.autoUpdate` or `needsUpdate`. The shadow pass walks the scene from the shadow's camera, a cascaded
 *   shadow's once a cascade from its own (SunShadowNode), a point light's once a face (LODs chosen for it), on the main camera's layers unless the shadow's own are set, each caster drawn with the shadow material:
 *   its side the material's `shadowSide` or the other side, a see-through double-sided one drawn twice.
 */
export class CountingWebGPURenderer extends CountingRenderer {
	constructor(parameters = {}) {
		super(parameters);
		this.isWebGLRenderer = false;
		this.isWebGPURenderer = true;
		this.coordinateSystem = THREE.WebGPUCoordinateSystem;
		this.initialized = false;
		this.backend = { isWebGPUBackend: !parameters.forceWebGL, isWebGLBackend: !!parameters.forceWebGL, device: null };
		this.onDeviceLost = () => {};
		/** the keyed shadows' frame (core.js's keepShadowSwitch) */
		this._keyedAt = -1;
		/** what a PassNode keeps and puts back round its draw (three's Renderer) */
		this.contextNode = context();
		this.transparent = this.opaque = true;
		this.lighting = this._mrt = null;
	}
	getOutputRenderTarget() {
		return null;
	}
	getMRT() {
		return this._mrt;
	}
	setMRT(mrt) {
		this._mrt = mrt;
	}
	/**
	 * A RenderPipeline's frame (intent 009e04d3): its picture is one triangle (a QuadMesh), made from scene passes three
	 * draws before it (PassNode.updateBefore: the scene into the pass's target, its shadows with it). Which passes a
	 * picture reads three learns as it builds its shader, which nothing here does: they are the passes made for the
	 * pipeline (./tsl.js `pass`, ./webgpu.js `RenderPipeline`). Each is drawn by three's own PassNode, once a frame, and
	 * counted as the picture's main pass. The post passes' own triangles between them (occlusion, bloom, edges) are not.
	 */
	_drawPasses(quad) {
		for (const pass of quad.userData.passes ?? []) {
			this._pass = pass.renderTarget;
			try {
				pass.updateBefore({ renderer: this });
			} finally {
				this._pass = undefined;
			}
		}
	}
	init() {
		this.initialized = true;
		return Promise.resolve(this);
	}
	get _initialized() {
		return this.initialized;
	}
	/** a compute pass (its dispatch counted, nothing run), refused as three's Renderer.compute refuses it */
	compute(nodes, dispatchSize = null) {
		const list = Array.isArray(nodes) ? nodes : [nodes];
		if (list.length === 0 || list.some((n) => n?.isComputeNode !== true)) throw new Error('THREE.Renderer: ".compute()" expects a "ComputeNode".');
		if (dispatchSize !== null && list.some((n) => n.count !== null || n.dispatchSize !== null))
			throw new Error('THREE.Renderer: A dispatch size cannot be passed to "renderer.compute()" for nodes created with "compute( count )". Use "computeKernel()" instead.');
		this._tally.computes += 1;
	}
	computeAsync(nodes, dispatchSize = null) {
		return Promise.resolve(this.compute(nodes, dispatchSize));
	}
	/** a buffer read back: nothing was computed, so its contents as the CPU last wrote them */
	getArrayBufferAsync(attribute) {
		return Promise.resolve(attribute.array.slice().buffer);
	}
	/** three's own (r187): three/webgpu's PMREMGenerator asks it before it bakes (a plant's or a sky's environment) */
	hasInitialized() {
		return this.initialized;
	}
	/** no compressed texture format offered (KTX2's detectSupport asks each), as before init on three's own */
	hasFeature() {
		return false;
	}
	renderAsync(scene, camera) {
		return Promise.resolve(this.render(scene, camera));
	}
	/** the frame's walk, as WebGPU's: the camera in its coordinate system, the background on a sphere, the output pass */
	render(scene, camera) {
		if (camera !== undefined && camera.isCamera !== true) return;
		if (camera.coordinateSystem !== this.coordinateSystem) {
			camera.coordinateSystem = this.coordinateSystem;
			camera.updateProjectionMatrix();
		}
		if (scene.isQuadMesh === true && this._pass === undefined) this._drawPasses(scene);
		const toScreen = this._target === null || this._target === this._pass;
		// the scene drawn with a texture or node background's sphere instead of WebGL's box or plane
		const bg = scene.background, bgNode = scene.backgroundNode;
		const sphere = !!(bgNode || (bg && !bg.isColor && (bg.isTexture || bg.isNode)));
		scene.background = null;
		scene.backgroundNode = null;
		try {
			super.render(scene, camera);
		} finally {
			scene.background = bg;
			scene.backgroundNode = bgNode;
		}
		if (sphere) this._countDraw(BACKGROUND_SPHERE_TRIS, toScreen);
		// to the canvas through the frame buffer target and its output pass (tone mapping, colour space)
		if (toScreen && (this.toneMapping !== THREE.NoToneMapping || this.outputColorSpace !== THREE.ColorManagement.workingColorSpace)) this._countDraw(1, true);
	}
	/** one draw that is no object's (the background's sphere, the output's triangle) */
	_countDraw(tris, toScreen) {
		this.info.render.calls += 1;
		this.info.render.triangles += tris;
		const t = this._tally;
		if (toScreen) (t.calls += 1), (t.tris += tris);
		else (t.targetCalls += 1), (t.targetTris += tris);
	}
	/** the shadow passes of a frame, as ShadowNode draws them */
	_shadows(lights, scene, camera, list) {
		const sm = this.shadowMap;
		if (sm.enabled === false || lights.length === 0) return;
		// the renderer's own switch, as the core keeps it on WebGPU
		const frame = this.info.render.frame;
		if (sm.autoUpdate === false) {
			if (sm.needsUpdate === true) (sm.needsUpdate = false), (this._keyedAt = frame);
			if (this._keyedAt !== frame) return;
		}
		// a light's shadow is drawn only where something it lights that receives shadows is drawn
		// (by the material it is drawn with: the scene's override, a depth pass's, is lit by nothing)
		const lit = (m) => m.lights !== false && !m.isMeshBasicMaterial && !m.isMeshDepthMaterial;
		const receives = list.some((d) => d.object.isMesh && d.object.receiveShadow === true && lit(scene.overrideMaterial ?? d.material));
		if (!receives) return;
		const was = { target: this._target, face: this._face, mip: this._mip };
		for (const light of lights) {
			const shadow = light.shadow;
			if (!shadow || !(shadow.autoUpdate || shadow.needsUpdate)) continue;
			// a cascaded shadow (three's SunLight: SunShadowNode) is drawn once a cascade, each from its own camera
			if (light.isPointLight !== true) shadow.updateMatrices(light, camera);
			const faces = light.isPointLight ? 6 : shadow.getViewportCount?.() ?? 1;
			const layers = (shadow.camera.layers.mask & 0xfffffffe) === 0 ? camera.layers : shadow.camera.layers;
			for (let face = 0; face < faces; face++) {
				const cam = light.isPointLight ? pointFace(light, shadow, face) : faces > 1 && shadow.getCamera ? shadow.getCamera(face) : shadow.camera;
				cam.updateMatrixWorld();
				_proj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
				_shadowFrustum.setFromProjectionMatrix(_proj, cam.coordinateSystem, cam.reversedDepth);
				this._tally.shadowPasses++;
				this._shadowWalk(scene, layers, cam);
			}
			shadow.needsUpdate = false;
		}
		this.setRenderTarget(was.target, was.face, was.mip);
	}
	_shadowWalk(object, layers, cam) {
		if (object.visible === false) return;
		if (object.layers.test(layers)) {
			// WebGPU's shadow pass is a render from the shadow's camera: a LOD picks its level for it
			if (object.isLOD && object.autoUpdate === true) object.update(cam);
			else if ((object.isMesh || object.isLine || object.isPoints || object.isSprite) && object.castShadow === true && (!object.frustumCulled || object.intersectsFrustum(_shadowFrustum))) {
				const geometry = object.geometry, material = object.material;
				const one = (m, group) => {
					object.onBeforeShadow(this, object, cam, cam, geometry, m, group);
					// the shadow material takes the caster's see-through and its side (shadowSide, else the other side;
					// a double-sided one stays double-sided), so a see-through double-sided caster is drawn twice
					const side = m.shadowSide ?? (m.side === THREE.DoubleSide ? THREE.DoubleSide : m.side === THREE.FrontSide ? THREE.BackSide : THREE.FrontSide);
					const passes = (m.transparent === true || m.transmission > 0) && side === THREE.DoubleSide ? 2 : 1;
					const n = drawOf(object, geometry, m, group).tris;
					for (let p = 0; p < passes; p++) this._countShadow(n);
					object.onAfterShadow(this, object, cam, cam, geometry, m, group);
				};
				if (Array.isArray(material)) {
					for (const group of geometry.groups) {
						const m = material[group.materialIndex];
						if (m && m.visible) one(m, group);
					}
				} else if (material.visible) one(material, null);
			}
		}
		const kids = object.children;
		for (let i = 0, l = kids.length; i < l; i++) this._shadowWalk(kids[i], layers, cam);
	}
	_countShadow(tris) {
		this.info.render.calls += 1;
		this.info.render.triangles += tris;
		(this._tally.shadowCalls += 1), (this._tally.shadowTris += tris);
	}
}

const _shadowFrustum = new THREE.Frustum();
/** a point light's shadow camera turned to its cube face `face` (three's own placing) */
function pointFace(light, shadow, face) {
	const cam = shadow.camera, far = light.distance || cam.far;
	if (far !== cam.far) (cam.far = far), cam.updateProjectionMatrix();
	const at = new THREE.Vector3().setFromMatrixPosition(light.matrixWorld);
	cam.position.copy(at);
	cam.up.copy(CUBE_UPS[face]);
	cam.lookAt(at.clone().add(CUBE_DIRS[face]));
	return cam;
}

const CUBE_DIRS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
const CUBE_UPS = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)];
