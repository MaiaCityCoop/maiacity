// What a world waits for before its first build: play's catalog and its sandbox's config. A failure says why, on the
// world's loading screen.
import { loadRecipes } from '$lib/content/assets/catalog.js';
import { loadConfig } from '$lib/content/game/code/index.js';

export async function catalogReady(sandbox?: string) {
	const [r] = await Promise.all([loadRecipes(), sandbox ? loadConfig(sandbox) : null]);
	if (r.phase !== 'ready') throw new Error(r.error || 'The asset catalog could not be loaded.');
	return r;
}
