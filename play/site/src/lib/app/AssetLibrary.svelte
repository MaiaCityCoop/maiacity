<!--
	The asset library, in the layout legacy's Assets had (aven/db/page/Assets.svelte, its Frame): on the left Maia City's
	assets by group, a search, each leading to its newest version; in the middle the one picked, built in the box from
	its own file and shown on the asset stage ($lib/content/assets/VaultAsset.svelte), in its turntable with its moves
	and views; on the right its History ($lib/app/History.svelte: its versions as a chain, who wrote each and who
	accepted it, every edit an admin can build it at, its open intent variants), the version's details, and its parts.
	Everything is play's: the catalog by hash, the chain from play's database. An asset's address is `#<asset id>` (its
	UUID), a version or variant of it `#<asset id>/<hash>`.

	Each group is its own app on the dashboard (Samuel 2026-11-04: /plants/, /things/, /machines/, /buildings/,
	/animals/, /biomes/), this one viewer given its `group`; /assets/ shows them all. The group `actors` is shown as
	Animals (its key in play's database stays `actors`).
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { playCall, stopCall, unlock } from '$lib/call';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import History, { type Pick } from '$lib/app/History.svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { catalogReady } from '$lib/recipes';
	import { admitProposed, recipeInfo, source } from '$lib/content/assets/catalog.js';

	type Listed = { id: string; grp: string; slug: string; label: string; head: number; versions: number };
	type Variant = { name: string; recipe: string; label: string | null };
	type Version = { id: string; number: number; parents: string[]; recipe: string | null; defaultVariant: string | null; note: string; created: string; author: string | null; approvedBy: string | null; imported: boolean; variants: Variant[]; cardLabel: string | null; triangles: number | null; size: number[] | null; skinned: boolean | null; sheet: string | null; datasheet: string | null; brief: string | null };
	type Chain = { id: string; grp: string; slug: string; label: string; versions: Version[]; sound: string | null; sound_gain: number };

	const viewer = import('$lib/content/assets/VaultAsset.svelte');
	const partsList = import('$lib/content/assets/Parts.svelte');
	import { GROUPS } from './groups';

	/** the one group this view shows (its key in play's database), or every group */
	let { group }: { group?: string } = $props();
	const title = $derived(group ? (GROUPS[group] ?? group) : 'Assets');

	let listed = $state<Listed[]>([]);
	let ready = $state(false);
	let failed = $state('');
	let query = $state('');
	let hash = $state(typeof location === 'undefined' ? '' : decodeURIComponent(location.hash.slice(1)));
	let chain = $state<Chain | null>(null);
	let catalog = $state.raw<any>(null);
	let picked = $state<string | null>(null);
	let solo = $state(true);
	let tab = $state<'history' | 'details' | 'parts'>('history');
	// where the viewer puts what it says of the asset (its readout and panel): the aside, under the name
	let details = $state<HTMLElement | null>(null);

	// an animal's call (the asset's sound, play's files by hash): played as it is picked, and again from the aside
	let calling = $state(false);
	/** an asset picked by a tap or a key (not the page opened on one): its call plays as it comes */
	let pickedNow = false;
	const call = (c: Chain) => {
		if (!c.sound) return;
		calling = true;
		playCall(c.sound, c.sound_gain, () => (calling = false)).catch(() => (calling = false));
	};
	const hush = () => {
		stopCall();
		calling = false;
	};
	onDestroy(stopCall);

	onMount(async () => {
		try {
			const [all] = await Promise.all([api<Listed[]>('/assets'), catalogReady()]);
			listed = group ? all.filter((a) => a.grp === group) : all;
			ready = true;
		} catch (e) {
			failed = (e as Error).message;
		}
	});

	// the address: the asset's UUID, then the recipe's hash where a version or variant is picked
	const parts = $derived(hash.split('/'));
	const assetId = $derived(parts[0] || (listed[0]?.id ?? ''));
	const wanted = $derived(parts[1] ?? '');
	$effect(() => {
		const id = assetId;
		if (!id || !ready) return;
		let gone = false;
		api<Chain>(`/assets/${id}`).then(
			(c) => {
				if (gone) return;
				const fresh = chain?.id !== c.id;
				chain = c;
				if (fresh) hush();
				if (fresh && pickedNow) call(c);
				pickedNow = false;
			},
			(e) => !gone && (failed = e.message)
		);
		return () => (gone = true);
	});
	/** the recipe a version builds by default: its own, else its default variant's */
	const ownOf = (v: Version) => v.recipe ?? v.variants.find((x) => x.name === v.defaultVariant)?.recipe ?? v.variants[0]?.recipe ?? null;
	const shownHash = $derived(chain?.id === assetId ? (wanted || (chain.versions[0] ? ownOf(chain.versions[0]) : null)) : null);
	const shownVersion = $derived(chain?.versions.find((v) => v.recipe === shownHash || v.variants.some((x) => x.recipe === shownHash)) ?? null);
	const info = $derived(shownHash ? recipeInfo(shownHash) : undefined);

	const found = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const groups = new Map<string, Listed[]>();
		for (const a of listed) {
			if (q && !`${a.label} ${a.slug} ${a.grp}`.toLowerCase().includes(q)) continue;
			groups.set(a.grp, [...(groups.get(a.grp) ?? []), a]);
		}
		return [...groups];
	});
	const go = (h: string) => {
		pickedNow = h.split('/')[0] !== chain?.id;
		location.hash = h;
		hash = h;
		picked = null;
		catalog = null;
		tab = 'history';
	};
	const short = (h: string | null) => (h ? `${h.slice(0, 10)}…` : '—');
	// a whole asset another carries (a pickup's Power Cube), by the hash its card names
	const unitHref = (ref: string) => {
		const h = String(ref).split('?')[0];
		const at = recipeInfo(h);
		return at ? `#${at.asset}/${h}` : null;
	};
	const unitName = (ref: string) => {
		const at = recipeInfo(String(ref).split('?')[0]);
		return at ? `${at.label} v${at.v}` : String(ref);
	};
	$effect(() => {
		if (picked) tab = 'parts';
	});

	// ---- its history (the asset's Loro document, play/SPEC.md §4.4; $lib/app/History.svelte): admins scrub every edit
	// and see the asset built in the box as it stood there, or as an intent variant would make it
	const admin = $derived(session.me?.level === 'admin');
	/** the recipe built at the edit or variant picked in its history (play keeps it by its hash), and what it says */
	let pickHash = $state<string | null>(null);
	let pickNote = $state('');
	let pickKind = $state<'edit' | 'variant' | null>(null);
	let asked = 0;
	// another asset, version or variant shown: back to it, the history let go
	$effect(() => {
		void shownHash;
		asked++;
		pickHash = null;
		pickKind = null;
	});
	/** the asset as its history picks it: an edit's or a variant's recipe file built in the box; a version by its address */
	async function onPick(p: Pick, about = '') {
		const c = chain;
		if (!c) return;
		if (p.kind === 'version' || p.kind === 'main') {
			asked++;
			pickHash = null;
			pickKind = null;
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
		if (mine !== asked) return;
		pickHash = b.hash;
		pickNote = about;
		pickKind = p.kind;
	}
	const viewerHash = $derived(pickHash ?? shownHash);
	const viewerInfo = $derived(viewerHash ? recipeInfo(viewerHash) : undefined);
</script>

<svelte:window onhashchange={() => (hash = decodeURIComponent(location.hash.slice(1)))} onpointerdown={unlock} onkeydown={unlock} />
<svelte:head><title>{chain?.label ? `${chain.label} · ${title}` : title} · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<input class="nav-search" type="search" placeholder="Find {group ? `in ${title.toLowerCase()}` : 'an asset'}" bind:value={query} aria-label="Find {group ? `in ${title.toLowerCase()}` : 'an asset'}" />
	{#each found as [g, assets] (g)}
		{#if !group}<h3 class="nav-group">{GROUPS[g] ?? g}</h3>{/if}
		{#each assets as a (a.id)}
			<a class="nav-item" class:on={assetId === a.id} href="#{a.id}" onclick={(e) => (e.preventDefault(), go(a.id))} aria-current={assetId === a.id ? 'page' : undefined}
				><Icon name="asset" size={16} /><span>{a.label}</span><small>v{a.head}</small></a
			>
		{/each}
	{:else}
		<p class="soft none">{listed.length ? 'No asset is called that.' : `No ${title.toLowerCase()} yet.`}</p>
	{/each}
{/snippet}

{#snippet about()}
	{#if chain && shownVersion}
		<header class="about-head">
			<small>{GROUPS[chain.grp] ?? chain.grp} · owned by Maia City</small>
			<h3>{chain.label}</h3>
			<p class="soft">v{shownVersion.number}{info?.variant ? ` · ${info.label.split(': ').at(-1)}` : ''} · {chain.versions.length} version{chain.versions.length === 1 ? '' : 's'}</p>
			{#if chain.sound}
				<button class="chip call" class:on={calling} onclick={() => (calling ? hush() : chain && call(chain))} aria-pressed={calling}>{calling ? '■ Stop its call' : '▶ Hear its call'}</button>
			{/if}
		</header>
		<div bind:this={details}></div>
		<div class="tabs" role="tablist">
			<button role="tab" aria-selected={tab === 'history'} class:on={tab === 'history'} onclick={() => (tab = 'history')}>History</button>
			<button role="tab" aria-selected={tab === 'details'} class:on={tab === 'details'} onclick={() => (tab = 'details')}>Details</button>
			{#if catalog}<button role="tab" aria-selected={tab === 'parts'} class:on={tab === 'parts'} onclick={() => (tab = 'parts')}>Parts <small>{catalog.parts.length}</small></button>{/if}
		</div>
		{#if tab === 'history'}
			<!-- its versions (who wrote each and who accepted it), each one's edits beneath it, its open intent variants;
			     every edit built in the box as it stood, as an admin picks it -->
			<History doc={chain.id} {onPick} version={shownVersion.number} versions={chain.versions.map((v) => ({ number: v.number, note: v.note, at: v.created, by: v.imported ? 'legacy avenDB' : (v.author ?? 'someone'), acceptedBy: v.approvedBy, label: v.cardLabel ?? chain!.label }))}>
				{#snippet extra(n)}
					{@const v = chain!.versions.find((x) => x.number === n)}
					{#if v && (v.variants.length > 1 || (v.variants.length && v.recipe))}
						<div class="variants">
							{#each v.variants as x (x.name)}
								<a class="chip" class:accent={x.recipe === shownHash} href="#{chain!.id}/{x.recipe}" onclick={(e) => (e.preventDefault(), go(`${chain!.id}/${x.recipe}`))}>{x.label?.split(': ').at(-1) ?? x.name}</a>
							{/each}
						</div>
					{/if}
				{/snippet}
			</History>
		{:else if tab === 'details'}
			<h4 class="side-head">This version</h4>
			<dl>
				<dt>Version</dt><dd>v{shownVersion.number}{shownVersion.parents.length ? `, after ${short(shownVersion.parents[0])}` : ', its first'}</dd>
				<dt>Id</dt><dd class="mono" title={shownVersion.id}>{short(shownVersion.id)}</dd>
				<dt>Recipe</dt><dd class="mono" title={shownHash ?? ''}>BLAKE3 {short(shownHash)}</dd>
				{#if shownVersion.triangles}<dt>Triangles</dt><dd>{shownVersion.triangles.toLocaleString('en-GB')}{shownVersion.skinned ? ', skinned' : ''}</dd>{/if}
				{#if shownVersion.size}<dt>Size</dt><dd>{shownVersion.size.map((n) => n.toFixed(2)).join(' × ')} m</dd>{/if}
				<dt>By</dt><dd>{shownVersion.imported ? 'From legacy avenDB' : (shownVersion.author ?? 'someone')}{shownVersion.approvedBy ? `, accepted by ${shownVersion.approvedBy}` : ''} · {new Date(shownVersion.created).toLocaleDateString('en-GB')}</dd>
			</dl>
			{#if shownVersion.variants.length > 1 || (shownVersion.variants.length && shownVersion.recipe)}
				<h4 class="side-head gap">Its variants</h4>
				<div class="variants">
					{#each shownVersion.variants as x (x.name)}
						<a class="chip" class:accent={x.recipe === shownHash} href="#{chain.id}/{x.recipe}" onclick={(e) => (e.preventDefault(), go(`${chain!.id}/${x.recipe}`))}>{x.label?.split(': ').at(-1) ?? x.name}</a>
					{/each}
				</div>
			{/if}
			{#if shownVersion.sheet}
				<!-- its reference sheet (a plant's plate of every stage and organ, kept in the Library): opened whole -->
				<a class="sheet" href="/api/files/{shownVersion.sheet}" target="_blank" rel="noopener" title="Its reference sheet, whole (it is kept in the Library)">
					<img src="/api/files/{shownVersion.sheet}" alt="v{shownVersion.number}'s reference sheet" loading="lazy" />
					<span>Reference sheet</span>
				</a>
			{/if}
			{#if shownVersion.datasheet || shownVersion.brief}
				<!-- its data sheet (the researched numbers, every source) and its sheet's brief, kept in the Library -->
				<p class="docs">
					{#if shownVersion.datasheet}<a href="/library/?kind=document&q={shownVersion.datasheet}">Data sheet</a>{/if}
					{#if shownVersion.brief}<a href="/library/?kind=document&q={shownVersion.brief}">Sheet brief</a>{/if}
				</p>
			{/if}
			{#if admin}
				<p class="soft propose">Propose v{(chain.versions[0]?.number ?? 0) + 1} in <a href="/intents/">Intents</a>.</p>
			{/if}
		{:else if catalog}
			{#await partsList then { default: Parts }}
				<Parts {catalog} own={shownHash ?? undefined} bind:picked bind:solo hrefOf={unitHref} nameOf={unitName} />
			{/await}
		{/if}
	{/if}
{/snippet}

<div class="assets">
	<Frame nav={ready ? shelf : undefined} aside={chain && shownVersion ? about : undefined} navLabel="Maia City's {title.toLowerCase()}" asideLabel="The asset's versions and parts" navIcon="asset" flush>
		{#if failed}
			<p class="error">{failed}</p>
		{:else if !ready}
			<p class="soft">Reading Maia City's assets…</p>
		{:else if shownHash && info}
			<svelte:boundary onerror={(e) => console.error(e)}>
				{#await viewer}
					<p class="soft">Opening the stage…</p>
				{:then { default: VaultAsset }}
					<div class="viewer">
						{#key shownHash}
							<VaultAsset {source} hash={viewerHash ?? shownHash} title="{(viewerInfo ?? info).label} v{(viewerInfo ?? info).v}{pickKind === 'edit' ? ' · at an edit' : pickKind === 'variant' ? ' · as an intent variant' : ''}" note={pickKind ? pickNote : (shownVersion?.note ?? '')} bind:catalog bind:picked {solo} fill named={false} {details} />
						{/key}
					</div>
				{/await}
				{#snippet failed(e, reset)}
					<p class="error" role="alert">Showing it failed: {(e as Error)?.message ?? e} <button class="btn quiet" onclick={reset}>Try again</button></p>
				{/snippet}
			</svelte:boundary>
		{:else if chain}
			<p class="empty">No recipe of this version is in the catalog.</p>
		{/if}
	</Frame>
</div>

<style>
	/* legacy's view colours, in the brand's palette */
	.assets {
		position: fixed;
		/* the whole screen: the nav pill floats over it (its columns scroll clear of it, Frame's sides) */
		inset: 0;
		background: var(--cream);
		--ok: #3f7a4f;
		--bad: var(--terracotta);
		--soft: rgb(38 56 44 / 0.6);
		--edge: var(--line);
		--card: var(--paper);
		--accent: var(--brand-green);
	}
	.assets :global(.soft) { color: var(--soft); }
	.assets :global(.chip) { display: inline-flex; align-items: center; padding: 0.08rem 0.55rem; border-radius: 999px; background: rgb(0 0 0 / 0.06); font-size: 0.74rem; font-weight: 500; text-decoration: none; color: inherit; }
	.assets :global(.chip.accent) { background: var(--mustard-soft); }
	.assets :global(.mono) { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.8em; }
	/* the stage as tall and as wide as the middle column, edge to edge */
	.viewer { height: 100%; }
	.viewer :global(.turntable.inline) { border-radius: 0; }
	/* the middle's notes when nothing is shown, kept off its edges */
	.assets :global(.middle > p) { margin: 1rem clamp(1rem, 3vw, 2.4rem); }
	.none { padding: 0.4rem 0.6rem; font-size: 0.84rem; }
	.about-head { margin: 0 0 0.9rem 0.35rem; }
	.call { margin-top: 0.5rem; border: 0; cursor: pointer; font: inherit; font-size: 0.78rem; }
	.call.on { background: var(--ink); color: var(--paper); }
	.about-head small { color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.about-head h3 { margin: 0.15rem 0 0; font-size: 1.15rem; font-family: var(--font-body); font-weight: 600; }
	.about-head p { margin: 0.1rem 0 0; font-size: 0.8rem; }
	.tabs { display: flex; gap: 4px; margin: 0 0 0.8rem; }
	.tabs button { font: inherit; font-size: 0.82rem; padding: 0.35rem 0.8rem; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); cursor: pointer; }
	.tabs button.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	/* the version's details: its reference sheet, its documents, its variants */
	.sheet { display: flex; align-items: center; gap: 0.5rem; margin: 0.8rem 0 0.1rem 0.35rem; font-size: 0.78rem; color: inherit; text-decoration: none; }
	.sheet img { width: 5.5rem; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 0.35rem; border: 1px solid var(--line, #e5e1d8); background: #fff; }
	.sheet:hover span { text-decoration: underline; }
	.docs { display: flex; gap: 0.75rem; margin: 0.5rem 0 0 0.35rem; font-size: 0.78rem; }
	.side-head.gap { margin-top: 1rem; }
	.variants { display: flex; flex-wrap: wrap; gap: 4px; margin: 0.35rem 0 0 0.35rem; }
	.side-head { margin: 0 0 0.5rem 0.35rem; color: var(--soft); font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.3rem 0.8rem; margin: 0 0 0 0.35rem; font-size: 0.8rem; }
	dt { opacity: 0.6; }
	dd { margin: 0; overflow-wrap: anywhere; }
	.propose { font-size: 0.8rem; margin: 1rem 0 0 0.35rem; }
	.empty { padding: 1rem; border: 1px dashed var(--line); border-radius: 12px; color: var(--soft); }
</style>
