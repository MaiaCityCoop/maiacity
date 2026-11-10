// @ts-nocheck — three's TSL as the census hands it to a world's code (./setup.ts; intent 009e04d3): all of it, each
// scene pass made (`pass`) kept for the pipeline it is made for, since the counting renderer builds no shader to find
// which passes a pipeline's picture reads (./counting.js `_drawPasses`)
export * from 'three/tsl';
import { pass as scenePass } from 'three/tsl';
import { madePasses } from './counting.js';
export const pass = (...a) => {
	const p = scenePass(...a);
	madePasses.push(p);
	return p;
};
