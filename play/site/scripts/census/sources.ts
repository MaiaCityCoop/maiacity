/*
 * EVERY ASSET'S SOURCE, AS PLAY KEEPS IT OR AS AN INTENT MAKES IT (intents d3ef7454, 5723e301): each asset of every
 * group with the readable sources of its newest accepted version (its own and each variant's, each once), or, where
 * `intent` holds a variant of it, the one source that variant makes. Read as the census reads play (./setup.ts:
 * pinned in ./inputs, `record` pinning anew), so a check runs on what an intent proposes with no token.
 */
import { join } from 'node:path';

import { setup } from './setup';

export const GROUPS = ['plants', 'things', 'machines', 'buildings', 'actors', 'characters', 'biomes', 'worlds'];

export const get = async (route: string) => {
	const r = await fetch(route);
	if (!r.ok) throw new Error(`${route}: ${r.status} ${await r.text()}`);
	return r;
};
/** a recipe file's readable source: what it wraps between its head and its last line */
export const sourceOf = (recipe: string) => recipe.slice(recipe.indexOf('\n', recipe.indexOf('exports = module.exports;')) + 1, recipe.lastIndexOf('\nreturn module.exports.recipe('));

export type Sources = { group: string; id: string; slug: string; label: string; at: string; texts: string[] };

/** every asset's sources, group by group; `at` says which: `v3`, or `→ v4` for the intent's variant */
export async function* sources(o: { intent?: string; record?: boolean }): AsyncGenerator<Sources> {
	setup({ inputs: join(import.meta.dir, 'inputs'), record: o.record, fresh: true });
	for (const group of GROUPS)
		for (const a of await (await get(`/api/assets?group=${group}`)).json()) {
			const head = (await (await get(`/api/assets/${a.id}`)).json()).versions[0];
			const mine = o.intent ? await fetch(`/api/assets/${a.id}/recipe?intent=${o.intent}`) : null;
			const made = mine?.ok ? await mine.json() : null;
			const hashes = [...new Set([head.source, ...(head.variants ?? []).map((x: any) => x.source)].filter(Boolean))] as string[];
			const texts = made ? [sourceOf(await (await get(`/api/files/${made.hash}`)).text())] : await Promise.all(hashes.map(async (h) => (await get(`/api/files/${h}`)).text()));
			yield { group, id: a.id, slug: a.slug, label: a.label, at: made ? `→ v${made.v}` : `v${head.number}`, texts };
		}
}

/**
 * One asset judged against its named exception: `found`, what is wrong with it (none: fine), `known`, whether it is
 * named an exception (by its UUID). An exception is `known` while something is found, and `stale` once nothing is:
 * its reason is gone, and so must its name be; so a list of exceptions only shrinks.
 */
export const judged = (known: boolean, found: readonly string[]): 'ok' | 'known' | 'stale' | 'fail' => (known ? (found.length ? 'known' : 'stale') : found.length ? 'fail' : 'ok');

/** every asset checked by `why` (what is wrong with a source, in words; none: fine): the failing ones printed, a count a
 * group; whether all pass. An asset in `known` (by its UUID) is printed, `KNOWN`, and fails nothing while it is found;
 * known and fine, it fails: its exception has no reason left (`judged`) */
export async function checkAll(o: { intent?: string; record?: boolean; known?: string[] }, why: (text: string) => string[], what: string) {
	const groups = new Map(GROUPS.map((g) => [g, { n: 0, bad: 0 }]));
	for await (const s of sources(o)) {
		const g = groups.get(s.group)!;
		const found = [...new Set(s.texts.flatMap(why))];
		g.n++;
		const is = judged(!!o.known?.includes(s.id), found);
		if (is === 'known') console.log(`KNOWN ${s.group}/${s.slug} (${s.id}) ${s.at}: ${found.join(', ')}`);
		else if (is === 'stale') g.bad++, console.log(`FAIL ${s.group}/${s.slug} (${s.id}) ${s.at}: named --known, and nothing is found in it any more: drop its --known`);
		else if (is === 'fail') g.bad++, console.log(`FAIL ${s.group}/${s.slug} (${s.id}) ${s.at}: ${found.join(', ')}`);
	}
	for (const [group, g] of groups) console.log(`${g.bad ? 'FAIL' : 'ok  '} ${group}: ${g.bad} of ${g.n} ${what}`);
	return [...groups.values()].every((g) => !g.bad);
}
