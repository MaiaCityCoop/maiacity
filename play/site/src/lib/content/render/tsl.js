// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * OUR NODE MATERIALS (intent 602a8849), beside the render kit's (./nodes, intent cb16b7a5): what one writes on the
 * screen, and the classes ours are made from.
 *
 * On the screen the handler tone-maps and encodes every node material, whatever it asks. Here one with
 * `toneMapped: false` is encoded and not toned, as three's own are, and one with `userData.raw` is written as it is, as
 * three's raw shader materials wrote their colour (a pass after the output pass, a flat overlay). Into a target, the
 * kit's `install` already draws ours (`isKit`) linear and untoned.
 */
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, NodeMaterial } from 'three/webgpu';
import { workingToColorSpace } from 'three/tsl';

/** @param {import('three').WebGLRenderer} r @param {any} h the renderer's handler (./nodes `install`) */
export function screenOutputs(r, h) {
	if (!h?.renderer) return h;
	const was = h.getOutputCallback;
	h.getOutputCallback = (node, b) => {
		const m = b?.material ?? h.nodeFrame.material;
		if (r.getRenderTarget() !== null || !m) return was(node, b);
		if (m.userData?.raw) return node;
		return m.toneMapped === false ? workingToColorSpace(node, r.outputColorSpace) : was(node, b);
	};
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
