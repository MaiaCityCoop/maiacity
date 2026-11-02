<script lang="ts">
	import { onMount } from 'svelte';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';

	// admins only for now (Samuel 2026-11-02): anyone else is taken back to the dashboard
	const admin = $derived(session.me?.level === 'admin');
	onMount(() => {
		if (!admin) goto('/', { replaceState: true });
	});

	type P = { id: string; asset_id: string; label: string; grp: string; slug: string; version_label: string | null; number: number; status: string; note: string; author: string | null; decided_by: string | null; created: string };
	let list = $state<P[]>([]);
	let status = $state('open');
	let error = $state('');
	const load = async () => {
		try { list = await api<P[]>(`/proposals${status === 'all' ? '' : `?status=${status}`}`); error = ''; } catch (e) { error = (e as Error).message; }
	};
	onMount(() => {
		if (admin) load();
	});
	async function act(id: string, verdict: string) {
		try { await api(`/proposals/${id}/${verdict}`, { method: 'POST' }); await load(); } catch (e) { error = (e as Error).message; }
	}
	const deciding = $derived(may(session.me, 'decide', 'asset_version'));

	// a citizen proposes the next version of an asset: the recipe file the asset box made for it (version head + 1)
	type Listed = { id: string; grp: string; slug: string; label: string; head: number };
	let assets = $state<Listed[]>([]);
	let target = $state('');
	let file = $state<FileList | null>(null);
	let note = $state('');
	let sent = $state('');
	onMount(async () => {
		if (admin && may(session.me, 'propose', 'asset_version')) assets = await api<Listed[]>('/assets');
	});
	const chosen = $derived(assets.find((a) => a.id === target));
	async function propose() {
		sent = '';
		try {
			const r = await api('/proposals', { json: { asset: target, recipe: await file![0].text(), note } });
			sent = `Proposed as v${r.number}: an admin will look at it.`;
			note = '';
			await load();
		} catch (e) {
			sent = (e as Error).message;
		}
	}
</script>

<svelte:head><title>Proposals · maiaCITY play</title></svelte:head>

{#if admin}
<main class="page">
	<h1>Proposals</h1>
	<p class="muted">New versions of Maia City's assets: citizens propose them, admins accept or reject them. Of two proposals on the same version, the first accepted goes in and the other is stale: rebuilt and proposed again.</p>
	<div class="tabs">{#each ['open', 'accepted', 'rejected', 'stale', 'withdrawn', 'all'] as s}<button class="btn small" class:ghost={status !== s} onclick={() => ((status = s), load())}>{s}</button>{/each}</div>
	{#if may(session.me, 'propose', 'asset_version')}
		<section class="card propose">
			<h2>Propose a new version</h2>
			<select bind:value={target}><option value="">Which asset?</option>{#each assets as a (a.id)}<option value={a.id}>{a.label} · {a.grp}/{a.slug} · now v{a.head}</option>{/each}</select>
			{#if chosen}<p class="muted">Upload the recipe file the asset box made for <code>v{chosen.head + 1}</code> of it. Every other asset it names, it names by hash.</p>{/if}
			<input type="file" accept=".js,text/javascript" bind:files={file} />
			<input placeholder="What changed" bind:value={note} />
			<button class="btn" disabled={!target || !file?.length} onclick={propose}>Propose</button>
			{#if sent}<p>{sent}</p>{/if}
		</section>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
	{#if !list.length}<p class="muted">Nothing {status === 'all' ? 'yet' : status}.</p>{/if}
	{#each list as p (p.id)}
		<article class="card row">
			<div>
				<h3><a href="/assets/#{p.asset_id}">{p.label}</a> <span class="muted">v{p.number}</span></h3>
				<p class="muted">{p.grp}/{p.slug} · by {p.author ?? 'someone'} · {new Date(p.created).toLocaleString()}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}</p>
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
{/if}

<style>
	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 1.5rem 0; }
	.row { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; margin-bottom: 0.7rem; }
	.row h3 { margin: 0; font-size: 1.15rem; }
	.row p { margin: 0.2rem 0; font-size: 0.9rem; }
	.propose { display: grid; gap: 0.6rem; padding: 1.2rem; margin-bottom: 1.5rem; }
	.propose h2 { margin: 0; font-size: 1.2rem; }
	.actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
</style>
