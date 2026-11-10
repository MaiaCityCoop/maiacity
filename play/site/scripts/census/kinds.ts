/*
 * A WORLD'S KINDS, BUILT BY REAL WORKERS (intent 08d00b84) — play's plants as the census pins them (./inputs/, read by
 * no network), built by the frozen box engine in Bun workers through the page's own pool (src/lib/content/assets/box/
 * pool.js), for ./pool.test.ts (the same builds side by side as alone) and ./cores.ts (how much sooner).
 */
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

/** the census's page, and `n` of Sandbox 1's plants: the biggest recipe files of the catalog, in the order of their hashes */
export async function kindsOf(n: number, cache?: string) {
	setup({ inputs: join(import.meta.dir, 'inputs'), cache });
	const { catalogReady, INDEX, recipeAt } = await import(lib('content/assets/catalog.js'));
	const { SANDBOX } = await import(lib('kernel/sandboxes.js'));
	const { engineOf } = await import(lib('content/assets/load.js'));
	const { createPool, poolOf } = await import(lib('content/assets/box/pool.js'));
	const { budgetFor } = await import(lib('content/render/budget.js'));
	await catalogReady(SANDBOX.one);
	const plants = Object.entries(INDEX.recipes as Record<string, { group: string; label: string }>).filter(([, r]) => r.group === 'plants').sort(([a], [b]) => (a < b ? -1 : 1));
	const kinds: Kind[] = [];
	// every so-manieth of them, so the choice spans the catalog and is the same every run
	const step = Math.max(1, Math.floor(plants.length / n));
	for (let i = 0; i < plants.length && kinds.length < n; i += step) {
		const [hash, r] = plants[i]!;
		kinds.push({ hash, label: r.label, engine: engineOf(hash).v, recipe: await recipeAt(hash) });
	}
	return { kinds, createPool, poolOf, budgetFor, INDEX };
}
