// every kept answer of the census weighed: a build (its card, its triangles, its own build ms, its bytes raw and zstd)
// or a level made lighter (triangles in and out, bytes). Writes JSON lines.
import { deserialize } from 'bun:jsc';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = join(process.env.HOME!, '.cache/maiacity-census/kept');
const out = process.argv[2] ?? 'kept.jsonl';
const files = readdirSync(dir).flatMap((d) => readdirSync(join(dir, d)).map((f) => join(dir, d, f)));
const bytes = (v: any, seen = new Set()): { geo: number; pix: number } => {
	const t = { geo: 0, pix: 0 };
	const walk = (x: any, pix: boolean) => {
		if (!x || typeof x !== 'object' || seen.has(x)) return;
		seen.add(x);
		if (ArrayBuffer.isView(x)) return void (pix ? (t.pix += x.byteLength) : (t.geo += x.byteLength));
		if (x instanceof ArrayBuffer) return void (pix ? (t.pix += x.byteLength) : (t.geo += x.byteLength));
		if (typeof ImageBitmap !== 'undefined' && x instanceof ImageBitmap) return;
		for (const [k, y] of Object.entries(x)) walk(y, pix || k === 'images' || k === 'pixels' || k === 'bitmap');
	};
	walk(v, false);
	return t;
};
const keysOf = (v: any) => (v && typeof v === 'object' ? Object.keys(v).slice(0, 12) : typeof v);
const lines: string[] = [];
const shapes = new Map<string, number>();
for (const f of files) {
	let a: any;
	try {
		a = deserialize(Bun.zstdDecompressSync(readFileSync(f)));
	} catch {
		continue;
	}
	const zstd = statSync(f).size;
	const b = bytes(a);
	if (a?.card && a?.data?.geometries) {
		const g = a.data.geometries;
		let verts = 0;
		for (const x of g) verts += (x.attributes?.position?.array?.length ?? x.attributes?.position?.length ?? 0) / 3;
		lines.push(JSON.stringify({ kind: 'build', group: a.card.group, id: a.card.id, version: a.card.version, ref: a.data.ref, recipe: a.card.recipe, tris: a.data.stats?.tris, geometries: g.length, materials: a.data.materials?.length, images: a.data.images?.length, build_ms: a.ms?.build, bake_ms: a.ms?.bake, geo_bytes: b.geo, pix_bytes: b.pix, zstd, attrs: Object.keys(g[0]?.attributes ?? {}) }));
	} else {
		const k = JSON.stringify(keysOf(a)) + ' ' + JSON.stringify(keysOf(a?.data ?? a?.[0]));
		shapes.set(k, (shapes.get(k) ?? 0) + 1);
		lines.push(JSON.stringify({ kind: 'other', keys: keysOf(a), sub: keysOf(a?.data ?? a?.[0]), geo_bytes: b.geo, pix_bytes: b.pix, zstd }));
	}
}
writeFileSync(out, lines.join('\n') + '\n');
console.log(files.length, 'files;', lines.length, 'answers');
for (const [k, n] of shapes) console.log(n, k);
