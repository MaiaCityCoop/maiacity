<!-- The coming game: a placeholder. Here an invite from an admin makes a traveler a citizen of Maia City. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { loadMe, session } from '$lib/session.svelte';

	let code = $state('');
	let said = $state('');
	onMount(() => (code = new URLSearchParams(location.search).get('invite') ?? ''));
	async function claim() {
		said = '';
		try {
			const r = await api(`/invites/${encodeURIComponent(code.trim())}/claim`, { method: 'POST' });
			await loadMe();
			said = r.level === 'admin' ? 'You are an admin already.' : 'Welcome, citizen of Maia City.';
		} catch (e) {
			said = (e as Error).message;
		}
	}
</script>

<svelte:head><title>The game · maiaCITY play</title></svelte:head>

<main class="page narrow">
	<p class="pill">Coming</p>
	<h1>The game is being made.</h1>
	<p class="lead">It will be played by the citizens of Maia City. Until then the three sandboxes are open to every traveler.</p>
	<p><a class="btn mustard" href="/game/map/">See the world map</a></p>
	{#if session.me?.level === 'traveler'}
		<section class="card box">
			<h2>Have an invite?</h2>
			<p class="muted">An admin's invite makes you a citizen: you may then propose new versions of the assets, and play the game when it comes.</p>
			<form onsubmit={(e) => { e.preventDefault(); claim(); }}>
				<input placeholder="Invite code" bind:value={code} required />
				<button class="btn mustard">Become a citizen</button>
			</form>
			{#if said}<p>{said}</p>{/if}
		</section>
	{:else}
		<section class="card box"><h2>You are {session.me?.level === 'admin' ? 'an admin' : 'a citizen'}.</h2><p class="muted">You will be among the first to play.</p>{#if said}<p>{said}</p>{/if}</section>
	{/if}
</main>

<style>
	.narrow { max-width: 720px; }
	.lead { font-size: 1.15rem; color: var(--ink-soft); }
	.box { padding: 1.5rem; margin-top: 2rem; }
	form { display: flex; gap: 0.6rem; flex-wrap: wrap; }
	form input { flex: 1; min-width: 12em; }
</style>
