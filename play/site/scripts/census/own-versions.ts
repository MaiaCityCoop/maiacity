#!/usr/bin/env bun
/*
 * AN ASSET'S VERSION IS PLAY'S ALONE (intent 8823eb7c): each asset named (its UUID), its source as an intent's variant
 * makes it, checked to keep no version list of its own (no `HISTORY =`, no `recipeIn(…, id, v, …)` picking by the number
 * play's recipe file passes) and to be fewer bytes than its newest accepted version's source. Reads play live with
 * PLAY_MCP_TOKEN (the header to play only). Prints one line per asset; exits 0 only when every one holds.
 *
 *   bun play/site/scripts/census/own-versions.ts --intent <uuid> <asset uuid>…
 */
const PLAY = 'https://play.maia.city';
const argv = process.argv.slice(2);
const intent = argv[argv.indexOf('--intent') + 1];
const ids = argv.filter((a) => /^[0-9a-f-]{36}$/.test(a) && a !== intent);
const token = process.env.PLAY_MCP_TOKEN;
if (!argv.includes('--intent') || !intent || !ids.length || !token) throw new Error('own-versions: --intent <uuid> <asset uuid>…, PLAY_MCP_TOKEN set');
const get = async (path: string) => {
	const r = await fetch(PLAY + path, { headers: { authorization: `Bearer ${token}` } });
	if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
	return r;
};
/** a recipe file's readable source: what it wraps between the box's head and its last line */
const sourceOf = (recipe: string) => recipe.slice(recipe.indexOf('\n', recipe.indexOf('exports = module.exports;')) + 1, recipe.lastIndexOf('\nreturn module.exports.recipe('));
let ok = true;
for (const id of ids) {
	const chain = await (await get(`/api/assets/${id}`)).json();
	const head = chain.versions[0];
	const was = head.source ?? head.variants?.find((x: any) => x.name === head.defaultVariant)?.source ?? head.variants?.[0]?.source;
	const before = (await (await get(`/api/files/${was}`)).text()).length;
	const made = await (await get(`/api/assets/${id}/recipe?intent=${intent}`)).json();
	const now = sourceOf(await (await get(`/api/files/${made.hash}`)).text());
	const why = [/\bHISTORY\s*=/.test(now) && 'keeps HISTORY', now.includes('recipeIn("machines", MACHINES, id, v,') && 'picks by play\'s number', now.length >= before && `not smaller (${now.length} ≥ ${before})`].filter(Boolean);
	if (why.length) ok = false;
	console.log(`${why.length ? 'FAIL' : 'ok  '} ${chain.label} (${id}) v${head.number} → ${made.v}: ${before} → ${now.length} characters${why.length ? `: ${why.join(', ')}` : ''}`);
}
process.exit(ok ? 0 : 1);
