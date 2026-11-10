#!/usr/bin/env bun
/*
 * MEASURED AGAINST MAIN, IN THE SAME RUN (intent f63774a3): a check's bound is main's own value, measured in the run that
 * checks it. Main is the merge base of HEAD and origin/main (fetched, deepened if shallow), else origin/main's tip, or
 * `--main <commit>`. Main's measures are cached by the git objects at main of the paths they read (`readsOf`, intent
 * 006eb26a), so a main leaving them as they are is not measured again.
 *
 * One step, as a builder runs it in avenBOX (main measured or read from the cache, then the head, then compared):
 *   bun play/avenbox/vs-main.ts census --world sandbox-1|sandbox-3|worlds [--view near,mid|all] [--of tris,draws] (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts bytes <files…> (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts lines <files…> (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts count '<command printing a number>' (--within N% | --down N%)
 *
 *   --within N%    every value at most main's + N %          --down N%   every value at most main's − N % (a reduction)
 *                  either as near:7%,mid:5%,far:11%: a tolerance per value, by the start of its key
 *   --of           census values: tris, draws (every pass, the default), mainTris, mainDraws (the main pass)
 *   --main <sha>   main is this commit                       --main-only measure main (or read its cache) and stop
 *   --repo <dir>   the repository measured (this one by default)
 *
 * Apart, each side measured on its own and compared after (intent 006eb26a; the same result as the one step):
 *   bun play/avenbox/vs-main.ts <measure…> --side main|head --out <side.json>      one side's values
 *   bun play/avenbox/vs-main.ts compare <main side.json> <head side.json> (--within N% | --down N%)
 *   bun play/avenbox/vs-main.ts --main-of <spec.json> [--out <side.json>]   main's values of every vs-main call in an
 *                                                     intent's spec (intents-pr.yml's job "main's measures")
 *   bun play/avenbox/vs-main.ts --key-of <spec.json>  one key for all of them, for GitHub's cache
 *   bun play/avenbox/vs-main.ts --fold <results.json> --main-values <side.json> --heads <dir> --out <results.json>
 *                                                     the head's deferred calls compared with main, each into its
 *                                                     check's result and evidence (intents-pr.yml's job "compare")
 * In intents-pr.yml's run job VS_MAIN_HEAD_OUT names a directory and intent.ts each check (INTENT_CHECK): a bounded call
 * then measures only the head, writes it there with its check and arguments and exits 0; --fold decides its bound later.
 *
 * census: play/site/scripts/census.ts --json, main by its --at (in place in main's checkout); per view triangles and draws
 * a frame. bytes, lines: the files' sum, main's by git show (missing: 0). count: the command by bash in main's tree
 * (play/site/scripts/census/tree.ts) and the head, its last number. Cache: $VS_MAIN_CACHE (~/.cache/maiacity-vs-main)/<key>.json.
 * On main itself (the checkout is main's commit, as intents.yml's confirmation runs it) a census is counted once: the
 * head is main (intent 629840f2). Exits 0 only when every value is in its bound. A blind census (a view of either side with at most 1 draw) is no bound
 * and fails, naming the view and the side (intent 009e04d3).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
	const VALUED = ['--within', '--down', '--main', '--main-of', '--key-of', '--world', '--view', '--of', '--side', '--out', '--repo', '--fold', '--main-values', '--heads'];
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
	const side = opt('--side');
	if (side !== undefined && side !== 'main' && side !== 'head') throw new Error(`--side is main or head, not ${side}`);
	return {
		measure: what ? ({ what, args } as Measure) : null,
		bound,
		main: opt('--main'),
		mainOnly: argv.includes('--main-only'),
		mainOf: opt('--main-of'),
		keyOf: opt('--key-of'),
		side: side as 'main' | 'head' | undefined,
		out: opt('--out'),
		repo: opt('--repo'),
		fold: opt('--fold'),
		mainValues: opt('--main-values'),
		heads: opt('--heads')
	};
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

/** what a census reads of a commit: the site, and the id table it imports from play's API (cache key test) */
export const CENSUS_READS = ['play/site', 'play/api/src/kit/ids.ts'];
/** the paths a measure reads at main: '' is the whole tree (a count may read anything) */
const readsOf = (m: Measure): string[] => (m.what === 'census' ? CENSUS_READS : m.what === 'count' ? [''] : m.args);
/** raised when a key's meaning changes, so no older cache entry is read for it */
const KEY_VERSION = 2;
/** a census's own: 3 since a blind one is refused (intent 009e04d3), so main's values cached blind before are measured again */
const CENSUS_VERSION = 3;

