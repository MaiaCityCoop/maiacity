<script lang="ts">
	import { onMount } from 'svelte';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';

	type P = { id: string; asset_id: string; label: string; version_label: string | null; number: number; status: string; note: string; author: string | null; decided_by: string | null; created: string };
	let list = $state<P[]>([]);
	let status = $state('open');
	let error = $state('');
	const load = async () => {
		try { list = await api<P[]>(`/proposals${status === 'all' ? '' : `?status=${status}`}`); error = ''; } catch (e) { error = (e as Error).message; }
	};
	onMount(load);
	async function act(id: string, verdict: string) {
		try { await api(`/proposals/${id}/${verdict}`, { method: 'POST' }); await load(); } catch (e) { error = (e as Error).message; }
	}
	const deciding = $derived(may(session.me, 'decide', 'asset_version'));
</script>

<svelte:head><title>Proposals · maiaCITY play</title></svelte:head>

<main class="page">
	<h1>Proposals</h1>
	<p class="muted">New versions of Maia City's assets: citizens propose them, admins accept or reject them. Of two proposals on the same version, the first accepted goes in and the other is stale: rebuilt and proposed again.</p>
	<div class="tabs">{#each ['open', 'accepted', 'rejected', 'stale', 'withdrawn', 'all'] as s}<button class="btn small" class:ghost={status !== s} onclick={() => ((status = s), load())}>{s}</button>{/each}</div>
	{#if error}<p class="error">{error}</p>{/if}
	{#if !list.length}<p class="muted">Nothing {status === 'all' ? 'yet' : status}.</p>{/if}
	{#each list as p (p.id)}
		<article class="card row">
			<div>
				<h3><a href="/assets/{p.asset_id}/">{p.label}</a> <span class="muted">v{p.number}</span></h3>
				<p class="muted">{p.asset_id} · by {p.author ?? 'someone'} · {new Date(p.created).toLocaleString()}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}</p>
				{#if p.note}<p>{p.note}</p>{/if}
			</div>
			<div class="actions">
				<span class="pill">{p.status}</span>
				{#if p.status === 'open' && deciding}
					<button class="btn small" onclick={() => act(p.id, 'accept')}>Accept</button>
					<button class="btn small ghost" onclick={() => act(p.id, 'reject')}>Reject</button>
				{/if}
				{#if p.status === 'open' && p.author === session.me?.name}<button class="btn small ghost" onclick={() => act(p.id, 'withdraw')}>Withdraw</button>{/if}
			</div>
		</article>
	{/each}
</main>

<style>
	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 1.5rem 0; }
	.row { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; margin-bottom: 0.7rem; }
	.row h3 { margin: 0; font-size: 1.15rem; }
	.row p { margin: 0.2rem 0; font-size: 0.9rem; }
	.actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
</style>
