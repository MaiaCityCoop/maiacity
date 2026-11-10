// @ts-nocheck — three's WebGPU build as the census hands it to a world's code (./setup.ts; intent c1bee1f8): all of it,
// its WebGPURenderer the counting one (./counting.js CountingWebGPURenderer), which draws nothing and counts every draw
// WebGPU would send
export * from 'three/webgpu';
export { CountingWebGPURenderer as WebGPURenderer } from './counting.js';

// a pipeline takes the scene passes made for it (./tsl.js: render/post.js makes them, then the pipeline; intent 009e04d3)
import { RenderPipeline as Pipeline } from 'three/webgpu';
import { madePasses } from './counting.js';
export class RenderPipeline extends Pipeline {
	constructor(renderer, outputNode) {
		super(renderer, outputNode);
		this._quadMesh.userData.passes = madePasses.splice(0);
	}
}
