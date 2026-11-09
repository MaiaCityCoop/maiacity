// The reduce checks of intent 5884ade4 (untangle-codebase), each a family of bounds taken on main d5346b7.
// `bun intent-work/5884ade4/measure.ts <family>` from the repository's root prints every value with its bound and exits
// 0 only when all are in range; `all` runs every family. Files that open intents' branches change (./held.txt, taken
// when the spec was written) are left out of every count: this intent doesn't touch them.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const sh = (c: string) => execSync(c, { encoding: 'utf8', maxBuffer: 1 << 28 });
const held = new Set(readFileSync('intent-work/5884ade4/held.txt', 'utf8').split('\n').filter(Boolean));
const tracked = sh('git ls-files').split('\n').filter(Boolean);
const SKIP = /^(intent-work|play\/api\/import)\/|(^|\/)(static|node_modules)\//;
const code = tracked.filter((f) => /\.(ts|js|mjs|svelte|sh|yml|yaml|sql)$/.test(f) && !SKIP.test(f) && existsSync(f));
const own = code.filter((f) => !held.has(f));
const isTest = (f: string) => /\.test\.|(^|\/)(test|tests)\/|testkit|fixtures\//.test(f);
const text = new Map<string, string>();
const read = (f: string) => text.get(f) ?? (text.set(f, readFileSync(f, 'utf8')), text.get(f)!);
const count = (files: string[], re: RegExp) =>
	files.reduce((s, f) => s + (read(f).match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))?.length ?? 0), 0);
const filesWith = (files: string[], re: RegExp) => files.filter((f) => re.test(read(f))).length;
const lines = (f: string) => read(f).split('\n').length - (read(f).endsWith('\n') ? 1 : 0);
const under = (p: string) => own.filter((f) => f.startsWith(p));
const graph = () => JSON.parse(sh('bun intent-work/5884ade4/graph.ts json'));
// the check's own words: nothing goes round in a circle "except where a file another open intent is changing keeps it":
// folder cycles counted over the imports of files that aren't held
const heldFreeFolderCycles = () => Number(sh('HELD=intent-work/5884ade4/held.txt bun intent-work/5884ade4/graph.ts json').match(/"modCyclesHeldFree": (\d+)/)![1]);

