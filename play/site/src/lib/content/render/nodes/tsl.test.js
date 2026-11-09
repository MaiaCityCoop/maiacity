// The ground's TSL builds to GLSL as WebGLRenderer's node handler builds it (intent db87a28f): the biomes' ground, the
// stage's soil and floor. Where glslangValidator is installed (avenBOX), each shader is also checked as GLSL ES 3.0.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { glslOf, valid } from './glsl.testkit.js';
import { groundMaterial } from '../../biomes/surfaces.js';
import { groundOf } from '../../assets/ground.js';

describe('the ground in TSL', () => {
	it('builds the biomes ground: three surfaces of nine, by height, rows and tramlines', () => {
		const m = groundMaterial({ litter: 3, green: 10, tilled: 2 }, { rows: 0.5, tramlines: { every: 24, gauge: 1.8, tyre: 0.48 } });
		const p = glslOf(m);
		expect(p.fragmentShader).toContain('sampler2DArray');
		valid('ground', p);
	});
	for (const sky of [false, true])
		it(`builds the stage's floor and soil${sky ? ' under the sky' : ''}`, () => {
			const su = { horizon: { uniforms: { uSkyRing: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) } } } };
			const g = groundOf({ scene: new THREE.Scene(), bg: new THREE.Color(), sky: sky ? su : null, low: true }, { cover: false });
			const mats = new Set();
			g.group.traverse((o) => o.material && mats.add(o.material));
			expect(mats.size).toBe(2);
			let i = 0;
			for (const m of mats) valid(`stage${sky ? '-sky' : ''}${i++}`, glslOf(m));
		});
});

// three's compileAsync can wait forever on a node material under WebGLNodesHandler: every warm-up goes through
// render/core.js's precompile, which leaves node materials to compile as they are first drawn
describe('warm-ups', () => {
	it('call compileAsync only in render/core.js', () => {
		const src = join(import.meta.dirname, '../../..'), found = [];
		const walk = (d) => {
			for (const f of readdirSync(d)) {
				const p = join(d, f);
				if (statSync(p).isDirectory()) walk(p);
				else if (/\.(js|ts|svelte)$/.test(f) && !/\.test\./.test(f) && /compileAsync\(/.test(readFileSync(p, 'utf8'))) found.push(p.slice(src.length + 1));
			}
		};
		walk(src);
		expect(found).toEqual(['content/render/core.js']);
	});
});