/** a measure's own id, whatever the commit: the measure and its arguments */
export const measureId = (m: Measure) => createHash('sha256').update(JSON.stringify([m.what, ...m.args])).digest('hex').slice(0, 24);

/** a commit's whole hash in `repo`, fetched by its whole hash if this clone hasn't it (a shallow one) */
function commitIn(sha: string, repo: string) {
	let got = tryGit(repo, 'rev-parse', '--verify', '--quiet', `${sha}^{commit}`);
	if (!got && /^[0-9a-f]{40}$/.test(sha)) {
		tryGit(repo, 'fetch', '--quiet', '--depth=1', 'origin', sha);
		got = tryGit(repo, 'rev-parse', '--verify', '--quiet', `${sha}^{commit}`);
	}
	if (!got) throw new Error(`vs-main: no commit ${sha} here`);
	return got;
}

/** main's cache key for a measure: it and the git object at main of each path it reads ('-' if missing): remeasured exactly when those change */
export function keyOf(m: Measure, sha: string, repo = REPO) {
	const c = commitIn(sha, repo);
	const objects = readsOf(m).map((p) => [p, tryGit(repo, 'rev-parse', '--verify', '--quiet', p ? `${c}:${p}` : `${c}^{tree}`) || '-']);
	return createHash('sha256').update(JSON.stringify([m.what === 'census' ? CENSUS_VERSION : KEY_VERSION, m.what, ...m.args, objects])).digest('hex').slice(0, 32);
}

/** the cache's file for a measure of main at a commit */
export const cacheFile = (sha: string, m: Measure, repo = REPO) => join(cacheDir(), `${keyOf(m, sha, repo)}.json`);

/** whether `repo`'s work tree is the commit itself, its tracked files as committed: main is then measured in place */
function isCheckoutOf(sha: string, repo: string) {
	const c = tryGit(repo, 'rev-parse', '--verify', '--quiet', `${sha}^{commit}`);
	return !!c && tryGit(repo, 'rev-parse', 'HEAD') === c && tryGit(repo, 'status', '--porcelain', '--untracked-files=no') === '';
}

const lastNumber = (s: string) => {
	const all = s.match(/-?\d+(?:\.\d+)?/g);
	if (!all) throw new Error(`count: no number in its output: ${s.slice(-200)}`);
	return Number(all[all.length - 1]);
};

/**
 * A blind count is no bound (intent 009e04d3): since the renderer switch a census counted 1 triangle and 1 draw a view,
 * the final screen quad, and "main 1 → head 1" passed on nothing. A view with at most 1 draw is blind, on either side.
 */
const BLIND_DRAWS = 1;
const blindText = (side: string, view: string, of: string, draws: number) => `census of ${side}: ${view} is blind (${of} ${draws}): it counted the screen quad, not the scene, and a blind count is no bound`;
/** the blind views among a side's stored census values (its `<view> draws` and `<view> mainDraws`), each said */
export function blind(values: Values, side: string): string[] {
	const out: string[] = [];
	for (const [k, v] of Object.entries(values)) {
		const m = /^(.*) (draws|mainDraws)$/.exec(k);
		if (m && v <= BLIND_DRAWS) out.push(blindText(side, m[1], m[2], v));
	}
	return out;
}

