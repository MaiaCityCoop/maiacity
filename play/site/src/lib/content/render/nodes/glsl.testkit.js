// @ts-nocheck — test helpers only (no test of its own): a node material's GLSL as WebGLRenderer's node handler builds
// it, against a stand-in context (no graphics card), and, where glslangValidator is installed (avenBOX), each shader
// checked as GLSL ES 3.0. Used by ./tsl.test.js and ./graph.test.js.
import { expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';

/** a material's shaders as the node handler builds them, against a stand-in context (no graphics card) */
export function glslOf(material) {
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

export let glslang = false;
try {
	execFileSync('glslangValidator', ['--version'], { stdio: 'ignore' });
	glslang = true;
} catch {
	/* not installed: the build alone is checked */
}
const dir = mkdtempSync(join(tmpdir(), 'tsl-'));
export function valid(name, p) {
	expect(p.fragmentShader).toContain('void main');
	if (!glslang) return;
	for (const [stage, src] of [['frag', p.fragmentShader], ['vert', p.vertexShader]]) {
		const f = join(dir, `${name}.${stage}`);
		writeFileSync(f, `#version 300 es\n${src}`);
		execFileSync('glslangValidator', [f]);
	}
}

