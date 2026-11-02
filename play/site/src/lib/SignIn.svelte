<!--
	play's landing page, a visitor's one page, as compact as a card (maia.city's Join and Sign in come here): sign in with
	a passkey. Sign-up is by invite only (Samuel 2026-11-02): an admin's invite link (/?invite=<code>, the members page)
	opens the sign-up here and makes the newcomer a traveler; without one, only signing in. An admin makes a citizen.
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

<main class="landing">
	<section class="card">
		<p class="mark">maia<b>CITY</b> <span>play</span></p>
		{#if invite && open}
			<h1>You are invited.</h1>
			<form onsubmit={(e) => { e.preventDefault(); run(() => signUp(name, invite)); }}>
				<input placeholder="Your name" bind:value={name} minlength="2" maxlength="60" required autocomplete="name" aria-label="Your name" />
				<button class="btn mustard" disabled={busy || name.trim().length < 2}>Sign up with a passkey</button>
			</form>
			<p class="small">You come in as a traveler. Have a passkey already? <button class="link" disabled={busy} onclick={() => run(signIn)}>Sign in</button></p>
		{:else}
			<h1>Three worlds to walk.</h1>
			<button class="btn" disabled={busy} onclick={() => run(signIn)}>Sign in with a passkey</button>
			{#if invite && open === false}
				<p class="small error">This invite is used up or has expired: ask an admin for a new one.</p>
			{:else}
				<p class="small">New here? Maia City is invite-only: an admin's invite link lets you sign up.</p>
			{/if}
		{/if}
		{#if error}<p class="small error">{error}</p>{/if}
	</section>
	<a class="home" href="https://maia.city/">maia.city</a>
</main>

<style>
	.landing { display: grid; place-items: center; align-content: center; gap: 1rem; min-height: 100dvh; padding: 1.5rem 1rem; }
	.card { display: flex; flex-direction: column; gap: 0.85rem; width: min(100%, 22rem); padding: 1.6rem 1.5rem; border: 1px solid var(--line); border-radius: 22px; background: var(--paper); box-shadow: 0 12px 40px rgb(38 56 44 / 0.1); text-align: center; }
	.mark { margin: 0; font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.02em; }
	.mark span { margin-left: 0.25rem; font-family: var(--font-body); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--terracotta); }
	h1 { margin: 0.2rem 0 0.3rem; font-size: 1.6rem; }
	form { display: flex; flex-direction: column; gap: 0.6rem; }
	.btn { width: 100%; justify-content: center; }
	.small { margin: 0; font-size: 0.84rem; color: var(--ink-soft); }
	.small.error { color: var(--terracotta); }
	.link { padding: 0; border: 0; background: none; color: var(--brand-green); font: inherit; font-weight: 600; text-decoration: underline; cursor: pointer; }
	.home { font-size: 0.8rem; color: var(--muted); text-decoration: none; }
</style>