/** measures `m` at `sha` (main) or in the working tree (sha null) of `repo`; in place when the tree is `sha` itself */
export function measure(m: Measure, at: string | null, repo = REPO): Values {
	const sha = at && (m.what === 'bytes' || m.what === 'lines' || !isCheckoutOf(at, repo)) ? at : null;
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
		if (r.status !== 0) throw new Error(`count: \`${m.args[0]}\` exited ${r.status} ${at ? `at ${at.slice(0, 9)}` : 'at the head'}: ${r.stderr.slice(-400)}`);
		return { count: lastNumber(r.stdout) };
	}
	const [world, view, of] = m.args;
	const json = join(mkdtempSync(join(tmpdir(), 'vs-main-')), 'census.json');
	const r = spawnSync('bun', [join(repo, 'play/site/scripts/census.ts'), '--world', world, '--view', view, ...(sha ? ['--at', sha] : []), '--json', json], { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });
	if (r.status !== 0) throw new Error(`census ${at ? `at ${at.slice(0, 9)}` : 'of the head'} failed (${r.status})`);
	const out: Values = {};
	const want = of.split(',');
	for (const v of JSON.parse(readFileSync(json, 'utf8')).views) {
		if (!v.settled) throw new Error(`census ${at ? `at ${at.slice(0, 9)}` : 'of the head'}: ${v.view} did not settle`);
		// the draws are read whatever --of asks for: a blind view's triangles are no bound either (intent 009e04d3)
		const side = at ? `main ${at.slice(0, 9)}` : 'the head';
		if (!(v.totals.calls > BLIND_DRAWS)) throw new Error(blindText(side, v.view, 'draws', v.totals.calls));
		if (want.includes('mainDraws') && !(v.totals.mainCalls > BLIND_DRAWS)) throw new Error(blindText(side, v.view, 'mainDraws', v.totals.mainCalls));
		if (want.includes('tris')) out[`${v.view} tris`] = v.totals.tris;
		if (want.includes('draws')) out[`${v.view} draws`] = v.totals.calls;
		if (want.includes('mainTris')) out[`${v.view} mainTris`] = v.totals.mainTris;
		if (want.includes('mainDraws')) out[`${v.view} mainDraws`] = v.totals.mainCalls;
	}
	return out;
}

