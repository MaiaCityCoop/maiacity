// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * DOTS — markers of a fixed size on the screen (a contact, a pin), each a square of `px` pixels at its point, however
 * far: what a sized cloud of points drew (three's PointsMaterial without attenuation), as one instanced drawing of
 * sprites in TSL, since WebGPU draws a point one pixel wide (intent 602a8849).
 */
import * as THREE from 'three';
import { OwnBasic } from './tsl.js';
import { attribute, cameraProjectionMatrix, modelViewMatrix, positionLocal, uniform, vec4 } from 'three/tsl';

/**
 * @param {{ color: THREE.ColorRepresentation, px: number, depthTest?: boolean }} o
 * @returns {{ mesh: THREE.Mesh, set: (xyz: ArrayLike<number>) => void, dispose: () => void }}
 */
export function dots(o) {
	const screen = uniform(new THREE.Vector2(1, 1));
	const m = new OwnBasic({ color: o.color, depthTest: o.depthTest ?? true });
	const clip = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(attribute('at', 'vec3'), 1)));
	m.vertexNode = vec4(clip.xy.add(positionLocal.xy.mul(o.px * 2).div(screen).mul(clip.w)), clip.zw);
	const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
	geo.instanceCount = 0;
	const mesh = new THREE.Mesh(geo, m);
	mesh.frustumCulled = false;
	mesh.onBeforeRender = (r) => r.getDrawingBufferSize(screen.value);
	return {
		mesh,
		set(xyz) {
			geo.setAttribute('at', new THREE.InstancedBufferAttribute(new Float32Array(xyz), 3));
			geo.instanceCount = xyz.length / 3;
			mesh.visible = xyz.length > 0;
		},
		dispose() {
			geo.dispose();
			m.dispose();
		}
	};
}
