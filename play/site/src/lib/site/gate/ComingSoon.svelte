<!--
	What anyone without a page's right sees there (./Gate.svelte; intent aa751ecb): the dashboard's greyed-out card
	(routes/+page.svelte), "Coming soon · Invite only", alone on the page; signed out, with the way to sign in.
-->
<script lang="ts">
	import Icon from '$lib/site/app/Icon.svelte';

	let { signedOut = false }: { signedOut?: boolean } = $props();
</script>

<svelte:head><title>Coming soon · maiaCITY play</title></svelte:head>

<main class="soon">
	<p class="mark">maia<b>CITY</b> <span>play</span></p>
	<div class="play off" aria-disabled="true"><Icon name="play" size={22} /><b>Maia City</b><span>Coming soon</span><em>Invite only</em></div>
	<p class="back">{#if signedOut}<a href="/">Sign in</a>{:else}<a href="/">Back to the dashboard</a>{/if}</p>
</main>

<style>
	.soon { display: flex; flex-direction: column; justify-content: center; gap: 1.2rem; max-width: 40rem; min-height: 70dvh; margin: 0 auto; padding: 2.5rem clamp(1rem, 4vw, 2rem); }
	.mark { margin: 0; font-family: var(--font-display); font-size: 1.3rem; color: var(--ink); }
	.mark span { font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--terracotta); }
	/* the dashboard's .play.off, as the game is shown there */
	.play { display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1.1rem; border: 1px solid var(--line); border-radius: 14px; background: var(--paper); color: var(--muted); cursor: not-allowed; }
	.play :global(svg) { flex: none; color: var(--muted); }
	.play b { font-family: var(--font-display); font-size: 1.1rem; font-weight: 500; color: var(--ink); }
	.play span { flex: 1; min-width: 0; overflow: hidden; font-size: 0.85rem; text-overflow: ellipsis; white-space: nowrap; }
	.play em { flex: none; font-style: normal; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
	.back { margin: 0; font-size: 0.9rem; }
	.back a { color: var(--terracotta); }
</style>
