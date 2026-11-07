<!--
	Your profile: the name Maia City knows you by, yours to change (POST /api/me/name, the sign-up rule for a name), and
	what you are there: your level and, for a founder, your number; for an admin, the access tokens an agent works for
	them with over MCP (/api/mcp). Opened from the nav pill's You menu.
-->
<script lang="ts">
	import { api } from '$lib/api';
	import { onMount } from 'svelte';
	import { loadMe, session } from '$lib/session.svelte';

	let name = $state(session.me?.name ?? '');
	let said = $state('');
	let failed = $state(false);
	let saving = $state(false);
	const article = $derived(/^[aeiou]/.test(session.me?.level ?? '') ? 'An' : 'A');
	const changed = $derived(name.trim().replace(/\s+/g, ' ') !== (session.me?.name ?? ''));

	// an admin's access tokens, for an agent working for them over MCP (/api/mcp): the token shown once, here alone
	type Token = { id: string; name: string; created: string; last_used: string | null; revoked_at: string | null; avenbox: boolean };
	const admin = $derived(session.me?.level === 'admin');
	let tokens = $state<Token[]>([]);
	let tokenName = $state('');
	let fresh = $state<{ name: string; token: string } | null>(null);
	let tokenError = $state('');
	const endpoint = typeof location === 'undefined' ? '' : `${location.origin}/api/mcp`;
	const loadTokens = async () => {
		if (admin) tokens = await api<Token[]>('/tokens').catch(() => []);
	};
	onMount(loadTokens);
	async function makeToken(e: SubmitEvent) {
		e.preventDefault();
		tokenError = '';
		try {
			fresh = await api<{ name: string; token: string }>('/tokens', { json: { name: tokenName } });
			tokenName = '';
			await loadTokens();
		} catch (err) {
			tokenError = (err as Error).message;
		}
	}
	async function revoke(t: Token) {
		if (!confirm(`Revoke "${t.name}"? An agent using it can do nothing more.`)) return;
		await api(`/tokens/${t.id}`, { method: 'DELETE' }).catch((err) => (tokenError = (err as Error).message));
		if (fresh && tokens.find((x) => x.id === t.id)?.name === fresh.name) fresh = null;
		await loadTokens();
	}
	// avenBOX's token (play/SPEC.md §4.12): the one the GitHub runs of the intents' checks hold (the repository's secret
	// PLAY_MCP_TOKEN); a code intent's test and measure results are taken from it alone
	async function markBox(t: Token) {
		const avenbox = !t.avenbox;
		if (avenbox && !confirm(`Mark "${t.name}" as avenBOX's? Only the GitHub runs of the intents' checks should hold it: what it records decides code intents.`)) return;
		await api(`/tokens/${t.id}/avenbox`, { json: { avenbox } }).catch((err) => (tokenError = (err as Error).message));
		await loadTokens();
	}
	const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

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
		{article} {session.me?.level} of Maia City{session.me?.founder ? ` · Founder ${String(session.me.founder).padStart(3, '0')}` : ''}.
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

	{#if admin}
		<section class="card box">
			<h2>Agents (MCP)</h2>
			<p class="hint muted">
				An agent (Claude, say) works on Maia City's assets for you with an access token: it reads the assets and their
				recipe files and proposes new versions, which come to the intents (the star in the nav pill) under your name, marked MCP. Deciding
				stays with the admins there. Admins only, for now.
			</p>
			<form class="row" onsubmit={makeToken}>
				<input bind:value={tokenName} placeholder="Where it is used, e.g. Claude laptop" maxlength="60" aria-label="Token name" />
				<button class="btn" disabled={!tokenName.trim()}>Make a token</button>
			</form>
			{#if tokenError}<p class="error">{tokenError}</p>{/if}
			{#if fresh}
				<div class="fresh" role="status">
					<p><b>{fresh.name}</b>: copy it now, it is shown only this once.</p>
					<code class="secret">{fresh.token}</code>
					<p class="hint muted">In Claude Code:</p>
					<code class="cmd">claude mcp add --transport http maia-play {endpoint} --header "Authorization: Bearer {fresh.token}"</code>
				</div>
			{/if}
			{#if tokens.length}
				<table>
					<thead><tr><th>Token</th><th>Made</th><th>Last used</th><th title="The token of the intents' checks' runs on GitHub">avenBOX</th><th></th></tr></thead>
					<tbody>
						{#each tokens as t (t.id)}
							<tr class:revoked={!!t.revoked_at}>
								<td>{t.name}</td>
								<td class="muted">{day(t.created)}</td>
								<td class="muted">{day(t.last_used)}</td>
								<td>{#if !t.revoked_at}<label class="muted"><input type="checkbox" checked={t.avenbox} onchange={() => markBox(t)} aria-label="avenBOX's token" /> avenBOX's</label>{:else if t.avenbox}<span class="muted">avenBOX's</span>{/if}</td>
								<td class="end">{#if t.revoked_at}<span class="muted">revoked</span>{:else}<button class="btn small ghost" onclick={() => revoke(t)}>Revoke</button>{/if}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
			<p class="hint muted">Endpoint: <code>{endpoint}</code></p>
		</section>
	{/if}
</main>

<style>
	.profile { max-width: 46rem; }
	.eyebrow { margin: 0; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--terracotta); }
	h1 { margin: 0.3rem 0 0.2rem; }
	.box { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.5rem; padding: 1.5rem; }
	label { font-weight: 600; }
	.row { display: flex; gap: 0.6rem; }
	.row input { flex: 1; min-width: 0; padding: 0.6em 0.8em; }
	.hint { margin: 0; font-size: 0.85rem; }
	.ok { margin: 0; color: var(--brand-green); }
	.error { margin: 0; }
	h2 { margin: 0; font-size: 1.25rem; }
	.fresh { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.9rem 1rem; border-radius: 14px; background: var(--mustard-soft); }
	.fresh p { margin: 0; }
	code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.8rem; overflow-wrap: anywhere; }
	.secret, .cmd { display: block; padding: 0.5rem 0.65rem; border-radius: 10px; background: #fff; user-select: all; }
	table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
	th, td { text-align: left; padding: 0.45rem 0.3rem; border-bottom: 1px solid var(--line); }
	th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
	.end { text-align: right; }
	tr.revoked td:first-child { text-decoration: line-through; color: var(--muted); }
</style>
