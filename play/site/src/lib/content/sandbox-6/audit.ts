/**
 * SANDBOX 6 · THE AUDIT — every number the page shows, worked out from the village config (the layout, Samuel's
 * design) and the audit config (each input with its source, a dated decision or an estimate and why): beds, floor
 * areas, the land, the tower sized from its programme, and what it costs, split into the village's part and each coop's.
 * A number whose input is not yet audited comes back as `null`, and the page shows it as unaudited.
 */
import { capOf, homeBlock, towerStoreys, type Kind, type Village } from './geometry';
import { landOf, paths, USE_IDS, type Use as LandUse } from './land';

export type Input = { label: string; unit: string; value: number | null; source?: string; decided?: string; estimate?: string; pending?: string };
/** low, typical, high */
export type Range = [number, number, number];
/** what a cost line is counted in: a dome size's shell m² or foundation rings, the home blocks' or the tower's gross floor, the land's ha, the roads' or the paths' km, an input's value (× `per`), every building, the beds, the hexes, or one */
type Qty = { shell?: number; ring?: number; homeGfa?: true; towerGfa?: true; land?: true; roads?: 'road' | 'path'; input?: string; per?: number; count?: 'buildings'; beds?: true; hexes?: true; each?: number };
export type Cost = { id: string; label: string; payer: 'village' | 'coop'; coop?: string; qty: Qty; contractor: Range; self: Range; unit: string; basis: string; source: string; estimate?: boolean; note?: string };
export type Audit = { inputs: Record<string, Input>; split: { village: string[]; coop: string[] }; costs: Cost[]; research?: { note: string; by: string }; old: Record<string, number | string> };

/** how an input is known: sourced, decided, estimated, or not yet */
export const standing = (i: Input) => (i.value === null ? 'pending' : i.source ? 'sourced' : i.decided ? 'decided' : i.estimate ? 'estimate' : 'unknown');
/** an input's value, or null while it is not audited */
const val = (a: Audit, key: string) => {
	const i = a.inputs[key];
	return i && standing(i) !== 'pending' && standing(i) !== 'unknown' ? i.value : null;
};

/** the gross floor a resident takes: the living space a person has, times the building's gross to its living space */
export function gfaPerson(a: Audit) {
	const net = val(a, 'livingPerson'), k = val(a, 'grossFactor');
	return net !== null && k !== null ? net * k : null;
}

/** the homes of one home dome: its block's storeys and floor, and the beds that floor holds */
function homesOf(v: Village, a: Audit, kind: string) {
	const K = v.kinds[kind], b = homeBlock(K.D, K.home!), gfa = gfaPerson(a);
	return { kind, storeys: b.storeys, gfa: b.gfa, beds: gfa ? Math.floor(b.gfa / gfa) : null };
}

/** what one use of the tower needs, m²: its share a resident × the residents, or a count × its size */
export type Use = { id: string; label: string; use: 'communal' | 'commercial' | 'tourist' | 'factory'; perResident?: string; count?: string; size?: string };

/** a tower of the old bell's shape scaled by `k` (its foot, height and dome top; storeys stay their height) */
export const scaled = (T: Kind, k: number): Kind => ({ ...T, D: T.D * k, H: T.H! * k, top: T.top! * k });

/**
 * The tower sized from what the village needs: its programme's floor (each use's need) over the share of a storey that
 * is usable (the rest core, stairs and walls), then the bell scaled until its storeys hold that much.
 */
