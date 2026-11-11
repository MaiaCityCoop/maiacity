#!/usr/bin/env bun
/*
 * EVERY ASSET CARRIES ITS OWN LEVELS AND STAYS WITHIN THE CEILING (intent a7507347; Samuel 2026-11-11; play/SPEC.md
 * §4.5): an asset's finest shape, its build (L0), has at most `CEILING` triangles (play/api/src/lod.ts: 300,000) at
 * every stage and variant it has, and its lighter levels are its own, declared in its source and named on its card,
 * none left to be derived on a visitor's device. Realism first: fewer, better-spent triangles, never a poorer asset.
 *
 * play's server runs no proposed code, so it never counts: at propose time it holds a changed source to its card's
 * word (`lod.levels: 'declared'`, `lod.tris` at most the ceiling; play/api/src/lod.ts `heldLod`). Here the word is
 * proven. Each asset is built headless in the census's box (./built.ts), every recipe it has (its own and each
 * variant's) at every whole stage its `stage` parameter spans, its other parameters as they stand, and the triangles of
 * what was built are counted (content/assets/card.js `trianglesOf`: every instance of an instanced mesh; no stage, no
 * shadow, no pass). An asset fails where its finest shape is over the ceiling, its card says `derived` (or names no
 * levels), or its card's `lod.tris` is under what was counted; with `--intent`, the assets that intent holds a variant of
 * are built as the variant makes them (the one recipe play's route makes of it) and must carry their count.
 *
 * Known exceptions, each by its UUID in ./ceiling.known.json with what was found when it was listed (only shown): the
 * assets outside the rule the day it came, which stay as they are until their own intent touches their source. One is
 * printed and fails nothing while it is outside the rule, and fails once it is within it: the list only shrinks.
 *
 *   bun play/site/scripts/census/ceiling.ts --all [--intent <uuid>] [--record] [--list]
 *   bun play/site/scripts/census/ceiling.ts <asset uuid>… [--intent <uuid>]      # these alone, each stage's count printed
 *
 * `--intent` alone counts what that intent changes. `--list` prints ./ceiling.known.json as it would be written today
 * and fails nothing (how the list was made). Builds run on every core, each recipe's counts kept between runs under
 * its hash (./kept.ts: a recipe's hash fixes its source, its pieces and its engine), so only what changed is built again.
 */
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import { CEILING, ceilingOf } from '../../../api/src/lod';
import { opened } from './built';
import { keptIn, keyOf } from './kept';
import { setup, lib } from './setup';
import { GROUPS, judged } from './sources';
import { CACHE } from './tree';

export type Counted = { /** the most triangles of any stage and recipe */ tris: number; /** where: `stage 9`, `white, stage 3` */ at: string };
const n = (x: number) => x.toLocaleString('en-US');

/**
 * What puts an asset outside the rule, in words (none: it is within it): `lod` its card's, `counted` its finest shape
 * as built, `most` its ceiling. `carried`: it must carry its count (an intent's variant, whose source is changing); a
 * version accepted before the rule carries none, and that alone is no failure.
 */
export function outside(lod: { levels?: string; tris?: number } | null | undefined, counted: Counted, { most = CEILING, carried = false } = {}): string[] {
	const found: string[] = [];
	if (counted.tris > most) found.push(`over: ${n(counted.tris)} triangles at ${counted.at}, ${n(counted.tris - most)} over the ceiling of ${n(most)}`);
	if (lod?.levels !== 'declared') found.push("derived: its lighter levels are left to the visitor's device (its card names none of its own)");
	if (lod?.tris !== undefined && lod.tris < counted.tris) found.push(`its card says ${n(lod.tris)} triangles (lod.tris), it has ${n(counted.tris)} at ${counted.at}`);
	if (lod?.tris !== undefined && lod.tris > most) found.push(`its card's count, ${n(lod.tris)}, is over the ceiling of ${n(most)}`);
	if (carried && lod?.tris === undefined) found.push(`its card carries no count: set card.lod.tris to ${n(counted.tris)}`);
	return found;
}

type Job = { hash: string; name: string | null };
type Stage = { stage: string | null; tris: number };

