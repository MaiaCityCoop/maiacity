// The ground's TSL builds to GLSL as the app's renderer builds it on its WebGL 2 backend (intent db87a28f; c1bee1f8):
// the biomes' ground, the stage's soil and floor. Where glslangValidator is installed (avenBOX), each shader is also checked as GLSL ES 3.0.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { fakeRenderer } from '../render/nodes/fakegl.js';
import { groundMaterial } from '../biomes/surfaces.js';
import { groundOf } from './ground.js';

/** a material's shaders as the app's renderer builds them, on a stand-in context (no graphics card) */
async function glslOf(material) {
	const { r, shaders } = await fakeRenderer({ shadows: 'pcf', toneMapping: 'agx' });
	const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
	const sun = new THREE.DirectionalLight();
	sun.castShadow = true;
	mesh.receiveShadow = true;
	scene.add(mesh, sun, new THREE.HemisphereLight());
	scene.fog = new THREE.Fog('#ffffff', 10, 100);
	r.render(scene, camera);
	// the material's own two (the last pair that is a Node System's, its shadow's and the frame's output aside)
	const ours = shaders.filter((x) => x.includes('Node System'));
	const strip = (/** @type {string} */ x) => x.replace(/^#version 300 es\n/, '');
	const pick = (/** @type {boolean} */ vert) => ours.filter((x) => /gl_Position\s*=/.test(x) === vert).sort((a, b) => b.length - a.length)[0] ?? '';
	return { vertexShader: strip(pick(true)), fragmentShader: strip(pick(false)) };
}

let glslang = false;
try {
	execFileSync('glslangValidator', ['--version'], { stdio: 'ignore' });
	glslang = true;
} catch {
	/* not installed: the build alone is checked */
}
const dir = mkdtempSync(join(tmpdir(), 'tsl-'));
function valid(name, p) {
	expect(p.fragmentShader).toContain('void main');
	if (!glslang) return;
	for (const [stage, src] of [['frag', p.fragmentShader], ['vert', p.vertexShader]]) {
		const f = join(dir, `${name}.${stage}`);
		writeFileSync(f, `#version 300 es\n${src}`);
		execFileSync('glslangValidator', [f]);
	}
}

describe('the ground in TSL', () => {
	it('builds the biomes ground: three surfaces of nine, by height, rows and tramlines', async () => {
		const m = groundMaterial({ litter: 3, green: 10, tilled: 2 }, { rows: 0.5, tramlines: { every: 24, gauge: 1.8, tyre: 0.48 } });
		const p = await glslOf(m);
		expect(p.fragmentShader).toContain('sampler2DArray');
		valid('ground', p);
	});
	for (const sky of [false, true])
		it(`builds the stage's floor and soil${sky ? ' under the sky' : ''}`, async () => {
			const su = { horizon: { uniforms: { uSkyRing: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) } } } };
			const g = groundOf({ scene: new THREE.Scene(), bg: new THREE.Color(), sky: sky ? su : null, low: true }, { cover: false });
			const mats = new Set();
			g.group.traverse((o) => o.material && mats.add(o.material));
			expect(mats.size).toBe(2);
			let i = 0;
			for (const m of mats) valid(`stage${sky ? '-sky' : ''}${i++}`, await glslOf(m));
		});
});

// every warm-up goes through render/core.js's precompile (660ad67f): one at a time on a renderer, so nothing else calls
// three's compileAsync
describe('warm-ups', () => {
	it('call compileAsync nowhere', () => {
		const src = join(import.meta.dirname, '../..'), found = [];
		const walk = (d) => {
			for (const f of readdirSync(d)) {
				const p = join(d, f);
				if (statSync(p).isDirectory()) walk(p);
				else if (/\.(js|ts|svelte)$/.test(f) && !/\.test\./.test(f) && /compileAsync\(/.test(readFileSync(p, 'utf8'))) found.push(p.slice(src.length + 1));
			}
		};
		walk(src);
		// but the core's precompile (intent c1bee1f8): its one call
		const core = 'content/render/core.js';
		expect(found.filter((f) => f.split('\\').join('/') !== core)).toEqual([]);
		const text = readFileSync(join(src, core), 'utf8');
		expect(text.match(/compileAsync\(/g)?.length ?? 0).toBeLessThanOrEqual(1);
		if (/compileAsync\(/.test(text)) expect(text.slice(text.indexOf('export function precompile('), text.search(/compileAsync\(/)).length).toBeLessThan(300);
	});
});

