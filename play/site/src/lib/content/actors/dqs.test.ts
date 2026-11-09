// Dual-quaternion skinning on node materials (intent c1bee1f8): WebGPU draws every material as a node material, which
// skins in NodeMaterial's position step, never in the GLSL chunks; ./dqs.ts makes that step skin by dual quaternions
// as the chunks do. Checked on WebGPURenderer's WebGL 2 backend over a context that only answers (no graphics card).
import { describe, expect, test } from 'vitest';

const g = globalThis as any;
g.self ??= g;
g.requestAnimationFrame ??= () => 0;
g.cancelAnimationFrame ??= () => {};
g.ImageBitmap ??= class {};
const THREE = await import('three');
const { MeshStandardNodeMaterial, NodeMaterial } = await import('three/webgpu');
const { fakeGL } = await import('../render/nodes/fakegl.js');
const { makeRenderer } = await import('../render/core.js');
const { dualQuaternionSkinning, threeSetupPosition } = await import('./dqs.ts');

/** a two-bone limb, its lower bone turned 90° (a knee) */
function limb(material: THREE.Material) {
	const geo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8, 8);
	const n = geo.attributes.position!.count;
	const idx: number[] = [], wt: number[] = [];
	for (let i = 0; i < n; i++) {
		const y = geo.attributes.position!.getY(i) + 1; // 0…2
		const w = Math.min(1, Math.max(0, y - 0.5));
		idx.push(0, 1, 0, 0);
		wt.push(1 - w, w, 0, 0);
	}
	geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
	geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
	const bones = [new THREE.Bone(), new THREE.Bone()];
	bones[0]!.position.y = -1;
	bones[1]!.position.y = 1;
	bones[0]!.add(bones[1]!);
	const mesh = new THREE.SkinnedMesh(geo, material);
	mesh.add(bones[0]!);
	mesh.bind(new THREE.Skeleton(bones));
	bones[1]!.rotation.z = Math.PI / 2;
	return mesh;
}

async function drawn(material: THREE.Material) {
	const { gl, shaders } = fakeGL();
	const c = gl.canvas as any;
	c.getContext = (kind: string) => (kind === 'webgl2' ? gl : null);
	const r = (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c })) as any;
	r.setSize(32, 32, false);
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 0, 6);
	scene.add(new THREE.AmbientLight('#fff', 1), limb(material));
	r.render(scene, camera);
	return shaders.filter((s: string | null) => /void main/.test(s ?? '') && /gl_Position/.test(s ?? '')).join('\n');
}

describe('dual-quaternion skinning on node materials', () => {
	test('three’s own position step is still the one ./dqs.ts follows (r187: morphs, skinning, displacement, batching, instancing, the position node)', () => {
		const src = String(threeSetupPosition);
		const steps = ['morphReference( object )', 'skinning( object )', 'this.displacementMap', 'batch( object )', 'instancedMesh( object )', "subBuild( this.positionNode, 'POSITION', 'vec3' )"];
		const at = steps.map((s) => src.indexOf(s));
		expect(at.every((i) => i >= 0)).toBe(true);
		expect([...at].sort((a, b) => a - b)).toEqual(at);
	});

	test('before it is installed, a skinned node material blends bone matrices; after, dual quaternions', async () => {
		const before = await drawn(new MeshStandardNodeMaterial());
		expect(before).toMatch(/skinIndex/);
		expect(before).not.toMatch(/dqReal/);
		dualQuaternionSkinning();
		expect((NodeMaterial.prototype as any).setupPosition).not.toBe(threeSetupPosition);
		const after = await drawn(new MeshStandardNodeMaterial());
		expect(after).toMatch(/dqReal/);
		expect(after).toMatch(/dqBind/);
		expect(after).toMatch(/dqNormal/);
		expect(after).toMatch(/cross\s*\(/);
		expect(after).toMatch(/sqrt\s*\(/);
	});

	test('a classic material, drawn by WebGPU as a node material, skins by dual quaternions too', async () => {
		dualQuaternionSkinning();
		expect(await drawn(new THREE.MeshStandardMaterial())).toMatch(/dqReal/);
	});
});
