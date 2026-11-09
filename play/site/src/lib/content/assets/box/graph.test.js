// The one allowlist a recipe's shader graph is held to (intent a5faafad, c2): what it lets through, everything it
// refuses with why, and ten thousand random graphs, valid and broken, none of which crashes it or slips past it.
import { describe, expect, it } from 'vitest';
import { checkGraph, graphOk, GraphError, LIMITS, OPS, OUTPUTS, REFUSED, SLOTS } from './graph.js';
import { GLOW } from './graph.examples.js';

const refused = (g, o) => {
	const r = graphOk(g, o);
	expect(r.ok).toBe(false);
	return r.why;
};
const g1 = (nodes, out, more = {}) => ({ format: 1, nodes, out, ...more });

describe('what it lets through', () => {
	it('the test asset: a glow, a sway in the wind, a noise', () => {
		const g = checkGraph(GLOW);
		expect(g.nodes).toHaveLength(GLOW.nodes.length);
		expect(g.out).toEqual(GLOW.out);
		expect(g).not.toBe(GLOW);
	});
	it('a clean copy: nothing it holds is the given one’s', () => {
		const given = g1([{ op: 'vec3', value: [1, 2, 3] }], { color: 0 });
		const g = checkGraph(given);
		given.nodes[0].value[0] = 9;
		expect(g.nodes[0].value).toEqual([1, 2, 3]);
	});
	it('a float drawn where a vec3 goes is spread', () => {
		expect(checkGraph(g1([{ op: 'float', value: 0.5 }], { color: 0 })).out.color).toBe(0);
	});
	it('a loop of a constant count, carrying a value', () => {
		const body = [{ op: 'acc' }, { op: 'index' }, { op: 'sin', in: [1] }, { op: 'add', in: [0, 2] }];
		const g = checkGraph(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 8, body }], { roughness: 1 }));
		expect(g.nodes[1].body).toHaveLength(4);
	});
	it('its own picture, declared and carried', () => {
		const g = g1([{ op: 'uv' }, { op: 'texture', in: [0], slot: 'map' }, { op: 'swizzle', in: [1], mask: 'xyz' }], { color: 2 }, { textures: ['map'] });
		expect(checkGraph(g, { slots: ['map'] }).textures).toEqual(['map']);
	});
	it('every operation of the list is built by the page', async () => {
		const { BUILD_OPS } = await import('../../render/nodes/graph.js');
		for (const op of Object.keys(OPS)) if (!['acc', 'index', 'loop'].includes(op)) expect(BUILD_OPS).toContain(op);
	});
});

