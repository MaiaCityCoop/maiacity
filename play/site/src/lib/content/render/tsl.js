// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT A NODE MATERIAL WRITES, on the WebGL renderer (intent 602a8849): three's WebGLNodesHandler (./core.js `nodes`)
 * tone-maps and encodes every node material for the screen, wherever it draws and whatever it asks. Here, as three's
 * own materials do: drawn into a target it comes out linear and untoned; on the screen one with `toneMapped: false` is
 * encoded and not toned, and one with `userData.raw` is written as it is, as three's raw shader materials wrote their
 * colour (a pass after the output pass, a flat overlay). Intent cb16b7a5 brings the target half as ./nodes `install`;
 * once it is on main this joins it.
 */
import { workingToColorSpace } from 'three/tsl';

/** @param {import('three').WebGLRenderer} r @param {import('three/addons/tsl/WebGLNodesHandler.js').WebGLNodesHandler} h */
export function outputs(r, h) {
	// a renderer that only counts (scripts/census) takes the handler without giving it itself: nothing is written there
	if (!h.renderer) return h;
	const screen = h.getOutputCallback;
	const onScreen = () => r.getRenderTarget() === null;
	h.getOutputCallback = (node, b) => {
		const m = b?.material;
		if (!onScreen() || m?.userData.raw) return node;
		return m?.toneMapped === false ? workingToColorSpace(node, r.outputColorSpace) : screen(node);
	};
	h.renderer.getCacheKey = () => (onScreen() ? `${r.toneMapping}${r.outputColorSpace}` : 'target');
	return h;
}
