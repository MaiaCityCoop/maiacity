// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE FAR PICTURES IN TSL (../../assets/render/impostors.js): what a picture is taken with (`bakeOf`: a thing's own
 * material giving its colour as it is, unlit, no studio light) and the card a page of them is drawn by.
 */
import * as THREE from 'three';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import { atan, cameraPosition, cameraViewMatrix, clamp, diffuseColor, floor, length, mod, normalize, positionLocal, select, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import { aFade, always, drawn, nodeOf, ours } from './index.js';

const baked = new WeakMap();
/**
 * A thing's material as a picture takes it: its own colour (its pictures, its copies' colours, its cut-outs) as it is,
 * unlit, so the card lights it as the scene is lit.
 * @param {THREE.Material} m
 */
export function bakeOf(m) {
	let b = baked.get(m);
	if (b) return b;
	const n = nodeOf(m);
	b = n === m ? (m.isNodeMaterial ? m.clone() : nodeOf(new THREE.MeshBasicMaterial({ color: m.color ?? 0x808080, side: m.side }))) : n;
	b.outputNode = vec4(diffuseColor.rgb, diffuseColor.a);
	baked.set(m, b);
	return b;
}

/**
 * The material of a page of far pictures (../../assets/render/impostors.js): each card stands at its foot (`aAt`),
 * `aSize` metres, turned about its upright axis to the eye (to the light, drawing its shadow), showing the picture of
 * its thing (`aCell`, then one of `frames` sides by the thing's own turn `aTurn`) from the page `map` of `grid` cells,
 * faded by `aFade`; `depth` the one that draws its shadow.
 * @param {THREE.Texture} map @param {THREE.Vector2} grid @param {number} frames @param {ReturnType<typeof cutOf>} cut
 */
export function cardMaterials(map, cells, frames, cut) {
	const grid = uniform(cells);
	const at = always('aAt', 'vec3'), size = always('aSize', 'float');
	const t = cameraPosition.xz.sub(at.xz);
	const te = select(length(t).greaterThan(1e-4), normalize(t), vec2(0, 1));
	const pos = at.add(vec3(te.y, 0, te.x.negate()).mul(positionLocal.x).mul(size)).add(vec3(0, positionLocal.y.mul(size), 0));
	const step = (Math.PI * 2) / frames;
	const face = mod(floor(atan(te.x, te.y).sub(always('aTurn', 'float')).div(step).add(0.5)), frames);
	const cell = always('aCell', 'float').add(face);
	const card = varying(vec2(mod(cell, grid.x), floor(cell.div(grid.x))).add(clamp(uv(), 0.004, 0.996)).div(grid));
	const look = drawn(map, card);
	const make = (K, o) => {
		const m = new (ours(K))({ alphaTest: 0.5, side: THREE.DoubleSide, ...o });
		m.positionNode = pos;
		m.colorNode = look;
		m.fade = aFade;
		m.cut = cut;
		return m;
	};
	const material = make(MeshStandardNodeMaterial, { roughness: 0.85 });
	// lit as a thing facing the eye a little upward
	material.normalNode = normalize(cameraViewMatrix.mul(vec4(normalize(vec3(te.x, 0.55, te.y)), 0)).xyz);
	return { material, depth: make(MeshBasicNodeMaterial, {}) };
}

