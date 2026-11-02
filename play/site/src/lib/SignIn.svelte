<!--
	A visitor's one page: sign in with a passkey. Sign-up is by invite only (Samuel 2026-11-02): an admin's invite link
	(/?invite=<code>, the members page) opens the sign-up here, and makes the newcomer a traveler; without one, only
	signing in. Becoming a citizen comes later, by an admin's hand.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { signIn, signUp } from '$lib/session.svelte';

	let name = $state('');
	let busy = $state(false);
	let error = $state('');
	/** the invite this page was opened with, and whether it can still be used */
	let invite = $state('');
	let open = $state<boolean | null>(null);

	onMount(async () => {
		invite = new URLSearchParams(location.search).get('invite')?.trim() ?? '';
		if (!invite) return;
		try {
			open = (await api<{ open: boolean }>(`/invites/${encodeURIComponent(invite)}`)).open;
		} catch {
			open = false;
		}
	});

	async function run(fn: () => Promise<unknown>) {
		busy = true;
		error = '';
		try {
			await fn();
			// signed in: the invite is used, so the address forgets it
			if (invite) history.replaceState(history.state, '', location.pathname);
		} catch (e) {
			error = (e as Error).name === 'NotAllowedError' ? 'The passkey prompt was closed.' : (e as Error).message;
		}
		busy = false;
	}
</script>

<main class="page signin">
	<section class="hero">
		<h1>Three worlds to walk, every asset with its history.</h1>
		<p class="lead">Maia City is invite-only. Sign in with your passkey; if an admin sent you an invite link, make your passkey with it and walk in as a traveler.</p>
	</section>
	<section class="card box">
		{#if invite && open}
			<p class="pill">You are invited</p>
			<h2>Make your passkey</h2>
			<p class="muted">You come in as a traveler: you walk every sandbox and read every asset of Maia City.</p>
			<form onsubmit={(e) => { e.preventDefault(); run(() => signUp(name, invite)); }}>
				<input placeholder="Your name" bind:value={name} minlength="2" maxlength="60" required autocomplete="name" />
				<button class="btn mustard" disabled={busy || name.trim().length < 2}>Sign up</button>
			</form>
			<hr />
			<p class="muted">Have a passkey already?</p>
			<button class="btn ghost" disabled={busy} onclick={() => run(signIn)}>Sign in with a passkey</button>
		{:else}
			<h2>Sign in</h2>
			<p class="muted">Your maia.city passkey works here too.</p>
			<button class="btn" disabled={busy} onclick={() => run(signIn)}>Sign in with a passkey</button>
			<hr />
			{#if invite && open === false}
				<p class="error">This invite is used up or has expired: ask an admin for a new one.</p>
			{:else}
				<p class="muted">New here? Maia City is invite-only: an admin's invite link lets you sign up.</p>
			{/if}
		{/if}
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
