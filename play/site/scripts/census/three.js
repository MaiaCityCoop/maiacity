// @ts-nocheck — three.js as the census hands it to a world's code (./setup.ts): all of it, its WebGLRenderer the
// counting renderer (./counting.js), which draws nothing and counts every draw three would send
export * from 'three';
export { CountingRenderer as WebGLRenderer } from './counting.js';

// three r187 renamed PMREMGenerator's `_allocateTargets` to `_allocateTarget` (its targets now cubes): the trees made
// before (match.ts's run 5) hook the old name to reuse one target, so the census, which counts them on r187, gives them
// both names
import { PMREMGenerator } from 'three';
const proto = /** @type {any} */ (PMREMGenerator.prototype);
if (!('_allocateTargets' in proto) && '_allocateTarget' in proto)
	Object.defineProperty(proto, '_allocateTargets', {
		configurable: true,
		get() {
			return this._allocateTarget;
		},
		set(f) {
			Object.defineProperty(this, '_allocateTarget', { value: f, writable: true, configurable: true });
		}
	});
