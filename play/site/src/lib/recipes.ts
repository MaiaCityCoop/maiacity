// play's asset catalog, loaded once before a world builds its first asset (legacy's app layout held its pages behind
// VaultRecipes until then); a failure says why, on the world's loading screen
import { loadRecipes } from '$lib/content/assets/vault.js';

export async function catalogReady() {
	const r = await loadRecipes();
	if (r.phase !== 'ready') throw new Error(r.error || 'The asset catalog could not be loaded.');
	return r;
}
