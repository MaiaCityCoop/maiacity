/**
 * A NEW BUILD IS OUT — the one place that decides when an open page moves to it (intent 8333276b). SvelteKit notices
 * the new build (svelte.config.js `version.pollInterval`, `updated`); the page moves to it:
 *
 *   on a navigation      the next page is loaded whole instead of going on with the old code
 *   back in view         a tab coming back (an iPad's Safari keeps one for days) checks and reloads where nothing is
 *                        lost by it: the sandboxes and the game go on until their next navigation
 */
import { onMount } from 'svelte';
import { beforeNavigate } from '$app/navigation';
import { page, updated } from '$app/state';

/** The layout's: the page watched for a new build from now on (called as the layout is made). */
export function watchNewBuild() {
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
	onMount(() => {
		const keepsPlay = () => /^\/(sandbox-|game)/.test(page.url.pathname);
		const back = async () => {
			if (document.visibilityState !== 'visible' || keepsPlay()) return;
			if (await updated.check().catch(() => false)) location.reload();
		};
		document.addEventListener('visibilitychange', back);
		return () => document.removeEventListener('visibilitychange', back);
	});
}
