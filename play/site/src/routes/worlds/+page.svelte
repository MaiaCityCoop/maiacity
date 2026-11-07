<!--
	WORLDS (Samuel 2026-11-05, play/SPEC.md §4.11): the asset group `worlds`, a world being the other assets composed
	into one place. On the left Maia City's worlds; in the middle the one picked, big, everything it names drawn where it
	stands, alive if it moves (its traffic, its signals, its sirens), under its own sky; on the right, in its History tab
	($lib/app/History.svelte, the one History of every view), its versions and, for admins, every edit it was made in. Its
	address is `#<asset id>` (its UUID), a version of it `#<asset id>/<recipe hash>`.

	Its film page, `/worlds/?film&asset=<asset id>&recipe=<recipe hash>` (play/SPEC.md §4.11): the world alone, whole
	screen, handed to the film camera (`window.__world`, $lib/content/worlds/film.js), its clock the shot's.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import History, { type ChainVersion, type Pick } from '$lib/app/History.svelte';
	import { api } from '$lib/api';
	import { catalogReady } from '$lib/recipes';
	import { INDEX, admitProposed, source } from '$lib/content/assets/catalog.js';
	import WorldStage from '$lib/content/worlds/WorldStage.svelte';

	type Listed = { id: string; grp: string; slug: string; label: string; head: number; versions: number };
	type Version = { id: string; number: number; recipe: string | null; defaultVariant: string | null; note: string; created: string; author: string | null; approvedBy: string | null; variants: { name: string; recipe: string; label: string | null }[]; cardLabel: string | null };
	type Chain = { id: string; grp: string; slug: string; label: string; versions: Version[] };

	let listed = $state<Listed[]>([]);
	let ready = $state(false);
	let failed = $state('');
	let hash = $state(typeof location === 'undefined' ? '' : decodeURIComponent(location.hash.slice(1)));
	let chain = $state<Chain | null>(null);
	// the film page: the world a shot names, by its asset's UUID and its version's recipe hash
	const filmed = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
	const film = filmed?.has('film') ? { asset: filmed.get('asset') ?? '', recipe: filmed.get('recipe') ?? '' } : null;
	const filmOk = !!film && /^[0-9a-f-]{36}$/.test(film.asset) && /^[0-9a-f]{64}$/.test(film.recipe);
	/** the film camera given the world once its view is up */
	const toFilm = async (view: any) => {
		const { connectWorldFilm } = await import('$lib/content/worlds/film.js');
		const shown = new Promise<void>((done, fail) => {
			const wait = () => (view.state.phase === 'shown' ? done() : view.state.phase === 'failed' ? fail(new Error(view.state.error)) : setTimeout(wait, 50));
			wait();
		});
		connectWorldFilm(view, { asset: film!.asset, recipe: film!.recipe, shown });
	};

	onMount(() => {
		const on = () => (hash = decodeURIComponent(location.hash.slice(1)));
		addEventListener('hashchange', on);
		Promise.all([api<Listed[]>('/assets'), catalogReady()])
			.then(([all]) => {
				listed = all.filter((a) => a.grp === 'worlds');
				ready = true;
			})
			.catch((e) => (failed = (e as Error).message));
		return () => removeEventListener('hashchange', on);
	});

	const parts = $derived(hash.split('/'));
	const assetId = $derived(parts[0] || (listed[0]?.id ?? ''));
	const wanted = $derived(parts[1] ?? '');
	$effect(() => {
		const id = assetId;
		if (!id || !ready) return;
		let gone = false;
		api<Chain>(`/assets/${id}`).then(
			(c) => !gone && (chain = c),
			(e) => !gone && (failed = e.message)
		);
		return () => (gone = true);
	});
	const ownOf = (v: Version) => v.recipe ?? v.variants.find((x) => x.name === v.defaultVariant)?.recipe ?? v.variants[0]?.recipe ?? null;
	const shownHash = $derived(chain?.id === assetId ? wanted || (chain.versions[0] ? ownOf(chain.versions[0]) : null) : null);
	const shownVersion = $derived(chain?.versions.find((v) => ownOf(v) === shownHash || v.variants.some((x) => x.recipe === shownHash)) ?? null);
	const go = (h: string) => {
		location.hash = h;
		hash = h;
	};
	const short = (h: string | null) => (h ? `${h.slice(0, 10)}…` : '—');

	// its History: an edit picked there is drawn as the world stood at it, from its recipe file at that edit
	let editHash = $state<string | null>(null);
	$effect(() => {
		void shownHash;
		editHash = null;
	});
	const chainOf = (c: Chain): ChainVersion[] => c.versions.map((v) => ({ number: v.number, note: v.note, at: v.created, by: v.author ?? 'someone', acceptedBy: v.approvedBy, label: v.cardLabel ?? c.label }));
	async function picked(p: Pick | null) {
		if (!chain) return;
		if (!p) return void (editHash = null);
		if ('version' in p) {
			const v = chain.versions.find((x) => x.number === p.version);
			if (v) go(`${chain.id}/${ownOf(v)}`);
			return;
		}
		const b = await api<any>(`/assets/${chain.id}/recipe?edit=${p.edit.seq}`);
		await admitProposed([b]);
		editHash = b.hash;
	}
