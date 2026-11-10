/*
 * A WORLD'S KINDS, BUILT BY REAL WORKERS (intent 08d00b84) — play's plants as the census pins them (./inputs/, nothing
 * read from play), built by the frozen box engine in Bun workers through the page's own pool (src/lib/content/assets/box/
 * pool.js), for ./pool.test.ts (the same builds side by side as alone) and ./cores.ts (how much sooner).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setup, frame, lib } from './setup';

export type Kind = { hash: string; label: string; engine: number; recipe: { hash: string; code: string; pieces?: string[] } };

/** a promise, the page's clock turned while it is open (the shell's frames and timers are the census's), `each` turn told */
export async function turning<T>(p: Promise<T>, each?: () => void): Promise<T> {
	let done = false;
	const q = p.finally(() => (done = true));
	q.catch(() => {});
	while (!done) {
		frame();
		each?.();
		await new Promise((r) => setTimeout(r, 2));
	}
	return q;
}

/**
 * The census's page, and `n` of Sandbox 1's plants: those whose recipe and pieces are pinned (./inputs/files), every
 * so-manieth in the order of their hashes, so the choice spans them and is the same every run. Nothing is read from
 * play (the token it would be read with is put away first, and a file not pinned is an error) and nothing a worker
 * built is kept.
 */
export async function kindsOf(n: number, cache?: string) {
	delete process.env.PLAY_MCP_TOKEN;
	// every plant really built, each time it is asked for: what the census keeps of its workers' answers between runs
	// (./kept.ts) would hand the second build of a plant back unbuilt, and these checks are of the building itself
	process.env.CENSUS_KEPT = '0';
	const inputs = join(import.meta.dir, 'inputs');
	setup({ inputs, cache });
	const { catalogReady, INDEX, recipeAt } = await import(lib('content/assets/catalog.js'));
	const { SANDBOX } = await import(lib('kernel/sandboxes.js'));
	const { engineOf } = await import(lib('content/assets/load.js'));
	const { resolved } = await import(lib('content/assets/box/pieces.js'));
	const { createPool, poolOf } = await import(lib('content/assets/box/pool.js'));
	const { budgetFor } = await import(lib('content/render/budget.js'));
	await catalogReady(SANDBOX.one);
	const pinned: Kind[] = [];
	for (const [hash, r] of Object.entries(INDEX.recipes as Record<string, { group: string; label: string }>).sort(([a], [b]) => (a < b ? -1 : 1))) {
		if (r.group !== 'plants' || !existsSync(join(inputs, 'files', `${hash}.gz`))) continue;
		const recipe = await recipeAt(hash);
		// (its pieces pinned too: a world that never grew it pinned none of them)
		if (await resolved(recipe).then(() => true, () => false)) pinned.push({ hash, label: r.label, engine: engineOf(hash).v, recipe });
	}
	if (pinned.length < n) throw new Error(`kinds: ${n} plants asked for, ${pinned.length} are pinned`);
	const step = Math.floor(pinned.length / n);
	const kinds = Array.from({ length: n }, (_, i) => pinned[i * step]!);
	return { kinds, createPool, poolOf, budgetFor, INDEX };
}
