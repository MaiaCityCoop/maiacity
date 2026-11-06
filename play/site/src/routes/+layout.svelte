<!--
	play's app shell, as legacy's (maia/site/routes/app/+layout.svelte): no bar across the top — each page is its own,
	the sandboxes full screen with their own top bars — and at the foot of every page the nav pill ($lib/site/app/NavPill
	.svelte): back, the intents (a star: their board in a modal over the page, $lib/site/intents, admins only), and
	you, whose menu switches whom you act as (yourself, or Maia City for its admins) and signs out. A visitor sees only
	the sign-in page.

	An app shell (Samuel 2026-11-04: on the iPad the pill floated up the page and stayed there): the document itself never
	scrolls; every page scrolls inside .app-scroll, a box as tall as the screen (100dvh), and the pill sits at the foot of
	that box. iOS 26 can leave the layout viewport (what `position: fixed` hangs on, and what visualViewport reports)
	shifted after a keyboard has come and gone (WebKit bug 297779), here or in the app beside it in Split View; with no
	document scroll there is nothing left to shift, and if iOS has panned the page anyway it is put back once no field is
	being typed in. The scroll position is the shell's: a new page opens at its top, Back and Forward come back to where
	they were, and a page that changes only its query keeps its place.
-->
<script lang="ts">
	import '../lib/fonts/fraunces/opsz.css';
	import '../lib/fonts/dm-sans/opsz.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import NavPill from '$lib/site/app/NavPill.svelte';
	import IntentsModal from '$lib/site/intents/IntentsModal.svelte';
	import { closeIntents, intentsModal, openIntents } from '$lib/site/intents/intents.svelte';
	import { pillContext } from '$lib/site/app/pill.svelte.js';
	import { footHost } from '$lib/site/app/foot.js';
	import { loadMe, session, signOut } from '$lib/session.svelte';
	import { acting, actAs } from '$lib/acting.svelte';
	import SignIn from '$lib/SignIn.svelte';
	import { dev } from '$app/environment';

	let { children } = $props();
	onMount(loadMe);

	// the render bench (/render, ./render/+page.svelte) and the world bench (/worlds/bench, ./worlds/bench/+page.svelte)
	// are developer's tools: in development they need no account
	const bench = $derived(dev && (page.url.pathname.startsWith('/render') || page.url.pathname.startsWith('/worlds/bench')));
	// a new build deployed while this page was open (svelte.config's pollInterval sets updated.current): the next
	// navigation loads it whole instead of going on with the old code; a tab coming back into view (an iPad's Safari
	// keeps one for days) checks and reloads where nothing is lost by it, the sandboxes and the game going on until
	// their next navigation
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
	// the intents' board is a modal over the page (Samuel 2026-11-05): a link that names it (/intents/, or /proposals/
	// from before) opens it here instead, and going anywhere else closes it
	beforeNavigate((nav) => {
		if (nav.willUnload) return;
		if (nav.type === 'link' && (nav.to?.url.pathname === '/intents/' || nav.to?.url.pathname === '/proposals/')) {
			nav.cancel();
			openIntents(nav.to.url.hash.slice(1));
		} else closeIntents();
	});
	const keepsPlay = () => /^\/(sandbox-|game)/.test(page.url.pathname);
	onMount(() => {
		const back = async () => {
			if (document.visibilityState !== 'visible' || keepsPlay()) return;
			if (await updated.check().catch(() => false)) location.reload();
		};
		document.addEventListener('visibilitychange', back);
		return () => document.removeEventListener('visibilitychange', back);
	});

	// ---- the shell's scroll: where each entry of the history was, so Back and Forward come back to it
	let scroller: HTMLElement | undefined = $state();
	const where = new Map<unknown, number>();
	const entry = () => (history.state as Record<string, unknown> | null)?.['sveltekit:history'];
	// the entry shown now: on Back the browser has already moved to the next one before beforeNavigate runs
	let shownEntry: unknown;
	beforeNavigate(({ from }) => {
		if (scroller && from && shownEntry !== undefined) where.set(shownEntry, scroller.scrollTop);
	});
	/** back to where an entry was: its page may still be filling in (its tiles come a moment later), so tried again
	 *  frame by frame for up to 1.5 s, until it is reached or the person scrolls */
	function restore(top: number) {
		const el = scroller!;
		const until = performance.now() + 1500;
		let set = -1;
		const step = () => {
			if (set >= 0 && Math.abs(el.scrollTop - set) > 2) return; // they scrolled themselves
			el.scrollTop = top;
			set = el.scrollTop;
			if (Math.abs(set - top) > 2 && performance.now() < until) requestAnimationFrame(step);
		};
		step();
	}
	afterNavigate(({ from, to, type }) => {
		shownEntry = entry();
		if (!scroller || !to) return;
		if (type === 'popstate') restore(where.get(entry()) ?? 0);
		// a new page from its top; the same page with another query or hash keeps its place (a hash scrolls itself)
		else if (from?.url.pathname !== to.url.pathname) scroller.scrollTop = 0;
	});
	// iOS may pan the page to show a field above its keyboard, and leave it panned: put back once nothing is typed in
	onMount(() => {
		const vv = window.visualViewport;
		const typing = () => {
			const a = document.activeElement as HTMLElement | null;
			return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
		};
		const unpan = () => setTimeout(() => {
			if (!typing() && (window.scrollY !== 0 || window.scrollX !== 0)) window.scrollTo(0, 0);
		}, 300);
		vv?.addEventListener('resize', unpan);
		document.addEventListener('focusout', unpan);
		return () => {
			vv?.removeEventListener('resize', unpan);
			document.removeEventListener('focusout', unpan);
		};
	});

	const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
	// whom you act as, in the You menu: yourself, and for an admin Maia City, the coop that owns every asset
	$effect(() => {
		const me = session.me;
		if (!me) return;
		const list = [
			{ id: 'me', label: me.name, sub: `Your account · ${me.level}`, text: initials(me.name), colour: '#c8744f', shape: 'human' as const },
			...(me.level === 'admin' ? [{ id: 'maia-city', label: 'Maia City', sub: 'The coop · its admins act for it', text: 'MC', colour: '#24452f', shape: 'coop' as const }] : [])
		];
		return pillContext({
			title: 'Act as',
			base: true,
			get list() {
				return list;
			},
			get current() {
				return acting.as;
			},
			pick: (id: string) => actAs(id as 'me' | 'maia-city')
		});
	});
</script>

{#if bench}
	{@render children()}
{:else if !session.ready}
	<main class="page"><p class="muted">Loading…</p></main>
{:else if !session.me}
	<SignIn />
{:else}
	<div class="app-shell">
		<div class="app-scroll" bind:this={scroller}>{@render children()}</div>
		<!-- at the foot of the shell, not fixed to the browser's viewport -->
		<div class="app-dock">
			<!-- what floats over the pill (its account menu, a toast) is moved here, so the pill keeps its size -->
			<div class="foot-stack" use:footHost></div>
			<NavPill founder={session.me.founder == null ? null : { number: session.me.founder }} name={session.me.name} onsignout={signOut} intents={session.me.level === 'admin'} />
		</div>
		{#if intentsModal.open && session.me.level === 'admin'}<IntentsModal />{/if}
	</div>
{/if}
