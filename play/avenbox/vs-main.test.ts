// vs-main.ts's own tests (intent f63774a3): tolerances, comparing, finding main, the cache, bytes, lines and counts
// against main in temp git repositories, and intents-pr.yml's job "main's measures".
import { beforeAll, describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const TMP = mkdtempSync(join(tmpdir(), 'vs-main-test-'));
process.env.CENSUS_CACHE = join(TMP, 'census-cache');
process.env.VS_MAIN_CACHE = join(TMP, 'vs-main-cache');
const vm = await import('./vs-main');

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
	test("the cache is keyed by main's commit and the measure's arguments", () => {
		const m = { what: 'bytes' as const, args: ['a.txt'] };
		expect(vm.cacheFile(base, m)).not.toBe(vm.cacheFile(tip, m));
		expect(vm.cacheFile(base, m)).not.toBe(vm.cacheFile(base, { what: 'bytes', args: ['b.txt'] }));
		expect(vm.cacheFile(base, m)).not.toBe(vm.cacheFile(base, { what: 'lines', args: ['a.txt'] }));
		expect(vm.cacheFile(base, m).startsWith(join(process.env.VS_MAIN_CACHE!, base))).toBe(true);
	});
	test('the command line: within the bound exits 0, out of it 1, as it prints', () => {
		const cli = (...a: string[]) => {
			try {
				return { code: 0, out: execFileSync('bun', [resolve(import.meta.dir, 'vs-main.ts'), ...a], { cwd: work, encoding: 'utf8', env: { ...ENV, VS_MAIN: base } }) };
			} catch (e: any) {
				return { code: e.status as number, out: String(e.stdout) };
			}
		};
		// the CLI measures its own checkout, main named by --main: a file this intent leaves as it is
		const here = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
		const ok = cli('lines', 'play/avenbox/gate.sh', '--within', '0%', '--main', here);
		expect(ok.code).toBe(0);
		expect(ok.out).toMatch(/within the bound of main/);
		const off = cli('bytes', 'play/avenbox/gate.sh', '--down', '1%', '--main', here);
		expect(off.code).toBe(1);
		expect(off.out).toMatch(/OFF/);
	});
});

describe("intents-pr.yml's workflow: main's measures", () => {
	const wf = (Bun as any).YAML.parse(readFileSync(resolve(import.meta.dir, '../../.github/workflows/intents-pr.yml'), 'utf8'));
	const steps = (job: string) => wf.jobs[job].steps as any[];
	test('workflow: a job between spec and run measures main on main\'s code, never the head\'s', () => {
		const main = wf.jobs.main;
		expect(main.needs).toBe('spec');
		const co = steps('main').find((s) => s.uses?.startsWith('actions/checkout'));
		expect(co.with.ref).toBe('${{ github.event.repository.default_branch }}');
		const runs = steps('main').map((s) => s.run ?? '').join('\n');
		expect(runs).toMatch(/git merge-base HEAD "\$HEAD_SHA"/);
		expect(runs).toMatch(/vs-main\.ts --main-of .* --main "\$BASE"/);
		expect(runs).not.toMatch(/git (checkout|switch)/);
	});
	test("workflow: main's measures kept in GitHub's cache by the merge base and handed to the run", () => {
		const cache = steps('main').find((s) => s.uses?.startsWith('actions/cache'));
		expect(cache.with.key).toMatch(/^vs-main-\$\{\{ steps\.base\.outputs\.base \}\}-/);
		const up = steps('main').find((s) => s.uses?.startsWith('actions/upload-artifact'));
		expect(up.with.name).toBe('vs-main');
	});
	test("workflow: the run job (the head's code) reads main's measures and never writes GitHub's cache", () => {
		expect(wf.jobs.run.needs).toEqual(['spec', 'main']);
		expect(steps('run').some((s) => s.uses?.startsWith('actions/cache'))).toBe(false);
		expect(steps('run').some((s) => s.uses?.startsWith('actions/download-artifact') && s.with?.name === 'vs-main')).toBe(true);
		const checks = steps('run').find((s) => /intent's checks/.test(s.name ?? ''));
		expect(checks.env.VS_MAIN).toBe('${{ needs.main.outputs.base }}');
		expect(checks.env.VS_MAIN_CACHE).toBeDefined();
	});
});
