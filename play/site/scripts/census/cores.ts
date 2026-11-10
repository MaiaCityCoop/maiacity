#!/usr/bin/env bun
/*
 * HOW MUCH SOONER A WORLD'S PLANTS ARE BUILT ON EVERY CORE (intent 08d00b84): play's pinned plants (./kinds.ts) built
 * by the frozen box engine in real workers twice in one run, on this machine: one after another in one box, as every
 * world built them before (their recipes are made for an engine older than the newest, and all fell to one box), then
 * side by side in the page's pool, as many boxes as this machine's cores let a desktop build at once
 * (render/budget.js: every core but one).
 *
 *   bun play/site/scripts/census/cores.ts [--kinds 48] [--busy 2] [--most 95%]
 *
 * Prints, for each, its seconds and how many boxes were building on average while it ran (the seconds its builds took
 * together, by the seconds it took: 1 for one after another). Exits 0 only if both built every plant, side by side at
 * least --busy boxes were building on average, and it took at most --most of the seconds of one after another. The
 * boxes busy are the scheduler's doing, the same on any machine; the seconds are this machine's: both arms in one
 * run, so a slower machine is slower at both, and one with more cores gains more.
 */
import { mkdtempSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { kindsOf, turning } from './kinds';

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1]! : d);
const n = Number(opt('--kinds', '48')), busy = Number(opt('--busy', '2')), most = Number(opt('--most', '95%').replace('%', '')) / 100;
if (!(n > 1) || !(busy >= 1) || !(most > 0 && most <= 1)) throw new Error('usage: bun cores.ts [--kinds 48] [--busy 2] [--most 95%]');

// this machine's own cores, read before the census's page says it is a Mac of eight
const cores = availableParallelism();
const { kinds, createPool, budgetFor } = await kindsOf(n, mkdtempSync(join(tmpdir(), 'census-cores-')));
const engine = kinds[0]!.engine;
const boxes = budgetFor(false, cores).builds;
const seconds = () => Bun.nanoseconds() / 1e9;

/** every kind built in a pool of `size` boxes: how long it took, how many were built, how many boxes built on average */
async function built(size: number, list = kinds) {
	const pool = createPool({ engine, size });
	const t0 = seconds();
	let inBuilds = 0;
	const got = await turning(
		Promise.all(
			list.map(async (k) => {
				try {
					// (the time the box itself took to build it, as the box says it: waiting for a box is not building)
					const { ms } = await pool.build(k.recipe, undefined, {});
					inBuilds += (ms.start + ms.build + ms.bake + ms.serialize) / 1000;
					return 1;
				} catch (e) {
					console.error(`cores: ${k.label} was not built: ${(e as Error).message}`);
					return 0;
				}
			})
		)
	);
	const s = seconds() - t0;
	pool.stop();
	return { s, n: got.reduce((a: number, b: number) => a + b, 0), busy: inBuilds / s };
}

// the engine read and a first worker made before either is timed
await built(1, kinds.slice(0, 1));
const one = await built(1);
const side = await built(boxes);
const ratio = side.s / one.s;
console.log(`cores: ${kinds.length} plants on box engine ${engine}, ${cores} cores`);
console.log(`  one after another, in one box   ${one.s.toFixed(1)} s (${one.n} built, ${one.busy.toFixed(1)} boxes building on average)`);
console.log(`  side by side, in ${boxes} boxes        ${side.s.toFixed(1)} s (${side.n} built, ${side.busy.toFixed(1)} boxes building on average)`);
const ok = one.n === kinds.length && side.n === kinds.length && side.busy >= busy && ratio <= most;
console.log(`  side by side: ${side.busy.toFixed(1)} boxes building on average (at least ${busy}), ${(ratio * 100).toFixed(0)} % of the seconds of one after another (at most ${(most * 100).toFixed(0)} %): ${ok ? 'ok' : 'NOT ok'}`);
process.exit(ok ? 0 : 1);
