// Running readable sources and pieces as the asset box does: CommonJS with require('three'), three's addons and pieces
// by the BLAKE3 hash of their source (here: the mirror's files, each held to its hash).
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const SITE = new URL('../../play/site/node_modules/', import.meta.url).pathname;
const HERE = new URL('.', import.meta.url).pathname;
export const THREE = await import(pathToFileURL(SITE + 'three/build/three.module.js').href);
const addons = {};
for (const a of ['utils/BufferGeometryUtils.js', 'geometries/RoundedBoxGeometry.js', 'utils/SkeletonUtils.js']) addons['three/addons/' + a] = await import(pathToFileURL(SITE + 'three/examples/jsm/' + a).href);
const req = createRequire(SITE + 'x.js');
const { blake3 } = await import(pathToFileURL(req.resolve('@noble/hashes/blake3.js')).href);
export const hash = (text) => Buffer.from(blake3(new TextEncoder().encode(text))).toString('hex');
/** every piece of the mirror by its hash, and each file's hash by its name */
const byHash = new Map();
export const files = {};
for (const dir of ['pieces', 'assets'])
	for (const f of readdirSync(HERE + dir)) {
		const code = readFileSync(`${HERE}${dir}/${f}`, 'utf8');
		files[`${dir}/${f}`] = hash(code);
		if (dir === 'pieces') byHash.set(hash(code), code);
	}
const loaded = new Map();
export function run(code, name = 'source') {
	const module = { exports: {} };
	const require = (id) => {
		if (id === 'three') return THREE;
		if (addons[id]) return addons[id];
		if (/^[0-9a-f]{64}$/.test(id)) {
			if (!byHash.has(id)) throw new Error(`${name}: no piece ${id}`);
			if (!loaded.has(id)) loaded.set(id, run(byHash.get(id), id));
			return loaded.get(id);
		}
		throw new Error(`${name}: may not require ${id}`);
	};
	new Function('module', 'exports', 'require', code)(module, module.exports, require);
	return module.exports;
}
/** a mirrored piece's exports, by its file's name */
export const piece = (name) => run(`module.exports = require('${files[`pieces/${name}.js`]}')`);
/** an asset of the mirror built at its defaults: its cast ({ rig, clips, gears, poses }) */
export const asset = (name) => run(readFileSync(`${HERE}assets/${name}.js`, 'utf8'), name).recipe('x', 14, null).build();