type Bound = [name: string, value: number, max: number];
const families: Record<string, () => Bound[]> = {
	// every file cycle has a held file in it; the largest is small; folders import in one direction
	cycles: () => {
		const g = graph();
		const free = g.fileCycles.filter((c: string[]) => !c.some((f) => held.has(f)));
		return [
			['file cycles without a held file', free.length, 0],
			['files in the largest file cycle', Math.max(0, ...g.fileCycles.map((c: string[]) => c.length)), 3],
			['folder cycles a held file does not close', heldFreeFolderCycles(), 1]
		];
	},
	// stable folders import nothing less stable (Martin's instability, ./graph.ts unstable)
	layers: () => [['imports of a less stable folder', graph().unstable.length, 10]],
	// play/api: one version control, one intent core, one error, one lock list
	api: () => {
		const src = under('play/api/src/').filter((f) => !isTest(f));
		return [
			['versioned.ts lines', lines('play/api/src/versioned.ts'), 900],
			['mcp.ts bytes', read('play/api/src/mcp.ts').length, 60_000],
			['error classes in play/api/src', count(src, /extends Error\b/), 6],
			['to_jsonb( fallbacks in play/api/src', count(src, /to_jsonb\(/), 0],
			['advisory lock numbers outside locks.ts', count(src.filter((f) => !f.endsWith('/locks.ts')), /advisory_xact_lock\(\d|\b4711\d{3}\b/), 0],
			['schema names written out in mcp.ts and stories.ts', count(['play/api/src/mcp.ts', 'play/api/src/stories.ts'], /["'][a-z_]+\/1["']/), 0],
			['piece special cases in versioned.ts and work.ts', count(['play/api/src/versioned.ts', 'play/api/src/work.ts'], /"piece"|'piece'|'piece:%'|"piece:"/), 0],
			['writers of play.story_versions', count(src, /(insert into|update)\s+play\.story_versions/i), 1],
			['"There is no such intent" copies', count(src, /There is no such intent/), 2]
		];
	},
	// play/site's application: one client, one admin gate, the board, the player and the turntable each one job
	site: () => {
		const S = 'play/site/src/';
		const app = own.filter((f) => /^play\/site\/src\/(routes|lib\/site|lib\/app|lib\/stories|lib\/[^/]+\.(ts|svelte)$)/.test(f) && !isTest(f));
		return [
			['IntentsBoard.svelte lines', lines(S + 'lib/site/intents/IntentsBoard.svelte'), 400],
			['StoryPlayer.svelte lines', lines(S + 'lib/stories/StoryPlayer.svelte'), 450],
			['Turntable.svelte lines', lines(S + 'lib/site/app/Turntable.svelte'), 420],
			['fetch( outside api.ts and call.ts', count(app.filter((f) => !/lib\/(api|call)\.ts$/.test(f)), /\bfetch\(/), 0],
			["level === 'admin' checks", count(under(S), /level === 'admin'/), 4],
			['files spelling /api/files/', filesWith(under(S).filter((f) => !isTest(f)), /\/api\/files\//), 2],
			["'prototype' as a stage in routes", count(under(S + 'routes/'), /'prototype'/), 0]
		];
	},
	// play/site's content: one loader, one hash, one pin ref, the dome cells one page
	content: () => {
		const S = 'play/site/src/';
		const g = graph();
		const edges = sh('bun intent-work/5884ade4/graph.ts edges').split('\n');
		const nonTest = own.filter((f) => !isTest(f));
		return [
			['sandbox-1 page lines', lines(S + 'routes/sandbox-1/+page.svelte'), 80],
			['sandbox-5 page lines', lines(S + 'routes/sandbox-5/+page.svelte'), 80],
			['hash patterns written out', count(nonTest.filter((f) => f.startsWith('play/site/')), /\[0-9a-f\]\{64\}/), 4],
			['pin:${ outside catalog.js', count(nonTest.filter((f) => f.startsWith(S) && !f.endsWith('assets/catalog.js')), /pin:\$\{/), 0],
			['box imports of content/assets', edges.filter((e) => /assets\/box\/[^/ ]+ -> play\/site\/src\/lib\/content\/assets\/[^/]+$/.test(e) && !/\.test\./.test(e)).length, 0],
			['cache.js lines', lines(S + 'lib/content/assets/cache.js'), 350],
			["sandbox slugs ('sandbox-N') in site code", count(nonTest.filter((f) => f.startsWith(S)), /['"]sandbox-\d['"]/), 3],
			['folder cycles a held file does not close (again, for content)', heldFreeFolderCycles(), 1]
		];
	},
	// nothing exported that nothing uses; no file nothing runs
	dead: () => {
		// users count wherever they are: play/api/import's scripts (the deploy's import runs them) are code, its data aren't
		const importers = tracked.filter((f) => /^play\/api\/import\/[^/]+\.(ts|js)$/.test(f) && existsSync(f));
		const all = [...code.filter((f) => /\.(ts|js|mjs|svelte)$/.test(f)), ...importers];
		const corpus = all.map((f) => [f, read(f)] as const);
		let dead = 0;
		const names: string[] = [];
		for (const f of own.filter((f) => /\.(ts|js|mjs|svelte)$/.test(f) && !isTest(f) && !/(^|\/)routes\//.test(f))) {
			for (const m of read(f).matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
				const re = new RegExp(`\\b${m[1].replace(/\$/g, '\\$')}\\b`);
				if (!corpus.some(([g, t]) => g !== f && re.test(t))) { dead++; names.push(`${f}:${m[1]}`); }
			}
		}
		if (process.env.SHOW) console.log(names.join('\n'));
		// the files the audit found nothing runs (decisions.md, Dead): most must go, a few may prove alive in Build
		const DEAD = ['.claude/launch.json', 'play/site/src/lib/site/app/PickList.svelte', 'play/site/scripts/clone.py',
			'deploy/deploy-time.ts', 'play/site/src/lib/content/sandbox-kit/orbit.js', 'play/site/src/lib/content/sandbox-kit/timeline.js',
			'play/site/src/lib/content/sandbox-kit/index.js', 'play/api/scripts/board-speed.ts', 'play/api/scripts/detail-size.ts',
			'play/api/scripts/seed-look.ts', 'play/api/import/plan.ts', 'play/site/src/lib/kernel/sandbox/engines.js'];
		return [
			['exports nothing else uses', dead, 0],
			['files found dead still there (of 12)', DEAD.filter((f) => existsSync(f)).length, 4],
			['files nothing imports or runs', graph().orphans.filter((f: string) => !held.has(f)).length, 0]
		];
	},
	// special cases: swallowed errors, type escapes, sleeps in tests
	special: () => {
		const nonHeld = own;
		return [
			['swallowed errors (empty catch, .catch(() => {}))', count(nonHeld, /catch *(\([^)]*\))? *\{ *\}|\.catch\(\(\) *=> *(\{ *\}|null|undefined|void 0)\)/), 30],
			['as any', count(nonHeld, /as any\b/), 90],
			['sleeps in play/api', count(under('play/api/'), /Bun\.sleep\(|\bsleep\(/), 2]
		];
	},
	// deploy and CI: each constant once
	infra: () => {
		const nonTest = tracked.filter((f) => !isTest(f) && !held.has(f) && !/^intent-work\//.test(f) && existsSync(f) && !/\.(png|jpe?g|webp|ktx2|glb|bin|woff2?|mp[34]|wav|lock)$/.test(f) && !SKIP.test(f));
		return [
			["the required check's name written out (files)", filesWith(nonTest, /play \/ API and site/), 1],
			['AWS_REQUEST_CHECKSUM_CALCULATION', count(nonTest, /AWS_REQUEST_CHECKSUM_CALCULATION/), 1],
			["the bucket's host", count(nonTest, /hel1\.your-objectstorage\.com/), 1],
			["Hetzner DNS's zones endpoint", count(nonTest, /dns\.hetzner\.com\/api\/v1\/zones/), 1],
			['production.yml lines', lines('.github/workflows/production.yml'), 200]
		];
	},
	// play/api's tests share one kit, fail rather than skip, test behaviour not source text
	tests: () => {
		const T = code.filter((f) => /^play\/api\/(test|scripts)\//.test(f) && !held.has(f));
		return [
			['files creating their own database', filesWith(T, /CREATE DATABASE/), 2],
			['call/tool helpers copied', count(T, /const (call|tool) = async/), 0],
			['suites that skip without a database', count(T, /describe\.skip/), 0],
			['sleeps in tests', count(T, /Bun\.sleep\(|\bsleep\(/), 2],
			['calls of MCP tools that are gone', count(T, /propose_story_version|story_edit|['"]propose_version['"]/), 0],
			["tests reading src's source text", count(T, /readFileSync\([^)]*src\//), 0]
		];
	},
	// comments: what restates the code goes; what points at a file points at one that exists
	comments: () => {
		const files = own.filter((f) => /\.(ts|js|mjs|svelte)$/.test(f));
		let commentLines = 0, stale = 0;
		const missing: string[] = [];
		for (const f of files) {
			for (const l of read(f).split('\n')) {
				if (!/^\s*(\/\/|\*|\/\*)/.test(l)) continue;
				commentLines++;
				for (const m of l.matchAll(/(?<![\w/.])((?:\.\.?\/)+[\w.\-/]+\.(?:ts|js|mjs|svelte|sql|sh|json))\b/g)) {
					const p = normalize(join(dirname(f), m[1]));
					if (!existsSync(p) && !existsSync(p.replace(/\.js$/, '.ts'))) { stale++; missing.push(`${f}: ${m[1]}`); }
				}
			}
		}
		if (process.env.SHOW) console.log(missing.join('\n'));
		return [
			['comment lines', commentLines, 9_400],
			['comments naming a file that is gone', stale, 0]
		];
	}
};

const want = process.argv[2] ?? 'all';
let ok = true;
for (const [name, f] of Object.entries(families)) {
	if (want !== 'all' && want !== name) continue;
	for (const [what, v, max] of f()) {
		const pass = v <= max;
		ok &&= pass;
		console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}: ${what} ${v.toLocaleString('en')} (at most ${max.toLocaleString('en')})`);
	}
}
if (!(want === 'all' || want in families)) { console.error(`no family ${want}: ${Object.keys(families).join(', ')}`); process.exit(2); }
process.exit(ok ? 0 : 1);
