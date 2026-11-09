// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE FAR PICTURES IN TSL (../../assets/render/impostors.js): what a view is baked with and the card that draws them,
 * by the same sums as impostors.js's `encode`, `decode`, `nearest` and `upOf` (tested there).
 */
import * as THREE from 'three';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import {
	abs, cameraFar, cameraNear, cameraPosition, cameraProjectionMatrix, cameraViewMatrix, cameraWorldMatrix, clamp, cos, cross, diffuseColor, dot, float, floor, frontFacing, max, mod,
	normalWorld, normalize, positionLocal, positionView, positionWorld, select, sin, uniform, varying, vec2, vec3, vec4, viewZToOrthographicDepth, viewZToPerspectiveDepth
} from 'three/tsl';
import { always, drawn, faded, nodeOf, ours } from './index.js';

/** the view baked: its direction, the thing's middle height, its ball's diameter */
export const bake = { dir: uniform(new THREE.Vector3(0, 0, 1)), mid: uniform(0), size: uniform(1) };

const baked = new WeakMap();
/** a material as baked: `albedo` its own colour, unlit; `normal` its normal and depth along the view, 0…1 @param {THREE.Material} m */
export function bakeOf(m) {
	let b = baked.get(m);
	if (b) return b;
	const of = () => {
		const n = nodeOf(m);
		return n !== m ? n : m.isNodeMaterial ? m.clone() : nodeOf(new THREE.MeshBasicMaterial({ color: m.color }));
	};
	const albedo = of(), normal = of();
	albedo.outputNode = diffuseColor;
	const n = normalize(select(frontFacing, normalWorld, normalWorld.negate()));
	normal.outputNode = vec4(n.mul(0.5).add(0.5), dot(positionWorld.sub(vec3(0, bake.mid, 0)), bake.dir).div(bake.size).add(0.5));
	baked.set(m, (b = { albedo, normal }));
	return b;
}

/** v turned t about the upright */
const turnY = (v, t) => vec3(v.x.mul(cos(t)).add(v.z.mul(sin(t))), v.y, v.z.mul(cos(t)).sub(v.x.mul(sin(t))));
/** a view's right and up */
const frameOf = (d) => {
	const r = normalize(cross(select(d.y.greaterThan(0.999), vec3(0, 0, -1), vec3(0, 1, 0)), d));
	return [r, cross(d, r)];
};

/**
 * A page's card at `aAt` (its ball's middle), `aCard` (size, turn, block's first cell, fade), faced to the eye, its
 * three nearest views blended from `map` and `normals` (`cells` a side), lit by its normals.
 */
export function cardMaterials(map, normals, cells, views, cut) {
	const at = always('aAt', 'vec3'), A = always('aCard', 'vec4'), size = A.x, turn = A.y, corner = A.z;
	// the eye in the thing's frame (a light's along its axis)
	const ortho = cameraProjectionMatrix.element(3).w.greaterThan(0.5);
	const c = turnY(select(ortho, cameraWorldMatrix.element(2).xyz.mul(1e4), cameraPosition.sub(at)), turn.negate());
	const e = normalize(c);
	const [er, eu] = frameOf(e);
	const V = er.mul(positionLocal.x).add(eu.mul(positionLocal.y)).mul(size);
	// the eye on the grid, and the triangle of views round it
	const n1 = views - 1;
	const h = normalize(vec3(e.x, max(e.y, 0), e.z.add(1e-5)));
	const p = vec2(h.x, h.z).div(abs(h.x).add(h.y).add(abs(h.z)));
	const g = vec2(p.x.add(p.y), p.x.sub(p.y)).mul(0.5).add(0.5).mul(n1);
	const b = clamp(floor(g), 0, n1 - 1), f = g.sub(b);
	const lo = f.x.add(f.y).lessThan(1);
	const grid = [select(lo, b, b.add(1)), b.add(select(lo, vec2(1, 0), vec2(0, 1))), b.add(select(lo, vec2(0, 1), vec2(1, 0)))];
	const w = varying(select(lo, vec3(float(1).sub(f.x).sub(f.y), f.x, f.y), vec3(f.x.add(f.y).sub(1), float(1).sub(f.x), float(1).sub(f.y))));
	const base = vec2(mod(corner, cells), floor(corner.div(cells)));
	const taken = grid.map((gk, k) => {
		const uv = gk.div(n1).mul(2).sub(1);
		const x = uv.x.add(uv.y).mul(0.5), z = uv.x.sub(uv.y).mul(0.5);
		const d = normalize(vec3(x, float(1).sub(abs(x)).sub(abs(z)), z));
		const [r, u] = frameOf(d);
		// the eye's ray through this corner met on the view's plane
		const rd = V.sub(c);
		const H = c.add(rd.mul(dot(c, d).negate().div(dot(rd, d))));
		const q = varying(base.add(gk)).add(clamp(varying(vec2(dot(H, r), dot(H, u)).div(size).add(0.5)), 0.004, 0.996)).div(cells);
		return { col: drawn(map, q), nd: drawn(normals, q), wk: w[['x', 'y', 'z'][k]] };
	});
	const look = taken.reduce((a, t) => a.add(t.col.mul(t.wk)), vec4(0));
	const cover = taken.reduce((a, t) => a.add(t.wk.mul(t.col.a)), float(1e-4));
	const nd = taken.reduce((a, t) => a.add(t.nd.mul(t.wk.mul(t.col.a))), vec4(0)).div(cover);
	// each pixel at its baked depth; its shadow cut as it is (on WebGPU by the material's own nodes, on WebGL `depth`)
	const z = positionView.z.add(nd.w.sub(0.5).mul(size));
	const dz = select(ortho, viewZToOrthographicDepth(z, cameraNear, cameraFar), viewZToPerspectiveDepth(z, cameraNear, cameraFar));
	const make = (K, o) => {
		const m = new (ours(K))({ alphaTest: 0.5, side: THREE.DoubleSide, ...o });
		m.positionNode = at.add(turnY(V, turn));
		m.colorNode = look;
		m.fade = A.w;
		m.cut = cut;
		m.depthNode = dz;
		return m;
	};
	const material = make(MeshStandardNodeMaterial, { roughness: 0.85 });
	material.normalNode = normalize(cameraViewMatrix.mul(vec4(turnY(normalize(nd.xyz.mul(2).sub(1)), turn), 0)).xyz);
	Object.defineProperty(material, 'maskShadowNode', { value: look.a.greaterThan(0.5).and(faded(A.w).not()) });
	return { material, depth: make(MeshBasicNodeMaterial, {}) };
}
