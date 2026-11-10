/*
 * DUAL-QUATERNION SKINNING — how an actor's skin bends at a joint without losing its volume.
 *
 * three.js skins by averaging bone matrices (linear blend): where a vertex is shared between two bones that have
 * turned apart (a knee, a hock, a neck turning), the average of two rotations is no rotation at all, so the skin
 * shrinks toward the joint and pinches. Blending the bones as dual quaternions instead turns the skin *about* the
 * joint by the blended angle, and the volume holds.
 *
 * The bones are what three.js hands the shader anyway (its bone texture, one matrix a bone); each matrix is read back
 * as a rotation, a translation and a size (a bone may be scaled: a frog's throat), the rotations and translations
 * blended as dual quaternions, the sizes as numbers. Every skinned mesh in the app is an actor, so its skinning is
 * replaced once, for all of them — their shadows included.
 *
 * Every material is a node material on the WebGPURenderer (intent c1bee1f8) and skins in NodeMaterial's
 * `setupPosition`: there the blend is made in TSL (`dqSkin`), after three's own `skinning` (which keeps the skeleton
 * updated each frame and the previous frame's pose for motion), its position, normal and tangent taken from the pose as
 * morphs leave it and set by dual quaternions instead.
 */
import * as THREE from 'three';
import { NodeMaterial } from 'three/webgpu';
import {
	Fn, OnObjectUpdate, attribute, batch, cross, dot, float, instancedMesh, int, ivec2, mat4, materialReference, max, morphReference, normalLocal, positionLocal, reference,
	referenceBuffer, select, skinning, sqrt, subBuild, tangentLocal, texture, textureSize, vec3, vec4
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
 * The four bones' dual-quaternion blend: the rotation (`real`), the move it makes, the size.
 * @param bones the bone matrices (an `element(i)` per bone) @param index the skin's indices @param weight its weights
 */
export function dqBlend(bones: N, index: N, weight: N) {
	const ws = [weight.x, weight.y, weight.z, weight.w];
	const parts = [index.x, index.y, index.z, index.w].map((i) => boneOf(bones.element(i)));
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
	size = size.div(total);
	const len = max(real.length(), 1e-6);
	real = real.div(len).toVar('dqReal');
	dual = dual.div(len).toVar('dqDual');
	const move = real.w.mul(dual.xyz).sub(dual.w.mul(real.xyz)).add(cross(real.xyz, dual.xyz)).mul(2);
	return { real, move, size: size.toVar('dqSize') };
}

/** the bone matrices three hands a skinned mesh's shader (its uniform buffer, or its bone texture for a big skeleton) */
function bonesOf(builder: N, skeleton: THREE.Skeleton): N {
	if (skeleton.bones.length * 64 <= builder.getUniformBufferLimit()) return referenceBuffer('skeleton.boneMatrices', 'mat4', skeleton.bones.length);
	if (skeleton.boneTexture === null) skeleton.computeBoneTexture();
	const bt: N = texture(skeleton.boneTexture!);
	OnObjectUpdate(({ object }: N) => {
		if (object.skeleton.boneTexture === null) object.skeleton.computeBoneTexture();
		bt.value = object.skeleton.boneTexture;
	});
	return {
		element: (i: N) => {
			const size = int(textureSize(bt).x).toConst();
			const j = int(i).mul(4).toConst();
			const y = j.div(size).toConst(), x = j.sub(y.mul(size)).toConst();
			return mat4(bt.load(ivec2(x, y)), bt.load(ivec2(x.add(1), y)), bt.load(ivec2(x.add(2), y)), bt.load(ivec2(x.add(3), y)));
		}
	};
}

/**
 * A skinned mesh's position, normal and tangent set by dual quaternions, from `bind` (the pose as morphs leave it),
 * `normal` and `tangent` before three's linear blend (TSL; NodeMaterial's position step calls it after `skinning`).
 */
export const dqSkin = (builder: N, mesh: THREE.SkinnedMesh, bind: N, normal: N, tangent: N) => {
	const index = attribute('skinIndex', 'uvec4'), weight = attribute('skinWeight', 'vec4');
	const bindMatrix: N = reference('bindMatrix', 'mat4'), bindInverse: N = reference('bindMatrixInverse', 'mat4');
	const { real, move, size } = dqBlend(bonesOf(builder, mesh.skeleton), index, weight);
	const skinVertex = bindMatrix.mul(vec4(bind, 1)).xyz;
	positionLocal.assign(bindInverse.mul(vec4(dqTurn(real, skinVertex.mul(size)).add(move), 1)).xyz);
	const turn = (v: N) => bindInverse.mul(vec4(dqTurn(real, bindMatrix.mul(vec4(v, 0)).xyz), 0)).xyz;
	if (normal) normalLocal.assign(turn(normal));
	if (tangent) tangentLocal.assign(turn(tangent));
};

/**
 * NodeMaterial's position step (three r187's `setupPosition`, step for step: morphs, skinning, displacement, batching,
 * instancing, the material's own position) with its skinning by dual quaternions. Its source is checked against
 * three's in ./dqs.test.ts, so a three that changes it is seen at once.
 */
function setupPosition(this: N, builder: N) {
	const { object, geometry } = builder;
	if (geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color) morphReference(object);
	if (object.isSkinnedMesh === true) {
		// the pose before three's blend, kept: three's own skinning keeps the skeleton and the previous pose up to date
		const bind = vec3(positionLocal).toVar('dqBind');
		const normal = builder.hasGeometryAttribute('normal') ? vec3(normalLocal).toVar('dqNormal') : null;
		const tangent = normal && builder.hasGeometryAttribute('tangent') ? vec3(tangentLocal).toVar('dqTangent') : null;
		skinning(object);
		dqSkin(builder, object, bind, normal, tangent);
	}
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
