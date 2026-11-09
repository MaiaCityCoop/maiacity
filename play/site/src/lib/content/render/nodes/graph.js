// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A RECIPE'S OWN LOOK, BUILT (intent a5faafad, GPU 14/14): a node graph a recipe gave its material, as plain data the
 * page has checked (../../assets/box/graph.js `checkGraph`, the one allowlist), built into TSL nodes here from that
 * list alone: each operation by its name from `BUILD`, nothing else, no code of the asset's ever run. A graph is
 * built once, its outputs sharing its nodes, so a value used many times is worked out once per shader stage and the
 * shader grows with the graph's nodes, never with its paths or its outputs.
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

/**
 * A checked list's nodes built once, with their types: each value one TSL node shared by every node and output that
 * reads it, so three works it out once per shader stage (a value read twice or more is given a variable of its own:
 * TSL's temporaries), never once per path or per output. A loop is a function of its own, its value carried in a
 * variable, its body built inside it.
 */
function built(nodes, m, carried) {
	const values = [], types = [];
	for (const x of nodes) {
		const ins = (x.in ?? []).map((k) => values[k]);
		const ts = (x.in ?? []).map((k) => types[k]);
		if (x.op === 'acc' || x.op === 'index') {
			values.push(x.op === 'acc' ? carried.value : carried.index);
			types.push(x.op === 'acc' ? carried.type : 'float');
			continue;
		}
		const t = typeOf(x, ts);
		values.push(x.op === 'loop' ? looped(x, ins[0], ts[0], m) : BUILD[x.op](x, ins, ts, t, m));
		types.push(t);
	}
	return { values, types };
}

/** a loop of a constant count: its value carried in a variable, its body built once inside it */
const looped = (x, init, type, m) =>
	Fn(() => {
		const acc = init.toVar();
		Loop(x.count, ({ i }) => {
			const body = built(x.body, m, { value: acc, type, index: float(i) });
			acc.assign(body.values.at(-1));
		});
		return acc;
	})();

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
	// built once: the outputs share its nodes (one stage's outputs work each value out once between them)
	const { values, types } = built(g.nodes, n, undefined);
	const output = (name) => as(values[g.out[name]], types[g.out[name]], OUTPUTS[name]);
	if (g.out.color !== undefined) n.colorNode = output('color');
	if (g.out.emissive !== undefined) n.emissiveNode = output('emissive');
	if (g.out.opacity !== undefined) n.opacityNode = output('opacity');
	if (g.out.roughness !== undefined) n.roughnessNode = output('roughness');
	if (g.out.metalness !== undefined) n.metalnessNode = output('metalness');
	if (g.out.position !== undefined) n.positionNode = output('position');
	n.graph = g;
	return n;
}