export function mainValues(m: Measure, sha: string, repo = REPO, log = (s: string) => console.log(s)): Values {
	const file = cacheFile(sha, m, repo);
	if (existsSync(file)) {
		log(`main ${sha.slice(0, 9)} ${m.what} ${m.args.join(' ')}: from cache`);
		return JSON.parse(readFileSync(file, 'utf8')).values;
	}
	const t0 = performance.now();
	const values = measure(m, sha, repo);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify({ sha, measure: m, values, at: new Date().toISOString() }));
	log(`main ${sha.slice(0, 9)} ${m.what} ${m.args.join(' ')}: measured in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
	return values;
}

const boundText = (b: Bound) => (b.by ? Object.entries(b.by).map(([k, p]) => `${k} ${p}%`).join(', ') : `${b.pct}%`);
const n = (x: number) => (Number.isInteger(x) ? x.toLocaleString('en') : x.toFixed(2));

/** one side's values, measure by measure (by measureId): what `--side`, `--main-of` and `compare` read and write */
export type Side = { side: 'main' | 'head'; sha: string | null; measures: Record<string, { measure: Measure; values: Values }> };
/** a head's call measured in intents-pr.yml's run job, its bound decided by --fold once main is measured */
type HeadCall = { check: string; call: string[]; values: Values };

/** the comparison as it prints, and whether every value is in its bound */
export function report(m: Measure, main: Values, head: Values, b: Bound, mainSha: string | null) {
	const rows = compare(main, head, b);
	const of = mainSha ? ` ${mainSha.slice(0, 9)}` : '';
	// stored values too (main's cache, a side file, a deferred head): one measured blind must not pass (intent 009e04d3)
	const blinds = m.what === 'census' ? [...blind(main, `main${of}`), ...blind(head, 'the head')] : [];
	const ok = rows.every((r) => r.ok) && !blinds.length;
	const lines = [`${m.what} ${m.args.join(' ')}: bound ${b.kind === 'within' ? 'main +' : 'main −'} ${boundText(b)}`];
	for (const r of rows) lines.push(`  ${r.ok ? 'ok ' : 'OFF'}  ${r.key.padEnd(12)} main ${n(r.main)} → head ${n(r.head)} (${r.main ? `${r.head >= r.main ? '+' : ''}${(((r.head - r.main) / r.main) * 100).toFixed(2)}%` : 'new'}), at most ${n(Number.isInteger(r.main) ? Math.floor(r.max + 1e-9) : r.max)}`);
	for (const t of blinds) lines.push(`  BLIND  ${t}`);
	lines.push(ok ? `vs-main: within the bound of main${of}` : blinds.length ? `vs-main: no bound of main${of}: the census is blind` : `vs-main: out of the bound of main${of}`);
	return { ok, rows, text: lines.join('\n') };
}

/** a side file with one measure */
const sideOf = (side: Side['side'], sha: string | null, m: Measure, values: Values): Side => ({ side, sha, measures: { [measureId(m)]: { measure: m, values } } });

/** every measure of the head side compared with main's same measure; a measure main hasn't is out of the bound */
function compareSides(main: Side, head: Side, b: Bound) {
	const out = Object.entries(head.measures).map(([id, h]) => {
		const mv = main.measures[id]?.values;
		if (!mv) return { ok: false, text: `${h.measure.what} ${h.measure.args.join(' ')}: main has no such measure in its side file` };
		return report(h.measure, mv, h.values, b, main.sha);
	});
	return { ok: out.length > 0 && out.every((o) => o.ok), text: out.map((o) => o.text).join('\n') || 'vs-main: the head side has no measure' };
}

const EVIDENCE_MOST = 4000;
/** the evidence with the comparison added at its end, its own text cut to keep it within intent.ts's length */
const withComparison = (evidence: string, text: string) => {
	const room = EVIDENCE_MOST - text.length - 3;
	const kept = evidence.length > room ? `${evidence.slice(0, Math.max(0, room - 1))}…` : evidence;
	return `${kept}\n\n${text}`.slice(0, EVIDENCE_MOST);
};

/** the head's deferred calls compared with main by main's code, each into its check: passes only if its run passed and every call is in bound; main's measure missing fails it */
export function fold<R extends { results: { check: string; pass: boolean; code: number; evidence: string }[] }>(results: R, main: Side | null, heads: HeadCall[]): R {
	for (const h of heads) {
		const r = results.results.find((x) => x.check === h.check);
		if (!r) continue;
		let ok = false, text: string;
		try {
			const p = parse(h.call);
			if (!p.measure || !p.bound) throw new Error(`vs-main ${h.call.join(' ')}: not a call with a measure and a bound`);
			const mv = main?.measures[measureId(p.measure)]?.values;
			if (!mv) text = `vs-main ${h.call.join(' ')}: main was not measured for it (intents-pr.yml's job "main's measures" measures the calls written in the spec's runs${main ? '' : ', and it did not finish'}): its bound is not shown`;
			else ({ ok, text } = report(p.measure, mv, h.values, p.bound, main!.sha));
		} catch (e) {
			text = e instanceof Error ? e.message : String(e);
		}
		r.evidence = withComparison(r.evidence, text);
		if (!ok) {
			r.pass = false;
			if (r.code === 0) r.code = 1;
		}
	}
	return results;
}

const readJson = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const writeJson = (f: string, v: unknown) => {
	mkdirSync(dirname(resolve(f)), { recursive: true });
	writeFileSync(f, JSON.stringify(v, null, 2));
};
/** every vs-main call of an intent's spec, parsed */
const callsOfSpec = (file: string) => (readJson(file).checks ?? []).flatMap((c: { run?: string }) => callsIn(c.run ?? '').map((call) => parse(call).measure)).filter(Boolean) as Measure[];

