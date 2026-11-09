<!--
	Pieces (play/SPEC.md §4.5; intent 5a15e468, Samuel 2026-11-07): the shared pieces a recipe names by hash, each a
	document `piece:<uuid>` of its own schema (play/api/src/pieces.ts). Each piece as its source reads, every accepted
	version with the BLAKE3 hash a recipe requires it by, and its History tab on the right ($lib/app/History.svelte, the
	one History of every view). A piece changes only by an intent's Accept, over MCP (doc_edit, propose_doc_version with
	`kind: "piece"`). `?piece=<id>` picks one, `&v=<n>` one of its versions. Admins only.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { pieceAddress } from '$lib/app/address';
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import History, { type Pick } from '$lib/app/History.svelte';

	type Kept = { number: number; hash: string; requires: string[]; depth: number };
	type Item = { id: string; label: string; note: string; number: number; bytes: number; versions: Kept[] };
	type Piece = { id: string; json: { label?: string; note?: string; source?: string }; number: number; version?: number; edit?: number };

	adminsOnly();
	const admin = $derived(isAdmin());
	let list = $state<Item[]>([]);
	let piece = $state<Piece | null>(null);
	let error = $state('');
	const params = $derived(page.url.searchParams);
	const id = $derived(pieceAddress(params).piece ?? list[0]?.id ?? '');
	const wantV = $derived(pieceAddress(params).v);
	const item = $derived(list.find((p) => p.id === id) ?? null);
	$effect(() => {
		if (!admin) return;
		api<Item[]>('/docs?kind=piece').then((l) => (list = l), (e) => (error = e.message));
	});
	$effect(() => {
		if (!admin || !id) return;
		const q = wantV ? `?v=${encodeURIComponent(wantV)}` : '';
		let gone = false;
		api<Piece>(`/docs/${id}${q}`).then(
			(p) => !gone && ((piece = p), (error = '')),
			(e) => !gone && (error = e.message)
		);
		return () => (gone = true);
	});
	const at = (p: string, v?: number) => goto(`?piece=${p}${v ? `&v=${v}` : ''}`, { keepFocus: true, noScroll: true });
	async function picked(p: Pick | null) {
		if (!piece) return;
		if (!p) return void at(piece.id);
		if ('version' in p) return void at(piece.id, p.version === piece.number ? undefined : p.version);
		piece = await api<Piece>(`/docs/${piece.id}?edit=${p.edit.seq}`);
	}
	const shownVersion = $derived(piece ? (piece.version ?? piece.number) : null);
	const kept = $derived(item?.versions.find((v) => v.number === shownVersion) ?? null);
	const short = (h: string) => `${h.slice(0, 12)}…`;
</script>

<svelte:head><title>Pieces · maiaCITY play</title></svelte:head>

