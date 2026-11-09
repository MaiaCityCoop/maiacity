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
 * A node material class of ours (`isKit`, as the render kit's): kept out of three's compile (./core.js), drawn linear
 * into a target, and keyed by its shape and the drawn geometry as the kit's are (./nodes `shapeOf`, bd087014, 660ad67f): two whose shaders differ never
 * share a program, and copies alike share one (keyed by id, Safari linked a program for every copy). The handler reads
 * the key off the class (its prototype's `customProgramCacheKey`), so it is a class, not a property.
 * @template {new (...a: any[]) => any} B @param {B} Base @returns {B}
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
