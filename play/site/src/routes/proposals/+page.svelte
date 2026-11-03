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
	let loaded = $state(false);
	let error = $state('');
	const load = async () => {
		try { list = await api<P[]>('/proposals'); error = ''; loaded = true; } catch (e) { error = (e as Error).message; }
	};
	// the board: one column a state a proposal is in, newest first in each (stale and withdrawn share the last)
	const COLUMNS = [
		{ id: 'open', title: 'Open', note: 'waiting for an admin', states: ['open'] },
		{ id: 'accepted', title: 'Accepted', note: 'the asset\'s head now', states: ['accepted'] },
		{ id: 'rejected', title: 'Rejected', note: 'not taken', states: ['rejected'] },
		{ id: 'done', title: 'Stale · withdrawn', note: 'overtaken or taken back', states: ['stale', 'withdrawn'] }
	];
	const columns = $derived(COLUMNS.map((c) => ({ ...c, cards: list.filter((p) => c.states.includes(p.status)) })));
	let proposing = $state(false);
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
	const reviewed = $derived(list.find((p) => p.id === open) ?? null);
	const close = () => (open = '');
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
			sent = `Proposed as v${r.number}: it is in Open, for an admin to look at.`;
			note = '';
			file = null;
			await load();
		} catch (e) {
			sent = (e as Error).message;
		}
	}
</script>

<svelte:head><title>Proposals · maiaCITY play</title></svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && open && close()} />

