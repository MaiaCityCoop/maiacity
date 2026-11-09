/**
 * What the app adds to the nav pill (./NavPill.svelte), as back.svelte.js adds its way back. The You item is the
 * person's vault switcher too (Samuel 2026-10-18): a context (`pillContext`) lists their vaults, their own (their
 * profile) first, in its menu, and the item shows the one picked. The app lists them on every page once they are
 * known, as its `base`; a page lists them as it looks at them, with what waits in each, in its place while it shows.
 */
import { untrack } from 'svelte';

/** @typedef {{ id: string, label: string, sub?: string, text: string, colour: string, shape?: 'human' | 'coop' | 'aven' | 'device', badge?: number }} Account */
/**
 * @typedef {{ title: string, readonly list: Account[], readonly current: string, pick: (id: string) => void,
 *   add?: { label: string, go: () => void }, base?: boolean }} Context
 */

/** @type {Context[]} */
let contexts = $state.raw([]);

export const pill = {
	/** the last context a page added, over the app's `base` one */
	get context() {
		return contexts.findLast((c) => !c.base) ?? contexts.at(-1) ?? null;
	}
};

/**
 * the You item shows this context's current one, and its menu lists the context, while the page shows it
 * @param {Context} c
 * @returns {() => void} it is gone
 */
export function pillContext(c) {
	untrack(() => (contexts = [...contexts, c]));
	return () => untrack(() => (contexts = contexts.filter((x) => x !== c)));
}
