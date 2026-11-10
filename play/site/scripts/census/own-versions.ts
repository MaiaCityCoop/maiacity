#!/usr/bin/env bun
/*
 * AN ASSET'S VERSION IS PLAY'S ALONE (intent 8823eb7c): each asset named (its UUID), its source as an intent's variant
 * makes it, checked to keep no version list of its own (no `HISTORY =`, no `recipeIn("machines", MACHINES, id, v, …)`
 * picking by the number play's recipe file passes) and to be fewer bytes than its newest accepted version's source.
 *
 * `--all` (intent d3ef7454): every asset of every group, its newest accepted version's source and each of its variants',
 * checked to keep none of the old version code (no `HISTORY =`, no `versioned(` list, no `recipeIn(` picking a version
 * out of one): play's version is the only numbering. Prints the assets that keep it and a count per group. With
 * `--intent`, an asset that intent proposes is checked as its variant makes it.
 *
 *   bun play/site/scripts/census/own-versions.ts --intent <uuid> <asset uuid>… [--record]
 *   bun play/site/scripts/census/own-versions.ts --all [--intent <uuid>] [--record]
 */
import { join } from 'node:path';

import { setup } from './setup';
import { checkAll, get, sourceOf } from './sources';

const argv = process.argv.slice(2);
const intent = argv.includes('--intent') ? argv[argv.indexOf('--intent') + 1] : undefined;
const ids = argv.filter((a) => /^[0-9a-f-]{36}$/.test(a) && a !== intent);
const all = argv.includes('--all');
if (!all && (!intent || !ids.length)) throw new Error('own-versions: --intent <uuid> <asset uuid>… | --all');

/** what of the old version code a source keeps */
const keeps = (src: string) =>
	[/\bHISTORY\s*=/.test(src) && 'keeps HISTORY', /\bversioned\(/.test(src) && 'keeps a versioned list', /\brecipeIn\(/.test(src) && 'picks from its list'].filter(Boolean) as string[];

if (all) process.exit((await checkAll({ intent, record: argv.includes('--record') }, keeps, 'keep their own version code')) ? 0 : 1);

setup({ inputs: join(import.meta.dir, 'inputs'), record: argv.includes('--record'), fresh: true });
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
