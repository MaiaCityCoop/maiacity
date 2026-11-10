// @ts-nocheck — three's WebGPU build as the census hands it to a world's code (./setup.ts; intent c1bee1f8): all of it,
// its WebGPURenderer the counting one (./counting.js CountingWebGPURenderer), which draws nothing and counts every draw
// WebGPU would send
export * from 'three/webgpu';
export { CountingWebGPURenderer as WebGPURenderer } from './counting.js';
