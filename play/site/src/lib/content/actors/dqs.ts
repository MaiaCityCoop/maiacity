/*
 * DUAL-QUATERNION SKINNING — how an actor's skin bends at a joint without losing its volume.
 *
 * three.js skins by averaging bone matrices (linear blend): where a vertex is shared between two bones that have
 * turned apart (a knee, a hock, a neck turning), the average of two rotations is no rotation at all, so the skin
 * shrinks toward the joint and pinches. Blending the bones as dual quaternions instead turns the skin *about* the
 * joint by the blended angle, and the volume holds.
 *
 * The bones are a skeleton's bone texture (three's own, one matrix a bone); each matrix is read back as a rotation, a
 * translation and a size (a bone may be scaled: a frog's throat), the rotations and translations blended as dual
 * quaternions, the sizes as numbers. Every skinned mesh in the app is an actor, so its skinning is replaced once, for
 * all of them — their shadows included.
 *
 * Every material is a node material on the WebGPURenderer (intent c1bee1f8) and skins in NodeMaterial's
 * `setupPosition`: there the blend is made in TSL (`dqSkin`) in the place of three's own `skinning`, which is not
 * built (intent 416c555c): it handed every draw of a skinned mesh, in every pass, its bones again as uniform buffers
 * of its own (five written a draw, most of what the old city's frame wrote), then blended them only to be overruled.
 * A skeleton is posed once a frame (`pose`) and its texture sent once, whatever draws it; where a pass draws motion
 * (TRAA's velocity) the position of the frame before is blended the same way from the pose before, so a bent joint at
 * rest has no motion (three's linear blend of it differed from the dual quaternions' position, a motion never made).
 */
import * as THREE from 'three';
import { NodeMaterial } from 'three/webgpu';
import {
	Fn, OnObjectUpdate, attribute, batch, cross, dot, float, instancedMesh, int, ivec2, mat4, materialReference, max, morphReference, normalLocal, positionLocal, positionPrevious,
	reference, select, sqrt, subBuild, tangentLocal, texture, textureSize, vec4
} from 'three/tsl';

/** a rotation matrix's quaternion, from its columns (every branch made, the right one chosen) */
const quatOf = (c0: N, c1: N, c2: N): N => {
	const tr = c0.x.add(c1.y).add(c2.z);
	const sA = sqrt(max(tr.add(1), 1e-12)).mul(2);
	const qA = vec4(c1.z.sub(c2.y).div(sA), c2.x.sub(c0.z).div(sA), c0.y.sub(c1.x).div(sA), sA.mul(0.25));
	const sB = sqrt(max(float(1).add(c0.x).sub(c1.y).sub(c2.z), 1e-12)).mul(2);
	const qB = vec4(sB.mul(0.25), c1.x.add(c0.y).div(sB), c2.x.add(c0.z).div(sB), c1.z.sub(c2.y).div(sB));
	const sC = sqrt(max(float(1).add(c1.y).sub(c0.x).sub(c2.z), 1e-12)).mul(2);
	const qC = vec4(c1.x.add(c0.y).div(sC), sC.mul(0.25), c2.y.add(c1.z).div(sC), c2.x.sub(c0.z).div(sC));
	const sD = sqrt(max(float(1).add(c2.z).sub(c0.x).sub(c1.y), 1e-12)).mul(2);
	const qD = vec4(c2.x.add(c0.z).div(sD), c2.y.add(c1.z).div(sD), sD.mul(0.25), c0.y.sub(c1.x).div(sD));
	return select(tr.greaterThan(0), qA, select(c0.x.greaterThan(c1.y).and(c0.x.greaterThan(c2.z)), qB, select(c1.y.greaterThan(c2.z), qC, qD)));
};
/** a bone's rotation, translation and size (before the blend) */
const boneOf = (b: N) => {
	const c0 = b.element(0).xyz, c1 = b.element(1).xyz, c2 = b.element(2).xyz;
	const s = c0.length();
	const q = quatOf(c0.div(s), c1.div(s), c2.div(s));
	const t = b.element(3).xyz;
	const d = vec4(t.mul(q.w).add(cross(t, q.xyz)), dot(t, q.xyz).negate()).mul(0.5);
	return { q, d, s };
};
/** a vector turned by a unit quaternion (dqTurn) */
export const dqTurn = (q: N, v: N): N => v.add(cross(q.xyz, cross(q.xyz, v).add(v.mul(q.w))).mul(2));

