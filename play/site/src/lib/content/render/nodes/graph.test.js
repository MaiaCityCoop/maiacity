// A checked graph built into TSL and on to GLSL as WebGPURenderer's WebGL 2 backend builds it (intent a5faafad): the test
// asset's glow and sway, every operation of the allowlist, a loop, its own picture; a graph that reuses a value many
// times grows the shader by its nodes, never by its paths; and nothing unchecked is built.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { MeshStandardNodeMaterial, WebGPURenderer } from 'three/webgpu';
import { fakeGL } from './fakegl.js';
import { applyGraph, BUILD_OPS } from './graph.js';
import { nodeOf } from './index.js';
import { createPresets } from '../../assets/render/presets.js';
import { GLOW } from '../../assets/box/graph.examples.js';
import { OPS, OUTPUTS } from '../../assets/box/graph.js';

/**
 * A material's GLSL as WebGPURenderer's WebGL 2 backend builds it (the switch's fallback, intent c1bee1f8), drawn once
 * on a context that only answers (./fakegl.js), no graphics card: its vertex and fragment shaders, each checked by
 * glslangValidator where installed.
 */
async function glslOf(material) {
	const g = /** @type {any} */ (globalThis);
	g.self ??= g;
	g.requestAnimationFrame ??= () => 0;
	g.cancelAnimationFrame ??= () => {};
	g.ImageBitmap ??= class {};
	const { gl, shaders } = fakeGL();
	const canvas = /** @type {any} */ (gl.canvas);
	canvas.getContext = (kind) => (kind === 'webgl2' ? gl : null);
	const r = new WebGPURenderer({ canvas, forceWebGL: true, antialias: false });
	await r.init();
	r.setSize(64, 64, false);
	r.shadowMap.enabled = true;
	const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 1, 4);
	camera.lookAt(0, 0, 0);
	const sun = new THREE.DirectionalLight();
	sun.castShadow = true;
	scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material), sun, new THREE.HemisphereLight());
	r.render(scene, camera);
	const isFrag = (s) => /\bout\s+(highp\s+)?vec4\b|gl_FragColor|fragColor/.test(s ?? '');
	// the material's own pair: the longest fragment shader drawn, and the longest vertex shader
	const longest = (list) => list.reduce((a, b) => (b.length > a.length ? b : a), '');
	const p = { fragmentShader: longest(shaders.filter(isFrag)), vertexShader: longest(shaders.filter((x) => x && !isFrag(x))) };
	r.dispose();
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
		writeFileSync(f, src.startsWith('#version') ? src : `#version 300 es\n${src}`);
		execFileSync('glslangValidator', [f]);
	}
}


const built = (graph, more = {}) => applyGraph(Object.assign(new MeshStandardNodeMaterial(), more), graph);