function towerOf(v: Village, a: Audit, residents: number | null) {
	const T = v.kinds.tower180, programme = (v.plans.tower.programme ?? []) as Use[];
	const need = programme.map((u) => {
		const per = u.perResident ? val(a, u.perResident) : null, n = u.count ? val(a, u.count) : null, size = u.size ? val(a, u.size) : null;
		// a share a resident (times its size, where it is counted in things a resident: desks), or a count of things times their size
		const m2 = u.perResident ? (per !== null && residents !== null && (!u.size || size !== null) ? per * residents * (u.size ? size! : 1) : null) : n !== null && size !== null ? n * size : null;
		return { ...u, m2, rooms: u.count && n !== null ? n : null };
	});
	const net = need.every((u) => u.m2 !== null) ? need.reduce((x, u) => x + u.m2!, 0) : null;
	const usable = val(a, 'usableShare');
	const gfa = net !== null && usable ? net / usable : null;
	const full = towerStoreys(T).reduce((x, s) => x + s.m2, 0);
	if (gfa === null) return { need, net, gfa: null, k: null, shape: null, storeys: null, full };
	// floor grows roughly with the cube of the size: start there, then bisect to the storeys that hold it
	let lo = 0.1, hi = 1;
	for (let i = 0; i < 40; i++) {
		const k = (lo + hi) / 2, m2 = towerStoreys(scaled(T, k)).reduce((x, s) => x + s.m2, 0);
		(m2 < gfa ? (lo = k) : (hi = k));
	}
	const shape = scaled(T, hi), storeys = towerStoreys(shape);
	return { need, net, gfa, k: hi, shape, storeys, full };
}

/** the sites of every hex, each with the hex it stands in and the group it is costed in */
function sitesOf(v: Village) {
	return v.hexes.flatMap((h) =>
		v.plans[h.plan].sites.map((s) => ({ ...s, hex: h.key, D: v.kinds[s.kind].D, group: s.kind === 'tower180' ? 'the tower' : s.use === 'works' ? 'works' : s.use === 'civic' ? 'village centre' : `Dome${v.kinds[s.kind].D}` }))
	);
}

const sum3 = (xs: Range[]): Range => [0, 1, 2].map((i) => xs.reduce((s, x) => s + x[i], 0)) as Range;
const times = (r: Range, n: number): Range => [r[0] * n, r[1] * n, r[2] * n];

