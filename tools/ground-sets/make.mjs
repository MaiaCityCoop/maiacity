// The ground's scanned surfaces (intent db87a28f): each of the biomes' SURFACES backed by a CC0 scanned set, made into
// three KTX2 maps (its colour at 2048 and 1024 px, the detail maps at 1024: a desktop's
// card holds them at that, a phone all three), each named by its BLAKE3 hash in play/media/<hash>.ktx2 (the deploy's import
// keeps it among play's files) and listed in play/site/src/lib/content/biomes/sets.js.
//
//   albedo  RGB the scan's colour, A its height (the displacement, stretched to 0…1): ETC1S, sRGB
//   normal  the scan's OpenGL normal: UASTC, linear, zstd
//   ar      R ambient occlusion, G roughness: UASTC, linear, zstd
//
//   cd tools/ground-sets && npm i && node make.mjs <download dir>
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex } from '@noble/hashes/utils.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DL = process.argv[2] ?? join(ROOT, '.ground-dl');
const MEDIA = join(ROOT, 'play/media');
const OUT = join(ROOT, 'play/site/src/lib/content/biomes/sets.js');

/** every surface, in SURFACES' order: its set, where it comes from, its real size (m) */
const SETS = [
	['litter', 'polyhaven', 'forest_leaves_02'],
	['humus', 'polyhaven', 'brown_mud_leaves_01'],
	['needles', 'polyhaven', 'forrest_ground_03'],
	['moss', 'ambientcg', 'Moss001'],
	['green', 'polyhaven', 'leafy_grass'],
	['soil', 'polyhaven', 'brown_mud_03'],
	['tilled', 'polyhaven', 'farm_soil'],
	['stubble', 'polyhaven', 'withered_grass'],
	['dust', 'polyhaven', 'gravelly_sand']
];

const get = async (url, file) => {
	if (existsSync(file)) return readFileSync(file);
	const r = await fetch(url);
	if (!r.ok) throw new Error(`${url}: ${r.status}`);
	const b = Buffer.from(await r.arrayBuffer());
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, b);
	return b;
};

