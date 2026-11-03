<!--
	The asset library, in the layout legacy's Assets had (aven/db/page/Assets.svelte, its Frame): on the left Maia City's
	assets by group, a search, each leading to its newest version; in the middle the one picked, built in the box from
	its own file and shown on the asset stage ($lib/content/assets/VaultAsset.svelte), in its turntable with its moves
	and views; on the right its versions as a chain (who wrote each and who accepted it), the version's details, and
	its parts. Everything is play's: the catalog by hash, the chain from play's database. An asset's address is
	`#<asset id>` (its UUID), a version or variant of it `#<asset id>/<hash>`.
-->
<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { playCall, stopCall, unlock } from '$lib/call';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { catalogReady } from '$lib/recipes';
	import { admitProposed, recipeInfo, source } from '$lib/content/assets/catalog.js';

	type Listed = { id: string; grp: string; slug: string; label: string; head: number; versions: number };
	type Variant = { name: string; recipe: string; label: string | null };
	type Version = { id: string; number: number; parents: string[]; recipe: string | null; defaultVariant: string | null; note: string; created: string; author: string | null; approvedBy: string | null; imported: boolean; variants: Variant[]; cardLabel: string | null; triangles: number | null; size: number[] | null; skinned: boolean | null };
	type Chain = { id: string; grp: string; slug: string; label: string; versions: Version[]; sound: string | null; sound_gain: number };

	const viewer = import('$lib/content/assets/VaultAsset.svelte');
	const partsList = import('$lib/content/assets/Parts.svelte');
	const GROUPS: Record<string, string> = { plants: 'Plants', things: 'Things', machines: 'Machines', buildings: 'Buildings', actors: 'Actors', biomes: 'Biomes' };

	let listed = $state<Listed[]>([]);
	let ready = $state(false);
	let failed = $state('');
	let query = $state('');
	let hash = $state(typeof location === 'undefined' ? '' : decodeURIComponent(location.hash.slice(1)));
	let chain = $state<Chain | null>(null);
	let catalog = $state.raw<any>(null);
	let picked = $state<string | null>(null);
	let solo = $state(true);
	let tab = $state<'versions' | 'parts'>('versions');
	/** the versions whose description is opened in the chain (folded to two lines otherwise) */
	let opened = $state<string[]>([]);
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
			[listed] = await Promise.all([api<Listed[]>('/assets'), catalogReady()]);
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
		tab = 'versions';
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

	// ---- its history, step by step (the asset's Loro document, play/SPEC.md §4.4): admins scrub every step and see the
	// asset built in the box as it stood there; play runs through them as a time-lapse of how it was made
	type Step = { seq: number; kind: string; author: string | null; via: string; message: string; at: string; version: number | null };
	const admin = $derived(session.me?.level === 'admin');
	let steps = $state<Step[]>([]);
	let atStep = $state<Step | null>(null);
	let stepHash = $state<string | null>(null);
	let stepError = $state('');
	let playing = $state(false);
	let asked = 0;
	const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	$effect(() => {
		const id = chain?.id;
		steps = [];
		atStep = null;
		stepHash = null;
		playing = false;
		if (!id || !admin) return;
		let gone = false;
		api<{ steps: Step[] }>(`/assets/${id}/history`).then(
			(h) => !gone && (steps = h.steps),
			() => {}
		);
		return () => (gone = true);
	});
	// another version picked in the chain: back to it, the history let go
	$effect(() => {
		void shownHash;
		atStep = null;
		stepHash = null;
		playing = false;
	});
	/** the asset as it stood at step `s`: its recipe file at that step (play keeps it by its hash), built in the box */
	async function pickStep(s: Step) {
		if (!chain || atStep?.seq === s.seq) return;
		const ask = ++asked;
		stepError = '';
		try {
			const b = await api<any>(`/assets/${chain.id}/steps/${s.seq}/recipe`);
			if (ask !== asked) return;
			await admitProposed([b]);
			atStep = s;
			stepHash = b.hash;
		} catch (e) {
			if (ask === asked) stepError = (e as Error).message;
		}
	}
	function backToVersion() {
		asked++;
		playing = false;
		atStep = null;
		stepHash = null;
	}
	const stepIndex = $derived(atStep ? steps.findIndex((s) => s.seq === atStep!.seq) : -1);
	let scrubbing = false;
	function scrubAt(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
		const i = Math.max(0, Math.min(steps.length - 1, Math.floor(((e.clientX - r.left) / r.width) * steps.length)));
		if (steps[i]) pickStep(steps[i]);
	}
	// the time-lapse: a step at a time, each held long enough to be built and seen (longer on a touch screen, which
	// builds only the step it shows)
	$effect(() => {
		if (!playing) return;
		const slow = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
		let gone = false;
		untrack(() => {
			(async () => {
				// from the step shown (from the first, at the end or at none)
				let i = atStep && stepIndex < steps.length - 1 ? stepIndex : -1;
				while (!gone && playing) {
					i++;
					if (i >= steps.length) {
						playing = false;
						break;
					}
					await pickStep(steps[i]);
					await new Promise((r) => setTimeout(r, slow ? 4200 : 2600));
				}
			})();
		});
		return () => (gone = true);
	});
	const viewerHash = $derived(stepHash ?? shownHash);
	const viewerInfo = $derived(viewerHash ? recipeInfo(viewerHash) : undefined);