describe('a graph built', () => {
	it('the test asset: colour, glow and its vertices moved', async () => {
		const m = built(GLOW);
		expect(m.colorNode).toBeTruthy();
		expect(m.emissiveNode).toBeTruthy();
		expect(m.positionNode).toBeTruthy();
		const p = await glslOf(m);
		valid('glow', p);
		// the noise and the time are in it
		expect(p.vertexShader).toMatch(/sin/);
	});
	it('every operation of the list, into every output it fits', async () => {
		const zero = { float: { value: 0.5 }, vec2: { value: [0.1, 0.2] }, vec3: { value: [0.1, 0.2, 0.3] }, vec4: { value: [0.1, 0.2, 0.3, 0.4] }, color: { value: 0xff8800 } };
		// inputs of each type, then each operation fed from them
		const base = [{ op: 'float', value: 0.3 }, { op: 'vec2', value: [0.1, 0.2] }, { op: 'vec3', value: [0.1, 0.2, 0.3] }, { op: 'vec4', value: [1, 2, 3, 4] }];
		const T = { float: 0, vec2: 1, vec3: 2, vec4: 3 };
		const cases = [];
		for (const [op, spec] of Object.entries(OPS)) {
			if (['acc', 'index', 'loop', 'texture'].includes(op)) continue;
			if (spec.n === 0) cases.push({ op, ...(zero[op] ?? {}) });
			else if (op === 'swizzle') cases.push({ op, in: [T.vec3], mask: 'zx' });
			else if (op === 'join') cases.push({ op, in: [T.float, T.vec2] });
			else if (['noise', 'worley', 'cross'].includes(op)) cases.push({ op, in: op === 'cross' ? [T.vec3, T.vec3] : [T.vec3] });
			else if (op === 'fbm') cases.push({ op, in: [T.vec3], octaves: 3 });
			else if (['normalize', 'length'].includes(op) || spec.n === 1) cases.push({ op, in: [T.vec3] });
			else if (spec.n === 2) cases.push({ op, in: [T.vec3, op === 'dot' || op === 'distance' ? T.vec3 : T.float] });
			else cases.push({ op, in: [T.vec3, T.vec3, T.float] });
		}
		for (const c of cases) {
			const nodes = [...base, c];
			const g = { format: 1, nodes, out: {} };
			const t = OPS[c.op].out ?? OPS[c.op].type(...(c.in ?? []).map((k) => ['float', 'vec2', 'vec3', 'vec4'][k]), c);
			for (const [k, want] of Object.entries(OUTPUTS)) if (t === want || t === 'float') g.out[k] = nodes.length - 1;
			if (!Object.keys(g.out).length) {
				nodes.push({ op: 'length', in: [nodes.length - 1] });
				g.out.roughness = nodes.length - 1;
			}
			valid(`op-${c.op}`, await glslOf(built(g)));
		}
		expect(BUILD_OPS.length).toBeGreaterThan(40);
	});
	it('a loop of a constant count', async () => {
		const body = [{ op: 'acc' }, { op: 'index' }, { op: 'positionLocal' }, { op: 'swizzle', in: [2], mask: 'x' }, { op: 'mul', in: [1, 3] }, { op: 'sin', in: [4] }, { op: 'add', in: [0, 5] }];
		const m = built({ format: 1, nodes: [{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 8, body }, { op: 'float', value: 0.125 }, { op: 'mul', in: [1, 2] }], out: { roughness: 3, position: 1 } });
		const p = await glslOf(m);
		valid('loop', p);
		expect(p.fragmentShader).toMatch(/for\s*\(/);
	});
	it('its own picture', async () => {
		const map = new THREE.DataTexture(new Uint8Array(4), 1, 1);
		const m = built({ format: 1, textures: ['map'], nodes: [{ op: 'uv' }, { op: 'texture', in: [0], slot: 'map' }, { op: 'swizzle', in: [1], mask: 'xyz' }], out: { color: 2 } }, { map });
		valid('texture', await glslOf(m));
	});
	it('a value used again and again is worked out once: the shader grows with the nodes, never with the paths', async () => {
		// each node adds the one before to itself: 2^40 paths if inlined
		const nodes = [{ op: 'positionLocal' }, ...Array.from({ length: 40 }, (_, i) => ({ op: 'add', in: [i, i] }))];
		const p = await glslOf(built({ format: 1, nodes, out: { color: 40 } }));
		valid('chain', p);
		expect(p.fragmentShader.length).toBeLessThan(200_000);
	});
	it('nothing unchecked: a refused graph builds nothing', async () => {
		const m = new MeshStandardNodeMaterial();
		expect(() => applyGraph(m, { format: 1, nodes: [{ op: 'storage' }], out: { color: 0 } })).toThrow(/refused/);
		expect(() => applyGraph(m, { format: 1, textures: ['map'], nodes: [{ op: 'uv' }, { op: 'texture', in: [0], slot: 'map' }], out: { opacity: 1 } })).toThrow(/carries no map/);
		expect(m.colorNode).toBeNull();
	});
	it('every way a material is drawn draws its graph: nodeOf, and the renderer’s kept materials, a skinned one’s too', async () => {
		const m = new THREE.MeshStandardMaterial();
		m.userData.graph = GLOW;
		const n = nodeOf(m);
		expect(n.isNodeMaterial).toBe(true);
		expect(n.emissiveNode).toBeTruthy();
		const presets = createPresets();
		const kept = presets.of(m), bent = presets.of(m, true);
		expect(kept.emissiveNode).toBeTruthy();
		expect(bent.isNodeMaterial).toBe(true);
		expect(bent).not.toBe(kept);
		// two graphs are two materials
		const other = new THREE.MeshStandardMaterial();
		other.userData.graph = { format: 1, nodes: [{ op: 'color', value: 1 }], out: { color: 0 } };
		expect(presets.of(other)).not.toBe(kept);
	});
	it('outputs share the graph: five outputs of one value cost what one does', async () => {
		const nodes = [{ op: 'positionWorld' }];
		let layer = [];
		for (let i = 0; i < 60; i++) nodes.push({ op: 'worley', in: [0] }), layer.push(nodes.length - 1);
		while (layer.length > 1) {
			const next = [];
			for (let i = 0; i < layer.length; i += 2) if (i + 1 < layer.length) nodes.push({ op: 'add', in: [layer[i], layer[i + 1]] }), next.push(nodes.length - 1); else next.push(layer[i]);
			layer = next;
		}
		const last = nodes.length - 1;
		const one = (await glslOf(built({ format: 1, nodes, out: { roughness: last } }))).fragmentShader.length;
		const five = (await glslOf(built({ format: 1, nodes, out: { roughness: last, metalness: last, opacity: last, color: last, emissive: last } }))).fragmentShader.length;
		expect(five).toBeLessThan(one * 1.2);
	});
	it('a vector made again and again from the one before is worked out once (join and swizzle too)', async () => {
		const nodes = [{ op: 'positionLocal' }];
		for (let k = 0; k < 30; k++) {
			nodes.push({ op: 'swizzle', in: [nodes.length - 1], mask: 'x' });
			const s = nodes.length - 1;
			nodes.push({ op: 'join', in: [s, s, s] });
		}
		const last = nodes.length - 1;
		const p = await glslOf(built({ format: 1, nodes, out: { color: last, emissive: last, position: last } }));
		valid('joins', p);
		expect(p.fragmentShader.length).toBeLessThan(60_000);
		expect(p.vertexShader.length).toBeLessThan(60_000);
	});
	it('a colour is the colour given, in linear components (not black)', async () => {
		const c = new THREE.Color(0x2bd4a8);
		const f = (await glslOf(built({ format: 1, nodes: [{ op: 'color', value: 0x2bd4a8 }], out: { color: 0 } }))).fragmentShader;
		expect(f).toContain(`vec3( ${c.r}, ${c.g}, ${c.b} )`);
	});
});
