// @ts-nocheck — plain JS, no imports: run in the box (bundled into its engine), in the page and in play's API alike
/*
 * A SHADER AS DATA — the one format and the one allowlist a recipe's own look travels in (intent a5faafad, GPU 14/14):
 * a TSL node graph written as plain JSON, never code. The box carries it out with the material (./serialize.js), the
 * page checks it here and builds it into TSL nodes from this list alone (../../render/nodes/graph.js), and play's API
 * checks the graphs a recipe declares with this same module when it is proposed (play/api/src/graphs.ts). Nothing in
 * it is run: a graph is a list of nodes, each one of the operations below by its name, its inputs earlier nodes of the
 * list by their place (so it can never loop back on itself), its settings plain numbers and short strings.
 *
 * What a shader may do is narrow by construction. It runs only on the graphics card (no network, page, storage or
 * cookies), and the list closes what is left:
 * - a hang: no loop but `loop` (a constant count, at most LIMITS.loop) and `fbm` (constant octaves, at most
 *   LIMITS.octaves); the whole graph, loops unrolled, costs at most LIMITS.cost;
 * - reading what isn't its own: no storage buffers, depth, screen, viewport, scene or other draws' pictures; a texture
 *   only one of its own material's pictures, by its slot, declared in `textures` (the page holds it to what the
 *   material carries), and none in the vertex stage (`position`);
 * - compile stalls and driver bugs: types checked node by node (float, vec2, vec3, vec4), at most LIMITS.nodes nodes,
 *   LIMITS.depth deep, LIMITS.bytes as JSON, every number finite and within ±LIMITS.value.
 *
 * Format 1 (box engine 6, box data format 5):
 *   { format: 1, nodes: [ { op, in?: [i, …], value?, mask?, slot?, octaves?, count?, body? }, … ],
 *     out: { color?, emissive?, opacity?, roughness?, metalness?, position? }, textures?: ['map', …] }
 * `out` names the node each of the material's inputs is drawn from (color and emissive vec3, position vec3: the vertex
 * moved, in the mesh's own space; the others float). A `loop`'s `body` is a list of nodes of its own, where `acc` is
 * the value carried from turn to turn (as `in[0]` gave it first) and `index` the turn (0, 1, …), its last node the
 * next `acc`. A graph is frozen with its engine: a version accepted with format 1 is built by format 1's list for good.
 */

export const GRAPH_FORMAT = 1;
/** the formats the page builds (a frozen version's graph is built by its own format's list for good) */
export const GRAPH_FORMATS = [1];

export const LIMITS = { nodes: 256, bytes: 32768, depth: 64, cost: 4096, loop: 16, loops: 2, octaves: 8, value: 1e6 };

/** a material's inputs a graph may draw, and the type each takes */
export const OUTPUTS = { color: 'vec3', emissive: 'vec3', opacity: 'float', roughness: 'float', metalness: 'float', position: 'vec3' };

/** the pictures of its own material a graph may read, by slot */
export const SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'aoMap', 'bumpMap'];

/** the uniforms every world shares that a graph may read: the wind (its direction times its strength) and the sun's direction */
export const SHARED = { wind: 'vec3', sun: 'vec3' };

/** what is refused by name, with why: everything else not in OPS is refused as unknown */
export const REFUSED = {
	storage: 'storage buffers', storageTexture: 'storage textures', storageElement: 'storage buffers', compute: 'compute',
	depth: 'the depth buffer', viewportDepthTexture: 'the depth buffer', linearDepth: 'the depth buffer', viewZ: 'the depth buffer',
	screenUV: 'the screen', screenCoordinate: 'the screen', screenSize: 'the screen', viewportTexture: 'the screen',
	viewportSharedTexture: 'the screen', viewportUV: 'the screen', pass: 'the scene', cubeTexture: 'a picture not its own',
	textureLoad: 'a picture by address', code: 'code', wgsl: 'code', glsl: 'code', js: 'code', Fn: 'code', uniform: 'a uniform not shared'
};

const TYPES = ['float', 'vec2', 'vec3', 'vec4'];
const size = (t) => TYPES.indexOf(t) + 1;
const vec = (n) => TYPES[n - 1];

export class GraphError extends Error {}
const fail = (why) => {
	throw new GraphError(why);
};

// ---------------------------------------------------------------- the operations

/** a and b the same type, or one of them a float (it is spread over the other's components) */
const broad = (a, b, what) => (a === b || b === 'float' ? a : a === 'float' ? b : fail(`${what}: a ${a} and a ${b} don't go together`));
const anyType = (t) => t;
const vecOnly = (what) => (t) => (t === 'float' ? fail(`${what} takes a vector`) : t);
const toFloat = () => 'float';
const isType = (want, what) => (t) => (t === want ? t : fail(`${what} takes a ${want}, not a ${t}`));