if (import.meta.main) {
	try {
		const argv = Bun.argv.slice(2);
		if (argv[0] === 'compare') {
			const [mainFile, headFile] = argv.slice(1, 3);
			const { bound } = parse(argv.slice(3));
			if (!mainFile || !headFile || !bound) throw new Error('vs-main compare <main side.json> <head side.json> (--within N% | --down N%)');
			const c = compareSides(readJson(mainFile), readJson(headFile), bound);
			console.log(c.text);
			process.exit(c.ok ? 0 : 1);
		}
		const o = parse(argv);
		const repo = o.repo ? resolve(o.repo) : REPO;
		if (o.fold) {
			if (!o.out || !o.heads) throw new Error('vs-main --fold <results.json> --main-values <side.json> --heads <dir> --out <results.json>');
			const main = o.mainValues && existsSync(o.mainValues) ? (readJson(o.mainValues) as Side) : null;
			const heads = existsSync(o.heads) ? readdirSync(o.heads).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(join(o.heads!, f)) as HeadCall) : [];
			const results = fold(readJson(o.fold), main, heads);
			writeJson(o.out, results);
			console.log(`${heads.length} of the head's calls compared with main${main ? ` ${main.sha?.slice(0, 9)}` : ' (main not measured)'}: ${results.results.filter((r: { pass: boolean }) => !r.pass).length} checks failed`);
			for (const h of heads) console.log(`  ${h.check}: vs-main ${h.call.join(' ')}`);
			process.exit(0);
		}
		if (o.mainOf || o.keyOf) {
			const measures = callsOfSpec((o.mainOf ?? o.keyOf)!);
			const sha = commitIn(o.main ?? process.env.VS_MAIN ?? mainOf(repo), repo);
			if (o.keyOf) {
				const keys = measures.map((m) => keyOf(m, sha, repo)).sort();
				console.log(createHash('sha256').update(keys.join('\n')).digest('hex').slice(0, 24));
				process.exit(0);
			}
			const side: Side = { side: 'main', sha, measures: {} };
			for (const m of measures) side.measures[measureId(m)] = { measure: m, values: mainValues(m, sha, repo) };
			if (o.out) writeJson(o.out, side);
			process.exit(0);
		}
		if (!o.measure) throw new Error('vs-main: census, bytes, lines or count, with --within N% or --down N% (see its head)');
		if (o.side) {
			if (!o.out) throw new Error('vs-main: --side writes its values: give --out <file>');
			const sha = o.side === 'main' ? commitIn(o.main ?? process.env.VS_MAIN ?? mainOf(repo), repo) : null;
			const values = sha ? mainValues(o.measure, sha, repo) : measure(o.measure, null, repo);
			writeJson(o.out, sideOf(o.side, sha, o.measure, values));
			console.log(`${o.side}${sha ? ` ${sha.slice(0, 9)}` : ''} ${o.measure.what} ${o.measure.args.join(' ')}: ${JSON.stringify(values)} → ${o.out}`);
			process.exit(0);
		}
		// intents-pr.yml's run job: the head alone, main measured beside it and compared by --fold
		const deferTo = process.env.VS_MAIN_HEAD_OUT, check = process.env.INTENT_CHECK;
		if (deferTo && check && /^[\w-]+$/.test(check) && o.bound && !o.mainOnly && !o.main) {
			const t0 = performance.now();
			const values = measure(o.measure, null, repo);
			mkdirSync(deferTo, { recursive: true });
			const file = join(deferTo, `${check}-${Date.now()}-${process.pid}.json`);
			writeFileSync(file, JSON.stringify({ check, call: argv, values } satisfies HeadCall));
			console.log(`head ${o.measure.what}: measured in ${((performance.now() - t0) / 1000).toFixed(1)} s: ${JSON.stringify(values)}`);
			console.log(`vs-main: compared with main once main is measured beside it (intents-pr.yml's job "compare"), into ${check}'s result`);
			process.exit(0);
		}
		const sha = o.main ?? process.env.VS_MAIN ?? mainOf(repo);
		const main = mainValues(o.measure, sha, repo);
		if (o.mainOnly) process.exit(0);
		if (!o.bound) throw new Error('vs-main: a bound, --within N% or --down N%');
		const t0 = performance.now();
		// on main itself the head is main: a census of one tree is the same census (census's test "the same every run"), counted once
		const itself = o.measure.what === 'census' && isCheckoutOf(sha, repo);
		const head = itself ? main : measure(o.measure, null, repo);
		console.log(itself ? `head census: the head is main ${sha.slice(0, 9)} itself, counted once` : `head ${o.measure.what}: measured in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
		const r = report(o.measure, main, head, o.bound, sha);
		console.log(r.text);
		process.exit(r.ok ? 0 : 1);
	} catch (e) {
		console.error(e instanceof Error ? e.message : e);
		process.exit(2);
	}
}
