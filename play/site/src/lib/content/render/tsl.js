// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * WHAT A NODE MATERIAL WRITES, on the WebGL renderer (intent 602a8849): three's WebGLNodesHandler (./core.js `nodes`)
 * tone-maps and encodes every node material for the screen, wherever it draws and whatever it asks. Ours (`isKit`) as
 * three's own materials do: drawn into a target linear and untoned; on the screen one with `toneMapped: false` is
 * encoded and not toned, and one with `userData.raw` is written as it is, as three's raw shader materials wrote their
 * colour (a pass after the output pass, a flat overlay). Every other node material as the handler draws it. Intent cb16b7a5 brings the target half as ./nodes `install`;
 * once it is on main this joins it.
 */
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, NodeMaterial } from 'three/webgpu';
import { workingToColorSpace } from 'three/tsl';

/** @param {import('three').WebGLRenderer} r @param {import('three/addons/tsl/WebGLNodesHandler.js').WebGLNodesHandler} h */
export function outputs(r, h) {
	// a renderer that only counts (scripts/census) takes the handler without giving it itself: nothing is written there
	if (!h.renderer) return h;
	// only our own materials (`isKit`: the render kit's, and the `Own*` below) are drawn linear and untoned into a target
	// and keyed apart as 'target'; every other node material (the sky, its environment bake) keeps the handler's key and
	// output, as on main (cb16b7a5 90ef0ae: the viewer's sky drawn raw was a haze over everything)
	let keying = null;
	const keyOf = h.customProgramCacheKeyCallback;
	h.customProgramCacheKeyCallback = function () {
		keying = this;
		try {
			return keyOf.call(this);
		} finally {
			keying = null;
		}
	};
	const screen = h.getOutputCallback;
	const onScreen = () => r.getRenderTarget() === null;
	h.getOutputCallback = (node, b) => {
		const m = b?.material ?? h.nodeFrame.material;
		if (!onScreen()) return m?.isKit ? node : screen(node, b);
		if (m?.userData?.raw) return node;
		return m?.toneMapped === false ? workingToColorSpace(node, r.outputColorSpace) : screen(node, b);
	};
	h.renderer.getCacheKey = () => (onScreen() || !(keying ?? h.nodeFrame.material)?.isKit ? `${r.toneMapping}${r.outputColorSpace}` : 'target');
	return h;
}

/**
 * A node material class whose every material gets its own program. three keys a node material's program by its nodes
 * alone, and two whose shaders differ by what is beside them (an environment map) would share one, each uploading its
 * uniforms by name into the other's layout (cb16b7a5, on the Mac: a cube map into a vec3). The handler reads the key
 * off the class (its prototype's `customProgramCacheKey`), so it is a class, not a property.
 * @template {new (...a: any[]) => any} B @param {B} Base @returns {B}
 */
const own = (Base) =>
	class extends Base {
		/** ours, as the render kit's: kept out of three's compile (./core.js) and drawn linear into a target */
		isKit = true;
		customProgramCacheKey() {
			return `${super.customProgramCacheKey()}#${this.id}`;
		}
	};
export const OwnStandard = own(MeshStandardNodeMaterial);
export const OwnPhysical = own(MeshPhysicalNodeMaterial);
export const OwnBasic = own(MeshBasicNodeMaterial);
export const OwnNode = own(NodeMaterial);