/**
 * Every operation a graph may use: `n` its number of inputs (or [least, most]), `keys` the settings it takes, `type`
 * its result's type from its inputs' (throwing where they don't fit), `cost` what it weighs (default 1).
 * The page builds each from TSL by the same name (../../render/nodes/graph.js `BUILD`).
 */
export const OPS = {
	// constants
	float: { n: 0, keys: ['value'], type: () => 'float' },
	vec2: { n: 0, keys: ['value'], type: () => 'vec2' },
	vec3: { n: 0, keys: ['value'], type: () => 'vec3' },
	vec4: { n: 0, keys: ['value'], type: () => 'vec4' },
	color: { n: 0, keys: ['value'], type: () => 'vec3' },
	// what the draw knows of the point drawn
	uv: { n: 0, type: () => 'vec2' },
	positionLocal: { n: 0, type: () => 'vec3' },
	positionWorld: { n: 0, type: () => 'vec3' },
	normalLocal: { n: 0, type: () => 'vec3' },
	normalWorld: { n: 0, type: () => 'vec3' },
	time: { n: 0, type: () => 'float' },
	instanceIndex: { n: 0, type: () => 'float' },
	instanceColor: { n: 0, type: () => 'vec3' },
	wind: { n: 0, type: () => SHARED.wind },
	sun: { n: 0, type: () => SHARED.sun },
	// one input
	abs: { n: 1, type: anyType }, sin: { n: 1, type: anyType }, cos: { n: 1, type: anyType }, fract: { n: 1, type: anyType },
	floor: { n: 1, type: anyType }, ceil: { n: 1, type: anyType }, sign: { n: 1, type: anyType }, sqrt: { n: 1, type: anyType },
	exp: { n: 1, type: anyType }, oneMinus: { n: 1, type: anyType }, negate: { n: 1, type: anyType }, saturate: { n: 1, type: anyType },
	normalize: { n: 1, type: vecOnly('normalize') }, length: { n: 1, type: toFloat },
	swizzle: { n: 1, keys: ['mask'], type: (t, x) => swizzled(t, x.mask) },
	// two
	add: { n: 2, type: (a, b) => broad(a, b, 'add') }, sub: { n: 2, type: (a, b) => broad(a, b, 'sub') },
	mul: { n: 2, type: (a, b) => broad(a, b, 'mul') }, div: { n: 2, type: (a, b) => broad(a, b, 'div') },
	mod: { n: 2, type: (a, b) => broad(a, b, 'mod') }, pow: { n: 2, type: (a, b) => broad(a, b, 'pow') },
	min: { n: 2, type: (a, b) => broad(a, b, 'min') }, max: { n: 2, type: (a, b) => broad(a, b, 'max') },
	step: { n: 2, type: (edge, x) => broad(x, edge, 'step') },
	dot: { n: 2, type: (a, b) => (a === b && a !== 'float' ? 'float' : fail(`dot takes two vectors of one size, not a ${a} and a ${b}`)) },
	distance: { n: 2, type: (a, b) => (a === b ? 'float' : fail(`distance takes two of one size, not a ${a} and a ${b}`)) },
	cross: { n: 2, type: (a, b) => (a === 'vec3' && b === 'vec3' ? 'vec3' : fail('cross takes two vec3')) },
	// three
	mix: { n: 3, type: (a, b, t) => broad(broad(a, b, 'mix'), t, 'mix') },
	clamp: { n: 3, type: (x, lo, hi) => broad(broad(x, lo, 'clamp'), hi, 'clamp') },
	smoothstep: { n: 3, type: (e0, e1, x) => broad(broad(x, e0, 'smoothstep'), e1, 'smoothstep') },
	// a vector of its inputs' components, two to four in all
	join: { n: [2, 4], type: (...ts) => (ts.reduce((s, t) => s + size(t), 0) <= 4 ? vec(ts.reduce((s, t) => s + size(t), 0)) : fail('join makes a vector of at most four components')) },
	// noise (MaterialX's, as three gives it): `fbm` its octaves summed, a loop of a constant count
	noise: { n: 1, type: isType('vec3', 'noise'), out: 'float', cost: 8 },
	worley: { n: 1, type: isType('vec3', 'worley'), out: 'float', cost: 16 },
	fbm: { n: 1, keys: ['octaves'], type: isType('vec3', 'fbm'), out: 'float', cost: 8 },
	// a picture of its own material's, declared in `textures`, at a uv
	texture: { n: 1, keys: ['slot'], type: isType('vec2', 'texture'), out: 'vec4', cost: 2 },
	// a loop of a constant count, carrying one value
	loop: { n: 1, keys: ['count', 'body'], type: anyType },
	// only inside a loop's body
	acc: { n: 0, inLoop: true, type: () => 'carried' },
	index: { n: 0, inLoop: true, type: () => 'float' }
};

