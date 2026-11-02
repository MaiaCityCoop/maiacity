<!-- a visitor's one page: sign in with a passkey, or sign up (open to everyone; a new human is a traveler) -->
<script lang="ts">
	import { signIn, signUp } from '$lib/session.svelte';

	let name = $state('');
	let busy = $state(false);
	let error = $state('');

	async function run(fn: () => Promise<unknown>) {
		busy = true;
		error = '';
		try {
			await fn();
		} catch (e) {
			error = (e as Error).name === 'NotAllowedError' ? 'The passkey prompt was closed.' : (e as Error).message;
		}
		busy = false;
	}
</script>

<main class="page signin">
	<section class="hero">
		<h1>Three worlds to walk, every asset with its history.</h1>
		<p class="lead">Sign in with your passkey, or make one now. Everyone who signs up is a traveler: you walk every sandbox and read every asset of Maia City.</p>
	</section>
	<section class="card box">
		<h2>Sign in</h2>
		<p class="muted">Your maia.city passkey works here too.</p>
		<button class="btn" disabled={busy} onclick={() => run(signIn)}>Sign in with a passkey</button>
		<hr />
		<h2>New here?</h2>
		<form onsubmit={(e) => { e.preventDefault(); run(() => signUp(name)); }}>
			<input placeholder="Your name" bind:value={name} minlength="2" maxlength="60" required />
			<button class="btn mustard" disabled={busy || name.trim().length < 2}>Sign up</button>
		</form>
		{#if error}<p class="error">{error}</p>{/if}
	</section>
</main>

<style>
	.signin { display: grid; grid-template-columns: 1.2fr 1fr; gap: 3rem; align-items: center; min-height: 100vh; }
	.lead { font-size: 1.15rem; color: var(--ink-soft); max-width: 34em; }
	.box { padding: 2rem; }
	.box h2 { font-size: 1.3rem; }
	hr { border: 0; border-top: 1px solid var(--line); margin: 1.5rem 0; }
	form { display: flex; gap: 0.6rem; flex-wrap: wrap; }
	form input { flex: 1; min-width: 10em; }
	@media (max-width: 800px) { .signin { grid-template-columns: 1fr; gap: 1.5rem; align-items: start; } }
</style>