{#snippet nav()}
	<ul class="nav">
		{#each list as p (p.id)}
			<li><a href="?piece={p.id}" class:on={p.id === id} onclick={(e) => (e.preventDefault(), at(p.id))}>{p.label} <span class="soft">v{p.number}</span></a></li>
		{:else}
			<li class="soft">No piece yet.</li>
		{/each}
	</ul>
{/snippet}

{#snippet head()}
	{#if piece}
		<header class="about-head">
			<small>Piece · owned by Maia City</small>
			<h3>{piece.json.label ?? 'A piece'}</h3>
			{#if piece.edit}
				<p class="asif">As it stood at an edit of its history: <a href="?piece={piece.id}" onclick={(e) => (e.preventDefault(), at(piece!.id))}>its newest version</a></p>
			{:else if shownVersion !== piece.number}
				<p class="asif">Version {shownVersion}, not its newest: <a href="?piece={piece.id}" onclick={(e) => (e.preventDefault(), at(piece!.id))}>v{piece.number}</a></p>
			{/if}
		</header>
	{/if}
{/snippet}

{#snippet history()}
	{#if piece}
		<History doc={piece.id} shown={shownVersion ?? piece.number} label="the piece" intent={null} onPick={picked} />
		<p class="soft propose">Propose v{piece.number + 1} over MCP (doc_edit, propose_doc_version) as an intent's work; it is decided in <a href="/intents/">Intents</a>. A recipe that names an older version keeps building it.</p>
	{/if}
{/snippet}

{#if admin}
	<div class="pieces">
		<Frame nav={nav} navLabel="Maia City's pieces" navIcon="asset" asideHead={piece ? head : undefined} history={piece ? history : undefined} asideLabel="The piece's history">
			<article class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if piece}
					<p class="eyebrow">Piece · v{shownVersion}{kept ? ` · BLAKE3 ${short(kept.hash)}` : ''}</p>
					<h1>{piece.json.label ?? 'A piece'}</h1>
					{#if piece.json.note}<p class="lead">{piece.json.note}</p>{/if}
					{#if kept}
						<p class="lead small">A recipe requires this version as <code>require("{kept.hash}")</code> and lists it in its manifest's <code>pieces</code>.{kept.requires.length ? ` It requires ${kept.requires.length} piece${kept.requires.length > 1 ? 's' : ''} itself, ${kept.depth} deep.` : ''}</p>
					{/if}
					{#if item?.versions.length}
						<h2>Its versions</h2>
						<ul class="versions">
							{#each item.versions as v (v.number)}
								<li><a href="?piece={piece.id}&v={v.number}" onclick={(e) => (e.preventDefault(), at(piece!.id, v.number))}>v{v.number}</a> <code title={v.hash}>{v.hash}</code></li>
							{/each}
						</ul>
					{/if}
					<h2>Its source</h2>
					<pre class="source">{piece.json.source ?? ''}</pre>
				{:else if !error}
					<p class="soft">{list.length ? '…' : 'No piece yet: one is proposed over MCP (propose_doc_version, kind piece).'}</p>
				{/if}
			</article>
		</Frame>
	</div>
{/if}

<style>
	.pieces { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.pieces :global(.soft) { color: var(--soft); }
	.body { max-width: 56rem; padding: 0.4rem 0 3rem; }
	.eyebrow { margin: 0; color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0.2rem 0 0.5rem; font-size: clamp(1.5rem, 3vw, 2rem); }
	h2 { margin: 1.2rem 0 0.4rem; font-size: 1rem; font-family: var(--font-body); font-weight: 600; }
	.lead { margin: 0 0 0.8rem; color: var(--ink-soft); }
	.small { font-size: 0.84rem; }
	code { font-size: 0.85em; overflow-wrap: anywhere; }
	.versions { margin: 0; padding-left: 1.1rem; font-size: 0.84rem; }
	.source { margin: 0; padding: 0.8rem; border-radius: 10px; background: rgb(255 255 255 / 0.6); border: 1px solid rgb(38 56 44 / 0.12); font-size: 0.78rem; line-height: 1.45; overflow: auto; max-height: 70vh; white-space: pre; }
	.nav { list-style: none; margin: 0; padding: 0.3rem; }
	.nav a { display: block; padding: 0.3rem 0.5rem; border-radius: 6px; text-decoration: none; color: inherit; font-size: 0.86rem; }
	.nav a.on { background: rgb(0 0 0 / 0.06); font-weight: 600; }
	.bad { color: var(--terracotta, #c23a22); }
	.about-head { margin: 0 0 0.9rem 0.35rem; }
	.about-head small { color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0.3rem; font-size: 1.15rem; font-family: var(--font-body); font-weight: 600; }
	.asif { margin: 0.4rem 0 0.5rem; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--mustard-soft, rgb(232 178 60 / 0.18)); font-size: 0.78rem; line-height: 1.4; }
	.propose { margin: 0 0 1.2rem 0.35rem; font-size: 0.76rem; }
</style>
