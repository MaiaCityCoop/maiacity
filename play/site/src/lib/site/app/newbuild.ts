/**
 * A NEW BUILD IS OUT — the one place that decides when an open page moves to it (intent 8333276b). play deploys many
 * times a day, and a page open from before a deploy still names the chunks of its own build, which the server no
 * longer has (a 404: play/api/src/site.ts). SvelteKit notices the new build (svelte.config.js `version.pollInterval`,
 * `updated`); the page moves to it:
 *
 *   on a navigation      the next page is loaded whole instead of going on with the old code
 *   back in view         a tab coming back (an iPad's Safari keeps one for days) checks and reloads where nothing is
 *                        lost by it: the sandboxes and the game go on until their next navigation
 *   on a chunk it cannot load (Vite's `vite:preloadError`, a failed dynamic import: the intents' board is a modal, so
 *                        opening a review there is no navigation) it checks for a new build and reloads **once**, the
 *                        board open again on the same intent. Never a loop: the build it reloaded from is kept for the
 *                        tab, and that build never reloads a second time; with no newer build nothing reloads and
 *                        whoever asked for the chunk says the real error (`chunkFailed` tells it apart).
 */
import { onMount } from 'svelte';
import { version } from '$app/environment';
import { beforeNavigate } from '$app/navigation';
import { page, updated } from '$app/state';
import { intentsModal, openIntents } from './intents.svelte';

/** the build this tab last reloaded from, and the board as it was then (sessionStorage: this tab's, gone with it) */
const FROM = 'play:newbuild:from';
const BOARD = 'play:newbuild:board';

/**
 * Whether `e` is a chunk of the page's own build that would not load, as each browser says it: Chromium "Failed to
 * fetch dynamically imported module", Firefox "error loading dynamically imported module", Safari "Importing a module
 * script failed" or, handed a page for a script, "'text/html' is not a valid JavaScript MIME type"; Vite "Unable to
 * preload CSS".
 */
export function chunkFailed(e: unknown): boolean {
	const said = String((e as { message?: unknown } | null)?.message ?? e ?? '');
	return /dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type|Failed to load module script|Unable to preload CSS/i.test(said);
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type Mover = {
	/** the build running (never the same twice) */ version: string;
	/** whether a newer build is out */ check: () => Promise<boolean>;
	reload: () => void;
	/** the tab's own store; null where the browser gives none */ store: Store | null;
	/** the board as it is: null closed, else the intent open on it ('' none) */ board: () => string | null;
};

/**
 * The move after a chunk that would not load: resolves true when the page is reloading onto a newer build. At most one
 * reload per build and tab; several failures at once share one answer. Without a store there is no memory of the
 * reload, so nothing reloads (never a loop).
 */
export function mover(m: Mover): () => Promise<boolean> {
	let asked: Promise<boolean> | null = null;
	const move = async () => {
		try {
			if (!m.store || m.store.getItem(FROM) === m.version) return false;
			if (!(await m.check())) return false;
			m.store.setItem(FROM, m.version);
			const board = m.board();
			if (board === null) m.store.removeItem(BOARD);
			else m.store.setItem(BOARD, board);
		} catch {
			return false;
		}
		m.reload();
		return true;
	};
	return () => (asked ??= move().finally(() => (asked = null)));
}

/** The board as a reload left it, read once: null closed, else the intent that was open on it ('' none). */
export function boardLeft(store: Store | null): string | null {
	try {
		const left = store?.getItem(BOARD) ?? null;
		store?.removeItem(BOARD);
		return left;
	} catch {
		return null;
	}
}

const tabStore = () => {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
};

/** Onto the new build, if one is out, after a chunk that would not load: true when the page is reloading. */
export const toNewBuild = mover({
	version,
	check: () => updated.check().catch(() => false),
	reload: () => location.reload(),
	get store() {
		return tabStore();
	},
	board: () => (intentsModal.open ? (intentsModal.at ?? '') : null)
});

/** The layout's: the page watched for a new build from now on (called as the layout is made). */
export function watchNewBuild() {
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
	onMount(() => {
		// reloaded onto this build with the board open: open again, on the same intent
		const left = boardLeft(tabStore());
		if (left !== null) openIntents(left);
		const keepsPlay = () => /^\/(sandbox-|game)/.test(page.url.pathname);
		const back = async () => {
			if (document.visibilityState !== 'visible' || keepsPlay()) return;
			if (await updated.check().catch(() => false)) location.reload();
		};
		// (not prevented: with no newer build the error goes on to whoever asked for the chunk)
		const lost = () => void toNewBuild();
		const rejected = (e: PromiseRejectionEvent) => chunkFailed(e.reason) && void toNewBuild();
		document.addEventListener('visibilitychange', back);
		window.addEventListener('vite:preloadError', lost);
		window.addEventListener('unhandledrejection', rejected);
		return () => {
			document.removeEventListener('visibilitychange', back);
			window.removeEventListener('vite:preloadError', lost);
			window.removeEventListener('unhandledrejection', rejected);
		};
	});
}
