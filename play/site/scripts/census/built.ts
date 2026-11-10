/*
 * ONE ASSET, READ AND BUILT IN THE CENSUS'S BOX (intents 660ad67f, 8823eb7c, a7507347): the census's page opened on
 * play's routes as pinned in ./inputs (`record` reads each live and pins it anew, PLAY_MCP_TOKEN), one headless asset
 * box, and the two steps every tool that builds an asset shares: `read` (its chain, its newest version and what an
 * intent proposes of it, admitted as the page admits a proposed build, AssetLibrary.svelte) and `build` (load.js
 * `vaultBuild`, nothing read from or kept in a device's cache). ./viewer.ts stages what it builds, ./ceiling.ts counts it.
 */
import { join } from 'node:path';

import { turning } from './kinds';
import { setup, lib } from './setup';

export async function opened(o: { root?: string; record?: boolean } = {}) {
	setup({ root: o.root, inputs: join(import.meta.dir, 'inputs'), record: o.record, fresh: true });
	const { catalogReady } = await import(lib('recipes'));
	await catalogReady();
	const { source, INDEX, admitProposed } = await import(lib('content/assets/catalog.js'));
	const { AssetBox } = await import(lib('content/assets/box/host.js'));
	const { vaultBuild } = await import(lib('content/assets/load.js'));
	const box = new AssetBox({ engine: INDEX.engine });
	return {
		INDEX,
		/** an asset by its UUID: its chain, its newest version `v`, and `proposed`, the recipe `intent`'s variant of it makes (null: it holds none) */
		async read(id: string, intent?: string) {
			const chain = await (await fetch(`/api/assets/${id}`)).json();
			const mine = intent ? await fetch(`/api/assets/${id}/recipe?intent=${intent}`) : null;
			const proposed = mine?.ok ? await mine.json() : null;
			if (proposed) await admitProposed([proposed]);
			return { chain, v: chain.versions[0], proposed };
		},
		/** a recipe built with `values` (its params' own where none is given), the page's clock turned while it builds */
		build: (hash: string, values: Record<string, string> = {}) => turning(vaultBuild(source, hash, values, { box, keep: false }))
	};
}
