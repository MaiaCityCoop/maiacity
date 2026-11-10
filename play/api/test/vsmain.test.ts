// A blind count is no bound (play/avenbox/vs-main.ts; intent 009e04d3): since the renderer switch the census counted 1
// triangle and 1 draw a view, the final screen quad, and "main 1 → head 1" passed on nothing. A census comparison where
// either side counts at most 1 draw in a view fails, naming the view and the side: as it is measured, and where only
// stored values are seen (compare's side files, --fold). A fake census here, no world, no network.
import { beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const TMP = mkdtempSync(join(tmpdir(), "vsmain-"));
process.env.VS_MAIN_CACHE = join(TMP, "cache");
process.env.CENSUS_CACHE = join(TMP, "census-cache");
// what a run in the box sets for a check's command (intent.ts, intents-pr.yml) is not these tests': they decide alike wherever they run
for (const k of ["VS_MAIN", "VS_MAIN_HEAD_OUT", "INTENT_CHECK"]) delete process.env[k];
const VS_MAIN = resolve(import.meta.dir, "../../avenbox/vs-main.ts");
const vm = await import("../../avenbox/vs-main");

const CENSUS = { what: "census" as const, args: ["sandbox-1", "all", "tris"] };
const SHA = "0123456789abcdef0123456789abcdef01234567";
const SEEING = { "near tris": 900_000, "near draws": 2_000, "far tris": 400_000, "far draws": 1_500 };
const side = (which: "main" | "head", values: Record<string, number>, measure = { ...CENSUS, args: ["sandbox-1", "all", "tris,draws"] }) => ({
  side: which,
  sha: which === "main" ? SHA : null,
  measures: { [vm.measureId(measure)]: { measure, values } },
});
const put = (name: string, v: unknown) => {
  const f = join(TMP, name);
  writeFileSync(f, JSON.stringify(v));
  return f;
};
const compare = (main: string, head: string) => {
  const r = Bun.spawnSync(["bun", VS_MAIN, "compare", main, head, "--within", "3%"]);
  return { code: r.exitCode, out: `${r.stdout}${r.stderr}` };
};
/** a repository whose census answers `draws` draws in near and 2,000 in far, whatever is asked of it */
const repoCounting = (draws: number) => {
  const repo = mkdtempSync(join(TMP, "repo-"));
  mkdirSync(join(repo, "play/site/scripts"), { recursive: true });
  writeFileSync(
    join(repo, "play/site/scripts/census.ts"),
    `import { writeFileSync } from 'node:fs';
const a = process.argv.slice(2);
const v = (view, calls) => ({ view, settled: true, totals: { tris: calls * 400, calls, mainTris: calls * 300, mainCalls: calls } });
writeFileSync(a[a.indexOf('--json') + 1], JSON.stringify({ views: [v('near', ${draws}), v('far', 2000)] }));
`,
  );
  return repo;
};

test("a blind census is no bound", () => {
  const seeingMain = put("main.json", side("main", SEEING));
  const seeingHead = put("head.json", side("head", SEEING));

  // a seeing census keeps its bound
  const seen = compare(seeingMain, seeingHead);
  expect(seen.out).toMatch(/vs-main: within the bound of main 012345678/);
  expect(seen.code).toBe(0);

  // main blind in near: 1 → 1 is in every bound, and still fails, naming main and the view
  const blindMain = compare(put("main-blind.json", side("main", { ...SEEING, "near tris": 1, "near draws": 1 })), put("head-1.json", side("head", { ...SEEING, "near tris": 1, "near draws": 1, "far draws": 1_400 })));
  expect(blindMain.code).not.toBe(0);
  expect(blindMain.out).toMatch(/census of main 012345678: near is blind \(draws 1\)/);
  expect(blindMain.out).toMatch(/census of the head: near is blind/);
  expect(blindMain.out).not.toMatch(/far is blind/);
  expect(blindMain.out).toMatch(/vs-main: no bound of main 012345678: the census is blind/);
  expect(blindMain.out).not.toMatch(/within the bound/);

  // the head alone blind, in far, by its main pass: fewer draws than main, in the bound, and no bound
  const mainPass = { ...CENSUS, args: ["sandbox-1", "all", "mainTris,mainDraws"] };
  const blindHead = compare(put("main-pass.json", side("main", { "near mainDraws": 2_000, "far mainDraws": 1_500 }, mainPass)), put("head-blind.json", side("head", { "near mainDraws": 2_000, "far mainDraws": 0 }, mainPass)));
  expect(blindHead.code).not.toBe(0);
  expect(blindHead.out).toMatch(/census of the head: far is blind \(mainDraws 0\)/);
  expect(blindHead.out).not.toMatch(/census of main/);
  expect(blindHead.out).not.toMatch(/near is blind/);

  // the same by the functions: stored values of either side, and a deferred head folded into its check
  expect(vm.blind(SEEING, "the head")).toEqual([]);
  expect(vm.report(CENSUS, SEEING, SEEING, { kind: "within", pct: 3 }, SHA).ok).toBe(true);
  expect(vm.report(CENSUS, { ...SEEING, "far draws": 1 }, SEEING, { kind: "within", pct: 3 }, SHA).ok).toBe(false);
  const folded = vm.fold({ results: [{ check: "c5", pass: true, code: 0, evidence: "ran" }] }, side("main", SEEING), [{ check: "c5", call: ["census", "--within", "3%"], values: { ...SEEING, "near draws": 1 } }]);
  expect(folded.results[0]).toMatchObject({ pass: false, code: 1 });
  expect(folded.results[0].evidence).toMatch(/census of the head: near is blind/);
  // only a census: another measure's 1 is a number like any
  expect(vm.report({ what: "count", args: ["echo 1"] }, { count: 1 }, { count: 1 }, { kind: "within", pct: 0 }, SHA).ok).toBe(true);

  // as it is measured: the draws are read though only triangles were asked for, the head's and main's
  const blindRepo = repoCounting(1);
  expect(() => vm.measure(CENSUS, null, blindRepo)).toThrow(/census of the head: near is blind \(draws 1\): it counted the screen quad, not the scene/);
  expect(() => vm.measure(CENSUS, SHA, blindRepo)).toThrow(/census of main 012345678: near is blind \(draws 1\)/);
  expect(vm.measure(CENSUS, null, repoCounting(2_000))).toEqual({ "near tris": 800_000, "far tris": 800_000 });

  // and by the command, one side measured on its own: it exits non-zero and writes no values
  const out = join(TMP, "side.json");
  const cli = Bun.spawnSync(["bun", VS_MAIN, "census", "--of", "tris", "--side", "head", "--out", out, "--repo", blindRepo]);
  expect(cli.exitCode).not.toBe(0);
  expect(`${cli.stderr}`).toMatch(/census of the head: near is blind/);
  expect(() => readFileSync(out)).toThrow();
});

// vs-main.ts's own tests (intents f63774a3, 006eb26a): tolerances, comparing, finding main, the cache keyed by what a
// measure reads, bytes, lines, counts and a census against main in temp git repositories, one step and measured apart.
// intents-pr.yml's jobs are workflows.test.ts's.
const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const git = (repo: string, ...a: string[]) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const commit = (repo: string, file: string, text: string, msg = file) => {
	writeFileSync(join(repo, file), text);
	git(repo, 'add', '-A');
	git(repo, 'commit', '-qm', msg);
	return git(repo, 'rev-parse', 'HEAD');
};

describe('bounds', () => {
	test('a tolerance is a percentage', () => {
		expect(vm.parsePct('3%')).toBe(3);
		expect(vm.parsePct('0.5')).toBe(0.5);
		expect(vm.parsePct('0%')).toBe(0);
		expect(() => vm.parsePct('-3%')).toThrow();
		expect(() => vm.parsePct('three')).toThrow();
	});
	test('--within lets the head grow by N %, --down asks it to shrink by N %', () => {
		expect(vm.limit(100, { kind: 'within', pct: 3 })).toBeCloseTo(103);
		expect(vm.limit(100, { kind: 'down', pct: 5 })).toBeCloseTo(95);
		const rows = vm.compare({ a: 100, b: 100 }, { a: 103, b: 104 }, { kind: 'within', pct: 3 });
		expect(rows.map((r) => r.ok)).toEqual([true, false]);
		expect(vm.compare({ a: 100 }, { a: 96 }, { kind: 'down', pct: 5 })[0].ok).toBe(false);
		expect(vm.compare({ a: 100 }, { a: 95 }, { kind: 'down', pct: 5 })[0].ok).toBe(true);
	});
	test('a tolerance per value, by the start of its key, the longest that fits', () => {
		const b = vm.parseBound('within', 'near:7%,mid:5%,far:11%,far draws:2%');
		expect(vm.pctOf(b, 'near tris')).toBe(7);
		expect(vm.pctOf(b, 'far tris')).toBe(11);
		expect(vm.pctOf(b, 'far draws')).toBe(2);
		expect(() => vm.pctOf(b, 'open tris')).toThrow();
		const rows = vm.compare({ 'near tris': 100, 'mid tris': 100 }, { 'near tris': 107, 'mid tris': 106 }, b);
		expect(rows.map((r) => r.ok)).toEqual([true, false]);
		expect(vm.parse(['census', '--down', 'near:1%,far:2%']).bound?.by).toEqual({ near: 1, far: 2 });
	});
	test('a value main has not counts against 0', () => {
		const [r] = vm.compare({}, { 'near tris': 5 }, { kind: 'within', pct: 3 });
		expect(r).toMatchObject({ main: 0, head: 5, ok: false });
		expect(vm.compare({ x: 0 }, { x: 0 }, { kind: 'within', pct: 0 })[0].ok).toBe(true);
	});
});

describe('arguments', () => {
	test('census: world, views and values, with their defaults', () => {
		expect(vm.parse(['census', '--world', 'sandbox-3', '--within', '3%']).measure).toEqual({ what: 'census', args: ['sandbox-3', 'all', 'tris,draws'] });
		const p = vm.parse(['census', '--view', 'far', '--of', 'tris', '--down', '10%']);
		expect(p.measure?.args).toEqual(['sandbox-1', 'far', 'tris']);
		expect(p.bound).toEqual({ kind: 'down', pct: 10 });
	});
	test('bytes and lines take files in any order as one measure; count one command', () => {
		expect(vm.parse(['bytes', 'b', 'a', '--within', '0%']).measure?.args).toEqual(['a', 'b']);
		expect(vm.parse(['count', 'ls x | wc -l', '--within', '0%']).measure?.args).toEqual(['ls x | wc -l']);
	});
	test('refused: two bounds, an unknown measure, nothing to measure', () => {
		expect(() => vm.parse(['bytes', 'a', '--within', '1%', '--down', '1%'])).toThrow();
		expect(() => vm.parse(['weight', 'a'])).toThrow();
		expect(() => vm.parse(['bytes', '--within', '1%'])).toThrow();
	});
	test("a check's run: every vs-main call, quotes kept, up to the shell's next operator", () => {
		const run = `! grep -q x f && bun play/avenbox/vs-main.ts bytes a.ts b.ts --down 5% && bun play/avenbox/vs-main.ts count 'ls src | wc -l' --within 0%; echo done`;
		expect(vm.callsIn(run)).toEqual([
			['bytes', 'a.ts', 'b.ts', '--down', '5%'],
			['count', 'ls src | wc -l', '--within', '0%']
		]);
		expect(vm.words(`a "b c" 'd "e"' f\\ g`)).toEqual(['a', 'b c', 'd "e"', 'f g']);
	});
});

describe('against main in a git repository', () => {
	let origin: string, work: string, base: string, tip: string;
	beforeAll(() => {
		origin = join(TMP, 'origin');
		execFileSync('git', ['init', '-q', '-b', 'main', origin]);
		// as GitHub, it hands out any commit by its hash (a pull request's head)
		git(origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
		commit(origin, 'a.txt', 'one\ntwo\n');
		base = commit(origin, 'n.txt', '3\n');
		work = join(TMP, 'work');
		execFileSync('git', ['clone', '-q', origin, work]);
		git(work, 'checkout', '-qb', 'intent');
		commit(work, 'a.txt', 'one\ntwo\nthree\n', 'head grows a.txt');
		commit(work, 'b.txt', 'new\n', 'head adds b.txt');
		// main moves on after the intent branched: its merge base stays main
		tip = commit(origin, 'n.txt', '9\n', 'main moves');
	});

	test("main is the merge base of the head and origin/main, not main's tip", () => {
		expect(vm.mainOf(work)).toBe(base);
		expect(base).not.toBe(tip);
	});
	test('a shallow clone is deepened until it has the merge base', () => {
		const shallow = join(TMP, 'shallow');
		execFileSync('git', ['clone', '-q', '--depth=1', '--branch', 'main', `file://${origin}`, shallow]);
		git(shallow, 'fetch', '-q', '--depth=1', `file://${work}`, 'intent');
		git(shallow, 'checkout', '-q', 'FETCH_HEAD');
		git(shallow, 'remote', 'set-url', 'origin', `file://${origin}`);
		// the head's own commits came from work: put them on origin, as GitHub holds a pull request's head
		git(work, 'push', '-q', origin, 'intent:refs/heads/intent');
		expect(git(shallow, 'rev-parse', '--is-shallow-repository')).toBe('true');
		expect(vm.mainOf(shallow)).toBe(base);
	});
	test("bytes and lines: main's read from git, a file missing on main counts 0", () => {
		const m = { what: 'bytes' as const, args: ['a.txt', 'b.txt'] };
		expect(vm.measure(m, base, work)).toEqual({ bytes: 8 });
		expect(vm.measure(m, null, work)).toEqual({ bytes: 18 });
		expect(vm.measure({ what: 'lines', args: ['a.txt'] }, base, work)).toEqual({ lines: 2 });
		expect(vm.measure({ what: 'lines', args: ['a.txt'] }, null, work)).toEqual({ lines: 3 });
	});
	test("count: the command run in main's tree and in the head", () => {
		const m = { what: 'count' as const, args: ['ls *.txt | wc -l'] };
		expect(vm.measure(m, base, work)).toEqual({ count: 2 });
		expect(vm.measure(m, null, work)).toEqual({ count: 3 });
	});
	test('main is measured once per main commit: the second time from the cache, nothing run', () => {
		const ran = join(TMP, 'ran');
		writeFileSync(ran, '');
		const m = { what: 'count' as const, args: [`echo x >> ${ran}; cat n.txt`] };
		const logs: string[] = [];
		expect(vm.mainValues(m, base, work, (s) => logs.push(s))).toEqual({ count: 3 });
		expect(vm.mainValues(m, base, work, (s) => logs.push(s))).toEqual({ count: 3 });
		expect(readFileSync(ran, 'utf8')).toBe('x\n');
		expect(logs[0]).toMatch(/measured in/);
		expect(logs[1]).toMatch(new RegExp(`^main ${base.slice(0, 9)} .* from cache$`));
	});
	test('cache key: the same at two mains where what the measure reads is the same, another where it changed', () => {
		// tip changed n.txt only: a.txt's measures keep their key, n.txt's and a count's (the whole tree) do not
		const a = { what: 'bytes' as const, args: ['a.txt'] };
		expect(vm.keyOf(a, base, work)).toBe(vm.keyOf(a, tip, work));
		expect(vm.keyOf({ what: 'lines', args: ['n.txt'] }, base, work)).not.toBe(vm.keyOf({ what: 'lines', args: ['n.txt'] }, tip, work));
		const count = { what: 'count' as const, args: ['ls | wc -l'] };
		expect(vm.keyOf(count, base, work)).not.toBe(vm.keyOf(count, tip, work));
		// the calls are in it: another file, another measure
		expect(vm.keyOf(a, base, work)).not.toBe(vm.keyOf({ what: 'bytes', args: ['b.txt'] }, base, work));
		expect(vm.keyOf(a, base, work)).not.toBe(vm.keyOf({ what: 'lines', args: ['a.txt'] }, base, work));
		expect(vm.cacheFile(base, a, work).startsWith(process.env.VS_MAIN_CACHE!)).toBe(true);
		expect(() => vm.keyOf(a, 'f'.repeat(7), work)).toThrow(/no commit/);
	});
	test('cache key: main measured again only when what it reads changed, else read from the cache', () => {
		const logs: string[] = [];
		const m = { what: 'lines' as const, args: ['a.txt'] };
		expect(vm.mainValues(m, base, work, (s) => logs.push(s))).toEqual({ lines: 2 });
		expect(vm.mainValues(m, tip, work, (s) => logs.push(s))).toEqual({ lines: 2 });
		expect(logs[0]).toMatch(/measured in/);
		expect(logs[1]).toMatch(new RegExp(`^main ${tip.slice(0, 9)} .* from cache$`));
		const n = { what: 'lines' as const, args: ['n.txt'] };
		vm.mainValues(n, base, work, (s) => logs.push(s));
		vm.mainValues(n, tip, work, (s) => logs.push(s));
		expect(logs.slice(2).every((l) => /measured in/.test(l))).toBe(true);
	});
	test('the command line: within the bound exits 0, out of it 1, as it prints', () => {
		const cli = (...a: string[]) => {
			try {
				return { code: 0, out: execFileSync('bun', [VS_MAIN, ...a, '--repo', work], { cwd: work, encoding: 'utf8', env: ENV }) };
			} catch (e: any) {
				return { code: e.status as number, out: String(e.stdout) };
			}
		};
		// the CLI measures the repository it is given, main named by --main: n.txt the head leaves as main has it. Never
		// the checkout these tests run in: a pull request's head on GitHub has no origin/main (intent 629840f2)
		const same = 'n.txt', here = base;
		const ok = cli('lines', same, '--within', '0%', '--main', here);
		expect(ok.code).toBe(0);
		expect(ok.out).toMatch(/within the bound of main/);
		const off = cli('bytes', same, '--down', '1%', '--main', here);
		expect(off.code).toBe(1);
		expect(off.out).toMatch(/OFF/);
	});
});

describe('cache key: what a census reads', () => {
	let repo: string;
	beforeAll(() => {
		repo = join(TMP, 'census-reads');
		mkdirSync(join(repo, 'play/site'), { recursive: true });
		mkdirSync(join(repo, 'play/api/src/kit'), { recursive: true });
		execFileSync('git', ['init', '-q', '-b', 'main', repo]);
		writeFileSync(join(repo, 'play/api/src/kit/ids.ts'), 'export const A = 1;\n');
		writeFileSync(join(repo, 'play/api/src/other.ts'), '1\n');
		commit(repo, 'play/site/world.js', '1\n');
	});
	test('cache key: a census is keyed by the site and the id table it imports, nothing else of the repository', () => {
		const census = { what: 'census' as const, args: ['sandbox-1', 'all', 'tris,draws'] };
		const k0 = vm.keyOf(census, git(repo, 'rev-parse', 'HEAD'), repo);
		const k1 = vm.keyOf(census, commit(repo, 'play/api/src/other.ts', '2\n'), repo);
		expect(k1).toBe(k0);
		const k2 = vm.keyOf(census, commit(repo, 'play/api/src/kit/ids.ts', 'export const A = 2;\n'), repo);
		expect(k2).not.toBe(k1);
		const k3 = vm.keyOf(census, commit(repo, 'play/site/world.js', '2\n'), repo);
		expect(k3).not.toBe(k2);
		expect(vm.keyOf({ ...census, args: ['sandbox-3', 'all', 'tris,draws'] }, git(repo, 'rev-parse', 'HEAD'), repo)).not.toBe(k3);
	});
	test("cache key: every file the census can load from outside play/site (the site's code, census.ts's imports) is among what it reads", () => {
		const ROOT = resolve(import.meta.dir, '../../..');
		const outside = new Set<string>(), seen = new Set<string>();
		const IMPORT = /(?:from|import\(|import)\s*['"]((?:\.\.?\/)[^'"\s]+)['"]/g;
		const real = (f: string) => [f, `${f}.ts`, `${f}.js`, join(f, 'index.ts'), join(f, 'index.js')].find((x) => existsSync(x) && statSync(x).isFile());
		// a file's relative imports: those outside play/site kept, those inside followed
		const follow = (file: string) => {
			if (seen.has(file)) return;
			seen.add(file);
			for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
				const to = resolve(dirname(file), m[1]), rel = to.slice(ROOT.length + 1);
				if (!rel.startsWith('play/site/')) outside.add(rel);
				else if (real(to)) follow(real(to)!);
			}
		};
		const walk = (dir: string) => {
			for (const e of readdirSync(dir, { withFileTypes: true })) {
				const f = join(dir, e.name);
				if (e.isDirectory()) {
					if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(f);
				} else if (/\.(ts|js|svelte)$/.test(e.name) && !/\.test\.[jt]s$/.test(e.name)) follow(f);
			}
		};
		walk(join(ROOT, 'play/site/src'));
		follow(join(ROOT, 'play/site/scripts/census.ts'));
		expect(seen.has(join(ROOT, 'play/site/scripts/census/run.ts'))).toBe(true);
		expect(outside.size).toBeGreaterThan(0);
		for (const f of outside) expect([f, vm.CENSUS_READS.some((p) => f === p || f.startsWith(`${p}/`))]).toEqual([f, true]);
	});
});

describe('measured apart: each side on its own, compared after', () => {
	// a census as census.ts answers it, its triangles read from tris.txt at --at (git show) or in its tree
	const FAKE = `import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const a = process.argv.slice(2), o = (k) => a[a.indexOf(k) + 1];
const at = a.includes('--at') ? o('--at') : null;
const [near, far] = (at ? execFileSync('git', ['show', at + ':tris.txt'], { encoding: 'utf8' }) : readFileSync('tris.txt', 'utf8')).trim().split(' ').map(Number);
const v = (view, tris) => ({ view, settled: true, totals: { tris, calls: 10, mainTris: tris, mainCalls: 10 } });
writeFileSync(o('--json'), JSON.stringify({ views: [v('near', near), v('far', far)] }));
`;
	let repo: string, main: string, n = 0;
	const out = () => join(TMP, `apart-${++n}`);
	const cli = (env: Record<string, string>, ...a: string[]) => {
		const own = a[0] === 'compare' || a[0] === '--fold' ? [] : ['--repo', repo];
		const r = Bun.spawnSync(['bun', VS_MAIN, ...a, ...own], { cwd: repo, env: { ...ENV, VS_MAIN_CACHE: join(TMP, 'apart-cache'), ...env } });
		return { code: r.exitCode, out: `${r.stdout}`, err: `${r.stderr}` };
	};
	/** the comparison's own lines: what the one step, compare and fold all print */
	const rows = (s: string) => s.split('\n').filter((l) => /^ {2}(ok |OFF)|^vs-main: (within|out)/.test(l));
	beforeAll(() => {
		repo = join(TMP, 'apart');
		mkdirSync(join(repo, 'play/site/scripts'), { recursive: true });
		execFileSync('git', ['init', '-q', '-b', 'main', repo]);
		writeFileSync(join(repo, 'play/site/scripts/census.ts'), FAKE);
		main = commit(repo, 'tris.txt', '1000 500\n');
		git(repo, 'checkout', '-qb', 'head');
		commit(repo, 'tris.txt', '1020 505\n', 'the head draws 2 % and 1 % more');
	});

	test('measured apart: a census of main in its own checkout (in place) equals the census at --at', () => {
		const census = { what: 'census' as const, args: ['sandbox-1', 'all', 'tris,draws'] };
		const at = vm.measure(census, main, repo);
		expect(at).toEqual({ 'near tris': 1000, 'near draws': 10, 'far tris': 500, 'far draws': 10 });
		const clone = join(TMP, 'apart-main');
		execFileSync('git', ['clone', '-q', repo, clone]);
		git(clone, 'checkout', '-q', main);
		expect(vm.measure(census, main, clone)).toEqual(at);
	});

	for (const [bound, code] of [['3%', 0], ['1.5%', 1]] as const) {
		test(`measured apart: --within ${bound} measured apart and compared equals the one step (exit ${code})`, () => {
			const one = cli({}, 'census', '--within', bound, '--main', main);
			expect(one.code).toBe(code);
			const dir = out(), m = join(dir, 'main.json'), h = join(dir, 'head.json');
			expect(cli({}, 'census', '--side', 'main', '--main', main, '--out', m).code).toBe(0);
			expect(cli({}, 'census', '--side', 'head', '--out', h).code).toBe(0);
			expect(JSON.parse(readFileSync(m, 'utf8')).sha).toBe(main);
			const two = cli({}, 'compare', m, h, '--within', bound);
			expect(two.code).toBe(code);
			expect(rows(two.out)).toEqual(rows(one.out));
			expect(rows(one.out).length).toBe(5);
		});

		test(`measured apart: deferred in the run job, main measured beside it and folded, the same verdict (--within ${bound})`, () => {
			const run = `bun play/avenbox/vs-main.ts census --within ${bound}`;
			const dir = out(), heads = join(dir, 'heads'), spec = join(dir, 'spec.json');
			mkdirSync(dir, { recursive: true });
			writeFileSync(spec, JSON.stringify({ intent: { id: 'x' }, checks: [{ id: 'c5', run }] }));
			// the head alone, exit 0, the call and its values kept for its check
			const d = cli({ VS_MAIN_HEAD_OUT: heads, INTENT_CHECK: 'c5' }, 'census', '--within', bound);
			expect(d.code).toBe(0);
			expect(d.out).toMatch(/compared with main once main is measured/);
			const files = readdirSync(heads);
			expect(files.length).toBe(1);
			expect(JSON.parse(readFileSync(join(heads, files[0]), 'utf8'))).toMatchObject({ check: 'c5', call: ['census', '--within', bound, '--repo', repo] });
			// main's job: every call of the spec, at main
			expect(cli({}, '--main-of', spec, '--main', main, '--out', join(dir, 'main.json')).code).toBe(0);
			writeFileSync(join(dir, 'results.json'), JSON.stringify({ intent: 'x', results: [{ check: 'c5', how: 'test', must: true, pass: true, code: 0, evidence: `$ ${run}\nexit 0` }, { check: 'c6', how: 'test', must: true, pass: true, code: 0, evidence: 'ok' }] }));
			expect(cli({}, '--fold', join(dir, 'results.json'), '--main-values', join(dir, 'main.json'), '--heads', heads, '--out', join(dir, 'folded.json')).code).toBe(0);
			const folded = JSON.parse(readFileSync(join(dir, 'folded.json'), 'utf8')).results;
			expect(folded[0].pass).toBe(code === 0);
			expect(folded[0].code).toBe(code);
			expect(rows(folded[0].evidence)).toEqual(rows(cli({}, 'census', '--within', bound, '--main', main).out));
			expect(folded[1]).toEqual({ check: 'c6', how: 'test', must: true, pass: true, code: 0, evidence: 'ok' });
		});
	}

	test("measured apart: main's measures missing fail the check, saying so; nothing deferred without a check's name", () => {
		const r = vm.fold({ results: [{ check: 'c5', pass: true, code: 0, evidence: 'ran' }] }, null, [{ check: 'c5', call: ['census', '--within', '3%'], values: { 'near tris': 1 } }]);
		expect(r.results[0]).toMatchObject({ pass: false, code: 1 });
		expect(r.results[0].evidence).toMatch(/main was not measured for it/);
		const heads = join(out(), 'heads');
		const one = cli({ VS_MAIN_HEAD_OUT: heads }, 'census', '--within', '3%', '--main', main);
		expect(one.code).toBe(0);
		expect(one.out).toMatch(/within the bound of main/);
		expect(() => readdirSync(heads)).toThrow();
	});
});
