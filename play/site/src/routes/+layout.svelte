<!--
	play's app shell, as legacy's (maia/site/routes/app/+layout.svelte): no bar across the top — each page is its own,
	the sandboxes full screen with their own top bars — and at the foot of every page the nav pill ($lib/site/app/NavPill
	.svelte): back, home to the dashboard, and you, whose menu switches whom you act as (yourself, or Maia City for its
	admins) and signs out. A visitor sees only the sign-in page.
-->
<script lang="ts">
	import '../lib/fonts/fraunces/opsz.css';
	import '../lib/fonts/dm-sans/opsz.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import NavPill from '$lib/site/app/NavPill.svelte';
	import { pillContext } from '$lib/site/app/pill.svelte.js';
	import { footHost } from '$lib/site/app/foot.js';
	import { pinned } from '$lib/site/app/pinned.js';
	import { loadMe, session, signOut } from '$lib/session.svelte';
	import { acting, actAs } from '$lib/acting.svelte';
	import SignIn from '$lib/SignIn.svelte';
	import { dev } from '$app/environment';

	let { children } = $props();
	onMount(loadMe);

	// the render bench (/render, ./render/+page.svelte) is a developer's tool: in development it needs no account
	const bench = $derived(dev && page.url.pathname.startsWith('/render'));
	// a new build deployed while this page was open (svelte.config's pollInterval sets updated.current): the next
	// navigation loads it whole instead of going on with the old code; a tab coming back into view (an iPad's Safari
	// keeps one for days) checks and reloads where nothing is lost by it, the sandboxes and the game going on until
	// their next navigation
	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
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
	{@render children()}
	<!-- kept at the foot of what is seen, even where the iPad's browser leaves its viewport short ($lib/site/app/pinned.js) -->
	<div class="app-dock" use:pinned>
		<!-- what floats over the pill (its account menu, a toast) is moved here, so the pill keeps its size -->
		<div class="foot-stack" use:footHost></div>
		<NavPill founder={session.me.founder == null ? null : { number: session.me.founder }} name={session.me.name} onsignout={signOut} />
	</div>
{/if}
