/**
 * SANDBOX 6 · THE LAND — what every square metre of a hex is used for, painted on a raster of the village config's
 * `cell` (2 m): the domes and the tower first (under glass, split by what stands inside), then the roads and the
 * footpaths, then the outdoor land by the plan's `land` rules. The areas the page shows are these cells counted, so the
 * map and the numbers always agree.
 */
import { capOf, edgeDistance, hexOf, homeBlock, towards, type Plan, type Road, type Site, type Village } from './geometry';

/** what the land is used for: `inside` uses are under glass; colours for the land-use map */
export const USES = {
	home: { label: 'Homes (the block’s footprint)', inside: true, map: '#e2a33b' },
	garden: { label: 'Food gardens under glass', inside: true, map: '#6fbf3f' },
	pond: { label: 'Fish ponds under glass', inside: true, map: '#3b8fd0' },
	food: { label: 'Food forest under glass', inside: true, map: '#58a838' },
	utilities: { label: 'Utilities and workshops', inside: true, map: '#8a6fc0' },
	works: { label: 'The works', inside: true, map: '#b0563a' },
	civic: { label: 'The village centre', inside: true, map: '#d0607a' },
	tower: { label: 'The tower', inside: true, map: '#5a4fa0' },
	road: { label: 'Roads and paths', map: '#4a4a4a' },
	yard: { label: 'Yards and loading', map: '#9a948a' },
	foodForest: { label: 'Food forest outdoors', map: '#9fd36a' },
	nature: { label: 'Nature: hedges, meadow, wild wood', map: '#7fa86a' },
	woodland: { label: 'Timber woodland', map: '#2f6b3a' },
	bamboo: { label: 'Bamboo groves', map: '#53b88a' },
	hemp: { label: 'Hemp fields', map: '#c8d860' },
	mine: { label: 'Clay, lime and gravel pits', map: '#a07a5a' }
} as const;
export type Use = keyof typeof USES;
export const USE_IDS = Object.keys(USES) as Use[];

/** a site's radius on the ground */
export const footR = (v: Village, s: Site) => v.kinds[s.kind].D / 2;

/** the footpaths: from each of the smallest home domes (the ones out over the south, off the ring) to the nearest road */
export function paths(v: Village, plan: Plan): Road[] {
	const out: Road[] = [];
	const homes = plan.sites.filter((s) => s.use === 'home'), small = Math.min(...homes.map((s) => v.kinds[s.kind].D));
	for (const s of homes) {
		if (v.kinds[s.kind].D > small) continue;
		let best = { d: Infinity, x: 0, z: 0 };
		for (const w of plan.roads)
			for (let k = 1; k < w.pts.length; k++) {
				const [ax, az] = w.pts[k - 1], [bx, bz] = w.pts[k];
				const dx = bx - ax, dz = bz - az;
				const t = Math.max(0, Math.min(1, ((s.x - ax) * dx + (s.z - az) * dz) / (dx * dx + dz * dz)));
				const x = ax + t * dx, z = az + t * dz, d = Math.hypot(s.x - x, s.z - z);
				if (d < best.d) best = { d, x, z };
			}
		const door = towards(s, best), r = footR(v, s), a = (door * Math.PI) / 180;
		out.push({ pts: [[best.x, best.z], [s.x + r * Math.sin(a), s.z - r * Math.cos(a)]], w: 3 });
	}
	return out;
}

/** under a site's glass: a home's block, its pond to the north and its garden; a 120's pond band to the north */
function inside(v: Village, s: Site, dx: number, dz: number): Use {
	const K = v.kinds[s.kind];
	if (s.use === 'home' && K.home) {
		const b = homeBlock(K.D, K.home), half = b.levels[0]?.half ?? 0;
		if (-dz >= b.front && -dz <= b.back && Math.abs(dx) <= half) return 'home';
		if (-dz >= b.back + 1 && Math.hypot(dx, dz) <= K.D / 2 - 1.5) return 'pond';
		return 'garden';
	}
	if (s.use === 'food' || s.use === 'utilities') {
		const a = capOf(K.D).a, r = Math.hypot(dx, dz), P = K.pond;
		// the heat store: a band along the north, `in` from the glass, `band` wide, `half` (radians) either side of north
		if (P && dz < 0 && r < a - P.in && r > a - P.in - P.band && Math.atan2(Math.abs(dx), -dz) < P.half) return 'pond';
		return s.use === 'food' ? 'food' : dz > 16 ? 'food' : 'utilities';
	}
	return s.use as Use;
}

