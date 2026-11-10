#!/usr/bin/env bun
/*
 * HOW MUCH SOONER A WORLD'S PLANTS ARE BUILT ON EVERY CORE (intent 08d00b84): play's pinned plants (./kinds.ts) built
 * by the frozen box engine in real workers twice in one run, on this machine: one after another in one box, as every
 * world built them before (their recipes are made for an engine older than the newest, and all fell to one box), then
 * side by side in the page's pool, as many boxes as this machine's cores let a desktop build at once
 * (render/budget.js: every core but one).
 *
 *   bun play/site/scripts/census/cores.ts [--kinds 24] [--most 70%]
 *
 * Prints both times and exits 0 only if side by side took at most --most of one after another (and built the same
 * number of builds). A ratio of two times of one run: a slower machine is slower at both.
 */
import { mkdtempSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { kindsOf, turning } from './kinds';

const argv = process.argv.slice(2);
const opt = (k: string, d: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1]! : d);
const n = Number(opt('--kinds', '24')), most = Number(opt('--most', '70%').replace('%', '')) / 100;
if (!(n > 1) || !(most > 0 && most <= 1)) throw new Error('usage: bun cores.ts [--kinds 24] [--most 70%]');

const { kinds, createPool, budgetFor } = await kindsOf(n, mkdtempSync(join(tmpdir(), 'census-cores-')));
const engine = kinds[0]!.engine;
const cores = availableParallelism();
const boxes = budgetFor(false, cores).builds;
const seconds = () => Bun.nanoseconds() / 1e9;

/** every kind built in a pool of `size` boxes: how long it took, and how many were built */
async function built(size: number, list = kinds) {
	const pool = createPool({ engine, size });
	const t0 = seconds();
	const got = await turning(Promise.all(list.map((k) => pool.build(k.recipe, undefined, {}).then(() => 1, (e: Error) => (console.error(`cores: ${k.label} was not built: ${e.message}`), 0)))));
	const s = seconds() - t0;
	pool.stop();
	return { s, n: got.reduce((a: number, b: number) => a + b, 0) };
}

// the engine read and a first worker made before either is timed
await built(1, kinds.slice(0, 1));
const one = await built(1);
const side = await built(boxes);
const ratio = side.s / one.s;
console.log(`cores: ${kinds.length} plants on box engine ${engine}, ${cores} cores`);
console.log(`  one after another, in one box   ${one.s.toFixed(1)} s (${one.n} built)`);
console.log(`  side by side, in ${boxes} boxes        ${side.s.toFixed(1)} s (${side.n} built)`);
const ok = one.n === kinds.length && side.n === kinds.length && ratio <= most;
console.log(`  side by side took ${(ratio * 100).toFixed(0)} % of one after another (at most ${(most * 100).toFixed(0)} %): ${ok ? 'ok' : 'NOT ok'}`);
process.exit(ok ? 0 : 1);
