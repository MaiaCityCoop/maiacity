<!--
	The asset library, in the layout legacy's Assets had (aven/db/page/Assets.svelte, its Frame): on the left Maia City's
	assets by group, a search, each leading to its newest version; in the middle the one picked, built in the box from
	its own file and shown on the asset stage ($lib/content/assets/VaultAsset.svelte), in its turntable with its moves
	and views; on the right the one aside ($lib/app/Aside.svelte): in Info the version's details, its reference sheet,
	its breeds to pick and its parts; in History its versions as a chain (who wrote each and who accepted it) and, for
	admins, every edit it was made in. Everything is play's: the catalog by hash, the chain from play's database. An asset's address is
	`#<asset id>` (its UUID), a version or variant of it `#<asset id>/<hash>`.

	Each group is its own app on the dashboard (Samuel 2026-11-04: /plants/, /things/, /machines/, /buildings/,
	/animals/, /biomes/), this one viewer given its `group`; /assets/ shows them all. The group `actors` is shown as
	Animals (its key in play's database stays `actors`).
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { playCall, stopCall, unlock } from '$lib/call';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type ChainVersion, type Pick } from './Aside.svelte';
	import { api, fileUrl, may } from '$lib/api';
	import { catalogReady } from '$lib/recipes';
	import { admitProposed, recipeInfo, source } from '$lib/content/assets/catalog.js';

	type Listed = { id: string; grp: string; slug: string; label: string; head: number; versions: number };
	type Variant = { name: string; recipe: string; label: string | null };
	type Version = { id: string; number: number; parents: string[]; recipe: string | null; defaultVariant: string | null; note: string; created: string; author: string | null; approvedBy: string | null; imported: boolean; variants: Variant[]; cardLabel: string | null; triangles: number | null; size: number[] | null; skinned: boolean | null; sheet: string | null; datasheet: string | null; brief: string | null; pieces?: { hash: string; piece: string; label: string; version: number }[] };
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
	let tab = $state<'info' | 'history'>('info');
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
	const rinfo = $derived(shownHash ? recipeInfo(shownHash) : undefined);

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
		if (picked) tab = 'info';
	});

	// ---- its History (the asset's Loro document, play/SPEC.md "Version control"): an edit picked there is built in the
	// box as the asset stood at it, from its recipe file at that edit (play keeps it by its hash); a version picked is
	// that version's own recipe
	type Edit = Extract<Pick, { edit: unknown }>['edit'];
	let atEdit = $state<Edit | null>(null);
	let stepHash = $state<string | null>(null);
	$effect(() => {
		void shownHash;
		atEdit = null;
		stepHash = null;
	});
	const chainOf = (c: Chain): ChainVersion[] =>
		c.versions.map((v) => ({ number: v.number, note: v.note, at: v.created, by: v.imported ? 'the legacy import' : (v.author ?? 'someone'), acceptedBy: v.approvedBy, label: v.cardLabel ?? c.label, v }));
	async function picked_(p: Pick | null) {
		if (!chain) return;
		if (!p) {
			atEdit = null;
			stepHash = null;
			return;
		}
		if ('version' in p) {
			const v = chain.versions.find((x) => x.number === p.version);
			if (v) go(`${chain.id}/${ownOf(v)}`);
			return;
		}
		const b = await api<any>(`/assets/${chain.id}/recipe?edit=${p.edit.seq}`);
		await admitProposed([b]);
		atEdit = p.edit;
		stepHash = b.hash;
	}
	const viewerHash = $derived(stepHash ?? shownHash);
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

