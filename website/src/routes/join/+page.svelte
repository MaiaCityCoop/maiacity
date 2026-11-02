<!--
	How to join Maia City: by invite only (Samuel 2026-11-02). An admin's invite link opens play (play.maia.city) with its
	sign-up, makes the passkey and lets the newcomer in as a traveler; becoming a citizen comes later, by an admin's hand.
	Everyone with a passkey signs in there.
-->
<script lang="ts">
	const PLAY = 'https://play.maia.city/';
</script>

<svelte:head>
	<title>Join · maiaCITY</title>
	<meta name="description" content="Maia City is invite-only: an invite link from one of its admins lets you in." />
</svelte:head>

<main class="wrap join">
	<p class="eyebrow">Join</p>
	<h1>Maia City is invite-only.</h1>
	<p class="lead">
		An invite link from one of Maia City's admins lets you in. Open it, make your passkey, and you walk in as a
		traveler: the three sandboxes and every asset of the city, with its history.
	</p>

	<section class="steps">
		<div class="step">
			<b>1</b>
			<h2>Get an invite</h2>
			<p>Ask someone who builds Maia City. Each link lets one person in, once.</p>
		</div>
		<div class="step">
			<b>2</b>
			<h2>Open it</h2>
			<p>It opens play, where you give your name and make a passkey on this device. No password, no email.</p>
		</div>
		<div class="step">
			<b>3</b>
			<h2>Walk in</h2>
			<p>You come in as a traveler. Citizens play the game when it comes: an admin makes a citizen.</p>
		</div>
	</section>

	<p class="signin">Have a passkey already? <a class="pill-btn" href={PLAY}>Sign in to play</a></p>
</main>

<style>
	.join {
		max-width: 52rem;
		padding-block: 3rem 6rem;
	}
	.eyebrow {
		margin: 0;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--terracotta);
	}
	h1 {
		margin: 0.4rem 0 1rem;
		font-size: clamp(2.2rem, 5vw, 3.4rem);
	}
	.lead {
		max-width: 38em;
		font-size: 1.15rem;
		color: var(--ink-soft);
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
		margin: 2.5rem 0;
	}
	.step {
		padding: 1.3rem 1.4rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--paper);
	}
	.step b {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--mustard);
		color: var(--ink);
	}
	.step h2 {
		margin: 0.8rem 0 0.3rem;
		font-size: 1.2rem;
	}
	.step p {
		margin: 0;
		color: var(--ink-soft);
	}
	.signin {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.8rem;
		color: var(--ink-soft);
	}
	@media (max-width: 760px) {
		.steps {
			grid-template-columns: 1fr;
		}
	}
</style>
