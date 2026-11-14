#!/usr/bin/env bun
/*
 * ONE LOAD OF EACH WORLD (intent a35ccd33) — an intent's real-GPU checks (each `run` a `bun …/scripts/gpu.ts …` call,
 * several chained too) planned as loads: one per world and engine, asked the union of what the calls ask that changes
 * the load, so every check reads its numbers from that one load (gpu.ts with GPU_LOADS) instead of loading the world
 * again. No dependency: intents-pr.yml's spec job runs it (main's copy) on the spec alone; gpu.ts (the head's) reads
 * the same rules to say whether a load answers a call.
 *
 *   bun play/site/scripts/gpu-loads.ts <spec file>     prints {"include":[{n, world, browser, args}…]}, GitHub's matrix
 */
import { readFileSync } from 'node:fs';

/** gpu.ts's own defaults: the world and the engines a call names when it names none */
export const DEFAULTS = { world: '/sandbox-5/', browser: 'chromium,webkit' };
/** a call's flags that change nothing of a load: what to load, where to write, how to print, the bounds judged after */
const READ = new Set(['--world', '--browser', '--out', '--steps', '--record', '--software', '--world-within', '--frame-within', '--walk-within', '--stroll-max', '--stroll-p99', '--stroll-per-minute', '--stroll-over-standing', '--fill-within']);
/** flags whose value names the load, never merged (other pinned inputs are another load) */
const KEY = new Set(['--inputs']);
/** a value handed to the load's command line, unquoted: a route, a number, a list, a path */
const SAFE = /^[\w./,:-]+$/;
const GPU = /\bbun\s+(\S*\/)?scripts\/gpu\.ts\b/g;

export type Args = Map<string, string | true>;
export type Call = { world: string; browsers: string[]; args: Args };
export type Load = { n: number; world: string; browser: string; args: string };

/** a call's arguments: `--flag value` where the next token is no flag, else `--flag` alone */
export function parseArgs(tokens: string[]): Args {
	const a: Args = new Map();
	for (let i = 0; i < tokens.length; i++) {
		if (!tokens[i].startsWith('--')) continue;
		const v = tokens[i + 1];
		if (v !== undefined && !v.startsWith('--')) a.set(tokens[i], v), i++;
		else a.set(tokens[i], true);
	}
	return a;
}

/** every gpu.ts call in a check's run, each with its world, engines and arguments */
export function callsOf(run: string): Call[] {
	const calls: Call[] = [];
	for (const m of run.matchAll(GPU)) {
		const rest = run.slice(m.index! + m[0].length).split(/&&|\|\||[;|\n]/)[0];
		const args = parseArgs(rest.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/^(['"])(.*)\1$/, '$2')));
		const s = (k: string, d: string) => (typeof args.get(k) === 'string' ? (args.get(k) as string) : d);
		calls.push({ world: s('--world', DEFAULTS.world), browsers: s('--browser', DEFAULTS.browser).split(','), args });
	}
	return calls;
}

/** what of a call the load must be asked: its flags but those READ, --walk-within asking --walk */
function loadAsks(args: Args): Args {
	const a: Args = new Map();
	for (const [k, v] of args) if (!READ.has(k)) a.set(k, v);
	if (args.has('--walk-within')) a.set('--walk', true);
	return a;
}
const numeric = (v: string | true) => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v);

/** one load's asks from several calls': a flag once asked stays, a number the largest, a list the union */
export function union(all: Args[]): Args {
	const u: Args = new Map();
	for (const a of all)
		for (const [k, v] of loadAsks(a)) {
			const was = u.get(k);
			if (was === undefined || was === true) u.set(k, v);
			else if (v === true) continue;
			else if (numeric(was) && numeric(v)) u.set(k, String(Math.max(Number(was), Number(v))));
			else if (!KEY.has(k)) u.set(k, [...new Set([...was.split(','), ...v.split(',')])].join(','));
		}
	return u;
}

/** why a load (its arguments) does not answer a call: nothing when it does. The call's --timeout is held to the
 *  world's own time by gpu.ts, the load having waited at least as long */
export function uncovered(load: Args, call: Args): string[] {
	const why: string[] = [];
	for (const [k, v] of loadAsks(call)) {
		const l = load.get(k);
		if (l === undefined) why.push(`the load was not asked ${k}`);
		else if (v === true) continue;
		else if (KEY.has(k) || l === true) l !== v && why.push(`the load's ${k} is ${l === true ? 'none' : l}, not ${v}`);
		else if (numeric(v) && numeric(l)) Number(l) < Number(v) && why.push(`the load's ${k} is ${l}, less than ${v}`);
		else if (v.split(',').some((x) => !l.split(',').includes(x))) why.push(`the load's ${k} is ${l}, not all of ${v}`);
	}
	return why;
}

/** the loads a spec's GPU checks need: one a world (and its pinned inputs) and engine */
export function plan(checks: { run?: string }[]): Load[] {
	const by = new Map<string, { world: string; browser: string; asks: Args[] }>();
	for (const c of checks)
		for (const call of callsOf(c.run ?? ''))
			for (const browser of call.browsers) {
				const key = `${call.world} ${call.args.get('--inputs') ?? ''} ${browser}`;
				if (!by.has(key)) by.set(key, { world: call.world, browser, asks: [] });
				by.get(key)!.asks.push(call.args);
			}
	return [...by.values()].map((l, n) => {
		const args = [...union(l.asks)].flatMap(([k, v]) => (v === true ? [k] : SAFE.test(v) ? [k, v] : []));
		return { n, world: l.world, browser: l.browser, args: args.join(' ') };
	}).filter((l) => SAFE.test(l.world) && SAFE.test(l.browser));
}

if (import.meta.main) {
	const file = process.argv[2];
	if (!file) (console.error('bun play/site/scripts/gpu-loads.ts <spec file>'), process.exit(2));
	const spec = JSON.parse(readFileSync(file, 'utf8')) as { checks: { run?: string }[] };
	console.log(JSON.stringify({ include: plan(spec.checks) }));
}
