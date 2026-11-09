<!--
	A sandbox's layout (play/SPEC.md §4.6; Samuel 2026-11-06): what it draws (its pins: each slot an asset's accepted
	version, its variant and its values) and how it lays them out (its configs), a document versioned like every other
	(sandbox:<uuid>, play/api/src/sandboxes.ts, one kind of play/api/src/versioned.ts). The sandboxes' pages have no
	Frame, so its History is here: on the left the sandboxes, in the middle the layout picked, as it stands at the version
	or edit picked (or as an intent's work would make it, `?intent=<id>`), with the world to open just so; on the right
	the one aside ($lib/app/Aside.svelte: its Info and History). A layout changes only by proposal, over MCP
	(doc_edit with its pin, pin_latest, unpin, set and delete; propose_doc_version), decided on the intents' board.
	`?v=<n>` one of its versions. Admins only.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type Pick } from '$lib/app/Aside.svelte';

	type Item = { id: string; label: string; number: number; versions: number; pins: number; configs: string[] };
	type PinShown = { slot: string; asset: string | null; label: string | null; number: number | null; variant: string | null; usedVariant: string | null; params: Record<string, string> | null };
	type Layout = {
		id: string; number: number; version?: number; edit?: number; route: string;
		json: { title: string; pins: Record<string, unknown>; configs: Record<string, unknown> };
		pins: PinShown[];
		intent?: { id: string; status: string; note: string };
	};

	adminsOnly();
	const admin = $derived(isAdmin());
	let list = $state<Item[]>([]);
	let layout = $state<Layout | null>(null);
	let error = $state('');
	const id = $derived(page.params.id ?? '');
	const params = $derived(page.url.searchParams);
	const wantV = $derived(params.get('v'));
	const wantIntent = $derived(params.get('intent'));
	$effect(() => {
		if (!admin) return;
		api<Item[]>('/docs?kind=sandbox').then((l) => (list = l), (e) => (error = e.message));
	});
	const query = () => (wantIntent ? `?intent=${encodeURIComponent(wantIntent)}` : wantV ? `?v=${encodeURIComponent(wantV)}` : '');
	$effect(() => {
		if (!admin || !id) return;
		const q = query();
		let gone = false;
		api<Layout>(`/docs/${id}${q}`).then(
			(l) => !gone && ((layout = l), (error = '')),
			(e) => !gone && (error = e.message)
		);
		return () => (gone = true);
	});
	const at = (s: string, v?: number) => goto(`/sandboxes/${s}/${v ? `?v=${v}` : ''}`, { keepFocus: true, noScroll: true });
	/** its History: a version picked is that version; an edit picked, the layout as it stood at it */
	async function picked(p: Pick | null) {
		if (!layout) return;
		if (!p) return void (layout = await api<Layout>(`/docs/${layout.id}${query()}`));
		if ('version' in p) return void at(layout.id, p.version === layout.number ? undefined : p.version);
		// an intent variant picked: the layout as its intent's work would make it
		if (p.variant?.intent) return void (layout = await api<Layout>(`/docs/${layout.id}?intent=${encodeURIComponent(p.variant.intent.id)}`));
		layout = await api<Layout>(`/docs/${layout.id}?edit=${p.edit.seq}`);
	}
	/** the world as the layout shown stands: at its version, its edit, or its intent's work */
	const world = $derived.by(() => {
		if (!layout) return '';
		const where = layout.intent ? layout.intent.id : layout.edit ? `e${layout.edit}` : layout.version && layout.version !== layout.number ? `v${layout.version}` : '';
		return where ? `${layout.route}?layout=${encodeURIComponent(`${layout.id}/${where}`)}` : layout.route;
	});
	const pinText = (p: PinShown) =>
		`${p.label ?? 'an asset'}${p.number != null ? ` v${p.number}` : ''}${p.usedVariant ? ` · ${p.usedVariant}${p.variant ? '' : ' (default)'}` : ''}${p.params ? ` · ${Object.entries(p.params).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}`;
	const configs = $derived(Object.entries(layout?.json.configs ?? {}));
</script>

<svelte:head><title>{layout?.json.title ?? 'Sandboxes'} · Layouts · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<h3 class="nav-group">Sandboxes</h3>
	{#each list as s (s.id)}
		<a class="nav-item" class:on={id === s.id} href="/sandboxes/{s.id}/" onclick={(e) => (e.preventDefault(), at(s.id))} aria-current={id === s.id ? 'page' : undefined}
			><Icon name="board" size={16} /><span>{s.label}</span><small>{s.number ? `v${s.number}` : ''}</small></a
		>
	{:else}
		<p class="soft none">{error ? '' : 'No sandboxes yet.'}</p>
	{/each}
{/snippet}

{#snippet side()}
	<Aside doc={layout!} where="Sandboxes · its layout" label={layout!.json.title} shown={wantV ? Number(wantV) : null} propose="Propose v{layout!.number + 1} over MCP (doc_edit with pin, pin_latest, unpin, set and delete; propose_doc_version): the world draws it once accepted." onPick={picked} />
{/snippet}

{#if admin}
	<div class="layouts">
		<Frame nav={list.length ? shelf : undefined} aside={layout ? side : undefined} navLabel="The sandboxes" asideLabel="The layout's history" navIcon="board">
			<article class="body">
				{#if error}<p class="bad">{error}</p>{/if}
				{#if layout}
					<p class="eyebrow">Sandboxes · {layout.intent ? `its layout as an intent would make it` : layout.edit ? `its layout at edit ${layout.edit}` : `layout v${layout.version ?? layout.number}`}</p>
					<h1>{layout.json.title}</h1>
					<p><a class="btn" href={world} target="_blank" rel="noopener">Walk {layout.json.title} as this layout draws it</a></p>
					<section>
						<h2>What it draws: {layout.pins.length} pin{layout.pins.length === 1 ? '' : 's'}</h2>
						<ul class="pins">
							{#each layout.pins as p (p.slot)}
								<li><span class="slot">{p.slot}</span><span>{pinText(p)}</span></li>
							{:else}
								<li class="soft">Nothing yet.</li>
							{/each}
						</ul>
					</section>
					<section>
						<h2>How it lays them out: {configs.length} config{configs.length === 1 ? '' : 's'}</h2>
						{#each configs as [name, data] (name)}
							<details>
								<summary>{name}</summary>
								<pre>{JSON.stringify(data, null, 1)}</pre>
							</details>
						{:else}
							<p class="soft">None.</p>
						{/each}
					</section>
				{/if}
			</article>
		</Frame>
	</div>
{/if}

<style>
	.layouts { position: fixed; inset: 0; background: var(--cream); --soft: rgb(38 56 44 / 0.6); --accent: var(--brand-green); }
	.layouts :global(.soft) { color: var(--soft); }
	.body { max-width: 52rem; padding: 0.4rem 0 3rem; min-width: 0; }
	.eyebrow { margin: 0; color: var(--accent); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h1 { margin: 0.2rem 0 0.5rem; font-size: clamp(1.5rem, 3vw, 2rem); }
	section { margin: 1.4rem 0 0; }
	h2 { margin: 0 0 0.4rem; font-size: 0.78rem; font-family: var(--font-body); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft); }
	.pins { margin: 0; padding: 0; list-style: none; display: grid; gap: 0.25rem; font-size: 0.86rem; }
	.pins li { display: grid; grid-template-columns: minmax(8rem, 14rem) minmax(0, 1fr); gap: 0.6rem; padding: 0.3rem 0.5rem; border-radius: 8px; background: var(--paper, #f6f1e6); overflow-wrap: anywhere; }
	.slot { font-weight: 600; }
	details { margin: 0 0 0.4rem; }
	summary { cursor: pointer; font-weight: 600; font-size: 0.88rem; }
	pre { margin: 0.3rem 0 0; padding: 0.5rem 0.6rem; border-radius: 8px; background: var(--paper, #f6f1e6); font-size: 0.74rem; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 28rem; overflow: auto; }
	.btn { display: inline-block; }
	.bad { color: var(--terracotta, #c23a22); }
	.none { padding: 0.4rem 0.6rem; font-size: 0.84rem; }
	@media (max-width: 640px) { .pins li { grid-template-columns: minmax(0, 1fr); gap: 0.1rem; } }
</style>
