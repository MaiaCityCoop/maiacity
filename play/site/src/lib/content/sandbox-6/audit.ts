/**
 * SANDBOX 6 · THE AUDIT — every number the page shows, worked out from the village config (the layout, Samuel's
 * design) and the audit config (each input with its source, a dated decision or an estimate and why): beds, floor
 * areas, the land, the tower's floors and rooms, and what it costs, split into the village's part and each coop's.
 * A number whose input is not yet audited comes back as `null`, and the page shows it as unaudited.
 */
import { homeBlock, towerStoreys, type Village } from './geometry';
import { landOf, USE_IDS, type Use } from './land';

export type Input = { label: string; unit: string; value: number | null; source?: string; decided?: string; estimate?: string; pending?: string; low?: number; high?: number };
export type Cost = { id: string; label: string; payer: 'village' | 'coop'; coop?: string; kind: string; per: 'each' | 'm2' | 'ha' | 'm'; input: string };
export type Audit = { inputs: Record<string, Input>; split: { village: string[]; coop: string[] }; costs: Cost[]; costsPending?: string; old: Record<string, number | string> };

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
export function homesOf(v: Village, a: Audit, kind: string) {
	const K = v.kinds[kind], b = homeBlock(K.D, K.home!), gfa = gfaPerson(a);
	return { kind, storeys: b.storeys, gfa: b.gfa, beds: gfa ? Math.floor(b.gfa / gfa) : null };
}

/** a hex's sites counted by kind and use */
const count = (v: Village, plan: string, pick: (s: Village['plans'][string]['sites'][number]) => boolean) => v.plans[plan].sites.filter(pick).length;

/** everything the page shows, for the village as a whole and each kind of hex */
export function auditOf(v: Village, a: Audit) {
	const homeKinds = [...new Set(v.plans.living.sites.filter((s) => s.use === 'home').map((s) => s.kind))];
	const homes = Object.fromEntries(homeKinds.map((k) => [k, homesOf(v, a, k)]));
	const bedsHex = homeKinds.every((k) => homes[k].beds !== null) ? homeKinds.reduce((n, k) => n + homes[k].beds! * count(v, 'living', (s) => s.use === 'home' && s.kind === k), 0) : null;
	const livingHexes = v.hexes.filter((h) => h.plan === 'living').length;
	const land = Object.fromEntries(Object.keys(v.plans).map((k) => [k, landOf(v, k).m2])) as Record<string, Record<Use, number>>;
	// the village's land by use, every hex counted
	const villageLand = Object.fromEntries(USE_IDS.map((u) => [u, v.hexes.reduce((s, h) => s + land[h.plan][u], 0)])) as Record<Use, number>;
	// the tower: its storeys, floors by use, and the rooms its tourist floors hold
	const T = v.kinds.tower180, storeys = towerStoreys(T), floors = v.plans.tower.floors ?? [];
	const towerFloors = floors.map((f) => ({ ...f, m2: storeys.filter((s) => s.k >= f.from && s.k < f.to).reduce((x, s) => x + s.m2, 0) }));
	const room = val(a, 'hotelRoom');
	const hotel = towerFloors.filter((f) => /hotel|short stay/i.test(f.name)).reduce((x, f) => x + f.m2, 0);
	// cost: each line its kind's count × its unit cost; a line without an audited unit cost is unaudited
	const quantity = (c: Cost) => {
		if (c.per === 'each') return v.hexes.reduce((n, h) => n + v.plans[h.plan].sites.filter((s) => s.kind === c.kind || s.use === c.kind).length, 0);
		if (c.per === 'ha') return (v.hexes.length * ((Math.sqrt(3) / 2) * v.hex.flats ** 2)) / 1e4;
		return null;
	};
	const costs = a.costs.map((c) => {
		const unit = val(a, c.input), n = quantity(c);
		return { ...c, unit, n, eur: unit !== null && n !== null ? unit * n : null };
	});
	const sum = (payer: 'village' | 'coop') => {
		const lines = costs.filter((c) => c.payer === payer);
		return lines.length && lines.every((c) => c.eur !== null) ? lines.reduce((x, c) => x + c.eur!, 0) : null;
	};
	const village = sum('village'), budget = val(a, 'budget');
	return {
		gfaPerson: gfaPerson(a),
		homes,
		bedsHex,
		bedsVillage: bedsHex === null ? null : bedsHex * livingHexes,
		bedsPlanned: val(a, 'bedsHex'),
		livingHexes,
		land,
		villageLand,
		hexArea: (Math.sqrt(3) / 2) * v.hex.flats ** 2,
		tower: { storeys: storeys.length, gfa: storeys.reduce((x, s) => x + s.m2, 0), floors: towerFloors, rooms: room ? Math.floor(hotel / room) : null },
		costs,
		cost: { village, coop: sum('coop'), budget, headroom: village !== null && budget !== null ? budget - village : null, pending: !a.costs.length ? a.costsPending ?? 'No cost is audited yet.' : null }
	};
}
