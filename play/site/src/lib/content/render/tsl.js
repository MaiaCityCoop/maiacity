// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * OUR NODE MATERIALS (intent 602a8849), beside the render kit's (./nodes, intent cb16b7a5): the classes ours are made
 * from. `userData.raw` marks one meant to be written as it is (a glow added onto the picture); the WebGPURenderer tones
 * and encodes the whole frame at its output, so it is toned with the rest.
 */
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial, NodeMaterial } from 'three/webgpu';
import { shapeOf } from './nodes/index.js';

/**
 * A node material class of ours (`isKit`, as the render kit's): kept out of three's compile (./core.js), drawn linear
 * into a target, and keyed by its shape and the drawn geometry as the kit's are (./nodes `shapeOf`, bd087014, 660ad67f): two whose shaders differ never
 * share a program, and copies alike share one (keyed by id, Safari linked a program for every copy). three reads
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
