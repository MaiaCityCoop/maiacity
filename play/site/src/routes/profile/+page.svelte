<!--
	Your profile: the name Maia City knows you by, yours to change (POST /api/me/name, the sign-up rule for a name), and
	what you are there: your level and, for a founder, your number. Opened from the nav pill's You menu.
-->
<script lang="ts">
	import { api } from '$lib/api';
	import { loadMe, session } from '$lib/session.svelte';

	let name = $state(session.me?.name ?? '');
	let said = $state('');
	let failed = $state(false);
	let saving = $state(false);
	const changed = $derived(name.trim().replace(/\s+/g, ' ') !== (session.me?.name ?? ''));

	async function save(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		try {
			const r = await api<{ name: string }>('/me/name', { json: { name } });
			await loadMe();
			name = r.name;
			[said, failed] = ['Saved.', false];
		} catch (err) {
			[said, failed] = [(err as Error).message, true];
		}
		saving = false;
	}
</script>

<svelte:head><title>Your profile · maiaCITY play</title></svelte:head>

<main class="page profile">
	<p class="eyebrow">Your profile</p>
	<h1>{session.me?.name}</h1>
	<p class="muted">
		{/^[aeiou]/.test(session.me?.level ?? '') ? 'An' : 'A'} {session.me?.level} of Maia City{session.me?.founder ? ` · Founder ${String(session.me.founder).padStart(3, '0')}` : ''}.
	</p>

	<form class="card box" onsubmit={save}>
		<label for="name">Your name</label>
		<div class="row">
			<input id="name" bind:value={name} maxlength="60" autocomplete="name" oninput={() => (said = '')} />
			<button class="btn" disabled={saving || !changed}>Save</button>
		</div>
		<p class="hint muted">What others in Maia City see: at least two characters.</p>
		{#if said}<p class:error={failed} class:ok={!failed} role="status">{said}</p>{/if}
	</form>
</main>

<style>
	.profile { max-width: 40rem; }
	.eyebrow { margin: 0; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--terracotta); }
	h1 { margin: 0.3rem 0 0.2rem; }
	.box { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.5rem; padding: 1.5rem; }
	label { font-weight: 600; }
	.row { display: flex; gap: 0.6rem; }
	.row input { flex: 1; min-width: 0; padding: 0.6em 0.8em; }
	.hint { margin: 0; font-size: 0.85rem; }
	.ok { margin: 0; color: var(--brand-green); }
	.error { margin: 0; }
</style>
