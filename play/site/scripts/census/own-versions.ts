#!/usr/bin/env bun
/*
 * AN ASSET'S VERSION IS PLAY'S ALONE (intent 8823eb7c): each asset named (its UUID), its source as an intent's variant
 * makes it, checked to keep no version list of its own (no `HISTORY =`, no `recipeIn("machines", MACHINES, id, v, …)`
 * picking by the number play's recipe file passes) and to be fewer bytes than its newest accepted version's source.
 *
 *   bun play/site/scripts/census/own-versions.ts --intent <uuid> <asset uuid>… [--record]
 */
import { join } from 'node:path';

import { setup } from './setup';

const argv = process.argv.slice(2);
const intent = argv.includes('--intent') ? argv[argv.indexOf('--intent') + 1] : undefined;
const ids = argv.filter((a) => /^[0-9a-f-]{36}$/.test(a) && a !== intent);
if (!intent || !ids.length) throw new Error('own-versions: --intent <uuid> <asset uuid>…');
setup({ inputs: join(import.meta.dir, 'inputs'), record: argv.includes('--record') });

const get = async (route: string) => {
	const r = await fetch(route);
	if (!r.ok) throw new Error(`${route}: ${r.status} ${await r.text()}`);
	return r;
};
const sourceOf = (recipe: string) => recipe.slice(recipe.indexOf('\n', recipe.indexOf('exports = module.exports;')) + 1, recipe.lastIndexOf('\nreturn module.exports.recipe('));
let ok = true;
for (const id of ids) {
	const chain = await (await get(`/api/assets/${id}`)).json();
	const head = chain.versions[0];
	const was = head.source ?? head.variants?.find((x: any) => x.name === head.defaultVariant)?.source ?? head.variants?.[0]?.source;
	const before = (await (await get(`/api/files/${was}`)).text()).length;
	const made = await (await get(`/api/assets/${id}/recipe?intent=${intent}`)).json();
	const now = sourceOf(await (await get(`/api/files/${made.hash}`)).text());
	const why = [
		/\bHISTORY\s*=/.test(now) && 'keeps HISTORY',
		now.includes('recipeIn("machines", MACHINES, id, v,') && "picks by play's number",
		now.length >= before && `not smaller (${now.length} ≥ ${before})`
	].filter(Boolean);
	if (why.length) ok = false;
	console.log(`${why.length ? 'FAIL' : 'ok  '} ${chain.label} (${id}) v${head.number} → ${made.v}: ${before} → ${now.length} characters${why.length ? `: ${why.join(', ')}` : ''}`);
}
process.exit(ok ? 0 : 1);
