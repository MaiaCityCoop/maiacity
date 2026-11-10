// Dual-quaternion skinning on node materials (intent c1bee1f8): WebGPU draws every material as a node material, which
// skins in NodeMaterial's position step; ./dqs.ts makes that step skin by dual quaternions. Checked on WebGPURenderer's WebGL 2 backend over a context that only answers (no graphics card).
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
const { mrt, output, velocity } = await import('three/tsl');
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

let drawnLast: any = null;
async function drawn(material: THREE.Material, motion = false) {
	const { gl, shaders } = fakeGL();
	const c = gl.canvas as any;
	c.getContext = (kind: string) => (kind === 'webgl2' ? gl : null);
	const r = (await makeRenderer({ backend: 'webgl2', pixelRatio: 1, canvas: c })) as any;
	r.setSize(32, 32, false);
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 0, 6);
	const mesh = limb(material);
	scene.add(new THREE.AmbientLight('#fff', 1), mesh);
	// a pass that draws motion (TRAA's velocity beside the colour)
	if (motion) r.setMRT(mrt({ output, velocity }));
	r.render(scene, camera);
	drawnLast = { r, scene, camera, mesh };
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
		expect(after).toMatch(/dqPosition/);
		// three's own blend of bone matrices is not built beside it: the bones are read from the skeleton's one texture
		expect(after).not.toMatch(/boneMatrices|UniformBuffer/i);
		expect(after).toMatch(/texelFetch/);
		expect(after).toMatch(/dqNormal/);
		expect(after).toMatch(/cross\s*\(/);
		expect(after).toMatch(/sqrt\s*\(/);
	});

	test('a classic material, drawn by WebGPU as a node material, skins by dual quaternions too', async () => {
		dualQuaternionSkinning();
		expect(await drawn(new THREE.MeshStandardMaterial())).toMatch(/dqReal/);
	});

	// intent 416c555c: a pass that draws motion blends the pose before the same way, and a skeleton is posed once a frame
	test('where a pass draws motion, the pose before is blended by dual quaternions too, from its own texture', async () => {
		dualQuaternionSkinning();
		const src = await drawn(new MeshStandardNodeMaterial(), true);
		// the one blend, a function, called for the pose and for the pose before
		expect(src.match(/\bdqBlend\s*\(/g)?.length).toBeGreaterThanOrEqual(3);
		expect(src).toMatch(/dqPoseWas/);
		expect(src).not.toMatch(/boneMatrices|UniformBuffer/i);
		const { mesh } = drawnLast;
		expect(mesh.skeleton.boneTexture).not.toBeNull();
		expect(mesh.skeleton.previousBoneTexture).not.toBeNull();
	});

	test('a skeleton is posed once a frame however many of its meshes are drawn, and the pose before is the frame’s before', async () => {
		dualQuaternionSkinning();
		await drawn(new MeshStandardNodeMaterial(), true);
		const { r, scene, camera, mesh } = drawnLast;
		const twin = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
		twin.bind(mesh.skeleton, mesh.bindMatrix);
		scene.add(twin);
		let updates = 0;
		const update = mesh.skeleton.update.bind(mesh.skeleton);
		mesh.skeleton.update = () => (updates++, update());
		const knee = mesh.skeleton.bones[1];
		// a frame is three's animation loop's (the page's requestAnimationFrame): turned here by hand
		const frame = () => (r._nodes.nodeFrame.update(), r.render(scene, camera));
		knee.rotation.z = 0.3;
		frame();
		expect(updates).toBe(1);
		const was = Array.from(mesh.skeleton.boneMatrices as Float32Array);
		knee.rotation.z = 0.9;
		frame();
		expect(updates).toBe(2);
		expect(Array.from(mesh.skeleton.previousBoneMatrices as Float32Array)).toEqual(was);
		expect(Array.from(mesh.skeleton.boneMatrices as Float32Array)).not.toEqual(was);
	});
});
