#!/usr/bin/env bun
/*
 * A WORLD HELD TO ITS BUDGET (play/SPEC.md §4.16, intent 1f6a98dd): the census of each world named (its triangles and
 * draws every view, what its load hands the simplifier) and its frame count (WebGPU calls at rest and walking), from the
 * pinned inputs, no token, against ./census/budgets.json. Prints a row per number: its aim, its ceiling, now. Exit 0
 * only when no count is over its ceiling (and, with --aim, over its aim). A count well under its ceiling is said, with
 * the ceiling it should be lowered to; with --strict that fails too.
 *
 *   bun play/site/scripts/budget.ts --world sandbox-1|sandbox-5|sandbox-3|all [--aim tris,draws,calls] [--strict] [--json <file>]
 *
 * About two minutes a world once its builds are kept (./census/kept.ts), the three in about four.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compare, holds, readBudgets, type Counts, type Row } from './census/budget';

const argv = process.argv.slice(2);
const arg = (k: string) => {
	const i = argv.indexOf(k);
	return i >= 0 ? argv[i + 1] : undefined;
};
const budgets = readBudgets();
const asked = arg('--world') ?? 'all';
const worlds = asked === 'all' ? Object.values(budgets.worlds).map((w) => w.world) : asked.split(',');
for (const w of worlds) if (!Object.values(budgets.worlds).some((x) => x.world === w)) throw new Error(`budget: no world ${w} in budgets.json`);
const aim = arg('--aim')?.split(',') ?? [];
const strict = argv.includes('--strict');
const CENSUS = join(import.meta.dir, 'census.ts');
const dir = mkdtempSync(join(tmpdir(), 'budget-'));

/** a world counted: the census and its frame count, each in its own process as a check runs them */
function countsOf(world: string): Counts {
	const census = join(dir, `${world}.json`), frame = join(dir, `${world}-frame.json`);
	const run = (args: string[]) => execFileSync('bun', [CENSUS, '--world', world, ...args], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 26 });
	run(['--frames', '30', '--json', census]);
	run(['--frame', '--json', frame]);
	const c = JSON.parse(readFileSync(census, 'utf8')), f = JSON.parse(readFileSync(frame, 'utf8'));
	const views: Counts['views'] = {};
	for (const v of c.views) {
		if (!v.settled) throw new Error(`budget: ${world} ${v.view} did not settle: a count of a world still building is no count`);
		views[v.view] = { tris: Math.round(v.totals.tris), draws: Math.round(v.totals.calls) };
	}
	for (const v of f.views) {
		views[v.view] = { ...views[v.view], calls: Math.round(v.still.calls) };
		if (v.walk) views[v.view].walkCalls = Math.round(v.walk.calls);
	}
	return { views, simplified: Math.round(c.lowered?.tris ?? 0) };
}

const n = (x: number | null) => (x === null ? '—' : x < 100 && !Number.isInteger(x) ? x.toFixed(1) : Math.round(x).toLocaleString('en'));
const all: Record<string, Row[]> = {};
let ok = true;
for (const world of worlds) {
	const t0 = performance.now();
	const rows = compare(budgets, world, countsOf(world), aim);
	all[world] = rows;
	ok &&= holds(rows, strict);
	console.log(`\n${world} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
	console.log(`  ${'number'.padEnd(12)} ${'view'.padEnd(6)} ${'aim'.padStart(11)} ${'ceiling'.padStart(12)} ${'now'.padStart(12)}  verdict`);
	for (const r of rows) console.log(`  ${r.what.padEnd(12)} ${(r.view ?? '').padEnd(6)} ${n(r.aim).padStart(11)} ${n(r.ceiling).padStart(12)} ${n(r.now).padStart(12)}  ${r.verdict}${r.verdict === 'not held' ? ` (${r.why})` : ''}`);
	for (const r of rows) if (r.verdict === 'over' || r.verdict === 'lower') console.log(`  ${r.verdict === 'over' ? '✗' : '↓'} ${r.why}`);
}
const json = arg('--json');
if (json) writeFileSync(json, JSON.stringify(all, null, 1));
console.log(`\nbudget: ${ok ? 'every world within its ceilings' : 'a world is over its budget'}`);
process.exit(ok ? 0 : 1);
