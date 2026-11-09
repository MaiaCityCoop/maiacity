// The render kit's shaders in TSL (intent cb16b7a5): every material of ./index.js built by the app's renderer
// (WebGPURenderer's WebGL 2 backend, intent c1bee1f8) on a context that only answers (./fakegl.js), as a world draws it —
// instanced, shadowed, cut, into a target and onto the screen — and each shader it hands the graphics card checked by
// glslang where it is installed. A program is the pipeline three draws a mesh with (its vertex and fragment stages).
import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { fakeRenderer } from './fakegl.js';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { SunLight } from 'three/addons/lights/SunLight.js';
import { precompile } from '../core.js';
import { aFade, blurMaterial, cardMaterials, cutBy, cutOf, floorMaterial, ghostMaterial, nodeOf, poolMaterial } from './index.js';

(globalThis as any).self ??= globalThis;
(globalThis as any).ImageBitmap ??= class {};

/** the app's renderer on the fake context, with shadows; what it compiled, and the program each material last drew with */
async function renderer() {
	const { r, shaders } = await fakeRenderer({ shadows: true, toneMapping: 'neutral' });
	const drewWith = new Map<any, any>();
	const pipelines = r._pipelines, get = pipelines.getForRender.bind(pipelines);
	pipelines.getForRender = (o: any, ...a: any[]) => {
		const p = get(o, ...a);
		drewWith.set(o.material, p);
		return p;
	};
	/** the program `m` last drew with: its vertex and fragment stages */
	const program = (m: any) => {
		const p = drewWith.get(m);
		return p && `${p.vertexProgram.id}:${p.fragmentProgram.id}`;
	};
	return { r, shaders, program };
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
	test('a level: instanced, faded, cut and capped, each mesh its own matrices', async () => {
		const { r, shaders, program } = await renderer();
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

	test('a level with its fade, as the renderer draws it', async () => {
		const { r, shaders, program } = await renderer();
		const { scene, camera } = lit();
		const m: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x406020 }));
		m.fade = aFade;
		const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), cutBy(m, cutOf()), 3);
		scene.add(mesh);
		r.render(scene, camera);
		valid(shaders);
	});

	test('a far page of pictures, lit by its normals, three views blended, casting its shadow at its depth', async () => {
		const { r, shaders, program } = await renderer();
		const { scene, camera } = lit();
		const { material, depth } = cardMaterials(new THREE.Texture(), new THREE.Texture(), 16, 8, cutOf());
		const quad = new THREE.PlaneGeometry(1, 1);
		const geo = new THREE.InstancedBufferGeometry();
		geo.index = quad.index;
		geo.setAttribute('position', quad.attributes.position);
		for (const [k, n] of [['aAt', 3], ['aCard', 4]] as const) geo.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(4 * n), n));
		geo.instanceCount = 4;
		const mesh = new THREE.Mesh(geo, material);
		mesh.customDepthMaterial = depth;
		mesh.castShadow = mesh.receiveShadow = true;
		mesh.frustumCulled = false;
		scene.add(mesh);
		r.render(scene, camera);
		expect(shaders.length).toBeGreaterThanOrEqual(4);
		// its shadow drawn at each pixel's baked depth
		expect(shaders.some((x) => /gl_FragDepth\s*=/.test(x))).toBe(true);
		valid(shaders);
	});

	test('the stage: its ghost, its contact shadow and its floor, into a target and onto the screen', async () => {
		const { r, shaders, program } = await renderer();
		const { scene, camera } = lit();
		const rt = new THREE.RenderTarget(64, 64);
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

	test('two of ours of one shape share a program; two whose shaders differ do not (bd087014)', async () => {
		const { r, program } = await renderer();
		const { scene, camera } = lit();
		const a: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080 }));
		const b: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x406080 }));
		const c: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080 }));
		a.fade = b.fade = aFade;
		const t = new THREE.RenderTarget(4, 4);
		c.map = t.texture;
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), a), new THREE.Mesh(new THREE.BoxGeometry(), b), new THREE.Mesh(new THREE.BoxGeometry(), c));
		r.render(scene, camera);
		const p = program;
		expect(p(a)).toBeTruthy();
		expect(p(a)).toBe(p(b));
		expect(p(c)).not.toBe(p(a));
	});

	test('two of ours never share a program when their shaders differ: each uploads only into its own layout', async () => {
		const { r, program } = await renderer();
		const { scene, camera } = lit();
		const a: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080 }));
		const b: any = nodeOf(new THREE.MeshStandardMaterial({ color: 0x808080, envMap: new THREE.CubeTexture() }));
		a.fade = b.fade = aFade;
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), a), new THREE.Mesh(new THREE.BoxGeometry(), b));
		r.render(scene, camera);
		const pa = program(a), pb = program(b);
		expect(pa).toBeTruthy();
		expect(pa).not.toBe(pb);
	});

	// 660ad67f: three's node builder reads the drawn geometry's attributes (a map's `uv`, vertex colours' `color`) into
	// the shader, which three's key never held; keyed by shape alone, Sandbox 5's plants joined each other's programs
	test('two of ours on meshes whose attributes differ never share a program', async () => {
		const pairs: [Partial<THREE.MeshStandardMaterialParameters>, (g: THREE.BufferGeometry) => void][] = [
			[{ map: new THREE.Texture() }, (g) => g.deleteAttribute('uv')],
			[{ vertexColors: true }, (g) => g.setAttribute('color', g.attributes.position.clone())],
			[{}, (g) => g.deleteAttribute('normal')]
		];
		for (const [params, change] of pairs) {
			const { r, program } = await renderer();
			const { scene, camera } = lit();
			const [a, b] = [0, 1].map(() => Object.assign(nodeOf(new THREE.MeshStandardMaterial(params)) as any, { fade: aFade }));
			const g = new THREE.BoxGeometry();
			change(g);
			scene.add(new THREE.Mesh(new THREE.BoxGeometry(), a), new THREE.Mesh(g, b));
			r.render(scene, camera);
			const p = program;
						expect(p(a)).toBeTruthy();
			expect(p(a)).not.toBe(p(b));
		}
	});

	test('one material on a mesh that takes shadows and one that takes none: each draws with its own program', async () => {
		// the car paint (8823eb7c): compiled for the body (shadows) and then its ends (none), the body's first draw took
		// the ends' uniforms; three builds a node material per drawn mesh, each its own program
		const { r, program } = await renderer();
		const { scene, camera } = lit();
		const paint = nodeOf(new THREE.MeshStandardMaterial({ vertexColors: true })) as any;
		const g = new THREE.BoxGeometry();
		g.setAttribute('color', g.attributes.position.clone());
		const body = Object.assign(new THREE.Mesh(g, paint), { receiveShadow: true, castShadow: true });
		const ends = Object.assign(new THREE.Mesh(g, paint), { receiveShadow: false });
		scene.add(body, ends);
		await precompile(r, scene, camera);
		const drawn = [body, ends, body].map((o) => {
			body.visible = o === body;
			ends.visible = o === ends;
			expect(() => r.render(scene, camera)).not.toThrow();
			return program(paint);
		});
		expect(drawn[0]).toBeTruthy();
		expect(drawn[2]).toBe(drawn[0]);
		expect(drawn[1]).not.toBe(drawn[0]);
	});

	test('twenty copies of one shape on meshes alike link one program', async () => {
		const { r, program } = await renderer();
		const { scene, camera } = lit();
		const leaf = new THREE.Texture();
		for (let i = 0; i < 20; i++) {
			const m: any = nodeOf(new THREE.MeshStandardMaterial({ color: i * 0x0a0a0a, map: leaf, alphaTest: 0.5 }));
			m.fade = aFade;
			scene.add(new THREE.InstancedMesh(new THREE.PlaneGeometry(), m, 4));
		}
		r.render(scene, camera);
		const programs = new Set<any>();
		scene.traverse((o: any) => o.material && programs.add(program(o.material)));
		expect(programs.size).toBe(1);
		expect([...programs][0]).toBeTruthy();
	});

	// 660ad67f: Safari linked 47 kit programs mid-walk in Sandbox 5, each built at its first frame. Warmed by precompile,
	// every program a world draws is built before it: its first frame compiles none
	test('precompile builds the kit’s node materials: the first frame builds none', async () => {
		const { r, shaders, program } = await renderer();
		const { scene, camera } = lit();
		const m: any = Object.assign(nodeOf(new THREE.MeshStandardMaterial({ map: new THREE.Texture() })), { fade: aFade });
		const n: any = Object.assign(nodeOf(new THREE.MeshStandardMaterial({ color: 0x406080 })), { fade: aFade });
		const bare = new THREE.BoxGeometry();
		bare.deleteAttribute('uv');
		scene.add(new THREE.Mesh(new THREE.BoxGeometry(), m), new THREE.Mesh(bare, m), new THREE.Mesh(new THREE.BoxGeometry(), n));
		await precompile(r, scene, camera);
		const built = shaders.length;
		expect(shaders.some((x) => /aFade/.test(x))).toBe(true);
		r.render(scene, camera);
		r.render(scene, camera);
		// none of the kit's (each reads its fade); three's own of the frame (its output) may still come
		expect(shaders.slice(built).filter((x) => /aFade/.test(x))).toEqual([]);
		expect(program(m)).toBeTruthy();
		expect(program(n)).not.toBe(program(m));
	});

	test('the sky’s sun lights a node material, its cascades shadowing it', async () => {
		const { r, shaders, program } = await renderer();
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

	test('every node material comes out linear in a target, as three’s own do: the sky is tone mapped once, at the output (544485e2)', async () => {
		const { r, shaders, program } = await renderer();
		const { scene, camera } = lit();
		const sky = new MeshBasicNodeMaterial();
		scene.add(new THREE.Mesh(new THREE.SphereGeometry(), sky));
		r.setRenderTarget(new THREE.RenderTarget(16, 16));
		r.render(scene, camera);
		const toned = /ToneMapping\(|TransferOETF\(|\bfn\d+\(/;
		expect(shaders.filter((x) => x.includes('Node System')).map((x) => x.match(/fragColor = .*/)?.[0]).join('\n')).not.toMatch(toned);
	});
});
