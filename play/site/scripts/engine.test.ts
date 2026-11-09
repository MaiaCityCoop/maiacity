/**
 * Box engine 7 (intent a5faafad), frozen and run as the page runs it, on the CPU in Bun (./box-worker.ts): its source as
 * it is now is the latest frozen engine byte for byte; every recipe the kept Old City world builds (its own and its
 * guests', their pieces joined in, src/lib/stories/fixtures/worlds/) builds on it as on engine 6, the same nodes,
 * geometry, materials and looks, format 6 aside; a recipe's own look leaves it as a checked graph the page keeps; and a
 * shader of its own given any other way refuses the build, naming the material.
 *   bun test scripts/engine.test.ts
 */
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { boxWorker } from './box-worker';
import { bundleEngine } from './freeze-engine';
import { hashText } from '../src/lib/content/game/hash.js';
import { enginesOf } from '../src/lib/kernel/engines.js';
import { piecesOf, withPieces } from '../src/lib/content/assets/box/pieces.js';
import { RECIPE_HEAD, recipeTail } from '../src/lib/content/assets/engines.js';
import { rebuild } from '../src/lib/content/assets/box/rebuild.js';
import { built, engineOf } from '../src/lib/stories/world-build';
import { GLOW } from '../src/lib/content/assets/box/graph.examples.js';

const latest = enginesOf('box').at(-1) as { v: number; blake3: string };
const FILES = new URL('../src/lib/stories/fixtures/worlds/9bb90d4c3f21a900d01a6729ac61d6e103d9f0abeb45668cf711a497729c68a8/files/', import.meta.url);
const code = (h: string) => readFileSync(new URL(h, FILES), 'utf8');
const deep = (c: string, seen = new Set<string>()): string[] => {
	for (const h of piecesOf(c) as string[]) if (!seen.has(h)) seen.add(h), deep(code(h), seen);
	return [...seen];
};
const recipes = readdirSync(FILES).filter((h) => code(h).startsWith(RECIPE_HEAD));
const withItsPieces = (h: string) => ({ hash: h, code: withPieces(code(h), deep(code(h)).map((p) => ({ hash: p, code: code(p) }))) });
const on = (v: number, recipe: { hash: string; code: string }) => engineOf(recipe, v, boxWorker(v), 60_000);
/** a recipe of our own, its source as a recipe file */
const own = (source: string) => {
	const c = RECIPE_HEAD + source + recipeTail('test-asset', 1, null);
	return { hash: hashText(c), code: c };
};
const recipeWith = (material: string) => `module.exports.graphs = { glow: ${JSON.stringify(GLOW)} };
module.exports.recipe = function () {
	const THREE = require('three');
	return { meta: { group: 'things', id: 'test-asset', version: 1, label: 'Test', params: [] }, build() {
		${material}
		return new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m);
	} };
};
`;

describe('box engine 7', () => {
	test('is the engine as its source is now, byte for byte (bun scripts/freeze-engine.ts --hash)', async () => {
		expect(latest.v).toBe(7);
		expect(hashText(await bundleEngine())).toBe(latest.blake3);
	}, 120_000);

	test(`builds every recipe of the kept world as engine 6 does (${recipes.length} recipes), format 6 aside`, async () => {
		expect(recipes.length).toBeGreaterThan(5);
		let same = 0;
		for (const h of recipes) {
			const r = withItsPieces(h);
			const [a, b] = [on(6, r), on(7, r)];
			try {
				const [x, y] = await Promise.all([a.build(undefined), b.build(undefined)]);
				expect(x.data.format).toBe(5);
				expect(y.data.format).toBe(6);
				expect(y.data.nodes.length).toBe(x.data.nodes.length);
				expect(y.data.geometries.length).toBe(x.data.geometries.length);
				expect(y.data.stats.tris).toBe(x.data.stats.tris);
				expect(y.data.materials.map((m: any) => [m.type, m.params, m.look])).toEqual(x.data.materials.map((m: any) => [m.type, m.params, m.look]));
				// the cut faces it said it has, now as their look
				expect(y.data.materials.filter((m: any) => m.cap).length).toBe(x.data.materials.filter((m: any) => m.custom && m.cap).length);
				expect(y.data.materials.some((m: any) => 'custom' in m)).toBe(false);
				expect(() => rebuild(y.data)).not.toThrow();
				same++;
			} finally {
				a.end();
				b.end();
			}
		}
		expect(same).toBe(recipes.length);
	}, 600_000);

	test('a recipe’s own look leaves as a checked graph, which the page keeps', async () => {
		const e = on(7, own(recipeWith(`const m = new THREE.MeshStandardMaterial({ color: 0x335533 }); m.userData.graph = module.exports.graphs.glow;`)));
		try {
			const m = await e.build(undefined);
			expect(m.data.materials[0].graph.out).toEqual(GLOW.out);
			let kept: any;
			rebuild(m.data).traverse((o: any) => (kept ??= o.material));
			expect(kept.userData.graph.nodes).toHaveLength(GLOW.nodes.length);
		} finally {
			e.end();
		}
	}, 60_000);

	test('a shader of its own any other way refuses the build, naming the material; an unsafe graph too', async () => {
		const tries = {
			'a shader of its own \\(MeshStandardMaterial, onBeforeCompile\\)': `const m = new THREE.MeshStandardMaterial({ name: 'cap' }); m.onBeforeCompile = (s) => s;`,
			'a shader of its own \\(ShaderMaterial': `const m = new THREE.ShaderMaterial({ name: 'raw' });`,
			'its graph is refused: .*may not read the screen': `const m = new THREE.MeshStandardMaterial(); m.userData.graph = { format: 1, nodes: [{ op: 'screenUV' }], out: { color: 0 } };`
		};
		for (const [why, material] of Object.entries(tries)) {
			const e = on(7, own(recipeWith(material)));
			try {
				await expect(e.build(undefined)).rejects.toThrow(new RegExp(why));
			} finally {
				e.end();
			}
		}
	}, 60_000);

	test('the test asset (c5): the glowing mushroom builds, its card fits, its cap carries its graph', async () => {
		const source = readFileSync(new URL('../src/lib/content/assets/box/fixtures/glow-mushroom.js', import.meta.url), 'utf8');
		const c = RECIPE_HEAD + source + recipeTail('glow-mushroom', 1, null);
		const r = { hash: hashText(c), code: c };
		const e = on(7, r);
		try {
			const m = await e.build(undefined);
			const { obj } = built(m, r.hash);
			const mats: any[] = [];
			obj.traverse((o: any) => o.material && mats.push(o.material));
			expect(mats.filter((x) => x.userData.graph).length).toBe(1);
			expect(mats.find((x) => x.userData.graph).userData.graph.out).toEqual({ position: 11, color: 18, emissive: 25 });
		} finally {
			e.end();
		}
	}, 60_000);
});