function outdoors(v: Village, plan: Plan, x: number, z: number, edge: number): Use {
	const L = plan.land as any;
	if (edge < L.hedge) return 'nature';
	if (plan.floors) {
		const r = Math.hypot(x - plan.ring.x, z - plan.ring.z);
		if (r < plan.ring.r + L.yard) return 'yard';
		for (const s of plan.sites) if (s.use === 'works' && Math.hypot(x - s.x, z - s.z) <= footR(v, s) + L.yardRound) return 'yard';
		if (r < plan.ring.r + L.nature) return 'nature';
		for (const s of plan.sites) if (s.use === 'civic' && Math.hypot(x - s.x, z - s.z) <= footR(v, s) + L.yardRound) return 'nature';
		const b = ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
		return (L.sectors as { to: number; use: Use }[]).find((q) => b < q.to)!.use;
	}
	for (const s of plan.sites) if (s.use === 'home' && Math.hypot(x - s.x, z - s.z) < footR(v, s) + L.garden) return L.rest;
	if (Math.hypot(x - plan.ring.x, z - plan.ring.z) < plan.ring.r) return L.inRing;
	return L.rest;
}

const onRoad = (roads: Road[], x: number, z: number) =>
	roads.some(({ pts, w }) => {
		for (let k = 1; k < pts.length; k++) {
			const [ax, az] = pts[k - 1], [bx, bz] = pts[k], dx = bx - ax, dz = bz - az;
			const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
			if (Math.hypot(x - ax - t * dx, z - az - t * dz) <= w / 2) return true;
		}
		return false;
	});

/**
 * A hex's land, cell by cell: each cell's use (an index into USE_IDS, 255 outside the hex), and the area of each
 * use, m², every cell counted.
 */
export function landOf(v: Village, key: string) {
	const plan = v.plans[key], H = hexOf(v.hex.flats), C = v.cell;
	const nx = Math.ceil(H.w / C), nz = Math.ceil((2 * H.s) / C);
	const x0 = -(nx * C) / 2, z0 = -(nz * C) / 2;
	const cells = new Uint8Array(nx * nz).fill(255);
	const roads = [...plan.roads, ...paths(v, plan)];
	const index = Object.fromEntries(USE_IDS.map((u, k) => [u, k])) as Record<Use, number>;
	const m2 = Object.fromEntries(USE_IDS.map((u) => [u, 0])) as Record<Use, number>;
	for (let j = 0; j < nz; j++)
		for (let i = 0; i < nx; i++) {
			const x = x0 + (i + 0.5) * C, z = z0 + (j + 0.5) * C;
			const edge = edgeDistance(H.w, x, z);
			if (edge < 0) continue;
			let use: Use | '' = '';
			for (const s of plan.sites)
				if (Math.hypot(x - s.x, z - s.z) <= footR(v, s)) {
					use = inside(v, s, x - s.x, z - s.z);
					break;
				}
			if (!use && (Math.abs(Math.hypot(x - plan.ring.x, z - plan.ring.z) - plan.ring.r) <= plan.ring.w / 2 || onRoad(roads, x, z))) use = 'road';
			if (!use) use = outdoors(v, plan, x, z, edge);
			cells[j * nx + i] = index[use];
			m2[use] += C * C;
		}
	return { nx, nz, x0, z0, cell: C, cells, m2, area: Object.values(m2).reduce((a, b) => a + b, 0) };
}