{#snippet side()}
	{@const v = shownVersion!}
	<Aside doc={{ id: chain!.id, kind: 'asset', number: chain!.versions[0]?.number, edit: atEdit?.seq }} where="{GROUPS[chain!.grp] ?? chain!.grp} · owned by Maia City" label="{chain!.label}{rinfo?.variant ? ` · ${rinfo.label.split(': ').at(-1)}` : ''}" shown={v.number} versions={chainOf(chain!)} breeds={v.variants.length > 1 || (v.variants.length && v.recipe) ? v.variants.map((x) => ({ label: x.label?.split(': ').at(-1) ?? x.name, on: x.recipe === shownHash, pick: () => go(`${chain!.id}/${x.recipe}`) })) : []} propose="Propose v{(chain!.versions[0]?.number ?? 0) + 1} over MCP (doc_edit, propose_doc_version)." onPick={picked_} bind:tab>
		{#snippet info()}
			{#if chain!.sound}<button class="chip call" class:on={calling} onclick={() => (calling ? hush() : call(chain!))} aria-pressed={calling}>{calling ? '■ Stop its call' : '▶ Hear its call'}</button>{/if}
			<dl>
				<dt>After</dt><dd>{v.parents.length ? short(v.parents[0]) : 'its first'}</dd>
				<dt>Recipe</dt><dd class="mono" title={shownHash ?? ''}>BLAKE3 {short(shownHash)}</dd>
				{#if v.triangles}<dt>Triangles</dt><dd>{v.triangles.toLocaleString('en-GB')}{v.skinned ? ', skinned' : ''}</dd>{/if}
				{#if v.size}<dt>Size</dt><dd>{v.size.map((n) => n.toFixed(2)).join(' × ')} m</dd>{/if}
				{#if v.pieces?.length}
					<dt>Pieces</dt>
					<dd class="pieces">
						{#each v.pieces as p (p.hash)}
							<a href="/pieces/?piece={p.piece}&v={p.version}" title={p.hash}>{p.label} v{p.version} <span class="mono">{short(p.hash)}</span></a>
						{/each}
					</dd>
				{/if}
			</dl>
			<!-- its reference sheet (a plant's plate of every stage and organ), its data sheet and the sheet's brief, kept in the Library -->
			{#if v.sheet}<a class="sheet" href={fileUrl(v.sheet)} target="_blank" rel="noopener"><img src={fileUrl(v.sheet)} alt="v{v.number}'s reference sheet" loading="lazy" /><span>Reference sheet</span></a>{/if}
			{#if v.datasheet || v.brief}<p class="docs">{#if v.datasheet}<a href="/library/?kind=document&q={v.datasheet}">Data sheet</a>{/if}{#if v.brief}<a href="/library/?kind=document&q={v.brief}">Sheet brief</a>{/if}</p>{/if}
			<div bind:this={details}></div>
			{#if catalog}{#await partsList then { default: Parts }}<h4 class="side-head">Parts {catalog.parts.length}</h4><Parts {catalog} own={shownHash ?? undefined} bind:picked bind:solo hrefOf={unitHref} nameOf={unitName} />{/await}{/if}
		{/snippet}
	</Aside>
{/snippet}

<div class="assets">
	<Frame nav={ready ? shelf : undefined} aside={chain && shownVersion ? side : undefined} navLabel="Maia City's {title.toLowerCase()}" asideLabel="The asset's info and history" navIcon="asset" flush>
		{#if failed}
			<p class="error">{failed}</p>
		{:else if !ready}
			<p class="soft">Reading Maia City's assets…</p>
		{:else if shownHash && rinfo}
			<svelte:boundary onerror={(e) => console.error(e)}>
				{#await viewer}
					<p class="soft">Opening the stage…</p>
				{:then { default: VaultAsset }}
					<div class="viewer">
						{#key shownHash}
							<VaultAsset {source} hash={viewerHash ?? shownHash} title="{(viewerInfo ?? rinfo).label} v{(viewerInfo ?? rinfo).v}{atEdit ? ' · an edit' : ''}" note={atEdit?.message ?? ''} bind:catalog bind:picked {solo} fill named={false} {details} />
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
	.assets :global(.mono) { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.8em; }
	/* the stage as tall and as wide as the middle column, edge to edge */
	.viewer { height: 100%; }
	.viewer :global(.turntable.inline) { border-radius: 0; }
	/* the middle's notes when nothing is shown, kept off its edges */
	.assets :global(.middle > p) { margin: 1rem clamp(1rem, 3vw, 2.4rem); }
	.none { padding: 0.4rem 0.6rem; font-size: 0.84rem; }
	.pieces { display: grid; gap: 0.15rem; }
	.pieces a { color: inherit; }
	.call { margin: 0 0 0.5rem; border: 0; cursor: pointer; font: inherit; font-size: 0.78rem; }
	.call.on { background: var(--ink); color: var(--paper); }
	.sheet { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0 0; font-size: 0.78rem; color: inherit; text-decoration: none; }
	.sheet img { width: 5.5rem; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 0.35rem; border: 1px solid var(--line, #e5e1d8); background: #fff; }
	.docs { display: flex; gap: 0.75rem; margin: 0.2rem 0 0; font-size: 0.78rem; }
	.side-head { margin: 0.9rem 0 0.4rem; color: var(--soft); font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.2rem 0.8rem; margin: 0.2rem 0 0; }
	dt { opacity: 0.6; }
	dd { margin: 0; overflow-wrap: anywhere; }
	.empty { padding: 1rem; border: 1px dashed var(--line); border-radius: 12px; color: var(--soft); }
</style>
