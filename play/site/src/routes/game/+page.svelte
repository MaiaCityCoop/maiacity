<!-- The coming game: a placeholder. Citizens will play it; an admin makes a traveler a citizen, by hand (the members page). -->
<script lang="ts">
	import { session } from '$lib/session.svelte';
</script>

<svelte:head><title>The game · maiaCITY play</title></svelte:head>

<main class="page narrow">
	<p class="pill">Coming</p>
	<h1>The game is being made.</h1>
	<p class="lead">It will be played by the citizens of Maia City. Until then the three sandboxes are open to every traveler.</p>
	{#if session.me?.level === 'traveler'}
		<section class="card box"><h2>You are a traveler.</h2><p class="muted">Citizens play the game when it comes: an admin of Maia City makes a citizen.</p></section>
	{:else}
		<section class="card box"><h2>You are {session.me?.level === 'admin' ? 'an admin' : 'a citizen'}.</h2><p class="muted">You will be among the first to play.</p></section>
	{/if}
</main>

<style>
	.narrow { max-width: 720px; }
	.lead { font-size: 1.15rem; color: var(--ink-soft); }
	.box { padding: 1.5rem; margin-top: 2rem; }
</style>