/** the components a mask picks of a value of type `t` */
function swizzled(t, mask) {
	if (typeof mask !== 'string' || !/^[xyzw]{1,4}$/.test(mask)) fail('swizzle takes a mask of one to four of x, y, z, w');
	const n = size(t);
	for (const c of mask) if ('xyzw'.indexOf(c) >= n) fail(`swizzle: a ${t} has no ${c}`);
	return vec(mask.length);
}

// ---------------------------------------------------------------- the check

/** a plain object of our data (no class, no accessor), or a refusal */
function plain(x, what) {
	if (!x || typeof x !== 'object' || Array.isArray(x)) fail(`${what} is an object`);
	const proto = Object.getPrototypeOf(x);
	if (proto !== Object.prototype && proto !== null) fail(`${what} is plain data`);
	for (const k of Object.keys(x)) {
		const d = Object.getOwnPropertyDescriptor(x, k);
		if (!d || !('value' in d)) fail(`${what} is plain data`);
	}
	return x;
}
const list = (x, what, most) => {
	if (!Array.isArray(x)) fail(`${what} is a list`);
	if (x.length > most) fail(`${what} has ${x.length} items, more than ${most}`);
	return x;
};
const number = (x, what) => (typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= LIMITS.value ? x : fail(`${what} is a number within ±${LIMITS.value}`));
const whole = (x, lo, hi, what) => (Number.isInteger(x) && x >= lo && x <= hi ? x : fail(`${what} is a whole number from ${lo} to ${hi}`));

/**
 * A list of nodes checked, as a clean copy: each an operation of OPS with its inputs earlier in the list, its settings,
 * and its type. `scope` counts the nodes and the cost of the whole graph as it goes.
 */
function nodesOf(raw, scope, where, carried) {
	const nodes = list(raw, `${where} nodes`, LIMITS.nodes);
	if (!nodes.length) fail(`${where} has no nodes`);
	const out = [], types = [], deep = [], vertexOk = [];
	nodes.forEach((x, i) => {
		const what = `${where} node ${i}`;
		plain(x, what);
		if (++scope.nodes > LIMITS.nodes) fail(`more than ${LIMITS.nodes} nodes`);
		const op = x.op;
		if (typeof op !== 'string' || op.length > 32) fail(`${what} names no operation`);
		if (!Object.hasOwn(OPS, op)) fail(Object.hasOwn(REFUSED, op) ? `${what}: ${op} is refused: a graph may not read ${REFUSED[op]}` : `${what}: no operation ${op.slice(0, 32)}`);
		const spec = OPS[op];
		if (spec.inLoop && carried === undefined) fail(`${what}: ${op} is only inside a loop's body`);
		const allowed = new Set(['op', 'in', ...(spec.keys ?? [])]);
		for (const k of Object.keys(x)) if (!allowed.has(k)) fail(`${what}: ${op} takes no ${k.slice(0, 32)}`);
		const [least, most] = Array.isArray(spec.n) ? spec.n : [spec.n, spec.n];
		const ins = x.in === undefined && least === 0 ? [] : list(x.in, `${what} in`, 4);
		if (ins.length < least || ins.length > most) fail(`${what}: ${op} takes ${least === most ? least : `${least} to ${most}`} inputs`);
		for (const k of ins) if (!Number.isInteger(k) || k < 0 || k >= i) fail(`${what}: an input is an earlier node's place`);
		const node = { op, ...(ins.length && { in: [...ins] }) };
		const inTypes = ins.map((k) => types[k]);
		let type, cost = spec.cost ?? 1;
		if (op === 'float') node.value = number(x.value, `${what} value`);
		else if (op === 'vec2' || op === 'vec3' || op === 'vec4') {
			const v = list(x.value, `${what} value`, 4);
			if (v.length !== size(op)) fail(`${what}: a ${op} has ${size(op)} numbers`);
			node.value = v.map((n, k) => number(n, `${what} value ${k}`));
		} else if (op === 'color') node.value = whole(x.value, 0, 0xffffff, `${what} value`);
		else if (op === 'swizzle') node.mask = x.mask;
		else if (op === 'fbm') {
			node.octaves = whole(x.octaves, 1, LIMITS.octaves, `${what} octaves`);
			cost *= node.octaves;
		} else if (op === 'texture') {
			if (!SLOTS.includes(x.slot)) fail(`${what}: a texture is one of its material's own pictures: ${SLOTS.join(', ')}`);
			if (!scope.textures.has(x.slot)) fail(`${what}: the texture ${x.slot} is not declared in textures`);
			node.slot = x.slot;
		} else if (op === 'loop') {
			if (scope.loops >= LIMITS.loops) fail(`${what}: loops nest at most ${LIMITS.loops} deep`);
			node.count = whole(x.count, 1, LIMITS.loop, `${what} count`);
			const inner = { ...scope, nodes: 0, cost: 0, loops: scope.loops + 1 };
			const body = nodesOf(x.body, inner, `${what} body`, inTypes[0]);
			scope.nodes += inner.nodes;
			if (scope.nodes > LIMITS.nodes) fail(`more than ${LIMITS.nodes} nodes`);
			if (body.type !== inTypes[0]) fail(`${what}: its body ends in a ${body.type}, but carries a ${inTypes[0]}`);
			node.body = body.nodes;
			cost += node.count * inner.cost;
			deep[i] = body.deep;
			if (!body.vertexOk) vertexOk[i] = false;
		}
		if (op === 'acc') type = carried;
		else {
			type = spec.type(...inTypes, x);
			if (spec.out) type = spec.out;
		}
		if (!TYPES.includes(type)) fail(`${what}: no type`);
		scope.cost += cost;
		if (scope.cost > LIMITS.cost) fail(`the graph costs more than ${LIMITS.cost} (loops counted turn by turn)`);
		types[i] = type;
		// how deep its expression nests (a loop's body counted once: it is written once, run count times)
		deep[i] = 1 + Math.max(deep[i] ?? 0, ...ins.map((k) => deep[k]));
		if (deep[i] > LIMITS.depth) fail(`${what}: more than ${LIMITS.depth} deep`);
		vertexOk[i] = vertexOk[i] !== false && op !== 'texture' && ins.every((k) => vertexOk[k]);
		out.push(node);
	});
	const last = out.length - 1;
	return { nodes: out, type: types[last], deep: Math.max(...deep), vertexOk: vertexOk.every(Boolean), all: { types, vertexOk } };
}

