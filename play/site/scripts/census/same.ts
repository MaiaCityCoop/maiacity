#!/usr/bin/env bun
/*
 * THE CENSUS, THE SAME EVERY RUN (intent 373050d1): Sandbox 1 counted from near, mid and far `--runs` times in a row
 * (default 5), each a census of its own process, on this checkout or `--at` a commit. Exits 0 only if every view's
 * triangles and draws a frame, and each asset renderer's triangles, draws and copies, are the same in every run, and
 * every view settled.
 *
 *   bun play/site/scripts/census/same.ts [--runs 5] [--at <commit>]
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k: string) => {
	const i = argv.indexOf(k);
	return i >= 0 ? argv[i + 1] : undefined;
};
const runs = Number(arg('--runs') ?? 5);
const at = arg('--at');
const out = mkdtempSync(join(tmpdir(), 'census-same-'));

const counts: Record<string, unknown>[] = [];
let settled = true;
for (let i = 1; i <= runs; i++) {
	const json = join(out, `${i}.json`);
	const p = Bun.spawnSync(['bun', join(import.meta.dir, '..', 'census.ts'), '--world', 'sandbox-1', '--view', 'all', ...(at ? ['--at', at] : []), '--json', json], { stdout: 'ignore', stderr: 'inherit' });
	if (p.exitCode !== 0) throw new Error(`census run ${i} failed`);
	const views = JSON.parse(readFileSync(json, 'utf8')).views;
	const run: Record<string, unknown> = {};
	for (const v of views) {
		settled &&= v.settled;
		run[v.view] = { tris: v.totals.tris, calls: v.totals.calls, settled: v.settled, ...Object.fromEntries(Object.entries(v.renderers).map(([k, r]: [string, any]) => [k, r && [r.tris, r.calls, r.copies]])) };
	}
	counts.push(run);
	console.log(`run ${i}: ${JSON.stringify(run)}`);
}
const same = counts.every((c) => JSON.stringify(c) === JSON.stringify(counts[0]));
console.log(same && settled ? `same: ${runs} runs counted alike at ${Object.keys(counts[0]).join(', ')}, every view settled` : `same: the runs differ${settled ? '' : ', or a view did not settle'}`);
process.exit(same && settled ? 0 : 1);
