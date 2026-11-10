#!/usr/bin/env bun
/*
 * A WORLD'S BUILDS BESIDE ITS LEVELS (intent 7a6c3f1b): play's pinned plants (./kinds.ts) built by the frozen box engine
 * in real workers through the page's own pool, while the page's level maker (render/lower.js, its real simplifying
 * workers) makes the lower levels of the heaviest of them, as a first visit to a world does. Three arms in one run, on
 * this machine, the page holding as many turns as this machine's cores give a desktop (render/budget.js):
 *
 *   alone    the plants in the pool, no level asked
 *   beside   the plants in the pool, the heaviest ones' levels asked as each is built
 *   one      the plants one after another in one box, the same levels asked
 *
 *   bun play/site/scripts/census/beside.ts [--kinds 48] [--heavy 4] [--most 125%] [--sooner 65%] [--work 110%] [--cores <n>]
 *
 * Prints each arm's seconds until every plant is built, until its levels are made, and the CPU seconds the whole
 * process spent on it (every worker's). Exits 0 only if every plant and level was made, the plants beside the levels
 * were built within --most of the seconds they take alone and --sooner of the seconds they take in one box, and the arm on every core spent at most --work of the CPU
 * seconds of the arm in one box. Both are ratios of one run, so a slower machine is slower at every arm.
 */
import { mkdtempSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { kindsOf, turning } from './kinds';
import { lib } from './setup';

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1]! : d);
const pct = (k: string, d: string) => Number(opt(k, d).replace('%', '')) / 100;
const n = Number(opt('--kinds', '48')), heavy = Number(opt('--heavy', '4')), most = pct('--most', '125%'), sooner = pct('--sooner', '65%'), work = pct('--work', '110%');
const cores = Number(opt('--cores', String(availableParallelism())));
if (!(n > 1) || !(heavy >= 1) || !(most > 0) || !(sooner > 0) || !(work > 0) || !(cores >= 2)) throw new Error('usage: bun beside.ts [--kinds 48] [--heavy 4] [--most 125%] [--sooner 65%] [--work 110%] [--cores <n>]');

const { kinds, createPool } = await kindsOf(n, mkdtempSync(join(tmpdir(), 'census-beside-')));
// the page as this machine would hold it (the census's page says it is a Mac of eight): set before the budget is first read
(globalThis as any).navigator.hardwareConcurrency = cores;
const { open } = await import(lib('content/assets/load.js'));
const { prepare } = await import(lib('content/assets/render/prepare.js'));
const { createLowering } = await import(lib('content/assets/render/lower.js'));
const { budgetOf, errorOf, smallestOf } = await import(lib('content/assets/render/lod.js'));
const { budget } = await import(lib('content/render/budget.js'));
const engine = kinds[0]!.engine;
const turns = budget().builds;
const seconds = () => Bun.nanoseconds() / 1e9;
const cpu = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1e6; };

/** every plant built in a pool of `size` boxes; `levelsOf`: the plants whose levels are asked of the level maker as each is built */
async function arm(size: number, levelsOf: Set<string>) {
	const pool = createPool({ engine, size });
	const lowering = createLowering();
	const t0 = seconds(), c0 = cpu();
	const levels: Promise<boolean>[] = [];
	const tris: Record<string, number> = {};
	const built = await turning(
		Promise.all(
			kinds.map(async (k: any) => {
				try {
					const b = await pool.build(k.recipe, undefined, {});
					const level = prepare(open(b, k.hash).obj, { of: (m: unknown) => m });
					tris[k.hash] = level.tris;
					if (levelsOf.has(k.hash)) {
						const plans = [1, 2].map((L) => ({ budget: budgetOf(L, level.tris), most: budgetOf(L, Infinity), error: errorOf(L, level.radius), smallest: smallestOf(L, level.radius) }));
						levels.push(lowering.lower(level, plans, false, true).then(() => true, (e: Error) => (console.error(`beside: a level of ${k.label} was not made: ${e.message}`), false)));
					}
					return 1;
				} catch (e) {
					console.error(`beside: ${k.label} was not built: ${(e as Error).message}`);
					return 0;
				}
			})
		)
	);
	const builds = seconds() - t0;
	const made = await turning(Promise.all(levels));
	const all = seconds() - t0;
	pool.stop();
	lowering.dispose();
	return { builds, all, cpu: cpu() - c0, n: built.reduce((a: number, b: number) => a + b, 0), levels: made.filter(Boolean).length, tris };
}

// the engine read and a first worker made before any arm is timed
await arm(1, new Set()).catch(() => {});
const alone = await arm(turns, new Set());
const heaviest = new Set(Object.entries(alone.tris).sort((a, b) => b[1] - a[1]).slice(0, heavy).map(([h]) => h));
const beside = await arm(turns, heaviest);
const one = await arm(1, heaviest);
const line = (name: string, a: typeof alone) => console.log(`  ${name.padEnd(46)} every plant built after ${a.builds.toFixed(1).padStart(5)} s, its ${a.levels} levels made after ${a.all.toFixed(1).padStart(5)} s, ${a.cpu.toFixed(0).padStart(4)} CPU s`);
console.log(`beside: ${kinds.length} plants on box engine ${engine}, ${cores} cores, the page's turns ${turns}; levels of the ${heavy} heaviest (${[...heaviest].map((h) => alone.tris[h]).join(', ')} triangles)`);
line(`alone, in ${turns} boxes`, alone);
line(`beside their levels, in ${turns} boxes`, beside);
line('beside their levels, one after another in one box', one);
const held = beside.builds / alone.builds, than = beside.builds / one.builds, more = beside.cpu / one.cpu;
const whole = [alone, beside, one].every((a) => a.n === kinds.length) && beside.levels === heavy && one.levels === heavy;
const ok = whole && held <= most && than <= sooner && more <= work;
console.log(`  the plants beside their levels: ${(held * 100).toFixed(0)} % of the seconds alone (at most ${(most * 100).toFixed(0)} %) and ${(than * 100).toFixed(0)} % of the seconds in one box (at most ${(sooner * 100).toFixed(0)} %); on every core ${(more * 100).toFixed(0)} % of the CPU seconds of one box (at most ${(work * 100).toFixed(0)} %): ${ok ? 'ok' : 'NOT ok'}`);
process.exit(ok ? 0 : 1);
