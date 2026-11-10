// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * OUR NODE MATERIALS (intent 602a8849) beside the render kit's (./nodes, intent cb16b7a5): what one writes on screen and
 * the classes ours are made from. On screen the handler tone-maps and encodes every node material; here `toneMapped:
 * false` is encoded, not toned, as three's own, and `userData.raw` is written as it is, as three's raw shader materials
 * wrote theirs (a pass after the output pass, a flat overlay). Into a target the kit's `install` draws ours (`isKit`)
 * linear and untoned.
 */
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, NodeMaterial } from 'three/webgpu';
import { workingToColorSpace } from 'three/tsl';
import { shapeOf } from './nodes/index.js';

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
 * A node material class of ours (`isKit`): out of three's compile (./core.js), drawn linear into a target, keyed by its
 * shape and drawn geometry as the kit's (./nodes `shapeOf`, bd087014, 660ad67f): differing shaders never share a program,
 * alike copies share one (keyed by id, Safari linked one for every copy). The handler reads the key off the class (its
 * prototype's `customProgramCacheKey`), so it is a class, not a property. @template {new (...a: any[]) => any} B @param {B} Base @returns {B}
 */
const own = (Base) =>
	class extends Base {
		isKit = true;
		customProgramCacheKey() {
			// a clash the shape misses (./nodes `own`, 660ad67f) keys by its id, as the kit's do
			return `${super.customProgramCacheKey()}#${this.own ? this.id : shapeOf(this)}`;
		}
	};
export const OwnStandard = own(MeshStandardNodeMaterial);
export const OwnPhysical = own(MeshPhysicalNodeMaterial);
export const OwnBasic = own(MeshBasicNodeMaterial);
export const OwnNode = own(NodeMaterial);
