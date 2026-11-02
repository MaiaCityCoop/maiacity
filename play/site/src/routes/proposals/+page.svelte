<script lang="ts">
	import { onMount } from 'svelte';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';
	import { admitProposed, source as catalogSource } from '$lib/content/assets/catalog.js';
	import { changesOnly, lineDiff } from '$lib/diff';

	const viewer = import('$lib/content/assets/VaultAsset.svelte');

	// admins only for now (Samuel 2026-11-02): anyone else is taken back to the dashboard
	const admin = $derived(session.me?.level === 'admin');
	onMount(() => {
		if (!admin) goto('/', { replaceState: true });
	});

	type P = { id: string; asset_id: string; label: string; grp: string; slug: string; version_label: string | null; number: number; status: string; note: string; author: string | null; decided_by: string | null; created: string; via?: 'web' | 'mcp' };
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

	// reviewing one: its readable source (beside its base's, as the lines that changed) and the version built in the asset
	// box, the sandboxed frame every recipe runs in, before anyone decides. The code is only ever shown here as text.
	type Build = { hash: string; variant: string | null; label: string; first: boolean };
	type Review = { id: string; source: string | null; recipe: string | null; baseVersion: { number: number; source: string | null } | null; builds: Build[] };
	let open = $state('');
	let review = $state<Review | null>(null);
	let code = $state('');
	let baseCode = $state<string | null>(null);
	let shown = $state('');
	let changes = $state(true);
	let reviewError = $state('');
	const text = async (hash: string) => {
		const r = await fetch(`/api/files/${hash}`, { credentials: 'same-origin' });
		if (!r.ok) throw new Error(`The file could not be read (HTTP ${r.status}).`);
		return r.text();
	};
	async function toggle(id: string) {
		if (open === id) return void (open = '');
		open = id;
		review = null;
		code = '';
		baseCode = null;
		shown = '';
		reviewError = '';
		try {
			const r = await api<Review & { builds: any[] }>(`/proposals/${id}`);
			if (open !== id) return;
			code = r.source ? await text(r.source) : r.recipe ? await text(r.recipe) : '';
			baseCode = r.baseVersion?.source ? await text(r.baseVersion.source) : null;
			await admitProposed(r.builds);
			review = r;
			shown = (r.builds.find((b) => b.first) ?? r.builds[0])?.hash ?? '';
		} catch (e) {
			reviewError = (e as Error).message;
		}
	}
	const diff = $derived(baseCode !== null && code ? changesOnly(lineDiff(baseCode, code)) : null);

	// a citizen proposes the next version of an asset: its readable source (or the recipe file the asset box made from it)
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
			const t = await file![0].text();
			// a recipe file the box made is sent as it is (play reads its source out of it); anything else is the source
			const upload = t.startsWith('defineRecipe(function (require) {') ? { recipe: t } : { source: t };
			const r = await api('/proposals', { json: { asset: target, ...upload, note } });
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
			{#if chosen}<p class="muted">Upload the readable source of <code>v{chosen.head + 1}</code>: a module that sets <code>module.exports.recipe</code>, as written, not minified. play wraps it into the recipe file. Every other asset it names, it names by hash.</p>{/if}
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
				<p class="muted">{p.grp}/{p.slug} · by {p.author ?? 'someone'}{#if p.via === 'mcp'} <span class="via" title="Proposed by an agent working for them over MCP">via MCP</span>{/if} · {new Date(p.created).toLocaleString()}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}</p>
				{#if p.note}<p>{p.note}</p>{/if}
				<button class="btn small ghost review" onclick={() => toggle(p.id)}>{open === p.id ? 'Close' : 'Review the code and see it built'}</button>
			</div>
			<div class="actions">
				<span class="pill">{p.status}</span>
				{#if p.status === 'open' && deciding}
					<button class="btn small" onclick={() => act(p.id, 'accept')}>Accept</button>
					<button class="btn small ghost" onclick={() => act(p.id, 'reject')}>Reject</button>
				{/if}
				{#if p.status === 'open' && p.author === session.me?.name}<button class="btn small ghost" onclick={() => act(p.id, 'withdraw')}>Withdraw</button>{/if}
			</div>
			{#if open === p.id}
				<div class="reviewing">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !review}<p class="muted">Reading it…</p>
					{:else}
						<div class="built">
							{#if review.builds.length > 1}
								<div class="tabs small">{#each review.builds as b (b.hash)}<button class="btn small" class:ghost={shown !== b.hash} onclick={() => (shown = b.hash)}>{b.variant ?? b.label}</button>{/each}</div>
							{/if}
							{#if shown}
								{#key shown}
									{#await viewer then { default: VaultAsset }}
										<VaultAsset source={catalogSource} hash={shown} title="{p.label} v{p.number} (proposed)" compact />
									{/await}
								{/key}
							{/if}
							<p class="muted small">Built in the asset box: a sandboxed frame with no origin, running the frozen engine in a worker, with no network, no storage and no access to this page.</p>
						</div>
						<div class="code">
							<div class="codebar">
								<strong>{review.source ? 'Its source' : 'Its recipe file (no source kept)'}</strong>
								{#if diff}<button class="btn small ghost" onclick={() => (changes = !changes)}>{changes ? `Whole file` : `Changes from v${review.baseVersion?.number}`}</button>{/if}
								{#if !review.baseVersion?.source && review.baseVersion}<span class="muted small">v{review.baseVersion.number} has no source to compare (imported)</span>{/if}
							</div>
							{#if diff && changes}
								<pre class="src">{#each diff as l, i (i)}<span class={l.op}>{l.op === 'add' ? '+ ' : l.op === 'del' ? '- ' : l.op === 'skip' ? '' : '  '}{l.text}
</span>{/each}</pre>
							{:else}
								<pre class="src">{code}</pre>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</article>
	{/each}
</main>
{/if}

<style>
	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 1.5rem 0; }
	.row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; margin-bottom: 0.7rem; }
	.row > div:first-child { flex: 1 1 20rem; min-width: 0; }
	.review { margin-top: 0.5rem; }
	.reviewing { flex: 1 1 100%; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; min-width: 0; }
	@media (max-width: 860px) { .reviewing { grid-template-columns: minmax(0, 1fr); } }
	.built { min-width: 0; }
	.code { min-width: 0; }
	.codebar { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.4rem; }
	.src { max-height: 32rem; overflow: auto; margin: 0; padding: 0.8rem; border-radius: 10px; background: var(--paper, #f6f1e6); font-size: 0.78rem; line-height: 1.45; white-space: pre; }
	.src .add { background: color-mix(in srgb, var(--sage, #8fae8b) 30%, transparent); display: block; }
	.src .del { background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); display: block; }
	.src .same { display: block; opacity: 0.7; }
	.src .skip { display: block; opacity: 0.5; font-style: italic; padding: 0.2rem 0; }
	.small { font-size: 0.8rem; }
	.row h3 { margin: 0; font-size: 1.15rem; }
	.row p { margin: 0.2rem 0; font-size: 0.9rem; }
	.propose { display: grid; gap: 0.6rem; padding: 1.2rem; margin-bottom: 1.5rem; }
	.propose h2 { margin: 0; font-size: 1.2rem; }
	.actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
	.via { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.75em; font-weight: 600; }
</style>
