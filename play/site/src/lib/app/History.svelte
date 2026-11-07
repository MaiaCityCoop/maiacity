<!--
	One History, the same in every view of a versioned thing (play/SPEC.md "Version control"; Samuel 2026-11-06), in the
	one aside's History tab (./Aside.svelte, its only user, which reads the history and hands it here). Its words are play's: an Edit is one change, kept with its author, message and time; a Variant a
	line of edits; Main the default variant, what is accepted; an Intent variant one that lives inside an intent; a Seed
	the version a variant grows from; a Version a numbered state of Main.

	At its top the scrubber over every edit of Main (versions marked, MCP and merge edits marked): drag along it, or use
	the arrow keys, to see the thing as it stood at any edit; ▶ Play its making runs through them; Back to vN returns to
	the version shown. Under it Main's versions, newest first, each with the edits that led to it folded beneath; then an
	asset's breeds (play/SPEC.md "Breeds"), each its own line beside Main that takes every edit accepted on Main except
	on the fields it overrides; then the open intent variants, each with its intent (and the breed it changes or makes). Picking an edit or an intent variant shows what it changes
	(./Changes.svelte) and hands it to the view (`onPick`), which shows the thing as it stood there: its state is the
	view's to draw (an asset built in the box, a factory's line, a story's timeline).

	The edits and variants are an admin's (GET /api/docs/<uuid>/history, `h`); the chain of versions is everyone's: a view
	may give its own (`versions`, as its own read lists them, each drawn with the view's `version` snippet beside it).
	Compact (Samuel 2026-11-07): a version is one line (its number, who, when, its edits) over its note in two lines at
	most, the whole note on a tap or under the pointer.
-->
<script lang="ts" module>
	import type { Edit } from './Changes.svelte';
	export type { Edit };
	export type Variant = {
		id: number;
		type: 'main' | 'intent' | 'breed';
		/** a breed's: its name (only shown) and the fields it overrides */
		name?: string;
		overrides?: string[];
		/** an intent variant's: the breed it changes, or the one it makes */
		breed?: number;
		breedName?: string | null;
		makes?: string;
		status: string;
		note: string;
		at: string;
		author: string | null;
		edits: number;
		seed: number | null;
		intent: { id: string; stage: string | null; title: string | null } | null;
	};
	/** a version as the chain lists it: its number, and whatever else the view knows of it */
	export type ChainVersion = { number: number; note?: string | null; at?: string | null; by?: string | null; acceptedBy?: string | null; label?: string | null; [more: string]: unknown };
	/** what is picked: an edit (of Main, or an intent variant's last), or a version of Main; null, back to the version shown */
	export type Pick = { edit: Edit; variant?: Variant | null } | { version: number };
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import Changes from './Changes.svelte';

	let {
		doc,
		shown = null,
		label = 'it',
		versions = null,
		version,
		intent = null,
		h = null,
		failed = '',
		onPick
	}: {
		/** the document's UUID (the asset's, the story's, the factory's …) */
		doc: string;
		/** the version the view shows */
		shown?: number | null;
		/** what the thing is called, in its captions */
		label?: string;
		/** the view's own list of versions (else Main's, from the history) */
		versions?: ChainVersion[] | null;
		/** what the view draws under a version of its chain (an asset's kinds, its reference sheet) */
		version?: Snippet<[ChainVersion]>;
		/** an intent whose variant the view shows (opened from the intents' board) */
		intent?: string | null;
		/** its history, as GET /api/docs/<uuid>/history gives it (an admin's), and why it could not be read */
		h?: { edits: Edit[]; versions: Version[]; variants: Variant[] } | null;
		failed?: string;
		onPick: (p: Pick | null) => void | Promise<void>;
	} = $props();

	type Version = { number: number; note: string; at: string; acceptedBy?: string | null };
	const admin = $derived(session.me?.level === 'admin');
	const edits = $derived(h?.edits ?? []);
	const mainVersions = $derived(h?.versions ?? []);
	const variants = $derived(h?.variants ?? []);
	let at = $state<Edit | null>(null);
	let onVariant = $state<Variant | null>(null);
	let playing = $state(false);
	let picking = $state('');
	let unfolded = $state<number[]>([]);
	let asked = 0;

	// another document, or another version shown by the view: back to it, the edit let go
	$effect(() => {
		void doc;
		void shown;
		untrack(() => {
			at = null;
			onVariant = null;
			playing = false;
		});
	});
	const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
	const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-GB') : '');
	const index = $derived(at ? edits.findIndex((e) => e.seq === at!.seq) : -1);
	/** the chain: the view's versions, else Main's, newest first */
	const chain = $derived<ChainVersion[]>(
		versions ?? [...mainVersions].reverse().map((v) => ({ number: v.number, note: v.note, at: v.at, acceptedBy: v.acceptedBy ?? null }))
	);
	const newest = $derived(chain.length ? Math.max(...chain.map((v) => v.number)) : null);
	/** each version's edits: those of Main after the version before it, up to the one it was named at */
	const ledTo = $derived.by(() => {
		const out = new Map<number, Edit[]>();
		let run: Edit[] = [];
		for (const e of edits) {
			run.push(e);
			if (e.version != null) {
				out.set(e.version, run);
				run = [];
			}
		}
		return out;
	});
	const open = $derived(variants.filter((v) => v.type === 'intent' && (v.status === 'open' || v.status === 'proposed')));
	const breeds = $derived(variants.filter((v) => v.type === 'breed' && v.status === 'open'));
	/** what an intent variant works on: Main, a breed, or a breed it makes */
	const onWhat = (v: Variant) => (v.makes ? `makes breed ${v.makes}` : v.breedName ? `changes breed ${v.breedName}` : 'changes Main');
	const intentVariant = $derived(intent ? variants.find((v) => v.intent?.id === intent) ?? null : null);

	async function pick(e: Edit, variant: Variant | null = null) {
		if (at?.seq === e.seq && onVariant?.id === (variant?.id ?? onVariant?.id)) return;
		const ask = ++asked;
		picking = '';
		try {
			await onPick({ edit: e, variant });
			if (ask !== asked) return;
			at = e;
			onVariant = variant;
		} catch (err) {
			if (ask === asked) picking = (err as Error).message;
		}
	}
	async function pickVariant(v: Variant) {
		try {
			const own = await api<{ edits: Edit[] }>(`/docs/${doc}/history?variant=${v.id}`);
			const last = own.edits.at(-1);
			if (last) await pick(last, v);
		} catch (err) {
			picking = (err as Error).message;
		}
	}
	function back() {
		asked++;
		playing = false;
		at = null;
		onVariant = null;
		picking = '';
		onPick(null);
	}
	function toVersion(n: number) {
		asked++;
		playing = false;
		at = null;
		onVariant = null;
		onPick({ version: n });
	}
	let scrubbing = false;
	function scrubAt(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
		const i = Math.max(0, Math.min(edits.length - 1, Math.floor(((e.clientX - r.left) / r.width) * edits.length)));
		if (edits[i]) pick(edits[i]);
	}
	function keys(e: KeyboardEvent) {
		const i = at && !onVariant ? index : edits.length;
		if (e.key === 'ArrowLeft' && i > 0) (e.preventDefault(), pick(edits[i - 1]));
		if (e.key === 'ArrowRight' && i < edits.length - 1) (e.preventDefault(), pick(edits[i + 1]));
		if (e.key === 'Home' && edits.length) (e.preventDefault(), pick(edits[0]));
		if (e.key === 'End' && edits.length) (e.preventDefault(), pick(edits[edits.length - 1]));
	}
	// its making: an edit at a time, each held long enough to be drawn and seen (longer on a touch screen)
	$effect(() => {
		if (!playing) return;
		const slow = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
		let gone = false;
		untrack(() => {
			(async () => {
				let i = at && !onVariant && index < edits.length - 1 ? index : -1;
				while (!gone && playing) {
					i++;
					if (i >= edits.length) {
						playing = false;
						break;
					}
					await pick(edits[i]);
					await new Promise((r) => setTimeout(r, slow ? 4200 : 2600));
				}
			})();
		});
		return () => (gone = true);
	});
	const fold = (n: number) => (unfolded = unfolded.includes(n) ? unfolded.filter((x) => x !== n) : [...unfolded, n]);
</script>

<section class="history" aria-label="Its history">
	{#if admin && edits.length}
		<div class="head">
			<h4>Edits <small>{edits.length}</small></h4>
			{#if edits.length > 1}<button class="chip" onclick={() => (playing = !playing)} aria-pressed={playing}>{playing ? '❚❚ Pause' : '▶ Play its making'}</button>{/if}
			{#if (at || intentVariant) && (shown ?? newest)}<button class="chip" onclick={back}>Back to v{shown ?? newest}</button>{/if}
		</div>
		<div
			class="ticks"
			role="slider"
			tabindex="0"
			aria-label="Its history, edit by edit"
			aria-valuemin={1}
			aria-valuemax={edits.length}
			aria-valuenow={at && !onVariant ? index + 1 : edits.length}
			onpointerdown={(e) => {
				playing = false;
				scrubbing = true;
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
				scrubAt(e);
			}}
			onpointermove={(e) => scrubbing && scrubAt(e)}
			onpointerup={() => (scrubbing = false)}
			onkeydown={keys}
		>
			{#each edits as e (e.seq)}
				<span class="tick" class:v={e.version} class:mcp={e.via === 'mcp'} class:merge={e.kind === 'merge'} class:on={!onVariant && at?.seq === e.seq} title="{e.message} · {e.author ?? 'play'}{e.via === 'mcp' ? ' (MCP)' : ''} · {when(e.at)}"
					>{#if e.version}<span class="vlabel">v{e.version}</span>{/if}</span
				>
			{/each}
		</div>
		<p class="soft caption" aria-live="polite">
			{#if picking}{picking}
			{:else if at && onVariant?.type === 'breed'}Breed {onVariant.name}, as it is now: Main beneath it on every field it does not override{onVariant.overrides?.length ? ` (it overrides ${onVariant.overrides.join(', ')})` : ''} · its last edit, “{at.message}” · {when(at.at)}
			{:else if at && onVariant}Intent variant {onVariant.id}{onVariant.intent?.title ? ` (“${onVariant.intent.title}”)` : ''}, {onVariant.seed ? `seeded from v${onVariant.seed}` : 'its first version'}: its last edit, “{at.message}” · {at.author ?? 'play'}{at.via === 'mcp' ? ' via MCP' : ''} · {when(at.at)}
			{:else if at}Edit {index + 1} of {edits.length}: “{at.message}” · {at.author ?? 'play'}{at.via === 'mcp' ? ' via MCP' : at.via === 'import' ? ' (imported)' : ''}{at.kind === 'merge' ? ' (a merge)' : ''} · {when(at.at)}
			{:else if intentVariant}Shown as intent “{intentVariant.intent?.title ?? intent}” would make it: its variant {intentVariant.id}, {intentVariant.seed ? `seeded from v${intentVariant.seed}` : 'its first version'}
			{:else}Every edit {label} was made in, kept: drag along the bar, or use the arrow keys, to see it as it stood at any of them{/if}
		</p>
	{:else if failed}
		<p class="soft caption">{failed}</p>
	{/if}

	<h4 class="sub">Main <small>{chain.length} version{chain.length === 1 ? '' : 's'}</small></h4>
	<ol class="chain">
		{#each chain as v (v.number)}
			{@const led = ledTo.get(v.number) ?? []}
			<li class:on={!at && !intentVariant && v.number === (shown ?? newest)}>
				<div class="row">
					<button class="ver" onclick={() => toVersion(v.number)}><b>v{v.number}</b>{#if v.label}<span>{v.label}</span>{/if}</button>
					<span class="soft by" title="{v.by ? `By ${v.by}` : ''}{v.acceptedBy ? ` · accepted by ${v.acceptedBy}` : ''}">{v.acceptedBy ?? v.by ?? ''}{(v.by || v.acceptedBy) && v.at ? ' · ' : ''}{day(v.at)}</span>
					{#if admin && led.length}<button class="fold edits-fold" aria-expanded={unfolded.includes(v.number)} onclick={() => fold(v.number)}>{led.length}</button>{/if}
				</div>
				{#if v.note}<button class="note" class:more={unfolded.includes(-v.number)} title={v.note} aria-expanded={unfolded.includes(-v.number)} onclick={() => fold(-v.number)}>{v.note}</button>{/if}
				{@render version?.(v)}
				{#if admin && led.length}
					{#if unfolded.includes(v.number)}
						<ol class="edits">
							{#each led as e (e.seq)}
								<li class:on={!onVariant && at?.seq === e.seq}><button onclick={() => pick(e)}>{e.message}</button> <span class="soft">{e.author ?? 'play'}{e.via === 'mcp' ? ' · MCP' : ''}{e.kind === 'merge' ? ' · merge' : ''}</span></li>
							{/each}
						</ol>
					{/if}
				{/if}
			</li>
		{/each}
	</ol>

	{#if admin && breeds.length}
		<h4 class="sub">Breeds <small>{breeds.length} beside Main, tracking it</small></h4>
		<ol class="variants breeds">
			{#each breeds as v (v.id)}
				<li class:on={onVariant?.id === v.id}>
					<button onclick={() => pickVariant(v)}>{v.name}</button>
					<p class="soft">{v.overrides?.length ? `overrides ${v.overrides.join(', ')}` : 'overrides nothing: Main as it is'} · {v.edits} edit{v.edits === 1 ? '' : 's'}</p>
				</li>
			{/each}
		</ol>
	{/if}

	{#if admin && open.length}
		<h4 class="sub">Intent variants <small>{open.length} open</small></h4>
		<ol class="variants">
			{#each open as v (v.id)}
				<li class:on={onVariant?.id === v.id || intentVariant?.id === v.id}>
					<button onclick={() => pickVariant(v)}>{v.intent?.title ?? (v.note || `Variant ${v.id}`)}</button>
					<p class="soft">{v.status === 'proposed' ? 'at Proposal' : 'being made'}{breeds.length || v.breedName || v.makes ? ` · ${onWhat(v)}` : ''} · {v.seed ? `seeded from v${v.seed}` : 'its first version'} · {v.edits} edit{v.edits === 1 ? '' : 's'}{v.author ? ` · ${v.author}` : ''}</p>
					{#if v.intent}<a class="soft" href="/intents/#{v.intent.id}">Its intent</a>{/if}
				</li>
			{/each}
		</ol>
	{/if}

	{#if admin && (at || onVariant || intentVariant)}
		<Changes {doc} edit={onVariant || !at ? null : at.seq} variant={onVariant?.id ?? (!at ? intentVariant?.id ?? null : null)} heading={onVariant?.type === 'breed' ? `What breed ${onVariant.name} overrides of Main` : onVariant || (!at && intentVariant) ? 'What the intent variant changes' : 'What this edit changes'} />
	{/if}
</section>

<style>
	.history { display: grid; gap: 0.25rem; margin: 0 0 0.9rem 0.35rem; min-width: 0; }
	.head { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
	h4 { margin: 0 auto 0 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--soft, rgb(38 56 44 / 0.6)); }
	h4 small { text-transform: none; letter-spacing: 0; font-weight: 500; }
	h4.sub { margin: 0.7rem 0 0.2rem; }
	.soft { color: var(--soft, rgb(38 56 44 / 0.6)); }
	.chip { display: inline-flex; align-items: center; padding: 0.08rem 0.55rem; border-radius: 999px; background: rgb(0 0 0 / 0.06); font: inherit; font-size: 0.74rem; font-weight: 500; border: 0; cursor: pointer; color: inherit; }
	.chip[aria-pressed='true'] { background: var(--ink, #1f2b23); color: var(--paper, #fff); }
	/* the scrubber: a thin bar of every edit, versions marked, dragged (or played) to see it as it stood */
	.ticks { position: relative; display: flex; align-items: flex-end; height: 1.7rem; padding-top: 0.75rem; cursor: ew-resize; touch-action: none; border-bottom: 1px solid var(--line, #e5e1d8); outline: none; }
	.ticks:focus-visible { box-shadow: 0 2px 0 var(--brand-green, #2f6b4f); }
	.tick { position: relative; flex: 1 1 0; height: 0.5rem; display: flex; justify-content: center; }
	.tick::before { content: ''; width: 2px; height: 100%; border-radius: 1px; background: color-mix(in srgb, var(--brand-green, #2f6b4f) 35%, transparent); }
	.tick.mcp::before { background: var(--sage, #8fae8b); }
	.tick.merge::before { background: var(--brand-green, #2f6b4f); }
	.tick.v { height: 0.85rem; }
	.tick.v::before { width: 3px; background: var(--brand-green, #2f6b4f); }
	.tick.on::before { width: 4px; background: var(--terracotta, #c8744f); }
	.vlabel { position: absolute; bottom: 100%; font-size: 0.62rem; font-weight: 700; line-height: 1; color: var(--brand-green, #2f6b4f); pointer-events: none; }
	.caption { margin: 0; font-size: 0.74rem; line-height: 1.35; }
	/* Main's versions as a chain, each its edits folded beneath */
	.chain { list-style: none; padding: 0; margin: 0 0 0.6rem 0.4rem; border-left: 2px solid var(--line, #e5e1d8); }
	.chain > li { position: relative; padding: 0.15rem 0 0.3rem 0.75rem; min-width: 0; }
	.chain > li::before { content: ''; position: absolute; left: -6px; top: 0.4rem; width: 8px; height: 8px; border-radius: 50%; background: var(--paper, #fff); border: 2px solid var(--sage, #8fae8b); }
	.chain > li.on::before { background: var(--mustard, #efb54d); border-color: var(--mustard, #efb54d); }
	.row { display: flex; align-items: baseline; gap: 0.4rem; min-width: 0; font-size: 0.74rem; }
	.by { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ver { all: unset; cursor: pointer; font-size: 0.8rem; display: inline-flex; gap: 0.3rem; min-width: 0; }
	.ver:hover span, .ver:focus-visible span { text-decoration: underline; }
	.note { all: unset; cursor: pointer; margin-top: 0.05rem; font-size: 0.72rem; line-height: 1.3; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; white-space: pre-line; color: var(--ink-soft, #3b4a40); }
	.note.more { display: block; -webkit-line-clamp: unset; line-clamp: unset; }
	.fold { all: unset; display: inline-block; font-size: 0.7rem; font-weight: 600; color: var(--soft, #777); cursor: pointer; }
	.fold:hover, .fold:focus-visible { color: inherit; text-decoration: underline; }
	.edits-fold { flex: none; }
	.edits-fold::after { content: ''; display: inline-block; margin-left: 0.3rem; vertical-align: 0.05rem; border-left: 4px solid currentColor; border-block: 3px solid transparent; transition: transform 0.15s; }
	.edits-fold[aria-expanded='true']::after { transform: rotate(90deg); }
	.edits { margin: 0.25rem 0 0; padding-left: 1.1rem; display: grid; gap: 0.15rem; font-size: 0.74rem; }
	.edits button, .variants button { all: unset; cursor: pointer; overflow-wrap: anywhere; }
	.edits button:hover, .variants button:hover, .edits button:focus-visible, .variants button:focus-visible { text-decoration: underline; }
	.edits li.on button, .variants li.on button { font-weight: 700; color: var(--terracotta, #c8744f); }
	.variants { list-style: none; margin: 0 0 0.5rem; padding: 0; display: grid; gap: 0.45rem; font-size: 0.82rem; }
	.variants li { padding: 0.35rem 0.5rem; border-radius: 8px; background: rgb(0 0 0 / 0.03); min-width: 0; }
	.variants p { margin: 0.1rem 0 0; font-size: 0.72rem; }
	.variants a { font-size: 0.72rem; }
</style>
