<!--
	A document's history, the one every view of a versioned thing shows in its right side (play/SPEC.md §4.4): an
	asset's, a world's, a story's, a factory's, a game config's, a skill's. Each is a Loro document, every change to it an
	edit, kept with who made it, how (on the site, over MCP, imported) and when.

	On top a thin bar of every edit, the versions marked on it, those over MCP and the merges each their own colour:
	dragged along, arrowed through, or played as a time-lapse of its making, it hands the view each edit, and the view
	shows the thing as it stood there (an edit held in the time-lapse only once it is shown, longer on a touch screen,
	which builds only the one it shows). Below it, Main's versions as a chain, newest first, each with the edits that made
	it folded beneath it; then the open intent variants, each a line of edits inside an intent, grown from its seed, its
	intent a link away on the intents' board. An edit or a variant picked shows what it changes (./Changes.svelte).

	The view is handed what to show (`onPick`: an edit, a version, a variant, or Main's newest) and says which of Main's
	versions it shows (`version`). It may give Main's versions as it knows them (`versions`, with who made and accepted
	each: the chain is drawn from them even where the history can't be read, as by someone not an admin) and what to show
	under each version in the chain (`extra`).
-->
<script lang="ts" module>
	/** what the view is asked to show */
	export type Pick = { kind: 'edit'; seq: number } | { kind: 'version'; number: number } | { kind: 'variant'; id: string } | { kind: 'main' };
	/** one of Main's versions as the view knows it: who made it and who accepted it, where it knows */
	export type VersionRow = { number: number; note?: string | null; at?: string | null; by?: string | null; acceptedBy?: string | null; label?: string | null };
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { api, ApiError } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Changes, { type Change, type EditRow } from './Changes.svelte';

	type Edit = EditRow & { variant: string | null; kind: 'seed' | 'edit' | 'import' | 'merge'; version: number | null };
	type Variant = { id: string; type: string; status: string; note: string; at: string; author: string | null; intent: string | null; intent_stage: string | null; intent_title: string | null; edits: number; seed: number | null };
	type Log = { id: string; kind: string; edits: Edit[]; versions: { number: number; note: string; at: string }[]; variants: Variant[] };
	type Shown = { changes: Change[]; edits?: EditRow[]; fresh: boolean; error?: string };

	let {
		doc,
		onPick,
		version = null,
		versions,
		extra
	}: {
		/** the document's UUID */
		doc: string;
		/** show this (with what the edit or variant says of itself); its answer awaited, a failure said under the bar */
		onPick: (p: Pick, about?: string) => unknown;
		/** the version of Main the view shows, where it shows one */
		version?: number | null;
		/** Main's versions as the view knows them */
		versions?: VersionRow[];
		/** what the view shows under a version in the chain, given its number */
		extra?: Snippet<[number]>;
	} = $props();

	// the document's UUID, read once: a view hands it as a getter over what it shows (doc={thing.id}), and the history is
	// read again only when the UUID itself changes, never when the view shows another state of the same document
	const docId = $derived(doc);

	// ---- the history, read from play (GET /api/docs/<uuid>/history): admins only, so anyone else sees the chain alone
	const admin = $derived(session.me?.level === 'admin');
	let log = $state<Log | null>(null);
	let failed = $state('');
	$effect(() => {
		const id = docId;
		untrack(letGo);
		log = null;
		failed = '';
		if (!id || !admin) return;
		let gone = false;
		// read untracked: what api() reads of the session must not read the history again on every request the view makes
		untrack(() =>
			api<Log>(`/docs/${id}/history`).then(
				(h) => !gone && (log = h),
				(e) => !gone && !(e instanceof ApiError && (e.status === 401 || e.status === 403)) && (failed = (e as Error).message)
			)
		);
		return () => (gone = true);
	});
	const edits = $derived(log?.edits ?? []);
	/** Main's versions, newest first: as the view knows them, else as the history reads them */
	const rows = $derived.by((): VersionRow[] => {
		const given = versions?.length ? versions : (log?.versions ?? []).map((v) => ({ number: v.number, note: v.note, at: v.at }));
		return [...given].sort((a, b) => b.number - a.number);
	});
	const newest = $derived(rows[0]?.number ?? null);
	/** each version's edits: a merge's are its variant's, else those since the version before it, up to the edit that
	 *  named it; and Main's edits since its newest version */
	const made = $derived.by(() => {
		const by = new Map<number, Edit[]>();
		const lines = new Map<string, Edit[]>();
		let main: Edit[] = [];
		for (const e of edits) {
			if (e.version == null) {
				if (e.variant) lines.set(e.variant, [...(lines.get(e.variant) ?? []), e]);
				else main.push(e);
				continue;
			}
			let own: Edit[];
			if (e.variant) {
				own = [...(lines.get(e.variant) ?? []), ...main, e];
				lines.delete(e.variant);
			} else {
				own = [...[...lines.values()].flat(), ...main, e];
				lines.clear();
			}
			by.set(e.version, own.sort((a, b) => a.seq - b.seq));
			main = [];
		}
		return { by, since: main };
	});
	/** the intent variants still open (one accepted is in Main, one archived let go) */
	const CLOSED = new Set(['accepted', 'archived', 'rejected', 'merged', 'closed']);
	const open = $derived((log?.variants ?? []).filter((v) => !CLOSED.has(v.status)));
	const STAGE: Record<string, string> = { idea: 'Idea', specify: 'Specify', prototype: 'Prototype', proposal: 'Proposal', ship: 'Ship', accepted: 'Accepted', archived: 'Archived' };
	const stageOf = (v: Variant) => (v.intent_stage ? (STAGE[v.intent_stage] ?? v.intent_stage) : v.status);

	// ---- what is picked here: an edit (on the bar, in the chain, in the time-lapse) or a variant, else the view's version
	let atEdit = $state<Edit | null>(null);
	let atVariant = $state<string | null>(null);
	let playing = $state(false);
	let pickError = $state('');
	let asked = 0;
	const atIndex = $derived(atEdit ? edits.findIndex((e) => e.seq === atEdit!.seq) : -1);
	const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
	const how = (via: string) => (via === 'mcp' ? ' via MCP' : via === 'import' ? ' (imported)' : '');

	/** nothing picked here any more: the view shows its version again */
	function letGo() {
		asked++;
		playing = false;
		atEdit = null;
		atVariant = null;
		pickError = '';
	}
	// another version shown by the view (picked in the chain, or by the view itself): the edit or variant let go
	$effect(() => {
		void version;
		untrack(letGo);
	});
	/** the view asked to show `p`; true once it does (a later pick, asked meanwhile, wins) */
	async function ask(p: Pick, about?: string): Promise<boolean> {
		const mine = ++asked;
		pickError = '';
		try {
			await onPick(p, about);
			return mine === asked;
		} catch (e) {
			if (mine === asked) pickError = (e as Error).message;
			return false;
		}
	}
	async function pickEdit(e: Edit) {
		if (atEdit?.seq === e.seq) return;
		if (await ask({ kind: 'edit', seq: e.seq }, e.message)) {
			atEdit = e;
			atVariant = null;
		}
	}
	async function pickVariant(v: Variant) {
		playing = false;
		if (atVariant === v.id) return back();
		if (await ask({ kind: 'variant', id: v.id }, v.intent_title ?? v.note)) {
			atVariant = v.id;
			atEdit = null;
		}
	}
	function pickVersion(n: number) {
		letGo();
		void ask({ kind: 'version', number: n });
	}
	/** back to the version the view shows (Main's newest where it shows none) */
	function back() {
		letGo();
		void ask(version != null && version !== newest ? { kind: 'version', number: version } : { kind: 'main' });
	}

	// the bar: a press puts the pick where it is, and dragging moves it
	let scrubbing = false;
	function scrubAt(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		const i = Math.max(0, Math.min(edits.length - 1, Math.floor(((e.clientX - r.left) / r.width) * edits.length)));
		if (edits[i]) pickEdit(edits[i]);
	}
	// the time-lapse: an edit at a time, from the one shown (from the first, at the end or at none)
	$effect(() => {
		if (!playing) return;
		const slow = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
		let gone = false;
		untrack(() => {
			(async () => {
				let i = atEdit && atIndex < edits.length - 1 ? atIndex : -1;
				while (!gone && playing) {
					i++;
					if (i >= edits.length) {
						playing = false;
						break;
					}
					await pickEdit(edits[i]);
					await new Promise((r) => setTimeout(r, slow ? 4200 : 2600));
				}
			})();
		});
		return () => (gone = true);
	});

	// ---- what the edit or variant picked changes (GET /api/docs/<uuid>/changes), read once the pick rests a moment
	let shown = $state<Shown | null>(null);
	$effect(() => {
		const e = atEdit;
		const v = atVariant;
		const id = docId;
		shown = null;
		if (!id || (!e && !v)) return;
		let gone = false;
		const t = setTimeout(() => {
			api<{ against: { version: number | null; edit: number | null }; changes: Change[]; edits?: EditRow[] }>(`/docs/${id}/changes?${e ? `edit=${e.seq}` : `variant=${encodeURIComponent(v!)}`}`).then(
				(r) => !gone && (shown = { changes: r.changes ?? [], edits: r.edits, fresh: r.against?.version == null && r.against?.edit == null }),
				(err) => !gone && (shown = { changes: [], fresh: false, error: (err as Error).message })
			);
		}, 150);
		return () => {
			gone = true;
			clearTimeout(t);
		};
	});

	// ---- the chain: the newest versions, the older ones folded away until asked for (or one of them is shown)
	const FOLD = 4;
	let showOld = $state(false);
	const shownRows = $derived.by(() => {
		if (showOld || rows.length <= FOLD + 1) return rows;
		const head = rows.slice(0, FOLD);
		const cur = rows.find((r) => r.number === version);
		return cur && !head.includes(cur) ? [...head, cur] : head;
	});
	/** the versions whose edits are unfolded, and those whose description is opened (folded to two lines otherwise) */
	let unfolded = $state<number[]>([]);
	let opened = $state<number[]>([]);
	const flip = (list: number[], n: number) => (list.includes(n) ? list.filter((x) => x !== n) : [...list, n]);
	let sinceOpen = $state(false);
</script>

{#snippet changed()}
	<div class="changed">
		{#if !shown}<p class="soft">Reading what it changes…</p>
		{:else if shown.error}<p class="soft">{shown.error}</p>
		{:else}<Changes changes={shown.changes} edits={shown.edits} fresh={shown.fresh} />{/if}
	</div>
{/snippet}

{#snippet editList(list: Edit[])}
	<ol class="edits">
		{#each list as e (e.seq)}
			<li>
				<button class:on={atEdit?.seq === e.seq} class:mcp={e.via === 'mcp'} class:merge={e.kind === 'merge'} onclick={() => ((playing = false), pickEdit(e))}>
					<b>{e.message}</b>
					<small>{e.author ?? 'play'}{e.via === 'mcp' ? ' · MCP' : ''}{e.kind === 'merge' ? ' · merged' : ''} · {when(e.at)}</small>
				</button>
			</li>
		{/each}
	</ol>
{/snippet}

<section class="history" aria-label="Its history">
	<div class="head">
		<h4>History <small>{rows.length} version{rows.length === 1 ? '' : 's'}{edits.length ? ` · ${edits.length} edits` : ''}</small></h4>
		{#if edits.length > 1}
			<button class="chip" onclick={() => (playing = !playing)} aria-pressed={playing}>{playing ? '❚❚ Pause' : '▶ Play its making'}</button>
		{/if}
		{#if atEdit || atVariant}<button class="chip" onclick={back}>Back to {version != null ? `v${version}` : newest != null ? `v${newest}` : 'Main'}</button>{/if}
	</div>

	{#if edits.length > 1}
		<div
			class="ticks"
			role="slider"
			tabindex="0"
			aria-label="Its history, edit by edit"
			aria-valuemin={1}
			aria-valuemax={edits.length}
			aria-valuenow={atEdit ? atIndex + 1 : edits.length}
			onpointerdown={(e) => {
				playing = false;
				scrubbing = true;
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
				scrubAt(e);
			}}
			onpointermove={(e) => scrubbing && scrubAt(e)}
			onpointerup={() => (scrubbing = false)}
			onkeydown={(e) => {
				const i = atEdit ? atIndex : edits.length;
				if (e.key === 'ArrowLeft' && i > 0) (e.preventDefault(), (playing = false), pickEdit(edits[i - 1]));
				if (e.key === 'ArrowRight' && i < edits.length - 1) (e.preventDefault(), (playing = false), pickEdit(edits[i + 1]));
			}}
		>
			{#each edits as e (e.seq)}
				<span class="tick" class:v={e.version != null} class:mcp={e.via === 'mcp'} class:merge={e.kind === 'merge'} class:on={atEdit?.seq === e.seq} title="{e.message} · {e.author ?? 'play'}{e.via === 'mcp' ? ' (MCP)' : ''} · {when(e.at)}"
					>{#if e.version != null}<span class="vlabel">v{e.version}</span>{/if}</span
				>
			{/each}
		</div>
		<p class="soft caption">
			{#if pickError}{pickError}
			{:else if atEdit}Edit {atIndex + 1} of {edits.length}: “{atEdit.message}” · {atEdit.author ?? 'play'}{how(atEdit.via)} · {when(atEdit.at)}
			{:else}Every edit it was made in, kept: drag along the bar to see it as it stood at any of them{/if}
		</p>
		{#if atEdit}{@render changed()}{/if}
	{:else if pickError}
		<p class="soft caption">{pickError}</p>
	{/if}
	{#if failed}<p class="soft caption">Its edits could not be read: {failed}</p>{/if}

	<ol class="chain">
		{#if made.since.length}
			<li class="since">
				<button class="fold" aria-expanded={sinceOpen} onclick={() => (sinceOpen = !sinceOpen)}>{made.since.length} edit{made.since.length === 1 ? '' : 's'} since v{newest}</button>
				{#if sinceOpen}{@render editList(made.since)}{/if}
			</li>
		{/if}
		{#each shownRows as v (v.number)}
			{@const own = made.by.get(v.number) ?? []}
			<li class:on={!atEdit && !atVariant && v.number === version}>
				<button class="vrow" onclick={() => pickVersion(v.number)} title={v.note || undefined}>
					<b>v{v.number}</b>
					{#if v.label}<span>{v.label}</span>{/if}
					{#if v.number === newest}<span class="badge">newest</span>{/if}
				</button>
				{#if v.by || v.acceptedBy || v.at}
					<p class="soft by">{v.by ? `By ${v.by}` : ''}{v.acceptedBy ? `${v.by ? ' · a' : 'A'}ccepted by ${v.acceptedBy}` : ''}{v.at ? `${v.by || v.acceptedBy ? ' · ' : ''}${new Date(v.at).toLocaleDateString('en-GB')}` : ''}</p>
				{/if}
				{#if v.note}
					<!-- a version's description folded to two lines; opened by its own button -->
					<p class="note" class:more={opened.includes(v.number)}>{v.note}</p>
					{#if v.note.length > 110}<button class="fold" aria-expanded={opened.includes(v.number)} onclick={() => (opened = flip(opened, v.number))}>{opened.includes(v.number) ? 'Show less' : 'Show more'}</button>{/if}
				{/if}
				{@render extra?.(v.number)}
				{#if own.length > 1}
					<button class="fold" aria-expanded={unfolded.includes(v.number)} onclick={() => (unfolded = flip(unfolded, v.number))}>{own.length} edits made it</button>
					{#if unfolded.includes(v.number)}{@render editList(own)}{/if}
				{/if}
			</li>
		{/each}
	</ol>
	{#if rows.length > FOLD + 1}
		<button class="fold older" onclick={() => (showOld = !showOld)}>{showOld ? 'Fold the older versions' : `Show ${rows.length - FOLD} older version${rows.length - FOLD === 1 ? '' : 's'}`}</button>
	{/if}

	{#if open.length}
		<h4 class="sub">Intent variants <small>{open.length}</small></h4>
		<ul class="variants">
			{#each open as v (v.id)}
				<li class:on={atVariant === v.id}>
					<button class="vrow" onclick={() => pickVariant(v)} aria-pressed={atVariant === v.id} title="Show it as this variant would make it">
						<span class="stage">{stageOf(v)}</span>
						<b>{v.intent_title ?? (v.note || 'An intent variant')}</b>
					</button>
					<p class="soft by">{v.edits} edit{v.edits === 1 ? '' : 's'}{v.seed != null ? ` from v${v.seed}` : ''}{v.author ? ` · ${v.author}` : ''}{v.at ? ` · ${when(v.at)}` : ''}{#if v.intent}{' · '}<a href="/intents/#{v.intent}">Open its intent</a>{/if}</p>
					{#if atVariant === v.id}{@render changed()}{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.history { display: grid; gap: 0.35rem; margin: 0 0 0.9rem 0.35rem; min-width: 0; --soft-ink: var(--soft, rgb(38 56 44 / 0.6)); }
	.soft { color: var(--soft-ink); }
	.head { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
	.head h4, .sub { margin: 0 auto 0 0; font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft-ink); }
	.head h4 small, .sub small { text-transform: none; letter-spacing: 0; font-weight: 500; }
	.sub { margin: 0.6rem 0 0.2rem; }
	.chip { display: inline-flex; align-items: center; padding: 0.08rem 0.55rem; border: 0; border-radius: 999px; background: rgb(0 0 0 / 0.06); font: inherit; font-size: 0.74rem; font-weight: 500; color: inherit; cursor: pointer; }
	.chip[aria-pressed='true'] { background: var(--ink, #1f2a22); color: var(--paper, #fff); }
	/* the bar of every edit, versions marked, dragged (or played) to see it as it stood */
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
	.caption { margin: 0; font-size: 0.74rem; line-height: 1.35; overflow-wrap: anywhere; }
	/* what a pick changes, kept from pushing the chain away */
	.changed { max-height: 22rem; overflow: auto; overscroll-behavior: contain; padding: 0.5rem 0.6rem; border-radius: 10px; background: var(--card, #fff); border: 1px solid var(--line); }
	.changed p { margin: 0; font-size: 0.78rem; }
	/* Main's versions, a line of dots, newest first */
	.chain { list-style: none; padding: 0; margin: 0.4rem 0 0 0.05rem; border-left: 2px solid var(--line); }
	.chain > li { position: relative; padding: 0.3rem 0 0.55rem 0.9rem; min-width: 0; }
	.chain > li::before { content: ''; position: absolute; left: -7px; top: 0.7rem; width: 10px; height: 10px; border-radius: 50%; background: var(--paper); border: 2px solid var(--sage); }
	.chain > li.on::before { background: var(--mustard); border-color: var(--mustard); }
	.chain > li.since::before { background: var(--line); border-color: var(--line); }
	.vrow { all: unset; box-sizing: border-box; display: flex; align-items: baseline; gap: 0.35rem; max-width: 100%; padding: 0.05rem 0.3rem; margin-left: -0.3rem; border-radius: 7px; font-size: 0.9rem; cursor: pointer; }
	.vrow:hover { background: color-mix(in srgb, var(--sage) 16%, transparent); }
	.vrow:focus-visible { outline: 2px solid var(--ink); }
	.vrow span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.badge { align-self: center; padding: 0 0.3rem; border-radius: 999px; background: var(--sage-soft, rgb(168 184 138 / 0.3)); font-size: 0.54rem; font-weight: 700; line-height: 1.55; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-soft); }
	.chain p { margin: 0.1rem 0 0; font-size: 0.76rem; }
	.note { color: var(--ink-soft); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; white-space: pre-line; overflow-wrap: anywhere; }
	.note.more { display: block; -webkit-line-clamp: unset; line-clamp: unset; }
	.fold { all: unset; display: block; margin-top: 0.15rem; font-size: 0.72rem; font-weight: 600; color: var(--soft-ink); cursor: pointer; }
	.fold:hover { color: inherit; text-decoration: underline; }
	.fold:focus-visible { outline: 2px solid var(--ink); border-radius: 3px; }
	.fold[aria-expanded]::after { content: ''; display: inline-block; margin-left: 0.3rem; vertical-align: 0.05rem; border-left: 4px solid currentColor; border-block: 3px solid transparent; transition: transform 0.15s; }
	.fold[aria-expanded='true']::after { transform: rotate(90deg); }
	.older { margin: 0 0 0 0.4rem; }
	/* a version's edits, unfolded under it */
	.edits { list-style: none; margin: 0.2rem 0 0.1rem; padding: 0; display: grid; gap: 1px; max-height: 16rem; overflow-y: auto; }
	.edits button { all: unset; box-sizing: border-box; display: grid; width: 100%; padding: 0.2rem 0.4rem; border-left: 2px solid color-mix(in srgb, var(--brand-green) 35%, transparent); border-radius: 0 6px 6px 0; cursor: pointer; font-size: 0.72rem; line-height: 1.3; overflow-wrap: anywhere; }
	.edits button.mcp { border-left-color: var(--sage, #8fae8b); }
	.edits button.merge { border-left-color: var(--brand-green); }
	.edits button:hover { background: color-mix(in srgb, var(--sage) 14%, transparent); }
	.edits button:focus-visible { outline: 2px solid var(--ink); }
	.edits button.on { background: var(--mustard-soft); }
	.edits b { font-weight: 500; }
	.edits small { color: var(--soft-ink); font-size: 0.64rem; }
	/* the intent variants still open, each with its intent */
	.variants { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
	.variants > li { padding: 0.35rem 0.5rem; border-radius: 10px; border: 1px solid var(--line); background: var(--paper, #faf8f2); min-width: 0; }
	.variants > li.on { border-color: var(--mustard); background: var(--mustard-soft); }
	.variants .vrow { margin: 0; padding: 0; font-size: 0.84rem; }
	.variants .vrow b { font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
	.variants p { margin: 0.1rem 0 0; font-size: 0.72rem; }
	.variants .changed { margin-top: 0.4rem; }
	.stage { flex: none; padding: 0 0.4em; border-radius: 999px; background: color-mix(in srgb, var(--mustard, #efb54d) 35%, transparent); font-size: 0.66rem; font-weight: 600; }
</style>