/** a set's four source maps (colour, height, normal, AO+roughness as R and G), its page and its real size */
async function source(where, id) {
	const dir = join(DL, id);
	if (where === 'polyhaven') {
		const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
		const info = await (await fetch(`https://api.polyhaven.com/info/${id}`)).json();
		const f = (k, ext) => files[k]['2k'][ext].url;
		return {
			colour: await get(f('Diffuse', 'jpg'), join(dir, 'diff.jpg')),
			height: await get(f('Displacement', 'png'), join(dir, 'disp.png')),
			normal: await get(f('nor_gl', 'png'), join(dir, 'nor.png')),
			ar: await get(f('arm', 'png'), join(dir, 'arm.png')),
			page: `https://polyhaven.com/a/${id}`,
			by: Object.keys(info.authors ?? {}).join(', '),
			size: +(Math.max(...(info.dimensions ?? [2000])) / 1000).toFixed(2)
		};
	}
	// ambientCG: a zip of its maps
	await get(`https://ambientcg.com/get?file=${id}_2K-PNG.zip`, join(dir, 'set.zip'));
	const un = join(dir, 'un');
	if (!existsSync(un)) execFileSync('python3', ['-I', '-c', `import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])`, join(dir, 'set.zip'), un]);
	const pick = (re) => readFileSync(join(un, readdirSync(un).find((n) => re.test(n))));
	const ao = await sharp(pick(/AmbientOcclusion\.png$/)).greyscale().raw().toBuffer({ resolveWithObject: true }).catch(() => null);
	const rough = await sharp(pick(/Roughness\.png$/)).greyscale().raw().toBuffer({ resolveWithObject: true });
	const { width: w, height: h } = rough.info;
	const ar = Buffer.alloc(w * h * 3);
	for (let i = 0; i < w * h; i++) {
		ar[i * 3] = ao ? ao.data[i] : 255;
		ar[i * 3 + 1] = rough.data[i];
	}
	return {
		colour: pick(/Color\.png$/),
		height: pick(/Displacement\.png$/),
		normal: pick(/NormalGL\.png$/),
		ar: await sharp(ar, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer(),
		page: `https://ambientcg.com/view?id=${id}`,
		by: 'Lennart Demes (ambientCG)',
		size: 2
	};
}

const decoder = async (buffer) => {
	const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	return { data: new Uint8Array(data), width: info.width, height: info.height };
};

/** a map at px a side as a KTX2 file, kept in play/media by its hash */
async function ktx2(png, px, kind) {
	const sized = await sharp(png).resize(px, px, { kernel: 'lanczos3' }).png().toBuffer();
	const opts =
		kind === 'albedo'
			? { isUASTC: false, qualityLevel: 200, compressionLevel: 2, isSetKTX2SRGBTransferFunc: true, generateMipmap: true }
			: { isUASTC: true, isSetKTX2SRGBTransferFunc: false, generateMipmap: true, needSupercompression: true, enableRDO: true, rdoQualityLevel: 2, isNormalMap: kind === 'normal', imageDecoder: decoder };
	const bytes = await encodeToKTX2(new Uint8Array(sized), { imageDecoder: decoder, ...opts });
	const hash = bytesToHex(blake3(bytes));
	writeFileSync(join(MEDIA, `${hash}.ktx2`), bytes);
	return { hash, bytes: bytes.length };
}

mkdirSync(MEDIA, { recursive: true });
// a set already made from the same scan is kept as it is (its files by their hashes)
const made = existsSync(OUT) ? (await import(OUT)).SETS : [];
const sets = [];
for (const [surface, where, id] of SETS) {
	const had = made.find((m) => m.surface === surface && m.id === id);
	if (had && Object.values(had.maps).every((m) => Object.values(m).every((f) => existsSync(join(MEDIA, f))))) {
		sets.push({ ...had, maps: Object.fromEntries(Object.entries(had.maps).map(([k, m]) => [k, Object.fromEntries(Object.entries(m).map(([px, f]) => [px, { hash: f.replace(/\.ktx2$/, '') }]))])) });
		continue;
	}
	const s = await source(where, id);
	// the colour with its height in alpha, the height stretched to fill 0…1 (each scan's own range)
	const col = await sharp(s.colour).resize(2048, 2048).removeAlpha().raw().toBuffer();
	const hgt = await sharp(s.height).resize(2048, 2048).greyscale().raw({ depth: 'ushort' }).toBuffer();
	const H = new Uint16Array(hgt.buffer, hgt.byteOffset, hgt.length / 2);
	let lo = 65535, hi = 0;
	for (const v of H) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
	const rgba = Buffer.alloc(2048 * 2048 * 4);
	for (let i = 0; i < 2048 * 2048; i++) {
		rgba[i * 4] = col[i * 3];
		rgba[i * 4 + 1] = col[i * 3 + 1];
		rgba[i * 4 + 2] = col[i * 3 + 2];
		rgba[i * 4 + 3] = Math.round(((H[i] - lo) / Math.max(1, hi - lo)) * 255);
	}
	const albedo = await sharp(rgba, { raw: { width: 2048, height: 2048, channels: 4 } }).png().toBuffer();
	// the colour's mean (linear), for the far ground: no texture read there
	const m = await sharp(s.colour).resize(1, 1, { kernel: 'cubic' }).removeAlpha().raw().toBuffer();
	const maps = {};
	for (const [kind, png] of [['albedo', albedo], ['normal', s.normal], ['ar', s.ar]]) {
		maps[kind] = {};
		for (const px of kind === 'albedo' ? [2048, 1024] : [1024]) maps[kind][px] = await ktx2(png, px, kind);
		console.error(surface, kind, Object.values(maps[kind]).map((m) => m.bytes).join(' '));
	}
	sets.push({ surface, id, source: s.page, by: s.by, licence: 'CC0', size: s.size, mean: [...m].map((v) => +((v / 255) ** 2.2).toFixed(4)), maps });
}

const text = `// Made by tools/ground-sets/make.mjs: do not edit by hand. Each surface's scanned set (CC0), its three maps as KTX2
// files by their BLAKE3 hash (the colour at 2048 and 1024 px, the normal and AO/roughness at 1024) (play's files, ../../kernel/files.js; play/media/<hash>.ktx2), its real
// size (m) and its colour's mean (linear).
/** @type {{ surface: string, id: string, source: string, by: string, licence: 'CC0', size: number, mean: number[], maps: { albedo: Record<2048 | 1024, string>, normal: Record<1024, string>, ar: Record<1024, string> } }[]} */
export const SETS = [
${sets.map((s) => `\t{ surface: '${s.surface}', id: '${s.id}', source: '${s.source}', by: '${s.by}', licence: 'CC0', size: ${s.size}, mean: [${s.mean.join(', ')}], maps: { ${['albedo', 'normal', 'ar'].map((k) => `${k}: { ${Object.entries(s.maps[k]).map(([px, m]) => `${px}: '${m.hash}.ktx2'`).join(', ')} }`).join(', ')} } }`).join(',\n')}
];
`;
writeFileSync(OUT, text);
console.error('wrote', OUT);
