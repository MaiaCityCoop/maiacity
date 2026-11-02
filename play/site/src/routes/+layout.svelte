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
	import NavPill from '$lib/site/app/NavPill.svelte';
	import { pillContext } from '$lib/site/app/pill.svelte.js';
	import { footHost } from '$lib/site/app/foot.js';
	import { loadMe, session, signOut } from '$lib/session.svelte';
	import { acting, actAs } from '$lib/acting.svelte';
	import SignIn from '$lib/SignIn.svelte';

	let { children } = $props();
	onMount(loadMe);

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

{#if !session.ready}
	<main class="page"><p class="muted">Loading…</p></main>
{:else if !session.me}
	<SignIn />
{:else}
	{@render children()}
	<div class="app-dock">
		<!-- what floats over the pill (its account menu, a toast) is moved here, so the pill keeps its size -->
		<div class="foot-stack" use:footHost></div>
		<NavPill founder={session.me.founder == null ? null : { number: session.me.founder }} name={session.me.name} onsignout={signOut} />
	</div>
{/if}
