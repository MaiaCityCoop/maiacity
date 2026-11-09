#!/usr/bin/env bun
/*
 * MEASURED AGAINST MAIN, IN THE SAME RUN (intent f63774a3): a check's bound is main's own value, measured in the run
 * that checks it, never a number taken from one main commit.
 *
 *   bun play/avenbox/vs-main.ts census --world sandbox-1|sandbox-3|worlds [--view near,mid|all] [--of tris,draws] (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts bytes <files…> (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts lines <files…> (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts count '<command printing a number>' (--within N% | --down N%)
 *
 *   --within N%    every value at most main's + N %          --down N%   every value at most main's − N % (a reduction)
 *                  either as near:7%,mid:5%,far:11%: a tolerance per value, by the start of its key
 *   --of           census values: tris, draws (every pass, the default), mainTris, mainDraws (the main pass)
 *   --main <sha>   main is this commit                       --main-only measure main (or read its cache) and stop
 *   bun play/avenbox/vs-main.ts --main-of <spec.json>       main's measures of every vs-main call in an intent's spec
 *                                                           (intents-pr.yml's job "main's measures", main's code only)
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { REPO, treeAt } from '../site/scripts/census/tree';

export type Values = Record<string, number>;
type Bound = { kind: 'within' | 'down'; pct: number; by?: Record<string, number> };
export type Measure = { what: 'census' | 'bytes' | 'lines' | 'count'; args: string[] };

const git = (repo: string, ...a: string[]) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 }).trim();
const tryGit = (repo: string, ...a: string[]) => {
	try {
		return git(repo, ...a);
	} catch {
		return '';
	}
};
const cacheDir = () => resolve(process.env.VS_MAIN_CACHE ?? join(process.env.HOME ?? '/tmp', '.cache/maiacity-vs-main'));

export function parsePct(s: string | undefined): number {
	const m = /^(\d+(?:\.\d+)?)%?$/.exec(s ?? '');
	if (!m) throw new Error(`a tolerance is a percentage, e.g. 3%, not ${s}`);
	return Number(m[1]);
}

export function parseBound(kind: Bound['kind'], s: string): Bound {
	if (!s.includes(':')) return { kind, pct: parsePct(s) };
	const by: Record<string, number> = {};
	for (const part of s.split(',')) {
		const [k, v] = part.split(':');
		if (!k || v === undefined) throw new Error(`a tolerance per value is key:N%, not ${part}`);
		by[k.trim()] = parsePct(v.trim());
	}
	return { kind, pct: NaN, by };
}

export function pctOf(b: Bound, key: string) {
	if (!b.by) return b.pct;
	const k = Object.keys(b.by).filter((p) => key.startsWith(p)).sort((x, y) => y.length - x.length)[0];
	if (k === undefined) throw new Error(`no tolerance given for ${key} (${Object.keys(b.by).join(', ')})`);
	return b.by[k];
}

export const limit = (main: number, b: Bound, key = '') => main * (1 + (b.kind === 'within' ? pctOf(b, key) : -pctOf(b, key)) / 100);

export function compare(main: Values, head: Values, b: Bound) {
	const keys = [...new Set([...Object.keys(main), ...Object.keys(head)])];
	return keys.map((k) => {
		const m = main[k] ?? 0, h = head[k] ?? 0, max = limit(m, b, k);
		return { key: k, main: m, head: h, max, ok: h <= max + 1e-9 };
	});
}

export function words(s: string): string[] {
	const out: string[] = [];
	let cur = '', q: string | null = null, any = false;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (q) {
			if (c === q) q = null;
			else if (c === '\\' && q === '"' && i + 1 < s.length) cur += s[++i];
			else cur += c;
		} else if (c === "'" || c === '"') (q = c), (any = true);
		else if (c === '\\' && i + 1 < s.length) (cur += s[++i]), (any = true);
		else if (/\s/.test(c)) {
			if (cur || any) out.push(cur);
			(cur = ''), (any = false);
		} else (cur += c), (any = true);
	}
	if (cur || any) out.push(cur);
	return out;
}

export function callsIn(run: string): string[][] {
	const calls: string[][] = [];
	const re = /vs-main\.ts\s+/g;
	for (let m; (m = re.exec(run)); ) {
		let i = re.lastIndex, q: string | null = null;
		for (; i < run.length; i++) {
			const c = run[i];
			if (q) {
				if (c === q) q = null;
			} else if (c === "'" || c === '"') q = c;
			else if (c === ';' || c === '|' || c === '&' || c === '\n' || c === ')') break;
		}
		calls.push(words(run.slice(re.lastIndex, i)));
	}
	return calls;
}

export function parse(argv: string[]) {
	const opt = (k: string) => {
		const i = argv.indexOf(k);
		return i >= 0 ? argv[i + 1] : undefined;
	};
	const VALUED = ['--within', '--down', '--main', '--main-of', '--world', '--view', '--of'];
	const within = opt('--within'), down = opt('--down');
	if (within !== undefined && down !== undefined) throw new Error('one bound: --within or --down');
	const bound: Bound | null = within !== undefined ? parseBound('within', within) : down !== undefined ? parseBound('down', down) : null;
	const rest = argv.filter((a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1] ?? ''));
	const what = rest[0] as Measure['what'];
	let args: string[] = [];
	if (what === 'census') {
		const world = opt('--world') ?? 'sandbox-1', view = opt('--view') ?? 'all', of = opt('--of') ?? 'tris,draws';
		args = [world, view, of];
	} else if (what === 'bytes' || what === 'lines') args = rest.slice(1).sort();
	else if (what === 'count') args = rest.slice(1, 2);
	else if (what !== undefined) throw new Error(`no measure ${what} (census, bytes, lines, count)`);
	if (what && !args.length) throw new Error(`${what}: what to measure is missing`);
	return { measure: what ? ({ what, args } as Measure) : null, bound, main: opt('--main'), mainOnly: argv.includes('--main-only'), mainOf: opt('--main-of') };
}

export function mainOf(repo = REPO): string {
	tryGit(repo, 'fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main');
	const head = git(repo, 'rev-parse', 'HEAD');
	for (let i = 0; i < 6; i++) {
		const base = tryGit(repo, 'merge-base', 'HEAD', 'origin/main');
		if (base) return base;
		if (tryGit(repo, 'rev-parse', '--is-shallow-repository') !== 'true') break;
		// each fetched on its own: a server may refuse one
		const depth = i < 5 ? `--deepen=${50 << i}` : '--deepen=1000000';
		tryGit(repo, 'fetch', '--quiet', depth, 'origin', '+refs/heads/main:refs/remotes/origin/main');
		tryGit(repo, 'fetch', '--quiet', depth, 'origin', head);
	}
	const tip = tryGit(repo, 'rev-parse', '--verify', '--quiet', 'origin/main^{commit}');
	if (!tip) throw new Error('vs-main: no origin/main here');
	console.error(`vs-main: no merge base of HEAD and origin/main here: main is origin/main's tip ${tip.slice(0, 9)}`);
	return tip;
}

export const cacheFile = (sha: string, m: Measure) => join(cacheDir(), sha, `${createHash('sha256').update(JSON.stringify([m.what, ...m.args])).digest('hex').slice(0, 24)}.json`);

const lastNumber = (s: string) => {
	const all = s.match(/-?\d+(?:\.\d+)?/g);
	if (!all) throw new Error(`count: no number in its output: ${s.slice(-200)}`);
	return Number(all[all.length - 1]);
};

export function measure(m: Measure, sha: string | null, repo = REPO): Values {
	if (m.what === 'bytes' || m.what === 'lines') {
		let total = 0;
		for (const f of m.args) {
			let text: Buffer | null = null;
			if (sha) {
				const r = spawnSync('git', ['-C', repo, 'show', `${sha}:${f}`], { maxBuffer: 1 << 28 });
				if (r.status === 0) text = r.stdout;
			} else if (existsSync(join(repo, f))) text = readFileSync(join(repo, f));
			if (!text) continue;
			total += m.what === 'bytes' ? text.length : text.toString('utf8').split('\n').length - (text.toString('utf8').endsWith('\n') ? 1 : 0);
		}
		return { [m.what]: total };
	}
	if (m.what === 'count') {
		const cwd = sha ? treeAt(sha, repo).dir : repo;
		const r = spawnSync('bash', ['-c', m.args[0]], { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
		if (r.status !== 0) throw new Error(`count: \`${m.args[0]}\` exited ${r.status} ${sha ? `at ${sha.slice(0, 9)}` : 'at the head'}: ${r.stderr.slice(-400)}`);
		return { count: lastNumber(r.stdout) };
	}
	const [world, view, of] = m.args;
	const json = join(mkdtempSync(join(tmpdir(), 'vs-main-')), 'census.json');
	const r = spawnSync('bun', [join(repo, 'play/site/scripts/census.ts'), '--world', world, '--view', view, ...(sha ? ['--at', sha] : []), '--json', json], { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });
	if (r.status !== 0) throw new Error(`census ${sha ? `at ${sha.slice(0, 9)}` : 'of the head'} failed (${r.status})`);
	const out: Values = {};
	const want = of.split(',');
	for (const v of JSON.parse(readFileSync(json, 'utf8')).views) {
		if (!v.settled) throw new Error(`census ${sha ? `at ${sha.slice(0, 9)}` : 'of the head'}: ${v.view} did not settle`);
		if (want.includes('tris')) out[`${v.view} tris`] = v.totals.tris;
		if (want.includes('draws')) out[`${v.view} draws`] = v.totals.calls;
		if (want.includes('mainTris')) out[`${v.view} mainTris`] = v.totals.mainTris;
		if (want.includes('mainDraws')) out[`${v.view} mainDraws`] = v.totals.mainCalls;
	}
	return out;
}

export function mainValues(m: Measure, sha: string, repo = REPO, log = (s: string) => console.log(s)): Values {
	const file = cacheFile(sha, m);
	if (existsSync(file)) {
		log(`main ${sha.slice(0, 9)} ${m.what} ${m.args.join(' ')}: from cache`);
		return JSON.parse(readFileSync(file, 'utf8')).values;
	}
	const t0 = performance.now();
	const values = measure(m, sha, repo);
	mkdirSync(join(cacheDir(), sha), { recursive: true });
	writeFileSync(file, JSON.stringify({ sha, measure: m, values, at: new Date().toISOString() }));
	log(`main ${sha.slice(0, 9)} ${m.what} ${m.args.join(' ')}: measured in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
	return values;
}

const boundText = (b: Bound) => (b.by ? Object.entries(b.by).map(([k, p]) => `${k} ${p}%`).join(', ') : `${b.pct}%`);
const n = (x: number) => (Number.isInteger(x) ? x.toLocaleString('en') : x.toFixed(2));

if (import.meta.main) {
	try {
		const o = parse(Bun.argv.slice(2));
		if (o.mainOf) {
			const spec = JSON.parse(readFileSync(o.mainOf, 'utf8'));
			const sha = o.main ?? process.env.VS_MAIN ?? mainOf();
			for (const c of spec.checks ?? []) for (const call of callsIn(c.run ?? '')) {
				const p = parse(call);
				if (p.measure) mainValues(p.measure, sha);
			}
			process.exit(0);
		}
		if (!o.measure) throw new Error('vs-main: census, bytes, lines or count, with --within N% or --down N% (see its head)');
		const sha = o.main ?? process.env.VS_MAIN ?? mainOf();
		const main = mainValues(o.measure, sha);
		if (o.mainOnly) process.exit(0);
		if (!o.bound) throw new Error('vs-main: a bound, --within N% or --down N%');
		const t0 = performance.now();
		const head = measure(o.measure, null);
		const rows = compare(main, head, o.bound);
		console.log(`head ${o.measure.what}: measured in ${((performance.now() - t0) / 1000).toFixed(1)} s; bound ${o.bound.kind === 'within' ? 'main +' : 'main −'} ${boundText(o.bound)}`);
		for (const r of rows) console.log(`  ${r.ok ? 'ok ' : 'OFF'}  ${r.key.padEnd(12)} main ${n(r.main)} → head ${n(r.head)} (${r.main ? `${r.head >= r.main ? '+' : ''}${(((r.head - r.main) / r.main) * 100).toFixed(2)}%` : 'new'}), at most ${n(Number.isInteger(r.main) ? Math.floor(r.max + 1e-9) : r.max)}`);
		const ok = rows.every((r) => r.ok);
		console.log(ok ? `vs-main: within the bound of main ${sha.slice(0, 9)}` : `vs-main: out of the bound of main ${sha.slice(0, 9)}`);
		process.exit(ok ? 0 : 1);
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(2);
	}
}
