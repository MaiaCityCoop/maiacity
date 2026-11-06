<!--
	WORLDS (Samuel 2026-11-05, play/SPEC.md §4.11): the asset group `worlds`, a world being the other assets composed
	into one place. On the left Maia City's worlds; in the middle the one picked, big, everything it names drawn where it
	stands, alive if it moves (its traffic, its signals, its sirens), under its own sky; on the right its History, as
	the asset library's ($lib/app/History.svelte: its versions, every edit an admin can see it at, its open intent
	variants), and its details. Its address is `#<asset id>` (its UUID), a version of it `#<asset id>/<recipe hash>`.

	Its film page, `/worlds/?film&asset=<asset id>&recipe=<recipe hash>` (play/SPEC.md §4.11): the world alone, whole
	screen, handed to the film camera (`window.__world`, $lib/content/worlds/film.js), its clock the shot's.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import History, { type Pick } from '$lib/app/History.svelte';
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
	let tab = $state<'history' | 'details'>('history');

	// ---- its history (the asset's Loro document): an edit or an intent variant picked is built in the box, as the
	// asset library builds it, and the world drawn from that recipe
	let pickHash = $state<string | null>(null);
	let asked = 0;
	$effect(() => {
		void shownHash;
		asked++;
		pickHash = null;
	});
	async function onPick(p: Pick) {
		const c = chain;
		if (!c) return;
		if (p.kind === 'version' || p.kind === 'main') {
			asked++;
			pickHash = null;
			const v = p.kind === 'version' ? c.versions.find((x) => x.number === p.number) : null;
			const own = v && v.number !== c.versions[0]?.number ? ownOf(v) : null;
			if ((own ?? '') !== wanted) go(own ? `${c.id}/${own}` : c.id);
			return;
		}
		const mine = ++asked;
		// a variant shown as its newest edit stands
		let seq = p.kind === 'edit' ? p.seq : null;
		if (p.kind === 'variant') {
			const h = await api<{ edits: { seq: number }[] }>(`/docs/${c.id}/history?variant=${encodeURIComponent(p.id)}`);
			seq = h.edits.at(-1)?.seq ?? null;
			if (seq === null) throw new Error('This variant has no edit yet.');
		}
		const b = await api<any>(`/assets/${c.id}/edits/${seq}/recipe`);
		if (mine !== asked) return;
		await admitProposed([b]);
		if (mine === asked) pickHash = b.hash;
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

{#snippet about()}
	{#if chain && shownVersion}
		<header class="about-head">
			<small>Worlds · owned by Maia City</small>
			<h3>{chain.label}</h3>
			<p class="soft">v{shownVersion.number} · {chain.versions.length} version{chain.versions.length === 1 ? '' : 's'}</p>
		</header>
		<div class="tabs" role="tablist">
			<button role="tab" aria-selected={tab === 'history'} class:on={tab === 'history'} onclick={() => (tab = 'history')}>History</button>
			<button role="tab" aria-selected={tab === 'details'} class:on={tab === 'details'} onclick={() => (tab = 'details')}>Details</button>
		</div>
		{#if tab === 'history'}
			<History doc={chain.id} {onPick} version={shownVersion.number} versions={chain.versions.map((v) => ({ number: v.number, note: v.note, at: v.created, by: v.author ?? 'someone', acceptedBy: v.approvedBy, label: v.cardLabel ?? chain!.label }))} />
		{:else}
			<dl>
				<dt>Version</dt><dd>v{shownVersion.number}</dd>
				<dt>Id</dt><dd class="mono" title={shownVersion.id}>{short(shownVersion.id)}</dd>
				<dt>Recipe</dt><dd class="mono" title={shownHash ?? ''}>BLAKE3 {short(shownHash)}</dd>
				<dt>By</dt><dd>{shownVersion.author ?? 'someone'}{shownVersion.approvedBy ? `, accepted by ${shownVersion.approvedBy}` : ''} · {new Date(shownVersion.created).toLocaleDateString('en-GB')}</dd>
			</dl>
		{/if}
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
	<Frame nav={ready ? shelf : undefined} aside={chain && shownVersion ? about : undefined} navLabel="Maia City's worlds" asideLabel="The world's history and details" navIcon="asset" flush>
		{#if failed}
			<p class="error">{failed}</p>
		{:else if !ready}
			<p class="soft">Reading Maia City's worlds…</p>
		{:else if shownHash}
			<WorldStage {source} engine={INDEX.engine} hash={pickHash ?? shownHash} />
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
	.about-head {
		margin: 0 0 0.9rem 0.35rem;
	}
	.about-head small {
		color: var(--accent, #2f6b4f);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.about-head h3 {
		margin: 0.15rem 0 0;
		font-size: 1.15rem;
		font-family: var(--font-body);
		font-weight: 600;
	}
	.about-head p.soft {
		margin: 0.1rem 0 0;
		padding: 0;
		font-size: 0.8rem;
	}
	.tabs {
		display: flex;
		gap: 4px;
		margin: 0 0 0.8rem;
	}
	.tabs button {
		font: inherit;
		font-size: 0.82rem;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--paper);
		cursor: pointer;
	}
	.tabs button.on {
		background: var(--ink);
		color: var(--paper);
		border-color: var(--ink);
	}
	dl {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: 4px 10px;
		margin: 0 0 0 0.35rem;
		font-size: 13px;
	}
	dt {
		opacity: 0.6;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
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