describe('what it refuses, saying why', () => {
	it('anything not plain data', () => {
		expect(refused(null)).toMatch(/object/);
		expect(refused([])).toMatch(/object/);
		expect(refused('{"format":1}')).toMatch(/object/);
		expect(refused(Object.assign(Object.create({ x: 1 }), { format: 1 }))).toMatch(/plain data/);
		const getter = g1([{ op: 'time' }], { opacity: 0 });
		Object.defineProperty(getter.nodes[0], 'in', { get: () => [], enumerable: true });
		expect(refused(getter)).toMatch(/plain data/);
		expect(refused({ ...GLOW, code: 'x' })).toMatch(/no code/);
		expect(refused({ ...GLOW, format: 2 })).toMatch(/format/);
	});
	it('an unknown operation, and storage, depth, screen and scene reads by name', () => {
		expect(refused(g1([{ op: 'eval' }], { opacity: 0 }))).toMatch(/no operation eval/);
		for (const [op, why] of Object.entries(REFUSED)) expect(refused(g1([{ op }], { opacity: 0 }))).toContain(`may not read ${why}`);
		expect(refused(g1([{ op: '__proto__' }], { opacity: 0 }))).toMatch(/no operation/);
		expect(refused(g1([{ op: 'constructor' }], { opacity: 0 }))).toMatch(/no operation/);
	});
	it('settings an operation does not take', () => {
		expect(refused(g1([{ op: 'time', value: 1 }], { opacity: 0 }))).toMatch(/takes no value/);
		expect(refused(g1([{ op: 'time', code: 'while(1){}' }], { opacity: 0 }))).toMatch(/takes no code/);
	});
	it('inputs that are not earlier nodes: no cycle, no forward reference', () => {
		expect(refused(g1([{ op: 'sin', in: [0] }], { opacity: 0 }))).toMatch(/earlier node/);
		expect(refused(g1([{ op: 'time' }, { op: 'sin', in: [2] }, { op: 'time' }], { opacity: 1 }))).toMatch(/earlier node/);
		expect(refused(g1([{ op: 'time' }, { op: 'sin', in: [-1] }], { opacity: 1 }))).toMatch(/earlier node/);
		expect(refused(g1([{ op: 'time' }, { op: 'sin', in: [0.5] }], { opacity: 1 }))).toMatch(/earlier node/);
	});
	it('types that do not fit', () => {
		expect(refused(g1([{ op: 'uv' }, { op: 'positionLocal' }, { op: 'add', in: [0, 1] }], { color: 2 }))).toMatch(/don't go together/);
		expect(refused(g1([{ op: 'uv' }], { color: 0 }))).toMatch(/takes a vec3, not a vec2/);
		expect(refused(g1([{ op: 'uv' }, { op: 'swizzle', in: [0], mask: 'z' }], { opacity: 1 }))).toMatch(/has no z/);
		expect(refused(g1([{ op: 'uv' }, { op: 'noise', in: [0] }], { opacity: 1 }))).toMatch(/takes a vec3/);
		expect(refused(g1([{ op: 'positionLocal' }, { op: 'positionLocal' }, { op: 'join', in: [0, 1] }], { opacity: 2 }))).toMatch(/at most four/);
	});
	it('loops: only of a constant count, at most 16 turns, nested at most twice', () => {
		const body = [{ op: 'acc' }];
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 17, body }], { opacity: 1 }))).toMatch(/count/);
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 0, body }], { opacity: 1 }))).toMatch(/count/);
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'time' }, { op: 'loop', in: [0], count: { op: 'time' }, body }], { opacity: 2 }))).toMatch(/count/);
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: Infinity, body }], { opacity: 1 }))).toMatch(/count/);
		const nest = (d) => (d === 0 ? [{ op: 'acc' }] : [{ op: 'acc' }, { op: 'loop', in: [0], count: 2, body: nest(d - 1) }]);
		expect(graphOk(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 2, body: nest(1) }], { opacity: 1 })).ok).toBe(true);
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 2, body: nest(2) }], { opacity: 1 }))).toMatch(/nest/);
		expect(refused(g1([{ op: 'acc' }], { opacity: 0 }))).toMatch(/only inside a loop/);
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 2, body: [{ op: 'uv' }] }], { opacity: 1 }))).toMatch(/carries a float/);
	});
	it('fbm’s octaves a constant, at most 8', () => {
		expect(refused(g1([{ op: 'positionLocal' }, { op: 'fbm', in: [0], octaves: 9 }], { opacity: 1 }))).toMatch(/octaves/);
	});
	it('its cost, loops counted turn by turn', () => {
		const heavy = Array.from({ length: 20 }, () => ({ op: 'worley', in: [0] }));
		const inner = [{ op: 'acc' }, { op: 'positionLocal' }, ...heavy.map(() => ({ op: 'worley', in: [1] })), { op: 'add', in: [0, 2] }];
		expect(refused(g1([{ op: 'float', value: 0 }, { op: 'loop', in: [0], count: 16, body: inner }], { opacity: 1 }))).toMatch(/costs more/);
	});
	it('size: nodes, depth, bytes, numbers', () => {
		const many = [{ op: 'time' }, ...Array.from({ length: LIMITS.nodes }, (_, i) => ({ op: 'sin', in: [i] }))];
		expect(refused(g1(many, { opacity: 0 }))).toMatch(/nodes|items/);
		const deep = [{ op: 'time' }, ...Array.from({ length: LIMITS.depth }, (_, i) => ({ op: 'sin', in: [i] }))];
		expect(refused(g1(deep, { opacity: deep.length - 1 }))).toMatch(/deep/);
		expect(refused(g1([{ op: 'float', value: 1e7 }], { opacity: 0 }))).toMatch(/within/);
		expect(refused(g1([{ op: 'float', value: NaN }], { opacity: 0 }))).toMatch(/within/);
		expect(refused(g1([{ op: 'vec3', value: [1, 2] }], { color: 0 }))).toMatch(/3 numbers/);
		expect(refused(g1([{ op: 'color', value: 0x1000000 }], { color: 0 }))).toMatch(/whole number/);
		expect(refused(g1([{ op: 'x'.repeat(40) }], { color: 0 }))).toMatch(/names no operation/);
	});
	it('textures: only its own pictures, declared, carried, and none in the vertex stage', () => {
		const tex = (more, slots) => refused(g1([{ op: 'uv' }, { op: 'texture', in: [0], slot: 'map' }, { op: 'swizzle', in: [1], mask: 'xyz' }], { color: 2 }, more), slots);
		expect(tex({})).toMatch(/not declared/);
		expect(tex({ textures: ['map'] }, { slots: [] })).toMatch(/carries no map/);
		expect(tex({ textures: ['envMap'] })).toMatch(/own pictures/);
		expect(refused(g1([{ op: 'uv' }, { op: 'texture', in: [0], slot: 'shadowMap' }], { opacity: 1 }, { textures: ['map'] }))).toMatch(/own pictures/);
		expect(refused(g1([{ op: 'uv' }, { op: 'texture', in: [0], slot: 'map' }, { op: 'swizzle', in: [1], mask: 'xyz' }], { position: 2 }, { textures: ['map'] }))).toMatch(/vertex stage/);
	});
	it('outputs it does not draw', () => {
		expect(refused(g1([{ op: 'time' }], {}))).toMatch(/at least one/);
		expect(refused(g1([{ op: 'time' }], { fragmentNode: 0 }))).toMatch(/not fragmentNode/);
		expect(refused(g1([{ op: 'time' }], { opacity: 3 }))).toMatch(/node's place/);
		expect(Object.keys(OUTPUTS)).toEqual(['color', 'emissive', 'opacity', 'roughness', 'metalness', 'position']);
	});
	it('lists with holes: what it checks is what it copies', () => {
		// eslint-disable-next-line no-sparse-arrays
		expect(refused({ format: 1, nodes: [, { op: 'float', value: 1 }, { op: 'add', in: [1, 1] }], out: { opacity: 1 } })).toMatch(/without holes/);
		// eslint-disable-next-line no-sparse-arrays
		expect(refused(g1([{ op: 'vec3', value: [1, , 3] }], { color: 0 }))).toMatch(/without holes/);
		const extra = Object.assign([{ op: 'time' }], { more: 1 });
		expect(refused(g1(extra, { opacity: 0 }))).toMatch(/without holes/);
	});
	it('throws a GraphError for checkGraph', () => {
		expect(() => checkGraph({})).toThrow(GraphError);
	});
});