/**
 * A graph checked against the one allowlist, as a clean copy holding nothing but what the list allows; throws a
 * GraphError saying why where it is refused. `slots`, where given (the page), the pictures its material carries: a
 * declared texture it doesn't carry is refused.
 * @param {unknown} raw
 * @param {{ slots?: string[] }} [o]
 * @returns {{ format: number, nodes: object[], out: Record<string, number>, textures?: string[] }}
 */
export function checkGraph(raw, { slots } = {}) {
	plain(raw, 'the graph');
	for (const k of Object.keys(raw)) if (!['format', 'nodes', 'out', 'textures'].includes(k)) fail(`the graph has no ${k.slice(0, 32)}`);
	if (!GRAPH_FORMATS.includes(raw.format)) fail(`the graph's format is one of ${GRAPH_FORMATS.join(', ')}`);
	const textures = raw.textures === undefined ? [] : list(raw.textures, 'textures', SLOTS.length);
	for (const t of textures) {
		if (!SLOTS.includes(t)) fail(`textures names its material's own pictures: ${SLOTS.join(', ')}`);
		if (slots && !slots.includes(t)) fail(`the texture ${t} is declared, but its material carries no ${t}`);
	}
	if (new Set(textures).size !== textures.length) fail('textures names each picture once');
	const scope = { nodes: 0, cost: 0, loops: 0, textures: new Set(textures) };
	const { nodes, all } = nodesOf(raw.nodes, scope, 'the graph');
	const out = {};
	plain(raw.out, 'out');
	const names = Object.keys(raw.out);
	if (!names.length) fail('out names at least one of ' + Object.keys(OUTPUTS).join(', '));
	for (const k of names) {
		if (!Object.hasOwn(OUTPUTS, k)) fail(`out: a graph draws ${Object.keys(OUTPUTS).join(', ')}, not ${k.slice(0, 32)}`);
		const i = raw.out[k];
		if (!Number.isInteger(i) || i < 0 || i >= nodes.length) fail(`out.${k} is a node's place`);
		const t = all.types[i];
		if (t !== OUTPUTS[k] && !(t === 'float' && OUTPUTS[k] !== 'float')) fail(`out.${k} takes a ${OUTPUTS[k]}, not a ${t}`);
		if (k === 'position' && !all.vertexOk[i]) fail('out.position reads no texture (the vertex stage)');
		out[k] = i;
	}
	const graph = { format: raw.format, nodes, out, ...(textures.length && { textures: [...textures] }) };
	const bytes = JSON.stringify(graph).length;
	if (bytes > LIMITS.bytes) fail(`the graph is ${bytes} bytes as JSON, more than ${LIMITS.bytes}`);
	return graph;
}

/** checkGraph's answer as `{ ok, graph }` or `{ ok: false, why }`, never throwing for a refusal */
export function graphOk(raw, o) {
	try {
		return { ok: true, graph: checkGraph(raw, o) };
	} catch (e) {
		if (e instanceof GraphError) return { ok: false, why: e.message };
		return { ok: false, why: 'the graph could not be read' };
	}
}
