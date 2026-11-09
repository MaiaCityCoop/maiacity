#!/usr/bin/env bun
/*
 * HOW SOON SANDBOX 1 IS QUIET, COLD AND WARM (intent 7af6e162, c3): Sandbox 1 built on the CPU (./run.ts) twice, each
 * a process of its own, on one fresh asset cache (OPFS on disk, ./opfs.ts): the first with nothing kept (cold, as a
 * device's first visit, or a Mac job in a fresh browser profile), the second reading what the first kept (warm, a second
 * visit). For each: the seconds until the world is quiet (../quiet.js), the pictures taken, and the pictures taken on a
 * 30 m walk from near in 1 m steps (each step a few frames, then quiet again).
 *
 *   bun play/site/scripts/census/settle.ts [--max 20]
 *
 * Exits 0 only if the warm load is quiet within --max seconds (20), took no picture, and took none on its walk.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const SITE = resolve(import.meta.dir, '../..');
type Load = { quiet: boolean; seconds: number; taken: number; walkTaken: number; walkQuiet: boolean; copies: number };

if (argv[0] === '--one') {
	// one load, in this process: the cache is CENSUS_CACHE, as the parent made it
	const { setup } = await import('./setup');
	setup({ inputs: join(SITE, 'scripts/census/inputs'), cache: process.env.CENSUS_CACHE });
	const { mountSandbox1, untilQuiet, VIEWS } = await import('./run');
	const { taken } = await import('../quiet.js');
	const g = globalThis as any;
	const t0 = performance.now();
	await mountSandbox1(() => {});
	const quiet = await untilQuiet(180_000);
	const seconds = +((performance.now() - t0) / 1000).toFixed(1);
	const n = VIEWS.near;
	g.__walker.place(n.x, n.z, n.yaw, n.pitch);
	await untilQuiet(180_000);
	const before = taken(g) ?? 0;
	// 30 m from near towards the master dome, a metre a step
	for (let m = 1; m <= 30; m++) {
		g.__walker.place(n.x, n.z - m, n.yaw, n.pitch);
		await untilQuiet(150);
	}
	const walkQuiet = await untilQuiet(180_000);
	const s = g.__assets.stats();
	const load: Load = { quiet, seconds, taken: before, walkTaken: (taken(g) ?? 0) - before, walkQuiet, copies: ['out', 'in', 'library'].reduce((a, k) => a + (s[k]?.copies ?? 0), 0) };
	console.log(JSON.stringify(load));
	process.exit(0);
}

const max = Number(argv[argv.indexOf('--max') + 1] || 20);
const cache = mkdtempSync(join(tmpdir(), 'census-settle-'));
// play's files by hash, as the census keeps them (what they name never changes): the world's inputs, not its cache
const files = join(resolve(process.env.CENSUS_CACHE ?? join(homedir(), '.cache/maiacity-census')), 'files');
if (existsSync(files)) symlinkSync(files, join(cache, 'files'));
const loads: Record<string, Load> = {};
try {
	for (const name of ['cold', 'warm']) {
		const r = spawnSync('bun', [import.meta.path, '--one'], { env: { ...process.env, CENSUS_CACHE: cache }, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
		const line = r.stdout.trim().split('\n').pop() ?? '';
		if (r.status !== 0 || !line.startsWith('{')) throw new Error(`settle: the ${name} load failed (${r.status})`);
		loads[name] = JSON.parse(line);
	}
} finally {
	rmSync(cache, { recursive: true, force: true });
}
console.table(Object.entries(loads).map(([load, l]) => ({ load, 'quiet after (s)': l.seconds, quiet: l.quiet, 'pictures taken': l.taken, 'taken on a 30 m walk': l.walkTaken, copies: l.copies })));
const w = loads.warm;
const ok = w.quiet && w.walkQuiet && w.seconds <= max && w.taken === 0 && w.walkTaken === 0;
console.log(`settle: warm ${w.seconds} s (at most ${max}), ${w.taken} pictures taken, ${w.walkTaken} on the walk: ${ok ? 'ok' : 'NOT ok'} (cold ${loads.cold.seconds} s, ${loads.cold.taken} taken, ${loads.cold.walkTaken} on the walk)`);
process.exit(ok ? 0 : 1);
