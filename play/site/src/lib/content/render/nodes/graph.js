// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A RECIPE'S OWN LOOK, BUILT (intent a5faafad, GPU 14/14): a node graph a recipe gave its material, as plain data the
 * page has checked (../../assets/box/graph.js `checkGraph`, the one allowlist), built into TSL nodes here from that
 * list alone: each operation by its name from `BUILD`, nothing else, no code of the asset's ever run. A graph is
 * built once per output, each node of it a variable of its own (`toVar`), so a value used many times is worked out
 * once and the shader grows with the graph's nodes, never with its paths.
 *
 * `applyGraph(n, graph)` gives a node material of ours (./index.js `nodeOf`) the graph's outputs: its colour, glow,
 * opacity, roughness, metalness and its vertices' place. Everything else it draws as before (its lights, its shadow,
 * our cut, caps and fade). WIND and SUN are the uniforms every world shares, which a world sets (the sky, the walker).
 */
import * as THREE from 'three';
import {
	Fn, Loop, abs, ceil, clamp, cos, cross, distance, dot, exp, float, floor, fract, instanceColor, instanceIndex, length, max, min, mix, mod,
	mx_fractal_noise_float, mx_noise_float, mx_worley_noise_float, normalLocal, normalWorld, normalize, oneMinus, positionLocal, positionWorld, pow,
	saturate, sign, sin, smoothstep, sqrt, step, texture, time, uniform, uv, vec2, vec3, vec4
} from 'three/tsl';
import { checkGraph, OPS, OUTPUTS } from '../../assets/box/graph.js';

/** the wind every world shares: its direction times its strength (m/s), in the world's frame */
export const WIND = uniform(new THREE.Vector3(1.5, 0, 0.5));
/** the sun's direction every world shares (toward the sun) */
export const SUN = uniform(new THREE.Vector3(0.4, 0.8, 0.45).normalize());

const SPLAT = { float, vec2, vec3, vec4 };
/** a value of type `from` as one of type `to` (a float spread over a vector's components) */
const as = (x, from, to) => (from === to ? x : SPLAT[to](x));

/** each operation of the allowlist, built from TSL: (node, its inputs, their types, its type, the material) */
const BUILD = {
	float: (x) => float(x.value),
	vec2: (x) => vec2(...x.value),
	vec3: (x) => vec3(...x.value),
	vec4: (x) => vec4(...x.value),
	color: (x) => vec3(new THREE.Color(x.value)),
	uv: () => uv(),
	positionLocal: () => positionLocal,
	positionWorld: () => positionWorld,
	normalLocal: () => normalLocal,
	normalWorld: () => normalWorld,
	time: () => time,
	instanceIndex: () => float(instanceIndex),
	instanceColor: () => instanceColor,
	wind: () => WIND,
	sun: () => SUN,
	abs: (_, [a]) => abs(a), sin: (_, [a]) => sin(a), cos: (_, [a]) => cos(a), fract: (_, [a]) => fract(a), floor: (_, [a]) => floor(a),
	ceil: (_, [a]) => ceil(a), sign: (_, [a]) => sign(a), sqrt: (_, [a]) => sqrt(a), exp: (_, [a]) => exp(a), oneMinus: (_, [a]) => oneMinus(a),
	negate: (_, [a]) => a.negate(), saturate: (_, [a]) => saturate(a), normalize: (_, [a]) => normalize(a), length: (_, [a]) => length(a),
	swizzle: (x, [a]) => a[x.mask],
	add: (...a) => wide(a, (p, q) => p.add(q)), sub: (...a) => wide(a, (p, q) => p.sub(q)), mul: (...a) => wide(a, (p, q) => p.mul(q)),
	div: (...a) => wide(a, (p, q) => p.div(q)), mod: (...a) => wide(a, mod), pow: (...a) => wide(a, pow), min: (...a) => wide(a, min),
	max: (...a) => wide(a, max), step: (...a) => wide(a, step),
	dot: (_, [a, b]) => dot(a, b), distance: (_, [a, b]) => distance(a, b), cross: (_, [a, b]) => cross(a, b),
	mix: (...a) => wide(a, mix), clamp: (...a) => wide(a, clamp), smoothstep: (...a) => wide(a, smoothstep),
	join: (_, ins, __, t) => SPLAT[t](...ins),
	noise: (_, [p]) => mx_noise_float(p),
	worley: (_, [p]) => mx_worley_noise_float(p),
	fbm: (x, [p]) => mx_fractal_noise_float(p, x.octaves),
	texture: (x, [at], _, __, m) => texture(m[x.slot], at)
};
/** the operations the page builds (OPS's, but loop, acc and index, which `built` makes itself) */
export const BUILD_OPS = Object.keys(BUILD);

/** an operation of several inputs, each spread to the result's type first (GLSL wants them alike) */
const wide = ([, ins, types, t], f) => f(...ins.map((v, k) => as(v, types[k], t)));

/** the places of the nodes `i` is worked out from, itself among them */
function reach(nodes, i) {
	const seen = new Set(), todo = [i];
	while (todo.length) {
		const k = todo.pop();
		if (seen.has(k)) continue;
		seen.add(k);
		todo.push(...(nodes[k].in ?? []));
	}
	return seen;
}

/** a checked list's nodes built (only those in `only`, else all), each a variable, with their types */
function built(nodes, m, carried, only) {
	const values = [], types = [];
	for (const [i, x] of nodes.entries()) {
		if (only && !only.has(i)) {
			values.push(undefined);
			types.push(undefined);
			continue;
		}
		const ins = (x.in ?? []).map((k) => values[k]);
		const ts = (x.in ?? []).map((k) => types[k]);
		let t;
		if (x.op === 'acc') {
			values.push(carried.value);
			types.push(carried.type);
			continue;
		}
		if (x.op === 'index') {
			values.push(carried.index);
			types.push('float');
			continue;
		}
		t = typeOf(x, ts);
		let v;
		if (x.op === 'loop') {
			const acc = ins[0].toVar();
			Loop(x.count, ({ i }) => {
				const body = built(x.body, m, { value: acc, type: ts[0], index: float(i) });
				acc.assign(body.values.at(-1));
			});
			v = acc;
		} else v = BUILD[x.op](x, ins, ts, t, m).toVar();
		values.push(v);
		types.push(t);
	}
	return { values, types };
}

/** a node's type, from OPS (the one list) */
function typeOf(x, ts) {
	const spec = OPS[x.op];
	return spec.out ?? spec.type(...ts, x);
}

/**
 * A node material given a checked graph's outputs. The graph is checked here again (it may come from anywhere), and
 * against the pictures the material carries; throws a GraphError where it is refused.
 * @param {any} n a node material (./index.js nodeOf)
 * @param {unknown} graph
 */
export function applyGraph(n, graph) {
	const slots = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'aoMap', 'bumpMap'].filter((k) => n[k]?.isTexture);
	const g = checkGraph(graph, { slots });
	const output = (name) =>
		Fn(() => {
			const i = g.out[name];
			const { values, types } = built(g.nodes, n, undefined, reach(g.nodes, i));
			return as(values[i], types[i], OUTPUTS[name]);
		})();
	if (g.out.color !== undefined) n.colorNode = output('color');
	if (g.out.emissive !== undefined) n.emissiveNode = output('emissive');
	if (g.out.opacity !== undefined) n.opacityNode = output('opacity');
	if (g.out.roughness !== undefined) n.roughnessNode = output('roughness');
	if (g.out.metalness !== undefined) n.metalnessNode = output('metalness');
	if (g.out.position !== undefined) n.positionNode = output('position');
	n.graph = g;
	return n;
}
