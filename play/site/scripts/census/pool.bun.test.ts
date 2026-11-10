/*
 * A world's plants built on several workers are the plants built alone (intent 08d00b84): play's pinned plants, built
 * by the frozen box engine in real workers through the page's pool (src/lib/content/assets/box/pool.js), side by side
 * and one after another, give the same build byte for byte; and a recipe made for an older engine than the newest (all
 * of play's) is built side by side too, where one box built them one at a time.
 *
 *   cd play/site && bun test scripts/census/pool.bun.test.ts
 */
import { beforeAll, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { kindsOf, turning, type Kind } from './kinds';
import { lib } from './setup';

const N = 8;
let kinds: Kind[], createPool: any, poolOf: any, INDEX: any, AssetBox: any;

/** a pool of real boxes of `size`, counting how many of its boxes build at once */
function counted(engine: number, size: number) {
	const seen = { now: 0, most: 0, boxes: new Set<number>() };
	let made = 0;
	const pool = createPool({
		engine,
		size,
		box: () => {
			const n = made++;
			const box = new AssetBox({ engine, rooms: 1 });
			const build = box.build.bind(box);
			box.build = (...a: unknown[]) => {
				seen.boxes.add(n);
				seen.most = Math.max(seen.most, ++seen.now);
				return build(...a).finally(() => void seen.now--);
			};
			return box;
		}
	});
	return { pool, seen };
}
/** a build as it is compared: its data and card, not how long it took */
const plain = (b: any) => ({ data: b.data, card: b.card });

beforeAll(async () => {
	({ kinds, createPool, poolOf, INDEX } = await kindsOf(N, mkdtempSync(join(tmpdir(), 'census-pool-'))));
	({ AssetBox } = await import(lib('content/assets/box/host.js')));
}, 120_000);

test(`${N} plants built side by side on several workers are the same builds as each built alone`, async () => {
	expect(kinds.length).toBe(N);
	expect(new Set(kinds.map((k) => k.engine)).size).toBe(1);
	const engine = kinds[0]!.engine;
	const side = counted(engine, 3);
	const together = await turning(Promise.all(kinds.map((k) => side.pool.build(k.recipe, undefined, {}))));
	side.pool.stop();
	// on more than one worker at once, never more than its boxes
	expect(side.seen.most).toBeGreaterThanOrEqual(2);
	expect(side.seen.most).toBeLessThanOrEqual(3);
	expect(side.seen.boxes.size).toBeGreaterThanOrEqual(2);
	const one = counted(engine, 1);
	const alone: unknown[] = [];
	for (const k of kinds) alone.push(await turning(one.pool.build(k.recipe, undefined, {})));
	one.pool.stop();
	expect(one.seen.most).toBe(1);
	for (let i = 0; i < N; i++) {
		const a = plain(together[i]), b = plain(alone[i]);
		// something was built at all: corners, by the thousand
		expect(JSON.stringify(a.card).length).toBeGreaterThan(20);
		expect(a).toEqual(b);
	}
}, 300_000);

test("a recipe made for an older engine than the newest is built in the page's pool, several at once", async () => {
	const { loadAsset } = await import(lib('content/assets/load.js'));
	const { budget } = await import(lib('content/render/budget.js'));
	const engine = kinds[0]!.engine;
	// what made every build wait for one box: play's recipes are made for an engine older than the newest
	expect(engine).toBeLessThan(INDEX.engine);
	const pool = poolOf(engine);
	expect(pool.size).toBe(budget().builds);
	let most = 0;
	const got = await turning(Promise.all(kinds.map((k) => loadAsset(k.hash, { cache: false }))), () => (most = Math.max(most, pool.building)));
	expect(got.every((g: any) => g.from === 'box' && g.obj)).toBe(true);
	expect(most).toBeGreaterThanOrEqual(2);
	pool.stop();
}, 300_000);