/**
 * The four bones' dual-quaternion blend, one shader function (`dqBlend`): its first column the rotation, its second
 * the move it makes and, last, the size. A function of its own, not written out where it is called: three walks a
 * material's whole node tree again at every build, and the blend's is large (every part of it read many times).
 * @param b0…b3 the four bones' matrices @param weight the skin's weights
 */
export const dqBlend: N = Fn(([b0, b1, b2, b3, weight]: N[]) => {
	const ws = [weight.x, weight.y, weight.z, weight.w];
	const parts = [b0, b1, b2, b3].map((b, i) => {
		const p = boneOf(b);
		return { q: p.q.toVar(`dqQ${i}`), d: p.d, s: p.s };
	});
	const first = parts[0]!.q;
	let real: N = vec4(0), dual: N = vec4(0), size: N = float(0);
	parts.forEach((p, i) => {
		const w = ws[i];
		// a bone turned the far way round counts by its antipode (same rotation), so the blend never cancels out
		const k = select(dot(p.q, first).lessThan(0), w.negate(), w);
		real = real.add(p.q.mul(k));
		dual = dual.add(p.d.mul(k));
		size = size.add(p.s.mul(w));
	});
	const total = max(ws[0].add(ws[1]).add(ws[2]).add(ws[3]), 1e-5);
	const len = max(real.length(), 1e-6).toVar('dqLength');
	real = real.div(len).toVar('dqReal');
	dual = dual.div(len).toVar('dqDual');
	const move = real.w.mul(dual.xyz).sub(dual.w.mul(real.xyz)).add(cross(real.xyz, dual.xyz)).mul(2);
	return mat4(real, vec4(move, size.div(total)), vec4(0), vec4(0));
}).setLayout({ name: 'dqBlend', type: 'mat4', inputs: ['b0', 'b1', 'b2', 'b3'].map((name) => ({ name, type: 'mat4' })).concat([{ name: 'weight', type: 'vec4' }]) });

/** a skeleton's bones read from a texture of them, one matrix a bone (three's bone texture: four texels a matrix) */
function bonesIn(bt: N) {
	return {
		element: (i: N) => {
			const size = int(textureSize(bt).x).toConst();
			const j = int(i).mul(4).toConst();
			const y = j.div(size).toConst(), x = j.sub(y.mul(size)).toConst();
			return mat4(bt.load(ivec2(x, y)), bt.load(ivec2(x.add(1), y)), bt.load(ivec2(x.add(2), y)), bt.load(ivec2(x.add(3), y)));
		}
	};
}

/** the frame each skeleton was last posed in: a skeleton is posed once a frame, whatever draws it and however often */
const posedAt = new WeakMap<THREE.Skeleton, number>();
/** a skeleton's bone texture, and its pose of the frame before where a pass asks for motion: there before they are read */
function held(skeleton: N, motion: boolean) {
	if (skeleton.boneTexture === null) skeleton.computeBoneTexture();
	if (motion && skeleton.previousBoneTexture === null) {
		skeleton.update();
		const { width, height } = skeleton.boneTexture.image;
		skeleton.previousBoneMatrices = new Float32Array(skeleton.boneMatrices);
		skeleton.previousBoneTexture = new THREE.DataTexture(skeleton.previousBoneMatrices, width, height, THREE.RGBAFormat, THREE.FloatType);
		skeleton.previousBoneTexture.needsUpdate = true;
	}
}
/**
 * A skeleton's pose brought up to date for a frame: its bones worked out and its texture sent once, the pose before
 * kept first where a pass draws motion. (Three's own skinning did this and handed every draw of every pass the bones
 * again as a uniform buffer of its own; here every mesh of a skeleton, in every pass, reads the one texture.)
 */
export function pose(skeleton: N, frameId: number, motion = false) {
	held(skeleton, motion);
	if (posedAt.get(skeleton) === frameId) return;
	posedAt.set(skeleton, frameId);
	if (skeleton.previousBoneTexture !== null) {
		skeleton.previousBoneMatrices.set(skeleton.boneMatrices);
		skeleton.previousBoneTexture.needsUpdate = true;
	}
	skeleton.update();
}

