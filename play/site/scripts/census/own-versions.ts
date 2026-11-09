#!/usr/bin/env bun
/*
 * AN ASSET'S VERSION IS PLAY'S ALONE (intent 8823eb7c): each asset named (its UUID), its source as an intent's variant
 * makes it, checked to keep no version list of its own (no `HISTORY =`, no `recipeIn("machines", MACHINES, id, v, …)`
 * picking by the number play's recipe file passes) and to be fewer bytes than its newest accepted version's source.
 * play's routes are read as the census reads them (./setup.ts): pinned in ./inputs, a file held to its hash; `--record`
 * pins what is not (PLAY_MCP_TOKEN). Prints one line per asset; exits 0 only when every one holds.
 *
 * `--all` (intent d3ef7454): every asset of every group, its newest accepted version's source and each of its variants',
 * checked to keep none of the old version code (no `HISTORY =`, no `versioned(` list, no `recipeIn(` picking a version
 * out of one): play's version is the only numbering. Prints the assets that keep it and a count per group.
 *
 *   bun play/site/scripts/census/own-versions.ts --intent <uuid> <asset uuid>… [--record]
 *   bun play/site/scripts/census/own-versions.ts --all [--record]
 */
import { join } from 'node:path';

import { setup } from './setup';

const argv = process.argv.slice(2);
const intent = argv.includes('--intent') ? argv[argv.indexOf('--intent') + 1] : undefined;
const ids = argv.filter((a) => /^[0-9a-f-]{36}$/.test(a) && a !== intent);
const all = argv.includes('--all');
if (!all && (!intent || !ids.length)) throw new Error('own-versions: --intent <uuid> <asset uuid>… | --all');
setup({ inputs: join(import.meta.dir, 'inputs'), record: argv.includes('--record') });

const get = async (route: string) => {
	const r = await fetch(route);
	if (!r.ok) throw new Error(`${route}: ${r.status} ${await r.text()}`);
	return r;
};
/** a recipe file's readable source: what it wraps between the box's head and its last line */
const sourceOf = (recipe: string) => recipe.slice(recipe.indexOf('\n', recipe.indexOf('exports = module.exports;')) + 1, recipe.lastIndexOf('\nreturn module.exports.recipe('));
/** what of the old version code a source keeps */
const keeps = (src: string) =>
	[/\bHISTORY\s*=/.test(src) && 'keeps HISTORY', /\bversioned\(/.test(src) && 'keeps a versioned list', /\brecipeIn\(/.test(src) && 'picks from its list'].filter(Boolean) as string[];

if (all) {
	const GROUPS = ['plants', 'things', 'machines', 'buildings', 'actors', 'characters', 'biomes', 'worlds'];
	let bad = 0;
	for (const group of GROUPS) {
		const assets = await (await get(`/api/assets?group=${group}`)).json();
		let n = 0;
		for (const a of assets) {
			const head = (await (await get(`/api/assets/${a.id}`)).json()).versions[0];
			const sources = [...new Set([head.source, ...(head.variants ?? []).map((x: any) => x.source)].filter(Boolean))] as string[];
			const why = new Set<string>();
			for (const h of sources) for (const w of keeps(await (await get(`/api/files/${h}`)).text())) why.add(w);
			if (why.size) n++, console.log(`FAIL ${group}/${a.slug} (${a.id}) v${head.number}: ${[...why].join(', ')}`);
		}
		bad += n;
		console.log(`${n ? 'FAIL' : 'ok  '} ${group}: ${n} of ${assets.length} keep their own version code`);
	}
	process.exit(bad ? 1 : 0);
}

let ok = true;
for (const id of ids) {
	const chain = await (await get(`/api/assets/${id}`)).json();
	const head = chain.versions[0];
	const was = head.source ?? head.variants?.find((x: any) => x.name === head.defaultVariant)?.source ?? head.variants?.[0]?.source;
	const before = (await (await get(`/api/files/${was}`)).text()).length;
	const made = await (await get(`/api/assets/${id}/recipe?intent=${intent}`)).json();
	const now = sourceOf(await (await get(`/api/files/${made.hash}`)).text());
	const why = [
		...keeps(now),
		now.length >= before && `not smaller (${now.length} ≥ ${before})`
	].filter(Boolean);
	if (why.length) ok = false;
	console.log(`${why.length ? 'FAIL' : 'ok  '} ${chain.label} (${id}) v${head.number} → ${made.v}: ${before} → ${now.length} characters${why.length ? `: ${why.join(', ')}` : ''}`);
}
process.exit(ok ? 0 : 1);
