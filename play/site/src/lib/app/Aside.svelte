<!--
	The one aside of every view of a versioned document (play/SPEC.md "Version control", *One aside*; Samuel
	2026-11-07): on the right, in Frame's right side (a round button at the bottom right on a phone), two tabs centred at
	its top. **Info**: what the document is (where it lives, its name, its kind, the version shown with who wrote and
	accepted it and when, its note), the view's own fields (`info`: an asset's parts, a factory's bill of process, a
	story's format), a picker of its latest versions and of its breeds (`breeds`), and how it changes. **History**: the
	one History ($lib/app/History.svelte: the edits scrubber, Main's versions, its breeds, its intent variants), fed from
	here. A view gives the document as /api/docs gives it (its UUID, kind, number, the version, edit or intent shown);
	a sandbox world gives only its layout's UUID and `float`: the aside reads the layout itself and slides in from its
	own button, and a pick opens the world at it (`?layout=<uuid>/v3`, `/e12`, `/<intent>`). Admins see the edits.
-->
<script lang="ts" module>
	export type { ChainVersion, Pick, Edit, Variant } from './History.svelte';
	type Ref = { id: string; kind?: string; number?: number; version?: number; edit?: number; versions?: { number: number; note?: string; at?: string; acceptedBy?: string | null }[]; intent?: { id: string; status?: string; stage?: string; note?: string; title?: string } | null; pins?: unknown[]; json?: any };
	export type Breed = { label: string; on?: boolean; pick: () => void };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Frame from './Frame.svelte';
	import History, { type ChainVersion, type Pick, type Edit, type Variant } from './History.svelte';

	let {
		doc,
		label = '',
		where = '',
		shown = null,
		versions = null,
		version,
		breeds = [],
		info,
		propose = '',
		float = false,
		tab = $bindable('info'),
		onPick
	}: {
		/** the document, as /api/docs gives it; or only its UUID, read here (a sandbox world's layout) */
		doc: Ref | string;
		label?: string;
		/** the line over its name: where it lives */
		where?: string;
		shown?: number | null;
		versions?: ChainVersion[] | null;
		version?: Snippet<[ChainVersion]>;
		breeds?: Breed[];
		/** the view's own fields of it, in Info */
		info?: Snippet;
		/** how it changes, at Info's foot */
		propose?: string;
		float?: boolean;
		tab?: 'info' | 'history';
		onPick?: (p: Pick | null) => void | Promise<void>;
	} = $props();

	const admin = $derived(session.me?.level === 'admin');
	// a world's layout, read here: as its address says (?layout=<uuid>/v3, /e12, /<intent>)
	const at = typeof location === 'undefined' ? '' : (new URLSearchParams(location.search).get('layout') ?? '').split('/')[1] ?? '';
	let read = $state<Ref | null>(null);
	$effect(() => {
		if (typeof doc !== 'string' || !admin) return;
		const q = /^v\d+$/.test(at) ? `?v=${at.slice(1)}` : /^e\d+$/.test(at) ? `?edit=${at.slice(1)}` : at ? `?intent=${at}` : '';
		api<Ref>(`/docs/${doc}${q}`).then((r) => (read = r), () => {});
	});
	const d = $derived(typeof doc === 'string' ? read : doc);
	/** a world's pick: the world opened at it */
	const open = (p: Pick | null) => {
		const s = new URLSearchParams(location.search);
		const to = !p ? '' : 'version' in p ? (p.version === d?.number ? '' : `v${p.version}`) : p.variant?.intent ? p.variant.intent.id : `e${p.edit.seq}`;
		if (to) s.set('layout', `${d!.id}/${to}`);
		else s.delete('layout');
		location.search = s.toString();
	};
	const pick = (p: Pick | null) => (onPick ?? open)(p);

	// its history, an admin's: fed to History, and Info's versions where the view gives none
	let h = $state<{ edits: Edit[]; versions: { number: number; note: string; at: string; acceptedBy?: string | null }[]; variants: Variant[] } | null>(null);
	let failed = $state('');
	$effect(() => {
		const id = d?.id;
		h = null;
		failed = '';
		if (!id || !admin) return;
		let gone = false;
		api<typeof h>(`/docs/${id}/history`).then((r) => !gone && (h = r), (e) => !gone && (failed = (e as Error).message));
		return () => (gone = true);
	});

	const chain = $derived<ChainVersion[]>(versions ?? [...(d?.versions ?? h?.versions ?? [])].reverse());
	const newest = $derived(d?.number ?? chain[0]?.number ?? null);
	const now = $derived(shown ?? d?.version ?? newest);
	const v = $derived(chain.find((c) => c.number === now));
	const name = $derived(label || d?.json?.label || d?.json?.title || '');
	const day = (iso: unknown) => (iso ? new Date(`${iso}`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
</script>

{#snippet body()}
	{#if d}
		<div class="tabs" role="tablist">
			<button role="tab" aria-selected={tab === 'info'} class:on={tab === 'info'} onclick={() => (tab = 'info')}>Info</button>
			<button role="tab" aria-selected={tab === 'history'} class:on={tab === 'history'} onclick={() => (tab = 'history')}>History</button>
		</div>
		<div role="tabpanel" hidden={tab !== 'info'} class="info">
			<header>
				{#if where}<small>{where}</small>{/if}
				<h3>{name}</h3>
				{#if d.json?.note}<p class="about" title={d.json.note}>{d.json.note}</p>{/if}
				{#if d.intent}
					<p class="asif">As its intent's work would make it{d.intent.status === 'accepted' || d.intent.status === 'archived' ? ` (${d.intent.status})` : ''}{d.intent.note || d.intent.title ? `: “${d.intent.note || d.intent.title}”` : ''} · <a href="/intents/#{d.intent.id}">its intent</a> · <button onclick={() => pick({ version: newest! })}>its newest version</button></p>
				{:else if d.edit}
					<p class="asif">As it stood at edit {d.edit} of its history: <button onclick={() => pick({ version: newest! })}>its newest version</button></p>
				{:else if now !== newest && newest}
					<p class="asif">Version {now}, not its newest: <button onclick={() => pick({ version: newest! })}>v{newest}</button></p>
				{/if}
			</header>
			<dl>
				<dt>Kind</dt><dd>{(d.kind ?? 'document').replace('_', ' ')}</dd>
				<dt>Version</dt><dd>{now ? `v${now}` : '—'}{newest ? ` of ${chain.length || newest}` : ''}</dd>
				{#if v?.by}<dt>By</dt><dd>{v.by}</dd>{/if}
				{#if v?.acceptedBy}<dt>Accepted</dt><dd>{v.acceptedBy}</dd>{/if}
				{#if v?.at}<dt>When</dt><dd>{day(v.at)}</dd>{/if}
				<dt>Id</dt><dd class="mono" title={d.id}>{d.id}</dd>
			</dl>
			{#if v?.note}<p class="note">{v.note}</p>{/if}
			{@render info?.()}
			{#if typeof doc === 'string' && d.pins}<p class="soft">{d.pins.length} pin{d.pins.length === 1 ? '' : 's'}, {Object.keys(d.json?.configs ?? {}).length} configs · <a href="/sandboxes/{d.id}/">its layout, pin by pin</a></p>{/if}
			{#if chain.length > 1}
				<h4>Latest versions</h4>
				<p class="chips">{#each chain.slice(0, 8) as c (c.number)}<button class:on={c.number === now && !d.edit && !d.intent} onclick={() => pick({ version: c.number })}>v{c.number}</button>{/each}{#if chain.length > 8}<button onclick={() => (tab = 'history')}>all {chain.length}</button>{/if}</p>
			{/if}
			{#if breeds.length}
				<h4>Breeds</h4>
				<p class="chips">{#each breeds as b (b.label)}<button class:on={b.on} onclick={b.pick}>{b.label}</button>{/each}</p>
			{/if}
			{#if admin && propose}<p class="soft propose">{propose} It is decided in <a href="/intents/">Intents</a>.</p>{/if}
		</div>
		{#if tab === 'history'}
			<div role="tabpanel"><History doc={d.id} {shown} label="it" versions={versions ?? null} {version} {h} {failed} intent={d.intent?.id ?? null} onPick={pick} /></div>
		{/if}
	{/if}
{/snippet}

{#if float}
	{#if admin && d}<Frame aside={body} asideLabel="Its layout: info and history" />{/if}
{:else}
	{@render body()}
{/if}

<style>
	.tabs { position: sticky; top: -0.4rem; z-index: 1; display: flex; justify-content: center; gap: 2px; width: max-content; margin: 0 auto 0.7rem; padding: 3px; border-radius: 999px; background: rgb(0 0 0 / 0.06); }
	.tabs button, .chips button, .asif button { font: inherit; color: inherit; border: 0; cursor: pointer; }
	.tabs button { padding: 0.28rem 1rem; border-radius: 999px; background: none; font-size: 0.8rem; font-weight: 600; }
	.tabs button.on { background: var(--paper, #fff); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12); }
	.info { margin: 0 0 0.9rem 0.35rem; font-size: 0.8rem; }
	header small, h4 { color: var(--accent, #2f6b4f); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	h3 { margin: 0.1rem 0 0.4rem; font-size: 1.1rem; font-family: var(--font-body); font-weight: 600; }
	h4 { margin: 0.9rem 0 0.3rem; color: var(--soft, #777); }
	.about { margin: 0 0 0.5rem; line-height: 1.4; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; }
	.asif { margin: 0 0 0.5rem; padding: 0.4rem 0.55rem; border-radius: 8px; background: var(--mustard-soft, rgb(232 178 60 / 0.18)); font-size: 0.76rem; line-height: 1.4; }
	.asif button { padding: 0; background: none; text-decoration: underline; }
	dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0.2rem 0.8rem; margin: 0; }
	dt { opacity: 0.6; }
	dd { margin: 0; overflow-wrap: anywhere; }
	.mono { font-family: ui-monospace, Menlo, monospace; font-size: 0.72rem; }
	.note { margin: 0.5rem 0 0; white-space: pre-line; line-height: 1.4; color: var(--ink-soft, #3b4a40); }
	.chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; }
	.chips button { padding: 0.12rem 0.55rem; border-radius: 999px; background: rgb(0 0 0 / 0.06); font-size: 0.74rem; }
	.chips button.on { background: var(--ink, #1f2b23); color: var(--paper, #fff); }
	.propose { margin: 0.9rem 0 0; font-size: 0.74rem; }
</style>
