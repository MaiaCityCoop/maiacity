// One cover stream for every world (intent 11ead007): the one program that lays a biome's cover, its plants put down
// once a tile as play's builds, grown on the graphics card by the render kit's TSL, nothing of it moved while you walk.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { coverStream } from './stream.js';
import { coverGrow } from '../render/nodes/index.js';

const join = (...p: string[]) => p.join('/');
const SRC = new URL('../../..', import.meta.url).pathname.replace(/\/$/, '');
const files = (dir: string): string[] =>
	readdirSync(dir).flatMap((f: string) => {
		const p = join(dir, f);
		return statSync(p).isDirectory() ? files(p) : /\.(js|ts|svelte)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
	});

/** a meadow of two kinds, each named by its build (a hash), as a biome's card names them */
const MEADOW = {
	surface: { green: 10 },
	density: 3,
	cover: [
		{ kind: 'grass', ref: 'a'.repeat(64) + '?kind=1&seed=7203', share: 10, colony: 40, spread: 0.98, fill: 1 },
		{ kind: 'stones', ref: 'b'.repeat(64) + '?kind=6&seed=7333', share: 2, colony: 3, spread: 0.4 }
	]
} as unknown as Parameters<typeof coverStream>[0]['recipe'];

/** a renderer as the stream asks for it, counting what it is asked */
function fakeDrawn() {
	const n = { use: [] as string[], take: 0, give: 0, live: new Set<object>() };
	return {
		n,
		use: (ref: string) => (n.use.push(ref), { ref }),
		take: (_k: unknown, at: { elements: number[] }, cover: { rank: number; near: number; reach: number; thin: number }) => {
			n.take++;
			expect(cover.rank).toBeGreaterThanOrEqual(0);
			expect(cover.rank).toBeLessThan(1);
			const c = { at: at.elements.slice(), cover };
			n.live.add(c);
			return c;
		},
		give: (c: object) => {
			n.give++;
			n.live.delete(c);
		}
	};
}

describe('one program lays the cover (c1)', () => {
	it('the sandboxes’ own cover is gone, nothing calls its maker, and the stream patches no shader', () => {
		expect(existsSync(join(SRC, 'lib/content/sandbox-2/interior/cover.js'))).toBe(false);
		expect(existsSync(join(SRC, 'lib/content/biomes/cover.js'))).toBe(false);
		for (const f of files(SRC)) expect(readFileSync(f, 'utf8').includes('create' + 'Cover'), f).toBe(false);
		const stream = readFileSync(join(SRC, 'lib/content/biomes/stream.js'), 'utf8');
		expect(stream).not.toContain('onBeforeCompile');
		expect(stream).not.toContain('customDepthMaterial');
	});
	it('the viewer’s ground leaves cover out by the render kit’s TSL, not a GLSL string', () => {
		const ground = readFileSync(join(SRC, 'lib/content/assets/ground.js'), 'utf8');
		expect(ground).not.toMatch(/transformed \*=/);
		expect(ground).toContain('coverAway');
	});
	it('every warm-up goes through the render kit’s precompile (compileAsync never resolves on node materials)', () => {
		const bad = files(SRC).filter((f) => !f.endsWith('render/core.js') && /\bcompileAsync\(/.test(readFileSync(f, 'utf8')));
		expect(bad).toEqual([]);
	});
});

describe('the stream (c3)', () => {
	it('draws each kind by the build its card names', () => {
		const d = fakeDrawn();
		coverStream({ drawn: d, recipe: MEADOW, tile: 8, reach: 20, near: 6 });
		expect(d.n.use).toEqual([MEADOW.cover[0]!.ref, MEADOW.cover[1]!.ref]);
		expect(() => coverStream({ drawn: d, recipe: { ...MEADOW, cover: [{ ...MEADOW.cover[0]!, ref: undefined }] } })).toThrow(/names no asset/);
	});
	it('puts each plant down once, whole, and moves nothing while the eye walks within its tiles', () => {
		const d = fakeDrawn();
		const s = coverStream({ drawn: d, recipe: MEADOW, tile: 8, reach: 20, near: 6, thin: 0.25 });
		s.update(0, 0, 999);
		const laid = d.n.take;
		expect(laid).toBeGreaterThan(1000);
		expect(d.n.give).toBe(0);
		for (const c of d.n.live) {
			const { at, cover } = c as unknown as { at: number[]; cover: { near: number; reach: number; thin: number } };
			// whole: a scale between the stream's 0.75 and 1.35, never shrunk on the processor
			expect(Math.hypot(at[0]!, at[1]!, at[2]!)).toBeGreaterThan(0.74);
			expect(cover).toMatchObject({ near: 6, reach: 20, thin: 0.25 });
		}
		// a few metres on, inside the same tiles: nothing taken, nothing given back
		for (let x = 0.5; x < 3; x += 0.5) s.update(x, 1, 999);
		expect(d.n.take).toBe(laid);
		expect(d.n.give).toBe(0);
		expect(s.count()).toBe(laid);
		// far on: the tiles behind let go, new ones laid
		s.update(200, 0, 999);
		expect(d.n.give).toBe(laid);
		s.dispose();
		expect(d.n.live.size).toBe(0);
	});
	it('a hidden floor lays nothing until shown', () => {
		const d = fakeDrawn();
		const s = coverStream({ drawn: d, recipe: MEADOW, tile: 8, reach: 20, hidden: true });
		s.update(0, 0, 999);
		expect(d.n.take).toBe(0);
		s.show(true);
		s.update(0, 0, 999);
		expect(d.n.take).toBeGreaterThan(0);
		s.show(false);
		expect(d.n.live.size).toBe(0);
	});
	it('lays its ground where it lies in the world, at its height', () => {
		const d = fakeDrawn();
		const s = coverStream({ drawn: d, recipe: MEADOW, tile: 8, reach: 12, at: [100, 2, -50], heightAt: () => 0.5 });
		s.update(0, 0, 999);
		for (const c of d.n.live) {
			const at = (c as unknown as { at: number[] }).at;
			expect(at[13]).toBeCloseTo(2.5);
			expect(Math.abs(at[12]! - 100)).toBeLessThan(30);
			expect(Math.abs(at[14]! + 50)).toBeLessThan(30);
		}
	});
});

describe('the cover grows as it did (c3)', () => {
	// the sum the stream's shader and the sandboxes' cover worked out before (main 06fc8c9)
	const before = (d: number, rank: number, near: number, reach: number, thin: number) => {
		const keep = d <= near ? 1 : 1 - (1 - thin) * Math.min(1, (d - near) / Math.max(1e-3, reach - near));
		const t = Math.min(1, Math.max(0, (d - (reach - 4)) / 4));
		return Math.min(1, Math.max(0, (keep - rank) / 0.08)) * (1 - t * t * (3 - 2 * t));
	};
	it('coverGrow is that sum, at every distance and rank', () => {
		for (const [near, reach, thin] of [[7, 28, 0.2], [9, 24, 0.25], [3, 8, 0.2]] as const)
			for (let d = 0; d < reach + 2; d += 0.37) for (let r = 0; r < 1; r += 0.013) expect(coverGrow(d, r, near, reach, thin)).toBeCloseTo(before(d, r, near, reach, thin), 6);
	});
});
