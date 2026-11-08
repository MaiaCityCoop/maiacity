// What a node material writes and how it is keyed (./tsl.js, intent 602a8849).
import { describe, expect, test } from 'vitest';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { OwnBasic, OwnNode, OwnPhysical, OwnStandard } from './tsl.js';

describe('our node materials', () => {
	test('each gets its own program: two alike are keyed apart, three’s own are not', () => {
		for (const Own of [OwnStandard, OwnPhysical, OwnBasic, OwnNode]) {
			const a = new Own(), b = new Own();
			expect(a.customProgramCacheKey()).not.toBe(b.customProgramCacheKey());
			expect(a.customProgramCacheKey()).toBe(a.customProgramCacheKey());
		}
		expect(new MeshStandardNodeMaterial().customProgramCacheKey()).toBe(new MeshStandardNodeMaterial().customProgramCacheKey());
	});
});
