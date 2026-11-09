/**
 * SANDBOX 7 · THE MAPS — land, what grows, sea depth and mountains: four play files named by hash in the planet config,
 * one grid format (equirectangular `width` × `height` from 90° N and 180° W, rows run-length encoded `<letter><run>…`,
 * each letter a value in `codes`). One decoder reads all four; a card asks with its centre's unit vector.
 */
export type Vec3 = readonly [number, number, number] | number[];
export type Value = string | number;
export type GridFile = { width: number; height: number; codes: Record<string, Value>; rows: string[]; source?: string; licence?: string };

export type Grid = {
	width: number;
	height: number;
	/** the value at a cell: x wraps round the planet, y wraps as the old maps did */
	at: (x: number, y: number) => Value;
	cellOf: (p: Vec3) => [number, number];
	sample: (p: Vec3) => Value;
	/**
	 * The value at a point, or where it is not one `want`s, the first nearby that is out to `radius` cells, on a `ring`
	 * or a `square`, ring by ring; undefined where none is (two maps drawing a coast differently meet here).
	 */
	near: (p: Vec3, want: (v: Value) => boolean, radius: number, shape: 'ring' | 'square') => Value | undefined;
};

/** latitude and longitude of a unit vector, in degrees */
export function latLonOf(p: Vec3): [number, number] {
	const lat = (Math.asin(Math.max(-1, Math.min(1, p[1]!))) * 180) / Math.PI;
	const lon = (Math.atan2(p[0]!, p[2]!) * 180) / Math.PI;
	return [lat, lon];
}

/** the unit vector at a latitude and longitude, in degrees (the inverse of latLonOf) */
export function unitAt(lat: number, lon: number): [number, number, number] {
	const a = (lat * Math.PI) / 180, b = (lon * Math.PI) / 180;
	return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

function decodeGrid(file: GridFile): Grid {
	const { width: w, height: h } = file;
	const letters = Object.keys(file.codes);
	const values = letters.map((l) => file.codes[l]!);
	const index = new Map(letters.map((l, i) => [l, i]));
	const grid = new Uint8Array(w * h);
	file.rows.forEach((row, y) => {
		let x = 0;
		for (const m of row.matchAll(/([A-Z.])(\d+)/g)) {
			const n = Number(m[2]);
			const i = index.get(m[1]!);
			if (i === undefined) throw new Error(`a map's row ${y} names ${m[1]}, which its codes do not`);
			grid.fill(i, y * w + x, y * w + x + n);
			x += n;
		}
		if (x !== w) throw new Error(`a map's row ${y} runs ${x} cells, not ${w}`);
	});
	if (file.rows.length !== h) throw new Error(`a map has ${file.rows.length} rows, not ${h}`);
	const at = (x: number, y: number) => values[grid[((y + h) % h) * w + ((x % w) + w) % w]!]!;
	const cellOf = (p: Vec3): [number, number] => {
		const [lat, lon] = latLonOf(p);
		return [((Math.floor(((lon + 180) / 360) * w) % w) + w) % w, Math.max(0, Math.min(h - 1, Math.floor(((90 - lat) / 180) * h)))];
	};
	return {
		width: w,
		height: h,
		at,
		cellOf,
		sample: (p) => at(...cellOf(p)),
		near(p, want, radius, shape) {
			const [x, y] = cellOf(p);
			const here = at(x, y);
			if (want(here)) return here;
			for (let r = 1; r <= radius; r++)
				for (let dy = -r; dy <= r; dy++)
					for (let dx = -r; dx <= r; dx++) {
						if (shape === 'ring' && Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
						const v = at(x + dx, y + dy);
						if (want(v)) return v;
					}
			return undefined;
		}
	};
}

/** The planet's four maps, as the globe asks them (./globe.ts GlobeMaps) */
export type PlanetMaps = { land: GridFile; biomes: GridFile; depth: GridFile; mountains: GridFile };

/** the land kinds the Köppen map folds the climates into */
export type LandKind = 'water' | 'grass' | 'earth' | 'forest' | 'taiga' | 'snow' | 'sand';

export function mapsOf(files: PlanetMaps) {
	const land = decodeGrid(files.land), kinds = decodeGrid(files.biomes), depth = decodeGrid(files.depth), mountains = decodeGrid(files.mountains);
	return {
		isLand: (p: Vec3) => land.sample(p) === 'land',
		/** what kind of land a point is; at a coast the climate grid draws as sea, the nearest land it knows (3 cells round) */
		kindOf: (p: Vec3) => (kinds.near(p, (v) => v !== 'water', 3, 'ring') ?? 'water') as LandKind,
		isMountain: (p: Vec3) => mountains.sample(p) === 'mountain',
		/** how deep the sea is: its layer, 0 (the shelf) to 11; at a coast the nearest sea the grid knows (2 cells round), else the shelf */
		depthOf: (p: Vec3) => (depth.near(p, (v) => (v as number) >= 0, 2, 'square') ?? 0) as number
	};
}
