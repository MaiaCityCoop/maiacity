#!/usr/bin/env bun
/*
 * THE CENSUS — what a world draws from each named camera, counted on the CPU in avenBOX in Bun, no GPU and no WebGL
 * context (intent bba45d6e; ./census/). The world is built by its own code with three.js, its renderer swapped for one
 * that counts every draw three would send (./census/counting.js), and the Mac then measures only the frame time.
 *
 *   bun play/site/scripts/census.ts [--world sandbox-1] [--view near|mid|far|all] [--at <commit>]
 *                                   [--inputs <dir>] [--record] [--json <file>] [--copies]
 *
 * --at <commit>   that commit's play/site, checked out in a worktree under the census's cache (this checkout's
 *                 node_modules and frozen engines), so an intent's base and head are counted alike
 * --inputs <dir>  play's routes as they were pinned there (./census/run5/: Sandbox 1's layout and the catalog of run 5);
 *                 none: read live from play.maia.city with PLAY_MCP_TOKEN. --record pins what is read live into it.
 * --json <file>   every view's census as JSON (each copy, each frame, the totals)
 * --copies        a table of each kind's copies drawn as shapes, the costliest first
 *
 * Prints per view: triangles a frame (main pass and shadows), draws (meshes, instanced batches), what culling removed,
 * each asset renderer's triangles, draws, copies, pictures and ghosts (copies put away yet still drawn: ./census/run.ts
 * `Copy`), and each kind's copies when asked.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k: string) => {
	const i = argv.indexOf(k);
	return i >= 0 ? argv[i + 1] : undefined;
};
const world = arg('--world') ?? 'sandbox-1';
if (world !== 'sandbox-1') throw new Error(`census: no world ${world} (sandbox-1)`);
const view = arg('--view') ?? 'all';
const views = (view === 'all' ? ['near', 'mid', 'far'] : view.split(',')) as ('near' | 'mid' | 'far')[];
const at = arg('--at');
const SITE = resolve(import.meta.dir, '..');
const REPO = resolve(SITE, '../..');
const CACHE = resolve(process.env.CENSUS_CACHE ?? join(process.env.HOME ?? '/tmp', '.cache/maiacity-census'));

/** a commit's tree, checked out once under the cache (detached), with this checkout's node_modules */
function treeAt(commit: string) {
	const sha = execFileSync('git', ['-C', REPO, 'rev-parse', '--verify', `${commit}^{commit}`], { encoding: 'utf8' }).trim();
	const dir = join(CACHE, 'trees', sha);
	if (!existsSync(join(dir, 'play/site/src'))) {
		mkdirSync(join(CACHE, 'trees'), { recursive: true });
		try {
			execFileSync('git', ['-C', REPO, 'cat-file', '-e', sha]);
		} catch {
			execFileSync('git', ['-C', REPO, 'fetch', '--quiet', 'origin', sha]);
		}
		execFileSync('git', ['-C', REPO, 'worktree', 'add', '--force', '--detach', dir, sha], { stdio: 'ignore' });
	}
	const nm = join(dir, 'play/site/node_modules');
	if (!existsSync(nm)) symlinkSync(join(SITE, 'node_modules'), nm);
	return { sha, root: join(dir, 'play/site') };
}

const tree = at ? treeAt(at) : null;
const { setup } = await import('./census/setup');
setup({ root: tree?.root, inputs: arg('--inputs') && resolve(arg('--inputs')!), record: argv.includes('--record'), cache: CACHE });
const { censusOf } = await import('./census/run');
const t0 = performance.now();
const got = await censusOf({ world: 'sandbox-1', views, log: (s) => console.error(s) });
const seconds = (performance.now() - t0) / 1000;

const n = (x: number) => Math.round(x).toLocaleString('en');
for (const v of got) {
	const t = v.totals;
	console.log(`\n${v.world} ${v.view}${tree ? ` at ${tree.sha.slice(0, 9)}` : ''}${v.settled ? '' : ' (still building)'}`);
	console.log(`  triangles a frame  ${n(t.tris)}  (main ${n(t.mainTris)}, shadow ${n(t.shadowTris)}, into targets ${n(t.targetTris)})`);
	console.log(`  draws              ${n(t.calls)}  (meshes ${n(t.meshes)}, instanced batches ${n(t.instanced)} of ${n(t.instances)} instances, shadow ${n(t.shadowCalls)})`);
	console.log(`  culled             ${n(t.culledObjects)} objects, ${n(t.culledTris)} triangles`);
	for (const [k, r] of Object.entries(v.renderers)) if (r) console.log(`  ${k.padEnd(8)}           ${n(r.tris)} triangles, ${r.calls} draws, ${n(r.copies)} copies (${n(r.pictures)} pictures, ${n(v.copies.filter((c) => c.renderer === k && c.ghost).length)} ghosts), shapes ${n(v.shapeTris[k] ?? 0)} triangles`);
	if (argv.includes('--copies')) {
		const rows = new Map<string, { renderer: string; kind: string; shapes: number; pictures: number; tris: number; farthest: number }>();
		for (const c of v.copies) {
			const key = `${c.renderer} ${c.kind}`;
			const r = rows.get(key) ?? { renderer: c.renderer, kind: c.kind.slice(0, 40), shapes: 0, pictures: 0, tris: 0, farthest: 0 };
			if (typeof c.level === 'number') (r.shapes++, (r.tris += c.tris ?? 0), (r.farthest = Math.max(r.farthest, c.d)));
			else if (c.level === 'picture') r.pictures++;
			rows.set(key, r);
		}
		console.table([...rows.values()].sort((a, b) => b.tris - a.tris).slice(0, 40));
	}
}
console.log(`\ncensus: ${views.length} view${views.length > 1 ? 's' : ''} in ${seconds.toFixed(1)} s`);
const json = arg('--json');
if (json) writeFileSync(json, JSON.stringify({ world, at: tree?.sha ?? null, seconds, views: got }));
process.exit(0);