{#if admin}
<main class="page board-page">
	<header class="head">
		<div>
			<h1>Proposals</h1>
			<p class="muted">New versions of Maia City's assets: citizens propose them, admins accept or reject them. Of two proposals on the same version, the first accepted goes in and the other goes stale.</p>
		</div>
		{#if may(session.me, 'propose', 'asset_version')}
			<button class="btn" onclick={() => (proposing = !proposing)}>{proposing ? 'Close' : '+ New proposal'}</button>
		{/if}
	</header>
	{#if proposing}
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
	<div class="board">
		{#each columns as c (c.id)}
			<section class="column" data-col={c.id}>
				<header class="colhead"><h2>{c.title}</h2><span class="count">{c.cards.length}</span></header>
				<p class="colnote">{c.note}</p>
				<div class="cards">
					{#each c.cards as p (p.id)}
						<article class="kcard" class:mine={open === p.id}>
							<button class="cardbody" onclick={() => toggle(p.id)} title="Review the code and see it built">
								<span class="title"><strong>{p.label}</strong> <span class="ver">v{p.number}</span></span>
								<span class="meta">{p.grp}/{p.slug}</span>
								{#if p.note}<span class="note">{p.note}</span>{/if}
								<span class="meta">
									{p.author ?? 'someone'}{#if p.via === 'mcp'} <span class="via" title="Proposed by an agent working for them over MCP">MCP</span>{/if}
									· {new Date(p.created).toLocaleDateString()}
									{#if p.status !== 'open' && p.status !== 'withdrawn' && p.decided_by} · {p.status} by {p.decided_by}{/if}
									{#if p.status === 'stale' || p.status === 'withdrawn'} · <span class="pill tiny">{p.status}</span>{/if}
								</span>
							</button>
							{#if p.status === 'open' && (deciding || p.author === session.me?.name)}
								<div class="cardactions">
									{#if deciding}
										<button class="btn small" onclick={() => act(p.id, 'accept')}>Accept</button>
										<button class="btn small ghost" onclick={() => act(p.id, 'reject')}>Reject</button>
									{/if}
									{#if p.author === session.me?.name}<button class="btn small ghost" onclick={() => act(p.id, 'withdraw')}>Withdraw</button>{/if}
								</div>
							{/if}
						</article>
					{:else}
						<p class="empty">{loaded ? 'Nothing here.' : '…'}</p>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</main>

{#if open && reviewed}
	<div class="scrim" role="presentation" onclick={close}></div>
	<div class="dialog card" role="dialog" aria-modal="true" aria-label="Review {reviewed.label} v{reviewed.number}">
		<header class="dhead">
			<div>
				<h2>{reviewed.label} <span class="ver">v{reviewed.number}</span> <span class="pill">{reviewed.status}</span></h2>
				<p class="muted small">{reviewed.grp}/{reviewed.slug} · by {reviewed.author ?? 'someone'}{#if reviewed.via === 'mcp'} <span class="via">via MCP</span>{/if} · {new Date(reviewed.created).toLocaleString()} · <a href="/assets/#{reviewed.asset_id}">the asset</a></p>
				{#if reviewed.note}<p>{reviewed.note}</p>{/if}
			</div>
			<div class="dactions">
				{#if reviewed.status === 'open' && deciding}
					<button class="btn small" onclick={() => act(reviewed.id, 'accept').then(close)}>Accept</button>
					<button class="btn small ghost" onclick={() => act(reviewed.id, 'reject').then(close)}>Reject</button>
				{/if}
				<button class="btn small ghost" onclick={close} aria-label="Close">✕</button>
			</div>
		</header>
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
								<VaultAsset source={catalogSource} hash={shown} title="{reviewed.label} v{reviewed.number} (proposed)" compact />
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
	</div>
{/if}
{/if}

<style>
	.board-page { max-width: none; }
	.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
	.head > div { flex: 1 1 28rem; max-width: 52rem; }
	.head p { margin: 0.3rem 0 0; }
	.propose { display: grid; gap: 0.6rem; padding: 1.2rem; margin-bottom: 1.2rem; max-width: 44rem; }
	.propose h2 { margin: 0; font-size: 1.2rem; }
	/* the board: four columns side by side, scrolling sideways on a narrow screen */
	.board { display: grid; grid-template-columns: repeat(4, minmax(15rem, 1fr)); gap: 0.9rem; overflow-x: auto; padding-bottom: 6rem; align-items: start; }
	.column { background: color-mix(in srgb, var(--ink, #23382b) 5%, transparent); border-radius: 14px; padding: 0.75rem; min-height: 12rem; }
	.colhead { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
	.colhead h2 { margin: 0; font-size: 1rem; }
	.column[data-col='open'] .colhead h2 { color: var(--terracotta, #c96f53); }
	.column[data-col='accepted'] .colhead h2 { color: var(--sage-deep, #4f7a55); }
	.count { font-size: 0.75rem; font-weight: 700; padding: 0.05rem 0.5rem; border-radius: 999px; background: var(--paper, #fbf8f1); }
	.colnote { margin: 0.15rem 0 0.6rem; font-size: 0.75rem; color: var(--ink-soft, #6b746c); }
	.cards { display: grid; gap: 0.55rem; }
	.kcard { background: var(--paper, #fbf8f1); border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); overflow: hidden; }
	.kcard.mine { outline: 2px solid var(--mustard, #d9a72e); }
	.cardbody { all: unset; box-sizing: border-box; display: grid; gap: 0.25rem; width: 100%; padding: 0.7rem 0.8rem; cursor: pointer; }
	.cardbody:hover { background: color-mix(in srgb, var(--mustard, #d9a72e) 8%, transparent); }
	.cardbody:focus-visible { outline: 2px solid var(--mustard, #d9a72e); outline-offset: -2px; }
	.title { font-size: 0.95rem; }
	.ver { color: var(--ink-soft, #6b746c); font-weight: 500; }
	.meta { font-size: 0.75rem; color: var(--ink-soft, #6b746c); }
	.note { font-size: 0.85rem; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
	.cardactions { display: flex; gap: 0.35rem; flex-wrap: wrap; padding: 0 0.8rem 0.7rem; }
	.empty { margin: 0.4rem 0.2rem; font-size: 0.8rem; color: var(--ink-soft, #6b746c); }
	.pill.tiny { font-size: 0.7rem; padding: 0 0.4em; }
	.via { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.75em; font-weight: 600; }
	/* reviewing one: a dialog over the board */
	.scrim { position: fixed; inset: 0; background: rgb(20 30 22 / 0.35); z-index: 40; }
	.dialog { position: fixed; inset: 3vh 3vw; z-index: 41; overflow: auto; padding: 1.2rem; display: grid; grid-template-rows: auto 1fr; gap: 1rem; }
	.dhead { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
	.dhead h2 { margin: 0; font-size: 1.3rem; }
	.dhead p { margin: 0.2rem 0; }
	.dactions { display: flex; gap: 0.4rem; flex-shrink: 0; }
	.reviewing { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; min-width: 0; }
	@media (max-width: 860px) { .reviewing { grid-template-columns: minmax(0, 1fr); } .dialog { inset: 0; border-radius: 0; } }
	.built, .code { min-width: 0; }
	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
	.codebar { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.4rem; }
	.src { max-height: 70vh; overflow: auto; margin: 0; padding: 0.8rem; border-radius: 10px; background: var(--paper, #f6f1e6); font-size: 0.78rem; line-height: 1.45; white-space: pre; }
	.src .add { background: color-mix(in srgb, var(--sage, #8fae8b) 30%, transparent); display: block; }
	.src .del { background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); display: block; }
	.src .same { display: block; opacity: 0.7; }
	.src .skip { display: block; opacity: 0.5; font-style: italic; padding: 0.2rem 0; }
	.small { font-size: 0.8rem; }
</style>