// ---------------------------------------------------------------- the fuzz

/** a seeded generator (mulberry32): the same ten thousand graphs every run */
function rng(seed) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const NAMES = [...Object.keys(OPS), ...Object.keys(REFUSED), 'eval', '__proto__', 'constructor', 'toString', ''];
const JUNK = [undefined, null, NaN, Infinity, -1, 0.5, 1e9, 'x', [], {}, true, [0, 0, 0], 'xyz', 'map', 'envMap', 3, 17, 9];

/** a graph made to fit, node by node (each input of a type its operation takes), then perhaps broken in one place */
function typedGraph(r) {
	const pick = (a) => a[Math.floor(r() * a.length)];
	const SIZE = { float: 1, vec2: 2, vec3: 3, vec4: 4 };
	const make = (n, carried) => {
		const nodes = [], types = [];
		const add = (x, t) => (nodes.push(x), types.push(t));
		if (carried) add({ op: 'acc' }, carried), add({ op: 'index' }, 'float');
		const of = (want) => {
			const k = types.flatMap((t, i) => (want(t) ? [i] : []));
			return k.length ? pick(k) : null;
		};
		while (nodes.length < n) {
			const kind = Math.floor(r() * 9);
			if (kind === 0 || nodes.length < 2) {
				const op = pick(['float', 'vec2', 'vec3', 'vec4', 'color', 'uv', 'positionLocal', 'positionWorld', 'normalLocal', 'normalWorld', 'time', 'instanceIndex', 'instanceColor', 'wind', 'sun']);
				const x = { op };
				if (op === 'float') x.value = r() * 4 - 2;
				if (op.startsWith('vec')) x.value = Array.from({ length: SIZE[op] }, () => r());
				if (op === 'color') x.value = Math.floor(r() * 0xffffff);
				add(x, { float: 'float', vec2: 'vec2', vec3: 'vec3', vec4: 'vec4', uv: 'vec2', time: 'float', instanceIndex: 'float' }[op] ?? 'vec3');
			} else if (kind === 1) {
				const a = of(() => true);
				add({ op: pick(['abs', 'sin', 'cos', 'fract', 'floor', 'ceil', 'sign', 'sqrt', 'exp', 'oneMinus', 'negate', 'saturate']), in: [a] }, types[a]);
			} else if (kind <= 3) {
				const a = of(() => true), b = of((t) => t === types[a] || t === 'float' || types[a] === 'float');
				add({ op: pick(['add', 'sub', 'mul', 'div', 'mod', 'pow', 'min', 'max', 'step']), in: [a, b] }, types[a] === 'float' ? types[b] : types[a]);
			} else if (kind === 4) {
				const a = of((t) => t === 'vec3');
				if (a === null) continue;
				const op = pick(['noise', 'fbm', 'worley', 'normalize', 'length']);
				add({ op, in: [a], ...(op === 'fbm' && { octaves: 1 + Math.floor(r() * 8) }) }, op === 'normalize' ? 'vec3' : 'float');
			} else if (kind === 5) {
				const a = of(() => true), n = SIZE[types[a]];
				const mask = Array.from({ length: 1 + Math.floor(r() * 4) }, () => 'xyzw'[Math.floor(r() * n)]).join('');
				add({ op: 'swizzle', in: [a], mask }, ['float', 'vec2', 'vec3', 'vec4'][mask.length - 1]);
			} else if (kind === 6) {
				const a = of(() => true), b = of((t) => t === types[a] || t === 'float'), c = of((t) => t === 'float');
				if (b === null || c === null) continue;
				add({ op: pick(['mix', 'clamp']), in: [a, b, c] }, types[a]);
			} else if (kind === 7 && !carried && r() < 0.5) {
				const a = of(() => true);
				const body = make(2 + Math.floor(r() * 5), types[a]);
				const last = body.types.length - 1;
				if (body.types[last] !== types[a]) body.nodes.push({ op: 'acc' });
				add({ op: 'loop', in: [a], count: 1 + Math.floor(r() * 16), body: body.nodes }, types[a]);
			} else {
				const a = of((t) => t === 'float'), b = of((t) => t === 'float');
				if (a === null || b === null) continue;
				add({ op: 'join', in: [a, b] }, 'vec2');
			}
		}
		return { nodes, types };
	};
	const { nodes, types } = make(2 + Math.floor(r() * 30));
	const out = {};
	for (const [k, t] of Object.entries(OUTPUTS)) {
		const fit = types.flatMap((x, i) => (x === t || x === 'float' ? [i] : []));
		if (fit.length && r() < 0.5) out[k] = pick(fit);
	}
	if (!Object.keys(out).length) out.opacity = types.indexOf('float') >= 0 ? types.indexOf('float') : (nodes.push({ op: 'time' }), nodes.length - 1);
	const g = { format: 1, nodes, out };
	if (r() < 0.2) {
		const x = pick(g.nodes);
		const k = pick(['op', 'in', 'value', 'mask', 'octaves', 'count', 'code']);
		x[k] = pick([...JUNK, ...NAMES]);
	}
	return g;
}

