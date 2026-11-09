/*
 * A BIOME FROM THE MAIA CITY VAULT — the floor a world lays (surfaces, density, cover, each kind its asset), read off
 * the card beside the biome's recipe ($content/biomes/card.js `biomeOfCard`), never the repo's list: a version the
 * owners accept is every world's floor from then on. Only once play's catalog is in (../catalog.js `loadRecipes`).
 */
import { biomeOfCard } from '$lib/content/biomes/card.js';
import { cardOf, hashOf } from '../catalog.js';

/**
 * The biome a ref names in the vault (`biomes/food-forest`, newest; `@2`, that one; or a pin), its card's numbers; throws
 * NotInVault naming it where none, BiomeCardError where its card is no floor's. @param {string | { entry: string, at: string[] }} ref
 */
function biomeAt(ref) {
	const hash = hashOf(ref);
	return biomeOfCard(cardOf(hash) ?? { ref: typeof ref === 'string' ? ref : JSON.stringify(ref) });
}

/**
 * The same, or null where the vault holds none or the card is no floor's (said on the console; the banner names a
 * missing one): the world then lays bare ground, never a repo floor. @param {string | { entry: string, at: string[] }} ref
 */
export function biomeOr(ref) {
	try {
		return biomeAt(ref);
	} catch (e) {
		console.warn(`biome ${typeof ref === 'string' ? ref : JSON.stringify(ref)}: ${/** @type {Error} */ (e).message}`);
		return null;
	}
}
