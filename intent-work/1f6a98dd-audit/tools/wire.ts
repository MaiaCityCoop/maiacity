// what ready shapes would weigh down the wire: each kept build's geometry quantized (positions 16 bit in its box,
// normals 8 bit, uv 16 bit, colour 8 bit), packed by meshoptimizer's vertex and index codecs, then zstd.
import { deserialize } from 'bun:jsc';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MeshoptEncoder } from '/home/user/maiacity/play/site/node_modules/meshoptimizer/meshopt_encoder.js';
await MeshoptEncoder.ready;
const dir = join(process.env.HOME!, '.cache/maiacity-census/kept');
const files = readdirSync(dir).flatMap((d) => readdirSync(join(dir, d)).map((f) => join(dir, d, f)));
const arr = (a: any) => (a?.array ?? a) as any;
const lines: string[] = [];
let shown = 0;
for (const f of files) {
	let a: any;
	try { a = deserialize(Bun.zstdDecompressSync(readFileSync(f))); } catch { continue; }
	if (!(a?.card && a?.data?.geometries)) continue;
	let raw = 0, packed = 0, tris = 0, verts = 0;
	const parts: Uint8Array[] = [];
	for (const g of a.data.geometries) {
		const pos = arr(g.attributes.position);
		if (!pos?.length) continue;
		if (!shown++) console.error('attribute shape:', JSON.stringify(Object.fromEntries(Object.entries(g.attributes).map(([k, v]: any) => [k, v?.array ? { ctor: v.array.constructor.name, itemSize: v.itemSize } : v?.constructor?.name]))));
		const n = pos.length / 3; verts += n;
		const idx = g.index ? arr(g.index) : null;
		const nor = arr(g.attributes.normal), uv = arr(g.attributes.uv), col = arr(g.attributes.color);
		const colSize = col ? col.length / n : 0;
		raw += pos.byteLength + (nor?.byteLength ?? 0) + (uv?.byteLength ?? 0) + (col?.byteLength ?? 0) + (idx?.byteLength ?? 0);
		let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
		for (let i = 0; i < pos.length; i++) { const c = i % 3; if (pos[i] < lo[c]) lo[c] = pos[i]; if (pos[i] > hi[c]) hi[c] = pos[i]; }
		const stride = 16; // pos 3×u16 + pad u16, normal 3×i8 + pad, uv 2×u16
		const stride2 = col ? 4 : 0;
		const vb = new Uint8Array(n * stride), dv = new DataView(vb.buffer);
		const cb = new Uint8Array(n * 4);
		let uvlo = [Infinity, Infinity], uvhi = [-Infinity, -Infinity];
		if (uv) for (let i = 0; i < uv.length; i++) { const c = i % 2; if (uv[i] < uvlo[c]) uvlo[c] = uv[i]; if (uv[i] > uvhi[c]) uvhi[c] = uv[i]; }
		for (let i = 0; i < n; i++) {
			for (let c = 0; c < 3; c++) dv.setUint16(i * stride + c * 2, Math.round(((pos[i * 3 + c] - lo[c]) / (hi[c] - lo[c] || 1)) * 65535), true);
			if (nor) for (let c = 0; c < 3; c++) dv.setInt8(i * stride + 8 + c, Math.round(nor[i * 3 + c] * 127));
			if (uv) for (let c = 0; c < 2; c++) dv.setUint16(i * stride + 12 + c * 2, Math.round(((uv[i * 2 + c] - uvlo[c]) / (uvhi[c] - uvlo[c] || 1)) * 65535), true);
			if (col) for (let c = 0; c < Math.min(4, colSize); c++) cb[i * 4 + c] = Math.max(0, Math.min(255, Math.round(col[i * colSize + c] * (col instanceof Float32Array ? 255 : 1))));
		}
		parts.push(MeshoptEncoder.encodeVertexBuffer(vb, n, stride));
		if (col) parts.push(MeshoptEncoder.encodeVertexBuffer(cb, n, 4));
		if (idx) {
			const i32 = idx instanceof Uint32Array ? idx : Uint32Array.from(idx);
			tris += i32.length / 3;
			parts.push(i32.length % 3 === 0 ? MeshoptEncoder.encodeIndexBuffer(new Uint8Array(i32.buffer, i32.byteOffset, i32.byteLength), i32.length, 4) : new Uint8Array(i32.buffer));
		} else tris += n / 3;
	}
	const all = new Uint8Array(parts.reduce((s, p) => s + p.byteLength, 0));
	let o = 0; for (const p of parts) { all.set(p, o); o += p.byteLength; }
	packed = all.byteLength;
	const z = Bun.zstdCompressSync(all, { level: 19 }).byteLength;
	lines.push(JSON.stringify({ group: a.card.group, id: a.card.id, version: a.card.version, ref: a.data.ref, tris: a.data.stats?.tris, verts, raw, meshopt: packed, wire: z }));
}
writeFileSync(process.argv[2] ?? 'wire.jsonl', lines.join('\n') + '\n');