function randomGraph(r) {
	if (r() < 0.6) return typedGraph(r);
	const pick = (a) => a[Math.floor(r() * a.length)];
	const nodesOf = (n, inLoop, depth) =>
		Array.from({ length: n }, (_, i) => {
			const op = pick(NAMES);
			const spec = OPS[op];
			const x = { op };
			const arity = spec ? (Array.isArray(spec.n) ? spec.n[0] + Math.floor(r() * 3) : spec.n) : Math.floor(r() * 3);
			if (arity || r() < 0.1) x.in = Array.from({ length: arity }, () => (r() < 0.95 ? Math.floor(r() * Math.max(1, i)) : pick(JUNK)));
			if (op === 'float') x.value = r() < 0.9 ? r() * 10 - 5 : pick(JUNK);
			if (op === 'vec2' || op === 'vec3' || op === 'vec4') x.value = Array.from({ length: r() < 0.9 ? Number(op[3]) : 3 }, () => r());
			if (op === 'color') x.value = r() < 0.9 ? Math.floor(r() * 0xffffff) : pick(JUNK);
			if (op === 'swizzle') x.mask = pick(['x', 'y', 'xy', 'xyz', 'zyx', 'w', 'xyzw', 'q', '']);
			if (op === 'fbm') x.octaves = r() < 0.9 ? 1 + Math.floor(r() * 8) : pick(JUNK);
			if (op === 'texture') x.slot = pick([...SLOTS, 'envMap']);
			if (op === 'loop') {
				x.count = r() < 0.9 ? 1 + Math.floor(r() * 16) : pick(JUNK);
				x.body = depth < 3 ? [{ op: 'acc' }, { op: 'index' }, ...nodesOf(1 + Math.floor(r() * 6), true, depth + 1)] : pick(JUNK);
			}
			if (r() < 0.03) x[pick(['code', 'value', 'mask', 'slot', 'body'])] = pick(JUNK);
			return x;
		});
	const nodes = nodesOf(1 + Math.floor(r() * 24), false, 0);
	const out = {};
	for (const k of [...Object.keys(OUTPUTS), 'fragmentNode']) if (r() < 0.3) out[k] = r() < 0.9 ? Math.floor(r() * nodes.length) : pick(JUNK);
	const g = { format: r() < 0.97 ? 1 : pick(JUNK), nodes, out };
	if (r() < 0.3) g.textures = r() < 0.8 ? [pick(SLOTS)] : pick(JUNK);
	return g;
}

