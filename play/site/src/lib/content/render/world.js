/**
 * THE WORLD RENDERER — the canvas, the scene and the camera every world is drawn with (the sandboxes, Sandbox 1 and 2's
 * islands, MaiaCity V1, the Factories, the tired land): the purpose renderer for worlds on the core (./core.js).
 *
 * Taken out of Sandbox 4 as the sandbox kit's stage: a renderer set up for the sky ($content/sandbox-kit/sky.js) — AgX
 * tone mapping (its lens set by the sky) and shadows — a perspective camera at a walker's field of view, both kept to the size of their
 * container, and a resolution that eases down a little when frames get slow and back up when there is room, so a
 * world stays smooth on a slow phone. A world that sizes its own canvas (an island's) takes only the renderer
 * (`createWorldRenderer`'s `renderer` alone, ./core.js `createRenderer` with the world's settings).
 */
import * as THREE from 'three';
import { createRenderer, disposeObject, disposeRenderer, fitTo, isWebGPU, placeSeenOnly, ready } from './core.js';
import { finishing, thisDevice } from './finish.js';
import { createAtmosphere } from './atmosphere.js';
import { createFinish } from './post.js';

/**
 * @typedef {object} StageHandle
 * @property {THREE.WebGLRenderer} renderer
 * @property {Promise<unknown>} ready settles once the renderer may draw (WebGPU's device asked for, intent c1bee1f8;
 *   on WebGL at once): the world's first frame waits for it
 * @property {THREE.Scene} scene
 * @property {THREE.PerspectiveCamera} camera
 * @property {(now?: number, hold?: boolean) => void} adapt call once a frame: the resolution follows the frame rate
 *   (`hold` keeps it as it is, as while a film is shot at the resolution it asks for)
 * @property {() => void} dispose let go of the canvas and everything in the scene
 */

/**
 * A world's renderer alone, on its own canvas, with the world's settings unless told otherwise: antialiased, AgX,
 * shadows, at most 1.25 pixels per CSS pixel. For a world that sizes and draws its canvas itself.
 * @param {import('./core.js').RendererOptions} [o]
 */
export function worldRenderer(o = {}) {
	return createRenderer({ maxPixelRatio: 1.25, toneMapping: 'agx', shadows: 'pcf', ...o });
}

/**
 * The kit's stage: a world's renderer, scene and camera in a container, kept to its size, its resolution following
 * the frame rate.
 * @param {HTMLElement} container
 * @param {{ fov?: number, near?: number, far?: number, maxPixelRatio?: number }} [options]
 * @returns {StageHandle}
 */
export function createWorldRenderer(container, options = {}) {
	const { fov = 68, near = 0.1, far = 2400, maxPixelRatio = 1.25 } = options;
	const top = () => Math.min(maxPixelRatio, window.devicePixelRatio);
	const renderer = createRenderer({ pixelRatio: top(), toneMapping: 'agx', shadows: 'pcf' });
	renderer.setSize(container.clientWidth, container.clientHeight);
	container.appendChild(renderer.domElement);
	const scene = new THREE.Scene();
	// each frame only what is seen is placed (most of a world is hidden: domes away, the plants' far tiles)
	placeSeenOnly(scene);
	const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, near, far);
	// a phone turned on its side, or its browser's bars coming and going, can settle the container's size only after
	// the window's resize: follow the container too, so the world always fills the screen
	const size = fitTo(renderer, container, { camera, window: true, now: false });

	let frames = 0, since = performance.now();
	return {
		renderer,
		ready: ready(renderer),
		scene,
		camera,
		adapt(now = performance.now(), hold = false) {
			// keep it smooth: lower the resolution a little when frames get slow, raise it when there is room
			frames++;
			if (hold) return void ((frames = 0), (since = now));
			if (now - since <= 1500) return;
			const fps = (frames * 1000) / (now - since);
			const pr = renderer.getPixelRatio();
			if (fps < 40 && pr > 1) renderer.setPixelRatio(Math.max(1, pr - 0.1));
			else if (fps > 56 && pr < top()) renderer.setPixelRatio(Math.min(top(), pr + 0.1));
			frames = 0;
			since = now;
		},
		dispose() {
			size.dispose();
			// the scene's shapes; its materials are shared by what may stay (the kit's, a library's)
			disposeObject(scene, { materials: false });
			disposeRenderer(renderer);
		}
	};
}

/**
 * @typedef {object} WorldFinish
 * @property {import('./finish.js').Plan | null} plan the plan drawn by (null on WebGL: the scene drawn as it is)
 * @property {import('./atmosphere.js').AtmosphereHandle | null} atmosphere
 * @property {(t?: number) => void} render a frame through the pipeline; `t` a film's own clock for the grain
 * @property {() => void} dispose
 */

/**
 * A world's picture finished (intent 1f0c6f79): the haze on its scene from the one sky and the one RenderPipeline for
 * the device (./finish.js), the far plane following the haze up to the world's own (what the world last set itself).
 * On WebGL the scene is drawn as it was, untouched. Made once the renderer is ready (its `init`), as the pipeline's
 * passes need the device.
 * @param {any} renderer @param {THREE.Scene} scene @param {THREE.PerspectiveCamera} camera
 * @param {{ sky?: any, device?: import('./finish.js').Device, film?: boolean, ghosts?: boolean }} [o] `sky` the one
 *   sky (../sandbox-kit/sky.js createSky's handle): the haze and the sun's contact shadows come from it
 * @returns {WorldFinish}
 */
export function worldFinish(renderer, scene, camera, o = {}) {
	if (!isWebGPU(renderer)) return { plan: null, atmosphere: null, render: () => renderer.render(scene, camera), dispose() {} };
	const plan = finishing({ device: o.device ?? thisDevice(), film: o.film, ghosts: o.ghosts });
	const atmosphere = o.sky ? createAtmosphere(scene, o.sky) : null;
	const finish = createFinish(renderer, scene, camera, plan, { sun: o.sky?.sun });
	/** the world's own far plane, and the one the haze last set */
	let own = camera.far, set = NaN;
	return {
		plan,
		atmosphere,
		render(t) {
			if (atmosphere) {
				atmosphere.update();
				// a small device's haze closer: its reach of the world's, the air that much denser
				atmosphere.uniforms.a.value /= plan.fog.reach;
				if (camera.far !== set) own = camera.far;
				atmosphere.far(camera, own);
				set = camera.far;
			}
			finish.render(t);
		},
		dispose() {
			finish.dispose();
			atmosphere?.dispose();
		}
	};
}

