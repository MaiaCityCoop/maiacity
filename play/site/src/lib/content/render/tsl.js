// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * TSL ON THE WEBGL RENDERER, for now (intent 602a8849): three's WebGLNodesHandler (r184+) installed on a renderer so a
 * node material is built into GLSL and drawn beside three's own, with a node material drawn into a target coming out
 * linear and untoned, as three's own do (the handler alone would tone-map and encode it for the screen); on the screen
 * a material with `toneMapped: false` is encoded and not toned, as three's own are, and one with `userData.raw` is
 * written as it is, as three's raw shader materials wrote their colour (a pass after the output pass, a flat overlay).
 *
 * Temporary: intent b03f9fb4 installs the handler in ./core.js and cb16b7a5 keeps this fix (./nodes/index.js
 * `install`); once both are on main this file goes and ./core.js calls theirs.
 */
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
import { workingToColorSpace } from 'three/tsl';

const handlers = new WeakMap();

/** @param {import('three').WebGLRenderer} r */
export function install(r) {
	if (handlers.has(r) || !r.setNodesHandler) return handlers.get(r);
	const h = new WebGLNodesHandler();
	r.setNodesHandler(h);
	const screen = h.getOutputCallback;
	const onScreen = () => r.getRenderTarget() === null;
	h.getOutputCallback = (node, b) => {
		const m = b?.material;
		if (!onScreen() || m?.userData.raw) return node;
		return m?.toneMapped === false ? workingToColorSpace(node, r.outputColorSpace) : screen(node);
	};
	h.renderer.getCacheKey = () => (onScreen() ? `${r.toneMapping}${r.outputColorSpace}` : 'target');
	handlers.set(r, h);
	return h;
}
