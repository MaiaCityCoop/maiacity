// The ground's TSL builds to GLSL as WebGLRenderer's node handler builds it (intent db87a28f): the biomes' ground, the
// stage's soil and floor. Where glslangValidator is installed (avenBOX), each shader is also checked as GLSL ES 3.0.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
import { groundMaterial } from '../biomes/surfaces.js';
import { groundOf } from './ground.js';

/** a material's shaders as the node handler builds them, against a stand-in context (no graphics card) */
function glslOf(material) {
	globalThis.ImageBitmap ??= class {};
	const gl = new Proxy({}, { get: (_, k) => (k === 'getParameter' ? () => 16 : k === 'getExtension' ? () => ({}) : k === 'getSupportedExtensions' ? () => [] : typeof k === 'string' && /^[A-Z_0-9]+$/.test(k) ? 1 : () => null) });
	const renderer = {
		getContext: () => gl, extensions: { has: () => true, get: () => ({}) }, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace,
		info: { render: { frame: 0 } }, properties: { has: () => false }, getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
		shadowMap: { enabled: true, type: THREE.PCFShadowMap }, localClippingEnabled: false, coordinateSystem: THREE.WebGLCoordinateSystem, getOutputRenderTarget: () => null,
		xr: { enabled: false, isPresenting: false }, getPixelRatio: () => 1, getDrawingBufferSize: (v) => v.set(800, 600), getSize: (v) => v.set(800, 600),
		debug: { checkShaderErrors: true, diagnostics: { keywords: false } }
	};
	const h = new WebGLNodesHandler();
	h.setRenderer(renderer);
	const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
	const sun = new THREE.DirectionalLight();
	sun.castShadow = true;
	scene.add(mesh, sun, new THREE.HemisphereLight());
	scene.fog = new THREE.Fog('#ffffff', 10, 100);
	h.renderStart(scene, camera);
	h.updateLights([sun]);
	const p = {};
	h.build(material, mesh, p);
	return p;
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