/** a point of the bind pose and its normal and tangent, turned and moved by the four bones' blend */
function skinned(bones: N, bind: N, normal: N | null, tangent: N | null, was = '') {
	const index = attribute('skinIndex', 'uvec4'), weight = attribute('skinWeight', 'vec4');
	const bindMatrix: N = reference('bindMatrix', 'mat4'), bindInverse: N = reference('bindMatrixInverse', 'mat4');
	const blend: N = dqBlend(bones.element(index.x), bones.element(index.y), bones.element(index.z), bones.element(index.w), weight).toVar(`dqPose${was}`);
	const real = blend.element(0), move = blend.element(1).xyz, size = blend.element(1).w;
	const skinVertex = bindMatrix.mul(vec4(bind, 1)).xyz;
	const turn = (v: N) => bindInverse.mul(vec4(dqTurn(real, bindMatrix.mul(vec4(v, 0)).xyz), 0)).xyz;
	return { position: bindInverse.mul(vec4(dqTurn(real, skinVertex.mul(size)).add(move), 1)).xyz, normal: normal && turn(normal), tangent: tangent && turn(tangent) };
}

/**
 * A skinned mesh's position, normal and tangent set by dual quaternions from its skeleton's bone texture, and, where
 * the pass draws motion (TRAA's velocity), its position of the frame before by the same blend of the pose before (TSL;
 * NodeMaterial's position step calls it in the place of three's `skinning`).
 */
export const dqSkin = (builder: N, mesh: THREE.SkinnedMesh) => {
	const motion: boolean = builder.needsPreviousData();
	held(mesh.skeleton, motion);
	const bones: N = texture((mesh.skeleton as N).boneTexture), before: N = motion ? texture((mesh.skeleton as N).previousBoneTexture) : null;
	// a material draws many meshes: each reads its own skeleton's textures, posed for the frame
	OnObjectUpdate(({ object, frameId }: N) => {
		pose(object.skeleton, frameId, motion);
		bones.value = object.skeleton.boneTexture;
		if (before) before.value = object.skeleton.previousBoneTexture;
	});
	if (before) positionPrevious.assign(skinned(bonesIn(before), positionPrevious, null, null, 'Was').position);
	const normal = builder.hasGeometryAttribute('normal') ? normalLocal : null;
	const tangent = normal && builder.hasGeometryAttribute('tangent') ? tangentLocal : null;
	const now = skinned(bonesIn(bones), positionLocal, normal, tangent);
	// each worked out from the pose as morphs left it, before any of them is set
	const set: [N, N][] = [[positionLocal, now.position.toVar('dqPosition')]];
	if (now.normal) set.push([normalLocal, now.normal.toVar('dqNormal')]);
	if (now.tangent) set.push([tangentLocal, now.tangent.toVar('dqTangent')]);
	for (const [to, v] of set) to.assign(v);
};

/**
 * NodeMaterial's position step (three r187's `setupPosition`, step for step: morphs, skinning, displacement, batching,
 * instancing, the material's own position) with its skinning by dual quaternions. Its source is checked against
 * three's in ./dqs.test.ts, so a three that changes it is seen at once.
 */
function setupPosition(this: N, builder: N) {
	const { object, geometry } = builder;
	if (geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color) morphReference(object);
	if (object.isSkinnedMesh === true) dqSkin(builder, object);
	if (this.displacementMap) {
		const map = materialReference('displacementMap', 'texture'), scale = materialReference('displacementScale', 'float'), bias = materialReference('displacementBias', 'float');
		positionLocal.addAssign(normalLocal.normalize().mul(map.x.mul(scale).add(bias)));
	}
	if (object.isBatchedMesh) batch(object);
	if (object.isInstancedMesh && object.instanceMatrix && object.instanceMatrix.isInstancedBufferAttribute === true) instancedMesh(object);
	if (this.positionNode !== null) positionLocal.assign(subBuild(this.positionNode, 'POSITION', 'vec3'));
	return positionLocal;
}
/** three's own position step, kept for ./dqs.test.ts's check */
export const threeSetupPosition = (NodeMaterial.prototype as N).setupPosition as (builder: N) => N;

let installed = false;
/** Every skinned mesh from here on skins by dual quaternions, in TSL. */
export function dualQuaternionSkinning() {
	if (installed) return;
	installed = true;
	(NodeMaterial.prototype as N).setupPosition = setupPosition;
}