/** everything the page shows, for the village as a whole and each kind of hex */
export function auditOf(v: Village, a: Audit) {
	const homeKinds = [...new Set(v.plans.living.sites.filter((s) => s.use === 'home').map((s) => s.kind))];
	const homes = Object.fromEntries(homeKinds.map((k) => [k, homesOf(v, a, k)]));
	const livingHexes = v.hexes.filter((h) => h.plan === 'living').length;
	const bedsHex = homeKinds.every((k) => homes[k].beds !== null) ? homeKinds.reduce((n, k) => n + homes[k].beds! * v.plans.living.sites.filter((s) => s.use === 'home' && s.kind === k).length, 0) : null;
	const bedsVillage = bedsHex === null ? null : bedsHex * livingHexes;
	const tower = towerOf(v, a, bedsVillage);
	// the village as it stands with its tower sized: the land and the drawing take the tower at that size
	const sized: Village = tower.shape ? { ...v, kinds: { ...v.kinds, tower180: tower.shape } } : v;
	const land = Object.fromEntries(Object.keys(v.plans).map((k) => [k, landOf(sized, k).m2])) as Record<string, Record<LandUse, number>>;
	const villageLand = Object.fromEntries(USE_IDS.map((u) => [u, v.hexes.reduce((s, h) => s + land[h.plan][u], 0)])) as Record<LandUse, number>;
	const hexArea = (Math.sqrt(3) / 2) * v.hex.flats ** 2;
	const sites = sitesOf(v);

	// each cost line, by where it stands: its quantity a hex (or the village's, for what serves it all) and its group
	type Part = { hex: string; group: string; n: number };
	const roadKm = (plan: string, kind: 'road' | 'path') => {
		const p = v.plans[plan], ways = kind === 'road' ? p.roads : paths(v, p);
		const len = ways.reduce((s, r) => s + r.pts.slice(1).reduce((x, q, i) => x + Math.hypot(q[0] - r.pts[i][0], q[1] - r.pts[i][1]), 0), 0);
		return (len + (kind === 'road' ? 2 * Math.PI * p.ring.r : 0)) / 1000;
	};
	const partsOf = (c: Cost): Part[] | null => {
		const q = c.qty;
		if (q.shell) return sites.filter((s) => s.D === q.shell && s.kind !== 'tower180').map((s) => ({ hex: s.hex, group: s.group, n: capOf(q.shell!).shell }));
		if (q.ring) return sites.filter((s) => s.D === q.ring && s.kind !== 'tower180').map((s) => ({ hex: s.hex, group: s.group, n: 1 }));
		if (q.homeGfa) return sites.filter((s) => s.use === 'home').map((s) => ({ hex: s.hex, group: s.group, n: homes[s.kind].gfa }));
		if (q.towerGfa) return tower.gfa === null ? null : [{ hex: 'centre', group: 'the tower', n: tower.gfa }];
		if (q.land) return v.hexes.map((h) => ({ hex: h.key, group: 'land', n: hexArea / 1e4 }));
		if (q.roads) return v.hexes.map((h) => ({ hex: h.key, group: 'roads and lines', n: roadKm(h.plan, q.roads!) }));
		if (q.hexes) return v.hexes.map((h) => ({ hex: h.key, group: 'roads and lines', n: 1 }));
		if (q.count === 'buildings') return sites.map((s) => ({ hex: s.hex, group: 'roads and lines', n: 1 }));
		if (q.beds) return bedsVillage === null ? null : [{ hex: 'village', group: 'roads and lines', n: bedsVillage }];
		if (q.input) {
			const x = val(a, q.input);
			return x === null ? null : [{ hex: 'village', group: c.payer === 'coop' ? c.coop! : 'roads and lines', n: x * (q.per ?? 1) }];
		}
		return [{ hex: 'village', group: c.payer === 'coop' ? c.coop! : 'roads and lines', n: q.each ?? 1 }];
	};
	const costs = a.costs.map((c) => {
		const parts = partsOf(c);
		const n = parts ? parts.reduce((s, p) => s + p.n, 0) : null;
		const self = n === null ? null : times(c.self, n), contractor = n === null ? null : times(c.contractor, n);
		const labour = self && contractor ? ([0, 1, 2].map((i) => contractor[i] - self[i]) as Range) : null;
		return { ...c, parts, n, self, contractorEur: contractor, labour };
	});
	type Line = (typeof costs)[number];
	/** the lines' self-built cost, contractor price and labour summed: null if any line is not audited */
	const total = (lines: Line[], share?: (l: Line) => number) => {
		if (!lines.length || lines.some((l) => l.n === null)) return null;
		const f = share ?? (() => 1);
		return { self: sum3(lines.map((l) => times(l.self!, f(l)))), contractor: sum3(lines.map((l) => times(l.contractorEur!, f(l)))), labour: sum3(lines.map((l) => times(l.labour!, f(l)))) };
	};
	const villageLines = costs.filter((c) => c.payer === 'village');
	/** the village's part split by a key of each line's parts (its hex, or its group) */
	const split = (key: 'hex' | 'group') => {
		if (villageLines.some((l) => !l.parts)) return null;
		const keys = [...new Set(villageLines.flatMap((l) => l.parts!.map((p) => p[key])))];
		return Object.fromEntries(keys.map((k) => [k, total(villageLines.filter((l) => l.parts!.some((p) => p[key] === k)), (l) => l.parts!.filter((p) => p[key] === k).reduce((s, p) => s + p.n, 0) / l.n!)]));
	};
	const village = total(villageLines), budget = val(a, 'budget');
	const coops = [...new Set(costs.filter((c) => c.payer === 'coop').map((c) => c.coop!))].map((coop) => ({ coop, lines: costs.filter((c) => c.coop === coop), total: total(costs.filter((c) => c.coop === coop)) }));
	const rate = a.costs.find((c) => c.qty.towerGfa);
	return {
		gfaPerson: gfaPerson(a),
		homes,
		bedsHex,
		bedsVillage,
		livingHexes,
		land,
		villageLand,
		hexArea,
		tower,
		sized,
		costs,
		cost: {
			village,
			byHex: split('hex'),
			byGroup: split('group'),
			coops,
			budget,
			/** what the village's part, self-built and typical, leaves of the budget (negative: the gap) */
			headroom: village && budget !== null ? budget - village.self[1] : null,
			/** the tower as sized against the old 180 m shape's floor, at the tall-building rate */
			towerSaving: rate && tower.gfa !== null ? times(rate.contractor, tower.full - tower.gfa) : null
		}
	};
}
