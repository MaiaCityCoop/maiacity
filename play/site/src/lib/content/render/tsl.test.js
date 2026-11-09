// What a node material writes and how it is keyed (./tsl.js, intent 602a8849).
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { OwnBasic, OwnNode, OwnPhysical, OwnStandard } from './tsl.js';

describe('our node materials', () => {
	test('ours are the kit’s kind, keyed by shape: copies alike share a program, a different shape does not', () => {
		for (const Own of [OwnStandard, OwnPhysical, OwnBasic, OwnNode]) {
			const a = new Own(), b = new Own();
			// ours: out of three's compile, linear into a target (./core.js, cb16b7a5's isKit)
			expect(a.isKit).toBe(true);
			expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
		}
		const plain = new OwnStandard(), mapped = new OwnStandard({ map: new THREE.Texture() });
		expect(plain.customProgramCacheKey()).not.toBe(mapped.customProgramCacheKey());
	});
});