</script>

<svelte:window onhashchange={() => (hash = decodeURIComponent(location.hash.slice(1)))} onpointerdown={unlock} onkeydown={unlock} />
<svelte:head><title>{chain?.label ?? 'Assets'} · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<input class="nav-search" type="search" placeholder="Find an asset" bind:value={query} aria-label="Find an asset" />
	{#each found as [g, assets] (g)}
		<h3 class="nav-group">{GROUPS[g] ?? g}</h3>
		{#each assets as a (a.id)}
			<a class="nav-item" class:on={assetId === a.id} href="#{a.id}" onclick={(e) => (e.preventDefault(), go(a.id))} aria-current={assetId === a.id ? 'page' : undefined}
				><Icon name="asset" size={16} /><span>{a.label}</span><small>v{a.head}</small></a
			>
		{/each}
	{:else}
		<p class="soft none">No asset is called that.</p>
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
		{#if admin && steps.length > 1}
			<div class="history">
				<div class="history-head">
					<h4>History <small>{steps.length} steps</small></h4>
					<button class="chip" onclick={() => (playing = !playing)} aria-pressed={playing}>{playing ? '❚❚ Pause' : '▶ Play its making'}</button>
					{#if atStep}<button class="chip" onclick={backToVersion}>Back to v{shownVersion.number}</button>{/if}
				</div>
				<div
					class="ticks"
					role="slider"
					tabindex="0"
					aria-label="The asset's history, step by step"
					aria-valuemin={1}
					aria-valuemax={steps.length}
					aria-valuenow={atStep ? stepIndex + 1 : steps.length}
					onpointerdown={(e) => { playing = false; scrubbing = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrubAt(e); }}
					onpointermove={(e) => scrubbing && scrubAt(e)}
					onpointerup={() => (scrubbing = false)}
					onkeydown={(e) => {
						const i = atStep ? stepIndex : steps.length;
						if (e.key === 'ArrowLeft' && i > 0) pickStep(steps[i - 1]);
						if (e.key === 'ArrowRight' && i < steps.length - 1) pickStep(steps[i + 1]);
					}}
				>
					{#each steps as s (s.seq)}
						<span class="tick" class:v={s.version} class:mcp={s.via === 'mcp'} class:merge={s.kind === 'merge'} class:on={atStep?.seq === s.seq} title="{s.message} · {s.author ?? 'play'}{s.via === 'mcp' ? ' (MCP)' : ''} · {when(s.at)}"
							>{#if s.version}<span class="vlabel">v{s.version}</span>{/if}</span
						>
					{/each}
				</div>
				<p class="soft caption">
					{#if stepError}{stepError}
					{:else if atStep}Step {stepIndex + 1} of {steps.length}: “{atStep.message}” · {atStep.author ?? 'play'}{atStep.via === 'mcp' ? ' via MCP' : atStep.via === 'import' ? ' (imported)' : ''} · {when(atStep.at)}
					{:else}Every step it was made in, kept: drag along the bar to build it as it stood at any of them{/if}
				</p>
			</div>
		{/if}
		<div bind:this={details}></div>
		<div class="tabs" role="tablist">
			<button role="tab" aria-selected={tab === 'versions'} class:on={tab === 'versions'} onclick={() => (tab = 'versions')}>Versions</button>
			{#if catalog}<button role="tab" aria-selected={tab === 'parts'} class:on={tab === 'parts'} onclick={() => (tab = 'parts')}>Parts <small>{catalog.parts.length}</small></button>{/if}
		</div>
		{#if tab === 'versions'}
			<ol class="chain">
				{#each chain.versions as v (v.id)}
					{@const own = ownOf(v)}
					<li class:on={v.id === shownVersion.id}>
						<a href="#{chain.id}/{own}" onclick={(e) => (e.preventDefault(), go(`${chain!.id}/${own}`))}><b>v{v.number}</b> <span>{v.cardLabel ?? chain.label}</span></a>
						<p class="soft">{v.imported ? 'From legacy avenDB' : `By ${v.author ?? 'someone'}`}{v.approvedBy ? ` · accepted by ${v.approvedBy}` : ''} · {new Date(v.created).toLocaleDateString('en-GB')}</p>
						{#if v.note}
							<!-- a version's description folded to two lines; opened by its own button -->
							<p class="note" class:more={opened.includes(v.id)}>{v.note}</p>
							{#if v.note.length > 110}<button class="fold" aria-expanded={opened.includes(v.id)} onclick={() => (opened = opened.includes(v.id) ? opened.filter((x) => x !== v.id) : [...opened, v.id])}>{opened.includes(v.id) ? 'Show less' : 'Show more'}</button>{/if}
						{/if}
						{#if v.variants.length > 1 || (v.variants.length && v.recipe)}
							<div class="variants">
								{#each v.variants as x (x.name)}
									<a class="chip" class:accent={x.recipe === shownHash} href="#{chain.id}/{x.recipe}" onclick={(e) => (e.preventDefault(), go(`${chain!.id}/${x.recipe}`))}>{x.label?.split(': ').at(-1) ?? x.name}</a>
								{/each}
							</div>
						{/if}
					</li>
				{/each}
			</ol>
			<h4 class="side-head">This version</h4>
			<dl>
				<dt>Version</dt><dd>v{shownVersion.number}{shownVersion.parents.length ? `, after ${short(shownVersion.parents[0])}` : ', its first'}</dd>
				<dt>Id</dt><dd class="mono" title={shownVersion.id}>{short(shownVersion.id)}</dd>
				<dt>Recipe</dt><dd class="mono" title={shownHash ?? ''}>BLAKE3 {short(shownHash)}</dd>
				{#if shownVersion.triangles}<dt>Triangles</dt><dd>{shownVersion.triangles.toLocaleString('en-GB')}{shownVersion.skinned ? ', skinned' : ''}</dd>{/if}
				{#if shownVersion.size}<dt>Size</dt><dd>{shownVersion.size.map((n) => n.toFixed(2)).join(' × ')} m</dd>{/if}
			</dl>
			{#if session.me?.level === 'admin'}
				<p class="soft propose">Propose v{(chain.versions[0]?.number ?? 0) + 1} in <a href="/proposals/">Proposals</a>.</p>
			{/if}
		{:else if catalog}
			{#await partsList then { default: Parts }}
				<Parts {catalog} own={shownHash} bind:picked bind:solo hrefOf={unitHref} nameOf={unitName} />
			{/await}
		{/if}
	{/if}
{/snippet}

<div class="assets">
	<Frame nav={ready ? shelf : undefined} aside={chain && shownVersion ? about : undefined} navLabel="Maia City's assets" asideLabel="The asset's versions and parts" navIcon="asset" flush>
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
							<VaultAsset {source} hash={viewerHash ?? shownHash} title="{(viewerInfo ?? info).label} v{(viewerInfo ?? info).v}{atStep ? ` · step ${stepIndex + 1}` : ''}" note={atStep ? atStep.message : (shownVersion?.note ?? '')} bind:catalog bind:picked {solo} fill named={false} {details} />
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
	.chain { list-style: none; padding: 0; margin: 0 0 1rem 0.4rem; border-left: 2px solid var(--line); }
	.chain li { position: relative; padding: 0.35rem 0 0.6rem 0.9rem; }
	.chain li::before { content: ''; position: absolute; left: -7px; top: 0.75rem; width: 10px; height: 10px; border-radius: 50%; background: var(--paper); border: 2px solid var(--sage); }
	.chain li.on::before { background: var(--mustard); border-color: var(--mustard); }
	.chain a { color: inherit; text-decoration: none; font-size: 0.9rem; }
	.chain p { margin: 0.1rem 0 0; font-size: 0.76rem; }
	.chain p.note { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; white-space: pre-line; }
	.chain p.note.more { display: block; -webkit-line-clamp: unset; line-clamp: unset; }
	.chain .fold { all: unset; margin-top: 0.1rem; font-size: 0.72rem; font-weight: 600; color: var(--soft); cursor: pointer; }
	.chain .fold:hover { color: inherit; text-decoration: underline; }
	.note { color: var(--ink-soft); }
	.variants { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.35rem; }
	.side-head { margin: 0 0 0.5rem 0.35rem; color: var(--soft); font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.3rem 0.8rem; margin: 0 0 0 0.35rem; font-size: 0.8rem; }
	dt { opacity: 0.6; }
	dd { margin: 0; overflow-wrap: anywhere; }
	.propose { font-size: 0.8rem; margin: 1rem 0 0 0.35rem; }
	.empty { padding: 1rem; border: 1px dashed var(--line); border-radius: 12px; color: var(--soft); }
	/* its history: a thin bar of every step, versions marked, dragged (or played) to build it as it stood */
	.history { display: grid; gap: 0.3rem; margin: 0 0 0.9rem 0.35rem; }
	.history-head { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
	.history-head h4 { margin: 0 auto 0 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft); }
	.history-head h4 small { text-transform: none; letter-spacing: 0; font-weight: 500; }
	.ticks { position: relative; display: flex; align-items: flex-end; height: 1.7rem; padding-top: 0.75rem; cursor: ew-resize; touch-action: none; border-bottom: 1px solid var(--line); outline: none; }
	.ticks:focus-visible { box-shadow: 0 2px 0 var(--brand-green); }
	.tick { position: relative; flex: 1 1 0; height: 0.5rem; display: flex; justify-content: center; }
	.tick::before { content: ''; width: 2px; height: 100%; border-radius: 1px; background: color-mix(in srgb, var(--brand-green) 35%, transparent); }
	.tick.mcp::before { background: var(--sage, #8fae8b); }
	.tick.merge::before { background: var(--brand-green); }
	.tick.v { height: 0.85rem; }
	.tick.v::before { width: 3px; background: var(--brand-green); }
	.tick.on::before { width: 4px; background: var(--terracotta, #c8744f); }
	.vlabel { position: absolute; bottom: 100%; font-size: 0.62rem; font-weight: 700; line-height: 1; color: var(--brand-green); pointer-events: none; }
	.caption { margin: 0; font-size: 0.74rem; line-height: 1.35; }
</style>
