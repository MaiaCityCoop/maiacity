// The render kit's shaders in TSL (intent cb16b7a5): every material of ./index.js built for WebGL through three's
// WebGLNodesHandler on a context that only answers (./fakegl.js), as a world draws it — instanced, shadowed, cut, into a
// target and onto the screen — and each shader it hands the graphics card checked by glslang where it is installed.
import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { fakeGL } from './fakegl.js';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { SunLight } from 'three/addons/lights/SunLight.js';
import { aFade, blurMaterial, cardMaterials, castsAsNode, cutBy, cutOf, floorMaterial, ghostMaterial, install, nodeOf, poolMaterial } from './index.js';

(globalThis as any).self ??= globalThis;
(globalThis as any).ImageBitmap ??= class {};

/** a renderer on the fake context, with shadows and the handler; what it compiled, by stage */
function renderer() {
	const { gl, shaders } = fakeGL();
	const r = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl } as any);
	r.shadowMap.enabled = true;
	r.toneMapping = THREE.NeutralToneMapping;
	install(r);
	return { r, shaders };
}

function lit() {
	const scene = new THREE.Scene();
	const sun = new THREE.DirectionalLight('#fff', 2);
	sun.castShadow = true;
	sun.position.set(3, 8, 2);
	scene.add(sun, new THREE.AmbientLight('#fff', 0.4));
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 2, 6);
	camera.lookAt(0, 0, 0);
	return { scene, camera };
}

let glslang: string | null = null;
try {
	execFileSync('glslangValidator', ['--version'], { stdio: 'pipe' });
	glslang = 'glslangValidator';
} catch {
	/* not installed: the shaders are only built */
}
const dir = mkdtempSync(join(tmpdir(), 'nodes-'));
/** every node shader (three's own are three's) compiles as GLSL ES 3.00 (glslang), or the error */
function valid(shaders: string[]) {
	const ours = shaders.filter((s) => s.includes('Node System'));
	expect(ours.length).toBeGreaterThan(0);
	if (!glslang) return;
	ours.forEach((s, i) => {
		const f = join(dir, `s${i}.${/gl_Position\s*=/.test(s) ? 'vert' : 'frag'}`);
		writeFileSync(f, s);
		try {
			execFileSync(glslang, [f], { stdio: 'pipe' });
		} catch (e: any) {
			throw new Error(`${f}: ${e.stdout}`);
		}
	});
}