/** an independent judge of the invariants every graph let through must hold (written apart from graph.js) */
function holds(g) {
	const walk = (nodes, inLoop, depth) => {
		expect(Array.isArray(nodes)).toBe(true);
		nodes.forEach((x, i) => {
			expect(Object.hasOwn(OPS, x.op)).toBe(true);
			expect(Object.hasOwn(REFUSED, x.op)).toBe(false);
			if (!inLoop) expect(['acc', 'index']).not.toContain(x.op);
			for (const k of x.in ?? []) expect(Number.isInteger(k) && k >= 0 && k < i).toBe(true);
			for (const k of Object.keys(x)) expect(['op', 'in', 'value', 'mask', 'slot', 'octaves', 'count', 'body']).toContain(k);
			if (x.op === 'loop') {
				expect(Number.isInteger(x.count) && x.count >= 1 && x.count <= LIMITS.loop).toBe(true);
				expect(depth).toBeLessThan(LIMITS.loops);
				walk(x.body, true, depth + 1);
			}
			if (x.op === 'fbm') expect(x.octaves >= 1 && x.octaves <= LIMITS.octaves).toBe(true);
			if (x.op === 'texture') expect(g.textures).toContain(x.slot);
			if (x.op === 'color') expect(Number.isInteger(x.value) && x.value >= 0 && x.value <= 0xffffff).toBe(true);
			else for (const v of [x.value].flat()) if (v !== undefined) expect(Number.isFinite(v) && Math.abs(v) <= LIMITS.value).toBe(true);
		});
	};
	walk(g.nodes, false, 0);
	expect(JSON.stringify(g).length).toBeLessThanOrEqual(LIMITS.bytes);
	for (const k of Object.keys(g.out)) expect(Object.hasOwn(OUTPUTS, k)).toBe(true);
}

describe('ten thousand random graphs', () => {
	it('never crash it, and every one let through holds the list', () => {
		const r = rng(0xa5faafad);
		let ok = 0, no = 0;
		for (let n = 0; n < 10_000; n++) {
			const g = randomGraph(r);
			let res;
			expect(() => (res = graphOk(g))).not.toThrow();
			// only GraphErrors: a crash of its own reads 'could not be read'
			if (!res.ok) expect(res.why).not.toBe('the graph could not be read');
			if (res.ok) {
				ok++;
				holds(res.graph);
				// what it let through it lets through again, the same
				expect(checkGraph(res.graph)).toEqual(res.graph);
			} else no++;
		}
		expect(ok + no).toBe(10_000);
		console.log(`fuzz: ${ok} let through, ${no} refused`);
		// both sides are exercised
		expect(ok).toBeGreaterThan(100);
		expect(no).toBeGreaterThan(1000);
	}, 120_000);
	it('every graph made invalid by one change is refused', () => {
		const r = rng(14);
		const breaks = [
			(g) => (g.nodes[0].op = 'storage'),
			(g) => (g.nodes[g.nodes.length - 1].in = [g.nodes.length - 1]),
			(g) => (g.nodes[0].code = 'x'),
			(g) => (g.out.fragmentNode = 0),
			(g) => (g.format = 0),
			(g) => g.nodes.push(...Array.from({ length: LIMITS.nodes }, () => ({ op: 'time' }))),
			(g) => (g.nodes[0] = { op: 'viewportTexture' })
		];
		let n = 0;
		for (let k = 0; k < 10_000 && n < 2000; k++) {
			const res = graphOk(randomGraph(r));
			if (!res.ok) continue;
			const g = structuredClone(res.graph);
			breaks[n % breaks.length](g);
			expect(graphOk(g).ok).toBe(false);
			n++;
		}
		expect(n).toBeGreaterThan(100);
	}, 120_000);
});
