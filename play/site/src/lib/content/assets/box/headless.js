// @ts-nocheck — plain JS
/*
 * A RECIPE RUN OUTSIDE THE BROWSER — the one way our tools run an asset's readable source on the CPU, in Bun, as the
 * asset box runs it (intent bba45d6e): a CommonJS module that may require three.js, three's addons and pieces by the
 * BLAKE3 hash of their source, nothing else. Each piece is held to its hash before it runs and runs once. Used by the
 * motion checks (tools/motion/box.mjs); the worlds' census (scripts/census) runs the box's own frozen engine instead.
 * Never in a page: a page builds a recipe only in the asset box (./host.js), where code we cannot trust is kept apart.
 */
import { blake3 } from '@noble/hashes/blake3.js';

/** a source's BLAKE3 hash, as play names files and pieces */
export const hashOf = (text) => [...blake3(new TextEncoder().encode(text))].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * A runner of readable sources: `run(code, name)` gives its module's exports.
 * @param {{ three: object, addons?: Record<string, object>, piece?: (hash: string) => string | undefined }} o three.js,
 *   three's addons by their `three/addons/…` name, and the source of a piece by its hash (none where it has none)
 */
export function runner({ three, addons = {}, piece = () => undefined }) {
	const loaded = new Map();
	function run(code, name = 'source') {
		const module = { exports: {} };
		const require = (id) => {
			if (id === 'three') return three;
			if (addons[id]) return addons[id];
			if (/^[0-9a-f]{64}$/.test(id)) {
				if (!loaded.has(id)) {
					const src = piece(id);
					if (src === undefined) throw new Error(`${name}: no piece ${id}`);
					if (hashOf(src) !== id) throw new Error(`${name}: piece ${id.slice(0, 12)}… is not what its hash names`);
					loaded.set(id, run(src, id));
				}
				return loaded.get(id);
			}
			throw new Error(`${name}: may not require ${id}`);
		};
		new Function('module', 'exports', 'require', code)(module, module.exports, require);
		return module.exports;
	}
	return run;
}