/** a recipe built at every whole stage its `stage` parameter spans (once where it has none), each one's triangles */
async function stagesOf(page: Awaited<ReturnType<typeof opened>>, trianglesOf: (o: any) => number, hash: string): Promise<Stage[]> {
	const p = (page.INDEX.recipes[hash]?.params ?? []).find((x: any) => (x.name ?? x.id) === 'stage');
	const [lo, hi] = [Math.ceil(p?.range?.min ?? p?.min ?? 0), Math.floor(p?.range?.max ?? p?.max ?? 0)];
	const stages = p ? Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i)) : [null];
	const out: Stage[] = [];
	for (const stage of stages) out.push({ stage, tris: trianglesOf((await page.build(hash, stage === null ? {} : { stage })).obj) });
	return out;
}

/** a worker: the recipes named on its command line built one after another, a JSON line each */
async function work(hashes: string[], o: { record?: boolean; intent?: string; admit: string[] }) {
	const page = await opened({ record: o.record });
	for (const id of o.admit) await page.read(id, o.intent);
	const { trianglesOf } = await import(lib('content/assets/card.js'));
	for (const hash of hashes) {
		try {
			console.log(JSON.stringify({ hash, stages: await stagesOf(page, trianglesOf, hash) }));
		} catch (e: any) {
			console.log(JSON.stringify({ hash, error: String(e?.message ?? e).slice(0, 400) }));
		}
	}
}

