/*
 * THE GRASS ALONE, FOR A LOOK IN SOFTWARE — a meadow and nothing else (a ground, a sky's colour, a sun) drawn by the
 * site's own renderer and grass (render/core.js `createRenderer`, render/nodes/grass-compute.js `grassFieldOn`), served
 * by the dev server like any module, so avenBOX's Chromium in software (SwiftShader) can shoot the grass on WebGPU
 * where a whole world can't stay up (intent e85a5860's c4; ../../../../intent-work/e85a5860-shots/shots.mjs loads it).
 *
 * Inlined as a module into a page of the dev server's origin, its address `?backend=webgpu|webgl2&biome=<id>&device=small`: no biome,
 * the made-up meadow below; a biome's id (meadow, food-forest), its own grass where its
 * recipe grows grass (`grassOfRecipe`) and its grass as its newest version on play writes it (pinned 2026-11-09, as
 * grass.test.js's cover measure); sets `window.__h`:
 *   ready      a promise, the renderer up and the scene laid
 *   frame(t, pushers?)  the grass updated at the world's time t (s) with its pushers (x, z, radius, strength), drawn
 *   look(x, y, z, yaw, pitch)  the camera placed (yaw 0 looks to −z)
 *   field, renderer, camera
 */
// inlined into the page (SvelteKit's dev server serves modules from src/ alone), so every import is by URL: the site's
// modules by their path, three by the very URL vite gave core.js (one three, not two)
const { createRenderer, ready } = await import('/src/lib/content/render/core.js');
const { grassFieldOn } = await import('/src/lib/content/render/nodes/grass-compute.js');
const { BIOMES } = await import('/src/lib/content/biomes/index.js');
const { grassOfRecipe } = await import('/src/lib/content/biomes/grass.js');
const threeAt = /** @type {string} */ ((await (await fetch('/src/lib/content/render/core.js')).text()).match(/from ["'](\/node_modules\/\.vite\/deps\/three\.js[^"']*)["']/)?.[1]);
const THREE = await import(threeAt);

const which = new URLSearchParams(location.search).get('backend') ?? 'webgpu';
const biome = new URLSearchParams(location.search).get('biome');
// whose budget: a desktop's, or a phone's (`small`), as the asset viewer and the worlds choose it
const device = new URLSearchParams(location.search).get('device') === 'small' ? 'small' : 'desktop';
document.body.style.margin = '0';
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh';
document.body.appendChild(canvas);
const W = window.innerWidth, H = window.innerHeight;

const renderer = createRenderer({ canvas, backend: /** @type {any} */ (which), antialias: true, pixelRatio: 1, toneMapping: 'agx', shadows: false });
renderer.setSize(W, H, false);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc3e6);
const camera = new THREE.PerspectiveCamera(55, W / H, 0.05, 400);
const sun = new THREE.DirectionalLight(0xfff1dc, 3);
sun.position.set(30, 60, 20);
scene.add(sun, new THREE.HemisphereLight(0xcfe2ff, 0x5a6b3a, 0.8));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5b5a33, roughness: 1 }));
scene.add(ground);

/** each grass biome's grass as its newest version on play writes it (its source's `grass`), and its ground's colour */
const OF = {
	meadow: { params: { height: 0.3, tall: 0.6, heightSpread: 0.45, width: 0.006, clump: 1.4, lean: 0.55, base: '#3a5a20', tip: '#a7bf62', dry: '#c2b071', dryShare: 0.15 }, ground: 0x5b5a33 }, // e36c9671 v2
	'food-forest': { params: { height: 0.22, tall: 0.45, heightSpread: 0.4, width: 0.006, clump: 1.2, lean: 0.5, base: '#3c5e22', tip: '#9ab85a', dry: '#b9a865', dryShare: 0.1 }, ground: 0x4a3b28 } // 254102d4 v3
};
const own = biome ? /** @type {any} */ (OF)[biome] : null;
if (biome && !own) throw new Error(`no grass biome ${biome}`);
const recipe = biome ? BIOMES.find((/** @type {any} */ b) => b.id === biome) : null;
const ofRecipe = recipe ? grassOfRecipe(/** @type {any} */ (recipe)) : null;
if (own) ground.material.color.setHex(own.ground);
/** a meadow: grass nearly everywhere, thinner in patches, some of it tall; the ground flat (or the biome's own) */
const at = (/** @type {number} */ x, /** @type {number} */ z) =>
	ofRecipe ? { ...ofRecipe(x, z), y: 0 } : { grass: 0.75 + 0.25 * Math.sin(x * 0.07) * Math.cos(z * 0.05), tall: 0.25 + 0.2 * Math.sin(x * 0.03 + z * 0.02), y: 0 };
/** @type {any} the field, made once the renderer is up (on WebGPU's own backend it chooses the blades on the card) */
let field = null;
const sunDir = sun.position.clone().normalize();

/** what is drawn into (`snap`, `frame`) */
const target = new THREE.RenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const look = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ z, /** @type {number} */ yaw, /** @type {number} */ pitch) => {
	camera.position.set(x, y, z);
	camera.rotation.set(pitch, yaw, 0, 'YXZ');
	camera.updateMatrixWorld();
};
const frame = async (/** @type {number} */ t, /** @type {[number, number, number, number][]} */ pushers = []) => {
	window.__worldTime = t;
	field.update(camera, t, { sun: { dir: sunDir, color: sun.color, strength: 1 }, height: H, pushers, budget: Infinity });
	// into the target, never the canvas (below: a WebGPU canvas shown loses its device here)
	renderer.setRenderTarget(target);
	if (renderer.renderAsync) await renderer.renderAsync(scene, camera);
	else renderer.render(scene, camera);
	renderer.setRenderTarget(null);
};

/*
 * A picture without the canvas: in avenBOX's headless Chromium a WebGPU canvas never presents (its device is destroyed
 * at the first frame shown, on SwiftShader as on the newer headless), so the scene is drawn into a target and read
 * back, linear, and put through the sRGB curve here, on either backend alike; a PNG's data URL.
 */
const snap = async () => {
	renderer.setRenderTarget(target);
	if (renderer.renderAsync) await renderer.renderAsync(scene, camera);
	else renderer.render(scene, camera);
	const px = await renderer.readRenderTargetPixelsAsync(target, 0, 0, W, H);
	renderer.setRenderTarget(null);
	const c = document.createElement('canvas');
	(c.width = W), (c.height = H);
	const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')), img = g.createImageData(W, H);
	const half = px instanceof Uint16Array, f = (/** @type {number} */ v) => (half ? THREE.DataUtils.fromHalfFloat(v) : v);
	const srgb = (/** @type {number} */ v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
	// WebGPU's rows top down, WebGL 2's bottom up
	const flip = !(/** @type {any} */ (renderer).backend?.isWebGPUBackend);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const i = ((flip ? H - 1 - y : y) * W + x) * 4, o = (y * W + x) * 4;
			for (let k = 0; k < 3; k++) img.data[o + k] = srgb(Math.min(1, Math.max(0, f(/** @type {number} */ (px[i + k])))));
			img.data[o + 3] = 255;
		}
	g.putImageData(img, 0, 0);
	return c.toDataURL('image/png');
};

window.__h = {
	snap,
	renderer,
	camera,
	look,
	frame,
	get field() {
		return field;
	},
	ready: ready(renderer).then(() => {
		field = grassFieldOn(renderer, { at, device, ...(own ? { params: own.params } : {}) });
		scene.add(field.object);
		look(0, 1.65, 0, 0, -0.12);
	})
};
