<!-- maia.city's home: the manifesto, and the way in: play's landing page (invite only to sign up). -->
<script lang="ts">
	import Manifesto from '$lib/Manifesto.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>maiaCITY</title>
	<meta name="description" content="We were never built to survive. We were built to thrive." />
</svelte:head>

<main class="wrap">
	<Manifesto banner={data.banner} />
</main>

<div class="signup-float">
	<a class="pill-btn" href="https://play.maia.city/">Join</a>
</div>

<style>
	main {
		padding-block: 0 6rem;
	}

	.signup-float {
		position: fixed;
		inset-inline: 0;
		bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
		z-index: 20;
		display: flex;
		justify-content: center;
		padding-inline: max(1rem, env(safe-area-inset-left, 0px)) max(1rem, env(safe-area-inset-right, 0px));
		pointer-events: none;
	}

	.signup-float .pill-btn {
		justify-content: center;
		min-width: 8rem;
		min-height: 3.25rem;
		padding-inline: 2rem;
		border: 1px solid rgb(255 255 255 / 0.2);
		background: var(--brand-green);
		box-shadow: 0 6px 24px rgb(38 56 44 / 0.24);
		pointer-events: auto;
	}

	.signup-float .pill-btn:focus-visible {
		outline: 3px solid var(--ink);
		outline-offset: 4px;
		box-shadow: 0 0 0 4px var(--paper), 0 6px 24px rgb(38 56 44 / 0.24);
	}

	/* The landing page's last links can scroll clear of its floating signup button. */
	.signup-float ~ :global(.site-footer) {
		padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
	}
</style>
