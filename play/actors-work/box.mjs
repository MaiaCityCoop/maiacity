// Running readable sources and pieces in Node as the asset box does: CommonJS with require('three'), three's addons
// and pieces by the BLAKE3 hash of their source (here: by file, or by hash once hashed).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const site = '/home/user/maiacity/play/site/node_modules/';
export const THREE = await import(pathToFileURL(site + 'three/build/three.module.js').href);
const addons = {};
for (const a of ['utils/BufferGeometryUtils.js', 'geometries/RoundedBoxGeometry.js', 'utils/SkeletonUtils.js']) addons['three/addons/' + a] = await import(pathToFileURL(site + 'three/examples/jsm/' + a).href);
const req = createRequire(site + 'x.js');
const { blake3 } = await import(pathToFileURL(req.resolve('@noble/hashes/blake3.js')).href).catch(async () => import(pathToFileURL(req.resolve('@noble/hashes/blake3')).href));
export const hash = (text) => Buffer.from(blake3(new TextEncoder().encode(text))).toString('hex');
const byHash = new Map();
/** a piece's source handed in: its hash */
export function piece(file) {
	const code = readFileSync(file, 'utf8');
	const h = hash(code);
	byHash.set(h, { code, file });
	return h;
}
const loaded = new Map();
export function run(code, name = 'source') {
	const module = { exports: {} };
	const require = (id) => {
		if (id === 'three') return THREE;
		if (addons[id]) return addons[id];
		if (/^[0-9a-f]{64}$/.test(id)) {
			if (!byHash.has(id)) throw new Error(`no piece ${id}`);
			if (!loaded.has(id)) loaded.set(id, run(byHash.get(id).code, byHash.get(id).file));
			return loaded.get(id);
		}
		throw new Error(`${name}: may not require ${id}`);
	};
	new Function('module', 'exports', 'require', code)(module, module.exports, require);
	return module.exports;
}