</script>

<svelte:head><title>Worlds · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<h3 class="nav-group">Worlds</h3>
	{#each listed as a (a.id)}
		<a class="nav-item" class:on={assetId === a.id} href="#{a.id}" onclick={(e) => (e.preventDefault(), go(a.id))} aria-current={assetId === a.id ? 'page' : undefined}
			><Icon name="asset" size={16} /><span>{a.label}</span><small>v{a.head}</small></a
		>
	{:else}
		<p class="soft none">No worlds yet.</p>
	{/each}
{/snippet}

{#snippet head()}
	{#if chain && shownVersion}
		<header class="about-head">
			<small>Worlds · owned by Maia City</small>
			<h3>{chain.label}</h3>
			<p class="soft">v{shownVersion.number} · {chain.versions.length} version{chain.versions.length === 1 ? '' : 's'}</p>
		</header>
	{/if}
{/snippet}

{#snippet history()}
	{#if chain && shownVersion}
		<History doc={chain.id} shown={shownVersion.number} label="the world" versions={chainOf(chain)} onPick={picked} />
		<dl>
			<dt>Id</dt><dd class="mono" title={shownVersion.id}>{short(shownVersion.id)}</dd>
			<dt>Recipe</dt><dd class="mono" title={shownHash ?? ''}>BLAKE3 {short(shownHash)}</dd>
		</dl>
	{/if}
{/snippet}

{#if film}
	<div class="film">
		{#if !filmOk}
			<p class="error">A world's film page names it by its asset's UUID and its version's recipe hash: /worlds/?film&amp;asset=…&amp;recipe=…</p>
		{:else if failed}
			<p class="error">{failed}</p>
		{:else if ready}
			<WorldStage {source} engine={INDEX.engine} hash={film.recipe} bare onview={toFilm} />
		{/if}
	</div>
{:else}
<div class="worlds">
	<Frame nav={ready ? shelf : undefined} asideHead={chain && shownVersion ? head : undefined} history={chain && shownVersion ? history : undefined} navLabel="Maia City's worlds" asideLabel="The world's history" navIcon="asset" flush>
		{#if failed}
			<p class="error">{failed}</p>
		{:else if !ready}
			<p class="soft">Reading Maia City's worlds…</p>
		{:else if shownHash}
			{#key editHash ?? shownHash}<WorldStage {source} engine={INDEX.engine} hash={editHash ?? shownHash} />{/key}
		{:else}
			<p class="soft">No world is picked.</p>
		{/if}
	</Frame>
</div>
{/if}

<style>
	.film {
		position: fixed;
		inset: 0;
		background: #000;
	}
	.worlds {
		height: 100%;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 10px;
		font-size: 13px;
	}
	dd {
		margin: 0;
	}
	.mono {
		font-family: ui-monospace, monospace;
	}
	.error {
		color: #a11;
		padding: 16px;
	}
	.soft {
		color: #666;
	}
	.none,
	p.soft {
		padding: 0 12px;
	}
</style>