describe('the render kit in TSL', () => {
	test('a level: instanced, faded, cut and capped, each mesh its own matrices', () => {
		const { r, shaders } = renderer();
		const { scene, camera } = lit();
		const cut = cutOf();
		const m: any = cutBy(nodeOf(new THREE.MeshPhysicalMaterial({ color: 0x808080, roughness: 0.4, clearcoat: 0.5 })), cut, { color: 0x8f150b, rough: 0.55, metal: 0 });
		m.fade = aFade;
		const g = new THREE.BoxGeometry();
		const meshes = [0, 1].map(() => {
			const geo = new THREE.BufferGeometry();
			for (const [k, a] of Object.entries(g.attributes)) geo.setAttribute(k, a as any);
			geo.setIndex(g.index);
			geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(4), 1));
			const mesh = new THREE.InstancedMesh(geo, m, 4);
			mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(12).fill(1), 3);
			mesh.castShadow = mesh.receiveShadow = true;
			scene.add(mesh);
			return mesh;
		});
		cut.a.value.set(1, 0, 0, 0.2);
		r.render(scene, camera);
		const vert = shaders.find((s) => s.includes('Node System') && s.includes('instanceMatrix'))!;
		expect(vert).toBeTruthy();
		// the renderer's own per-mesh attribute, four places wide; no matrices kept in the program
		expect(vert).toMatch(/in mat4 instanceMatrix/);
		expect(vert).not.toMatch(/NodeBuffer/);
		expect(meshes.length).toBe(2);
		valid(shaders);
	});

	test('a level with its fade, as the renderer draws it', () => {
		const { r, shaders } = renderer();
		const { scene, camera } = lit();
		const m: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x406020 }));
		m.fade = aFade;
		const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), cutBy(m, cutOf()), 3);
		scene.add(mesh);
		r.render(scene, camera);
		valid(shaders);
	});

	test('a far page of pictures, drawn and casting its shadow from the light', () => {
		const { r, shaders } = renderer();
		const { scene, camera } = lit();
		const map = new THREE.Texture();
		const { material, depth } = cardMaterials(map, new THREE.Vector2(8, 8), 8, cutOf());
		const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
		const geo = new THREE.InstancedBufferGeometry();
		geo.index = quad.index;
		for (const k of ['position', 'normal', 'uv']) geo.setAttribute(k, quad.attributes[k]);
		for (const [k, n] of [['aAt', 3], ['aSize', 1], ['aTurn', 1], ['aCell', 1], ['aFade', 1]] as const) geo.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(4 * n), n));
		geo.instanceCount = 4;
		const mesh = new THREE.Mesh(geo, material);
		mesh.customDepthMaterial = depth;
		mesh.castShadow = mesh.receiveShadow = true;
		mesh.frustumCulled = false;
		castsAsNode(mesh, r);
		scene.add(mesh);
		r.render(scene, camera);
		expect(shaders.length).toBeGreaterThanOrEqual(4);
		// the page is a render target: three turns its v over on WebGL, the card turns it back first (else each far
		// tree showed another's picture upside down)
		const card = shaders.filter((x) => x.includes('Node System') && /texture\(/.test(x) && !/gl_Position\s*=/.test(x));
		expect(card.join('\n')).toMatch(/vec2\( nodeVarying\d+\.x, \( 1\.0 - nodeVarying\d+\.y \) \)/);
		valid(shaders);
	});

	test('the stage: its ghost, its contact shadow and its floor, into a target and onto the screen', () => {
		const { r, shaders } = renderer();
		const { scene, camera } = lit();
		const rt = new THREE.WebGLRenderTarget(64, 64);
		const sky = { uniforms: { uSkyRing: { value: Array.from({ length: 16 }, (_, i) => new THREE.Vector3(0.5, 0.6, 0.6 + i / 64)) } } };
		const g = ghostMaterial();
		g.ghost.a.value = 0.5;
		scene.add(new THREE.Mesh(new THREE.SphereGeometry(), g));
		scene.add(new THREE.Mesh(new THREE.CircleGeometry(4), floorMaterial({ color: 0xc8bfae, roughness: 0.9 }, new THREE.Color(1, 1, 1), new THREE.Vector2(2, 8), sky)));
		scene.add(new THREE.Mesh(new THREE.CircleGeometry(4), floorMaterial({ color: 0xf0efea }, new THREE.Color(1, 1, 1), new THREE.Vector2(2, 8))));
		scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), poolMaterial(rt.texture, 0x3a3530, 0.7)));
		r.setRenderTarget(rt);
		r.render(scene, camera);
		const intoTarget = shaders.length;
		r.setRenderTarget(null);
		r.render(scene, camera);
		const quad = new THREE.Mesh(new THREE.PlaneGeometry(), blurMaterial(rt.texture));
		r.render(quad, camera);
		// in a target three's own come out linear and untoned: so do ours; on the screen, toned
		const outs = (list: string[]) => list.filter((x) => x.includes('Node System')).map((x) => x.match(/fragColor = .*/)?.[0]).filter(Boolean).join('\n');
		// three r186 names its tone mapping and sRGB functions, r187 numbers them (fn2)
		const toned = /ToneMapping\(|TransferOETF\(|\bfn\d+\(/;
		expect(outs(shaders.slice(0, intoTarget))).not.toMatch(toned);
		expect(outs(shaders.slice(intoTarget))).toMatch(toned);
		valid(shaders);
	});

	test('two of ours of one shape share a program; two whose shaders differ do not (bd087014)', () => {
		const { r } = renderer();
		const { scene, camera } = lit();
		const a: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080 }));
		const b: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x406080 }));
		const c: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080 }));
		a.fade = b.fade = aFade;
		const t = new THREE.WebGLRenderTarget(4, 4);
		c.map = t.texture;
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), a), new THREE.Mesh(new THREE.BoxGeometry(), b), new THREE.Mesh(new THREE.BoxGeometry(), c));
		r.render(scene, camera);
		const p = (m: any) => (r.properties.get(m) as any).currentProgram;
		expect(p(a)).toBeTruthy();
		expect(p(a)).toBe(p(b));
		expect(p(c)).not.toBe(p(a));
	});

	test('two of ours never share a program when their shaders differ: each uploads only into its own layout', () => {
		const { r } = renderer();
		const { scene, camera } = lit();
		const a: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080 }));
		const b: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080, envMap: new THREE.CubeTexture() }));
		a.fade = b.fade = aFade;
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), a), new THREE.Mesh(new THREE.BoxGeometry(), b));
		r.render(scene, camera);
		const pa = (r.properties.get(a) as any).currentProgram, pb = (r.properties.get(b) as any).currentProgram;
		expect(pa).toBeTruthy();
		expect(pa).not.toBe(pb);
	});

	// 660ad67f: three's node builder reads the drawn geometry's attributes (a map's `uv`, vertex colours' `color`) into
	// the shader, which three's key never held; keyed by shape alone, Sandbox 5's plants joined each other's programs
	test('two of ours on meshes whose attributes differ never share a program', () => {
		const pairs: [Partial<THREE.MeshStandardMaterialParameters>, (g: THREE.BufferGeometry) => void][] = [
			[{ map: new THREE.Texture() }, (g) => g.deleteAttribute('uv')],
			[{ vertexColors: true }, (g) => g.setAttribute('color', g.attributes.position.clone())],
			[{}, (g) => g.deleteAttribute('normal')]
		];
		for (const [params, change] of pairs) {
			const { r } = renderer();
			const { scene, camera } = lit();
			const [a, b] = [0, 1].map(() => Object.assign(nodeOf(new THREE.MeshStandardMaterial(params)) as any, { fade: aFade }));
			const g = new THREE.BoxGeometry();
			change(g);
			scene.add(new THREE.Mesh(new THREE.BoxGeometry(), a), new THREE.Mesh(g, b));
			r.render(scene, camera);
			const p = (m: any) => (r.properties.get(m) as any).currentProgram;
			expect(a._latestBuilder.fragmentShader + a._latestBuilder.vertexShader).not.toBe(b._latestBuilder.fragmentShader + b._latestBuilder.vertexShader);
			expect(p(a)).toBeTruthy();
			expect(p(a)).not.toBe(p(b));
		}
	});

	test('twenty copies of one shape on meshes alike link one program', () => {
		const { r } = renderer();
		const { scene, camera } = lit();
		const leaf = new THREE.Texture();
		for (let i = 0; i < 20; i++) {
			const m: any = nodeOf(new THREE.MeshStandardMaterial({ color: i * 0x0a0a0a, map: leaf, alphaTest: 0.5 }));
			m.fade = aFade;
			scene.add(new THREE.InstancedMesh(new THREE.PlaneGeometry(), m, 4));
		}
		r.render(scene, camera);
		const programs = new Set<any>();
		scene.traverse((o: any) => o.material && programs.add((r.properties.get(o.material) as any).currentProgram));
		expect(programs.size).toBe(1);
		expect([...programs][0]).toBeTruthy();
	});

	test('the sky’s sun lights a node material, its cascades shadowing it', () => {
		const { r, shaders } = renderer();
		const scene = new THREE.Scene();
		const sun = new SunLight(0xffffff, 2);
		sun.castShadow = true;
		sun.position.set(30, 80, 20);
		scene.add(sun, sun.target);
		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
		camera.position.set(0, 2, 6);
		camera.lookAt(0, 0, 0);
		const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), nodeOf(new THREE.MeshStandardMaterial()), 2);
		mesh.castShadow = mesh.receiveShadow = true;
		scene.add(mesh);
		const warn = console.warn, warned: string[] = [];
		console.warn = (...a: unknown[]) => void warned.push(a.join(' '));
		try {
			r.render(scene, camera);
		} finally {
			console.warn = warn;
		}
		expect(warned.join('\n')).not.toMatch(/Light node not found/);
		valid(shaders);
	});

	test('only the kit’s node materials come out linear in a target; the sky’s as three’s handler draws it', () => {
		const { r, shaders } = renderer();
		const { scene, camera } = lit();
		const sky = new MeshBasicNodeMaterial();
		scene.add(new THREE.Mesh(new THREE.SphereGeometry(), sky));
		r.setRenderTarget(new THREE.WebGLRenderTarget(16, 16));
		r.render(scene, camera);
		const toned = /ToneMapping\(|TransferOETF\(|\bfn\d+\(/;
		expect(shaders.filter((x) => x.includes('Node System')).map((x) => x.match(/fragColor = .*/)?.[0]).join('\n')).toMatch(toned);
	});
});
