/**
 * SANDBOX 6 · THE GEOMETRY — the shapes the village is made of, as maths: the hex, a glazed cap, a home block under its
 * shell, the tower's profile and storeys. Every size comes in from the village config (its layout document's `village`,
 * play/SPEC.md §4.6); nothing here is a number of the village's own. x runs east, z south (north is −z), in metres.
 */

export type Kind = { D: number; freq?: number; home?: HomeShape; pond?: { in: number; band: number; half: number }; H?: number; top?: number; storey?: number; core?: number; facade?: number };
export type HomeShape = { front: number; depth: number; storey: number; clear: number; balcony: number };
export type Site = { id: string; kind: string; x: number; z: number; use: string; name: string; door: number };
export type Road = { pts: [number, number][]; w: number };
export type Ring = { x: number; z: number; r: number; w: number };
export type Plan = { label: string; ring: Ring; sites: Site[]; roads: Road[]; land: Record<string, unknown>; programme?: unknown[]; programmeNote?: string };
export type Village = {
	hex: { flats: number; source?: string };
	cell: number;
	kinds: Record<string, Kind>;
	plans: Record<string, Plan>;
	hexes: { key: string; plan: string; label: string; x: number; z: number }[];
};

/** a hex `w` across its flats: its side (centre to corner) and its area, m² */
export const hexOf = (w: number) => ({ w, s: w / Math.sqrt(3), area: (Math.sqrt(3) / 2) * w * w });

/** how far a point (relative to a pointy north-south hex's middle) is inside its edge, m (negative outside) */
export function edgeDistance(w: number, x: number, z: number) {
	const s = w / Math.sqrt(3), ax = Math.abs(x), az = Math.abs(z);
	return Math.min(w / 2 - ax, (s - ax / Math.sqrt(3) - az) * (Math.sqrt(3) / 2));
}

/** the six corners of a hex round (cx, cz), north first */
export const corners = (w: number, cx = 0, cz = 0): [number, number][] =>
	Array.from({ length: 6 }, (_, k) => {
		const a = (k * Math.PI) / 3, s = w / Math.sqrt(3);
		return [cx + s * Math.sin(a), cz - s * Math.cos(a)];
	});

/** a point at a compass bearing (degrees, 0 north, 90 east) and distance from (cx, cz) */
export const bearing = (deg: number, r: number, cx = 0, cz = 0) => {
	const a = (deg * Math.PI) / 180;
	return { x: cx + r * Math.sin(a), z: cz - r * Math.cos(a) };
};
/** the bearing from one point to another, degrees */
export const towards = (a: { x: number; z: number }, b: { x: number; z: number }) => ((Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI + 360) % 360;

/** A glazed cap `D` across, a third as high (Samuel's domes): its sphere, floor, shell, volume and rim. */
export function capOf(D: number) {
	const a = D / 2, h = D / 3, R = (a * a + h * h) / (2 * h);
	return { D, a, h, R, floor: Math.PI * a * a, shell: 2 * Math.PI * R * h, volume: (Math.PI * h * h * (3 * R - h)) / 3, rim: Math.PI * D };
}
/** the height of a cap's shell over the floor, `r` from its middle */
export const capHeight = (c: ReturnType<typeof capOf>, r: number) => Math.max(0, Math.sqrt(Math.max(0, c.R * c.R - r * r)) - (c.R - c.h));

/**
 * A home dome's block (Samuel 2026-10-08): one straight block across the north of the dome, east to west, its long face
 * south over the dome's food garden. Each storey runs as far east and west as the shell lets it at its back corners
 * (`clear` over its ceiling), so it narrows storey by storey; a storey under 6 m long is left out. The fish pond fills
 * the floor between the block and the north rim.
 */
export function homeBlock(D: number, o: HomeShape) {
	const c = capOf(D), back = o.front + o.depth;
	const levels: { k: number; y: number; half: number; m2: number }[] = [];
	// up storey by storey until the shell leaves no 6 m of floor (it always does: the cap closes)
	for (let k = 0; ; k++) {
		const y = k * o.storey;
		const r2 = c.R * c.R - (y + o.storey + o.clear + c.R - c.h) ** 2;
		const half = Math.sqrt(Math.max(0, r2 - back * back));
		if (2 * half < 6) break;
		levels.push({ k, y, half, m2: 2 * half * o.depth });
	}
	const gfa = levels.reduce((a, l) => a + l.m2, 0);
	const pr = c.a - 1.5, ph = back + 1;
	const pond = ph < pr ? pr * pr * Math.acos(ph / pr) - ph * Math.sqrt(pr * pr - ph * ph) : 0;
	const top = levels[levels.length - 1];
	return { levels, storeys: levels.length, gfa, footprint: levels.length ? 2 * levels[0].half * o.depth : 0, pond, front: o.front, back, height: top ? top.y + o.storey : 0 };
}

/** the radius of the tower's shell at a height: the settlers game's tower profile, at full size */
export function towerRadius(T: Kind, y: number) {
	const H = T.H!, top = T.top!, R = T.D / 2;
	if (y >= H - top) return Math.sqrt(Math.max(0, top * top - (y - (H - top)) ** 2));
	const t = Math.min(1, Math.max(0, y / (H - top)));
	return Math.min(R, top + (R - top) * Math.pow(1 - t, 2.2) * (1 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 2.2))));
}
/** the tower's profile from foot to top, for a lathe */
export function towerProfile(T: Kind, n = 64): [number, number][] {
	const H = T.H!, top = T.top!;
	const pts: [number, number][] = [];
	for (let k = 0; k <= n; k++) pts.push([towerRadius(T, (k / n) * (H - top)), (k / n) * (H - top)]);
	for (let k = 1; k <= 8; k++) {
		const a = (k / 8) * (Math.PI / 2);
		pts.push([Math.max(0.01, top * Math.cos(a)), H - top + top * Math.sin(a)]);
	}
	return pts;
}
/** the tower's storeys: each one's floor, the shell's radius at its ceiling less the façade's stand-off, the core out */
export function towerStoreys(T: Kind) {
	const out: { k: number; y: number; r: number; m2: number }[] = [];
	for (let k = 0; ; k++) {
		const y = k * T.storey!;
		if (y + T.storey! > T.H!) break;
		const r = towerRadius(T, y + T.storey!) - T.facade!;
		if (r <= T.core! + 3) break;
		out.push({ k, y, r, m2: Math.PI * (r * r - T.core! * T.core!) });
	}
	return out;
}