async function main(argv: string[]) {
	const flag = (f: string) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
	const intent = flag('--intent');
	const record = argv.includes('--record');
	if (argv.includes('--work')) return work(argv.slice(argv.indexOf('--work') + 1), { record, intent, admit: (flag('--admit') ?? '').split(',').filter(Boolean) });
	const named = argv.filter((a, i) => /^[0-9a-f-]{36}$/.test(a) && argv[i - 1] !== '--intent');
	const all = argv.includes('--all');
	if (!all && !named.length && !intent) throw new Error('ceiling: --all, or asset UUIDs, or --intent <uuid>; [--record] [--list]');
	const known: Record<string, unknown> = await Bun.file(join(import.meta.dir, 'ceiling.known.json')).json();

	// every asset with its recipes: its newest version's (its own, each variant's), or the one its intent's variant makes
	setup({ inputs: join(import.meta.dir, 'inputs'), record, fresh: true });
	type Asset = { id: string; group: string; slug: string; label: string; at: string; lod: any; jobs: Job[]; proposed: boolean };
	const assets: Asset[] = [];
	for (const group of GROUPS)
		for (const a of await (await fetch(`/api/assets?group=${group}`)).json()) {
			if (named.length && !named.includes(a.id)) continue;
			const mine = intent ? await fetch(`/api/assets/${a.id}/recipe?intent=${intent}`) : null;
			const made = mine?.ok ? await mine.json() : null;
			if (!all && !named.length && !made) continue;
			const v = (await (await fetch(`/api/assets/${a.id}`)).json()).versions[0];
			const jobs: Job[] = made ? [{ hash: made.hash, name: made.variant ?? null }] : [...(v.recipe ? [{ hash: v.recipe, name: null }] : []), ...(v.variants ?? []).map((x: any) => ({ hash: x.recipe, name: x.name }))];
			assets.push({ id: a.id, group, slug: a.slug, label: a.label, at: made ? `→ v${made.v}` : `v${v.number}`, lod: made ? made.record?.card?.lod : v.lod, jobs, proposed: !!made });
		}

	// each recipe's counts: kept under its hash, or built now, on every core
	const kept = keptIn(process.env.CENSUS_KEPT === '0' ? null : join(CACHE, 'kept'));
	const keyFor = (hash: string) => keyOf('ceiling/1', hash);
	const counts = new Map<string, Stage[] | { error: string }>();
	const todo: string[] = [];
	for (const hash of new Set(assets.flatMap((a) => a.jobs.map((j) => j.hash)))) {
		const got = kept.get(keyFor(hash)) as Stage[] | undefined;
		if (got) counts.set(hash, got);
		else todo.push(hash);
	}
	const workers = Math.min(availableParallelism(), todo.length);
	const admit = assets.filter((a) => a.proposed).map((a) => a.id);
	await Promise.all(
		Array.from({ length: workers }, async (_, w) => {
			const mine = todo.filter((_, i) => i % workers === w);
			const child = Bun.spawn(['bun', import.meta.path, ...(record ? ['--record'] : []), ...(intent ? ['--intent', intent, '--admit', admit.join(',')] : []), '--work', ...mine], { stdout: 'pipe', stderr: 'inherit' });
			for (const line of (await new Response(child.stdout).text()).split('\n')) {
				if (!line.startsWith('{')) continue;
				const r = JSON.parse(line);
				counts.set(r.hash, r.error ? { error: r.error } : r.stages);
				if (!r.error) kept.put(keyFor(r.hash), r.stages);
			}
			await child.exited;
		})
	);

	// each asset judged, group by group
	const groups = new Map(GROUPS.map((g) => [g, { n: 0, bad: 0 }]));
	const list: Record<string, unknown> = {};
	for (const a of assets) {
		const g = groups.get(a.group)!;
		g.n++;
		const who = `${a.group}/${a.slug} (${a.id}) ${a.at}`;
		const counted: Counted = { tris: -1, at: '' };
		let error = '';
		for (const j of a.jobs) {
			const c = counts.get(j.hash);
			if (!c || 'error' in c) error ||= `${j.name ?? 'its recipe'} was not built: ${c ? c.error : 'its worker gave no count'}`;
			else for (const s of c) if (s.tris > counted.tris) Object.assign(counted, { tris: s.tris, at: [j.name, s.stage === null ? null : `stage ${s.stage}`].filter(Boolean).join(', ') || 'its build' });
			if (named.length && c && !('error' in c)) console.log(`     ${a.label}${j.name ? `: ${j.name}` : ''}: ${c.map((s) => `${s.stage === null ? '' : `stage ${s.stage}: `}${n(s.tris)}`).join(', ')}`);
		}
		if (error) {
			g.bad++, console.log(`FAIL ${who}: ${error}`);
			continue;
		}
		const found = outside(a.lod, counted, { most: ceilingOf(a.group), carried: a.proposed });
		if (found.length) list[a.id] = { label: a.label, ...(counted.tris > ceilingOf(a.group) ? { over: counted.tris, at: counted.at } : {}), ...(a.lod?.levels !== 'declared' ? { derived: true } : {}) };
		// (an intent's variant is its source touched: the rule holds it, a named exception or not)
		const is = judged(a.id in known && !a.proposed, found);
		if (is === 'known') console.log(`KNOWN ${who}: ${found.join('; ')}`);
		else if (is === 'stale') g.bad++, console.log(`FAIL ${who}: named in ceiling.known.json, and it is within the rule now (${n(counted.tris)} triangles at its finest, its levels declared): drop its line`);
		else if (is === 'fail') g.bad++, console.log(`FAIL ${who}: ${found.join('; ')}`);
		else console.log(`ok   ${who}: ${n(counted.tris)} triangles at its finest (${counted.at}), its levels declared`);
	}
	// (an exception of an asset play no longer has is stale too; only a census of every asset can tell)
	const gone = all && !intent ? Object.keys(known).filter((id) => !assets.some((a) => a.id === id)) : [];
	for (const id of gone) console.log(`FAIL ${id}: named in ceiling.known.json, and play has no such asset: drop its line`);
	if (argv.includes('--list')) return console.log(JSON.stringify(list, null, '\t')), 0;
	for (const [group, g] of groups) if (g.n) console.log(`${g.bad ? 'FAIL' : 'ok  '} ${group}: ${g.bad} of ${g.n} outside the rule and no named exception (at most ${n(ceilingOf(group))} triangles, its own levels)`);
	console.log(`ceiling: ${assets.length} assets, ${todo.length} recipes built now, ${counts.size - todo.length} read as kept`);
	return [...groups.values()].every((g) => !g.bad) && !gone.length ? 0 : 1;
}

if (import.meta.main) process.exit((await main(process.argv.slice(2))) ?? 0);
