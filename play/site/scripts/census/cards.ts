#!/usr/bin/env bun
/*
 * CARDS AGAINST THEIR RECIPES (intent 0c095468): play runs no code, so what a recipe is built with (its params: a plant's
 * stage, seed, detail and view) is known to play and to the page only from its version's card (`record.card.params`),
 * and the page refuses every ref its card does not declare (../../src/lib/content/assets/params.js) before the box
 * builds anything. A card that declares less than its recipe takes, or nothing, leaves a world's plants ungrown (a
 * garden asking a stage past the card's range: Sandbox 5's moringa, mango … on 2026-11-09).
 *
 * Each asset named (its UUID) is built in the census's headless box at its defaults, as viewer.ts builds it, and the
 * params its recipe declares (the box's card, `meta.params`) are laid beside its card's: every recipe of its newest
 * version (each of its variants), or, with `--intent`, the recipe that intent's variant would make where it holds one.
 * Prints each difference and one JSON line; exits 1 if any card differs from its recipe.
 *
 * play's routes are read as pinned in ./inputs, as the census reads them; `--record` pins what is not (PLAY_MCP_TOKEN).
 *
 *   bun play/site/scripts/census/cards.ts [<asset uuid>…] [--group <group>] [--intent <uuid>] [--root <tree>/play/site] [--record]
 */
import { join, resolve } from 'node:path';

/** one parameter as a recipe or a card declares it (../../src/lib/content/assets/params.js `Param`) */
export type Param = { id: string; label?: string; type?: string; value?: unknown; min?: number; max?: number; step?: number; names?: string[]; maxLength?: number };

/** the fields of a parameter a card must say as its recipe does */
const FIELDS = ['type', 'value', 'min', 'max', 'step', 'maxLength', 'names', 'label'] as const;

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const shown = (x: unknown) => (x === undefined ? '—' : Array.isArray(x) ? `${x.length} names` : JSON.stringify(x));

/**
 * Where a card's params differ from the ones its recipe declares, each as one line: a parameter the card leaves out
 * or adds, a field it says otherwise (a narrower range, another default), or the order the build takes them in.
 */
export function differences(recipe: Param[] | undefined, card: Param[] | undefined): string[] {
	const r = recipe ?? [], c = card ?? [];
	const out: string[] = [];
	const byId = new Map(c.map((p) => [p.id, p]));
	for (const p of r) {
		const q = byId.get(p.id);
		if (!q) {
			out.push(`${p.id}: the recipe takes it, the card does not declare it`);
			continue;
		}
		for (const f of FIELDS) if (!same(p[f], q[f])) out.push(`${p.id}.${f}: the recipe says ${shown(p[f])}, the card ${shown(q[f])}`);
	}
	const ids = new Set(r.map((p) => p.id));
	for (const q of c) if (!ids.has(q.id)) out.push(`${q.id}: the card declares it, the recipe does not take it`);
	if (!out.length && !same(r.map((p) => p.id), c.map((p) => p.id))) out.push(`order: the recipe takes ${r.map((p) => p.id).join(', ')}, the card says ${c.map((p) => p.id).join(', ')}`);
	return out;
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const flag = (f: string) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
	const root = flag('--root') && resolve(flag('--root')!);
	const [group, intent] = [flag('--group'), flag('--intent')];
	const ids = argv.filter((a, i) => /^[0-9a-f-]{36}$/.test(a) && argv[i - 1] !== '--intent');
	const { setup, lib, frame } = await import('./setup');
	setup({ root, inputs: join(import.meta.dir, 'inputs'), record: argv.includes('--record') });
	const { catalogReady } = await import(lib('recipes'));
	await catalogReady();
	const { source, INDEX, admitProposed } = await import(lib('content/assets/catalog.js'));
	const { AssetBox } = await import(lib('content/assets/box/host.js'));

	/** a promise, the page's clock turned while it is open */
	const turning = async <T>(p: Promise<T>) => {
		let done = false;
		const q = p.finally(() => (done = true));
		while (!done) {
			frame();
			await new Promise((r) => setTimeout(r, 5));
		}
		return q;
	};

	if (group) ids.push(...(await (await fetch(`/api/assets?group=${group}`)).json()).map((a: any) => a.id).filter((id: string) => !ids.includes(id)));
	const box = new AssetBox({ engine: INDEX.engine });
	const out: { id: string; label?: string; recipe?: string; variant?: string | null; ok: boolean; differences?: string[]; error?: string }[] = [];
	for (const id of ids) {
		let hashes: { hash: string; variant: string | null }[] = [];
		let label: string | undefined;
		try {
			const chain = await (await fetch(`/api/assets/${id}`)).json();
			label = chain.label;
			// the intent's variant as the page admits a proposed build (AssetLibrary.svelte), else every recipe of the newest version
			const mine = intent ? await fetch(`/api/assets/${id}/recipe?intent=${intent}`) : null;
			const proposed = mine?.ok ? await mine.json() : null;
			if (proposed) {
				await admitProposed([proposed]);
				hashes = [{ hash: proposed.hash, variant: proposed.variant ?? null }];
			} else {
				const v = chain.versions[0];
				hashes = v.recipe ? [{ hash: v.recipe, variant: null }] : (v.variants ?? []).map((x: any) => ({ hash: x.recipe, variant: x.name }));
			}
			if (!hashes.length) throw new Error('its newest version names no recipe');
		} catch (e: any) {
			out.push({ id, label, ok: false, error: String(e?.message ?? e).slice(0, 400) });
			console.error(`cards: ${label ?? id} could not be read: ${e?.message ?? e}`);
			continue;
		}
		for (const { hash, variant } of hashes) {
			const r: (typeof out)[number] = { id, label, recipe: hash, variant, ok: false };
			try {
				const card = INDEX.recipes[hash]?.params as Param[] | undefined;
				// built at its defaults (no values given: a card that declares none takes none), its own card back from the box
				const built = await turning(box.build(await source.recipeAt(hash), undefined));
				r.differences = differences(built.card?.params, card);
				r.ok = r.differences.length === 0;
			} catch (e: any) {
				r.error = String(e?.message ?? e).slice(0, 400);
			}
			out.push(r);
			const name = `${label ?? id}${variant ? ` (${variant})` : ''} ${hash.slice(0, 12)}…`;
			if (r.error) console.error(`cards: ${name} could not be built: ${r.error}`);
			else if (r.ok) console.error(`cards: ${name} declares what its recipe takes`);
			else for (const d of r.differences!) console.error(`cards: ${name}: ${d}`);
		}
	}
	console.log(JSON.stringify({ assets: out }));
	process.exit(out.length && out.every((r) => r.ok) ? 0 : 1);
}
