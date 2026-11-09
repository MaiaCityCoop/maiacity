<!--
	AN INTENT'S WORK, REVIEWED over the intents' board (./IntentsBoard.svelte): the version built in the asset box (the
	sandboxed frame every recipe runs in) as large as it can be, what it says of itself folded to two lines, its readable
	source beside its base's, as the lines that changed, a button away (code is only text here); a story's timeline played
	beside what changed clip by clip; any other document field by field, opened as it would be. Every document the work
	changes is listed, each read only when it is opened, once (intent 2df30a21: ./opened.ts). Read only: the decision is
	the whole intent's, the same bar as its detail's (Samuel 2026-11-07).
-->
<script lang="ts" module>
	import type { Results, Spec, Work } from './detail';
	/** the work opened for review: the intent's id, with the intent's title, spec and results beside it */
	export type Opened = Work & { id: string; intent_id: string; intent_title: string; intent_spec: Spec | null; intent_results: Results | null };
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { fileText } from '$lib/api';
	import { admitProposed } from '$lib/content/assets/catalog.js';
	import { changesOnly, lineDiff } from '$lib/diff';
	import Changes, { type Change, type Edit, type PinChange } from '$lib/app/Changes.svelte';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import StoryChanges, { type StoryDiff } from '$lib/stories/StoryChanges.svelte';
	import type { Story } from '$lib/stories/timeline';
	import { when } from '$lib/format';
	import { pieceHref } from '$lib/app/address';
	import BuildView from './BuildView.svelte';
	import Decision from './Decision.svelte';
	import type { Verdict } from './decide';
	import { detailOf, type Intent } from './detail';
	import { titleOf } from './names';
	import { summaryText, type createOpened, type Listed } from './opened';

	let {
		p,
		focus,
		of,
		opened,
		busy = null,
		error = '',
		ondecide,
		onclose,
		onopenintent
	}: {
		p: Opened;
		/** the document to open first, as the detail lists it */
		focus?: Listed;
		/** the intent as the board holds it, for its decision */
		of: Intent | undefined;
		opened: ReturnType<typeof createOpened<any>>;
		busy?: Verdict | null;
		/** a refused decision's reason */
		error?: string;
		ondecide: (verdict: Verdict) => void;
		onclose: () => void;
		onopenintent: (id: string) => void;
	} = $props();

	type Build = { hash: string; variant: string | null; label: string; first: boolean };
	/** every review of a document's version (play/api/src/versioned.ts reviewDoc): its document, what it changes field by
	 *  field against its seed, the edits that made it, whether Main moved since; an asset's adds its builds, a story's its
	 *  timelines; a sandbox's layout each pin before and after, whether it still holds, the sandbox to open as it would be */
	type DocReview = {
		doc: { id: string; kind: string; what: string; label: string; group?: string; open: string | null } | null; seedNumber: number | null; moved: boolean; changes: Change[]; edits: Edit[];
		pins?: PinChange[]; holds?: boolean; why?: string | null; sandbox?: { title: string; route: string; open: string }; docs?: DocReview[];
	};
	type Review = DocReview & { id: string; source: string | null; recipe: string | null; baseVersion: { number: number; source: string | null } | null; builds: Build[]; pieces?: { hash: string; piece: string; label: string; version: number }[] };
	type StoryReview = DocReview & { story: Story; baseStory: (Story & { number: number }) | null; diff: StoryDiff };

	let review = $state<Review | null>(null);
	let storyReview = $state<StoryReview | null>(null);
	let docReview = $state<DocReview | null>(null);
	let code = $state('');
	let baseCode = $state<string | null>(null);
	let shown = $state('');
	let changes = $state(true);
	let showSource = $state(false);
	let noteOpen = $state(false);
	let reviewError = $state('');
	let work = $state<any>(null);
	let listed = $state<Listed[]>([]);
	let focused = $state<Listed | null>(null);
	/** a piece's later version in this intent (intent 02e3a85f): its change is read against the one before it */
	const laterVersion = (d: Listed) => listed.findIndex((x) => x.doc?.id === d.doc?.id) < listed.indexOf(d);
	const diff = $derived(baseCode !== null && code ? changesOnly(lineDiff(baseCode, code)) : null);

	// one review for every kind, read once the work is opened: an asset's build, a story's timelines, or any document's fields
	let current = '';
	$effect(() => {
		const id = p.id, first = untrack(() => focus), stage = untrack(() => of?.stage ?? '');
		current = id;
		work = null;
		listed = [];
		noteOpen = false;
		reset();
		opened.intent(id, stage).then(
			({ review: got }: any) => {
				if (current !== id) return;
				work = got;
				listed = got?.docs ?? [];
				showDoc((first && listed.find((d) => d.doc?.id === first.doc?.id && d.variant === first.variant)) ?? listed[0] ?? null);
			},
			(e) => current === id && (reviewError = (e as Error).message)
		);
	});
	function reset() {
		review = null;
		storyReview = null;
		docReview = null;
		code = '';
		baseCode = null;
		shown = '';
		showSource = false;
		reviewError = '';
	}
	/** one document of the work opened: read alone, then shown as its kind is (an asset built, a story played, fields) */
	async function showDoc(d: Listed | null) {
		const id = p.id;
		focused = d;
		reset();
		let got: any = work ?? {};
		if (d?.doc) {
			try {
				// the intent's pieces, as the work lists them, beside a host's own
				got = { ...(await opened.read(id, d)), ...(work?.pieces ? { pieces: work.pieces } : {}) };
			} catch (e) {
				if (current === id && focused === d) reviewError = (e as Error).message;
				return;
			}
		}
		if (current !== id || focused !== d) return;
		if (got.story) return void (storyReview = got);
		if (!got.builds) return void (docReview = got);
		try {
			const r = got as Review;
			await admitProposed(r.builds);
			if (focused !== d) return;
			review = r;
			shown = (r.builds.find((b) => b.first) ?? r.builds[0])?.hash ?? '';
			code = r.source ? await fileText(r.source) : r.recipe ? await fileText(r.recipe) : '';
			baseCode = r.baseVersion?.source ? await fileText(r.baseVersion.source) : null;
		} catch (e) {
			reviewError = (e as Error).message;
		}
	}
</script>

{#snippet docChanges(r: DocReview, several: boolean, done: boolean)}
	<div class="sandbox-review">
		{#if several}<h3>{(r.doc?.what ?? 'document').replace(/^./, (c) => c.toUpperCase())}: {r.doc?.label}</h3>{/if}
		{#if r.holds === false && !done}<p class="error">It no longer holds on {r.doc?.label ?? 'it'} as it is now: {r.why} Accepting it archives it.</p>{/if}
		<p>
			{#if r.sandbox && !done && r.holds !== false}<a class="btn small" href={r.sandbox.open} target="_blank" rel="noopener">Open {r.sandbox.title} as it would be</a>{/if}
			{#if r.doc?.open}<a class="btn small" href={r.doc.open} target="_blank" rel="noopener">{r.sandbox ? `Its layout's history` : `Open ${r.doc.label} as it would be`}</a>{/if}
			{#if r.doc?.group}<span class="muted small"> What every agent is taught ({r.doc.what}s / {r.doc.group}): accepted, it is taught from the next request on.</span>{/if}
			{#if r.moved}<span class="muted small"> It was seeded from v{r.seedNumber}; the {r.doc?.what ?? 'document'} has a newer version since. Accepting merges it where the two touch different fields, and archives it where they touch the same.</span>{/if}
		</p>
		<Changes changes={r.changes} edits={r.edits} pins={r.pins ?? null} seed={r.seedNumber} heading={done ? 'What it changed' : 'What it changes'} />
	</div>
{/snippet}

<div class="review" role="dialog" aria-modal="true" aria-label="{p.label} {titleOf(p)}">
	<header class="review-head">
		<div class="who">
			<button class="to-board" onclick={onclose} title="Back to the intents (Esc)">‹ Intents</button>
			<h2>{p.label} <span class="muted">{titleOf(p)}</span> <span class="pill">{p.status}</span></h2>
			<p class="meta">{p.grp} · by {p.author ?? 'someone'}{#if p.via === 'mcp'}{' '}<span class="via" title="Proposed by an agent working for them over MCP">via MCP</span>{/if} · {when(p.created)}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}{#if p.intent_id}{' · for '}<button class="link" onclick={() => onopenintent(p.intent_id!)} title="The intent it was made for: its spec and checks">{p.intent_title}</button>{/if}</p>
			{#if p.intent_spec}
				{@const checks = p.intent_spec.checks}
				{@const musts = checks.filter((c) => c.must)}
				<!-- in plain words, as the intent's detail says it (Samuel 2026-11-07: the audience is a person) -->
				<p class="gate small" title={checks.map((c) => `${c.id} ${c.check}`).join('\n')}>Checks passed: <strong>{musts.filter((c) => p.intent_results?.[c.id]?.pass === true).length} of {musts.length}</strong> required</p>
			{/if}
		</div>
	</header>
	{#if p.note}
		<div class="note" class:folded={!noteOpen}>
			<p>{p.note}</p>
		</div>
		<button class="more" onclick={() => (noteOpen = !noteOpen)}>{noteOpen ? 'Less' : 'More'}</button>
	{/if}
	<!-- the work itself, the left pane on a wide screen -->
	<div class="work-pane">
	{#if listed.length > 1}
		<!-- every document it changes, in brief; each opened here on its own, read when it is (intent 2df30a21) -->
		<p class="muted small also-head">This intent changes {listed.length} documents: accepted together, or archived together. Open one to read its change.</p>
		<ul class="also-docs">
			{#each listed as d, n (`${d.doc?.id}:${d.variant ?? n}`)}
				<li>
					<button class="also" class:on={focused === d} aria-current={focused === d ? 'true' : undefined} onclick={() => showDoc(d)} title={summaryText(d)}>
						<span class="what">{(d.doc?.what ?? d.doc?.kind ?? 'document').replace(/^./, (c) => c.toUpperCase())}: {d.doc?.label ?? d.doc?.id}</span>
						<span class="muted small">{laterVersion(d) ? 'its next version here' : d.seedNumber == null ? 'new' : `v${d.seedNumber + 1}`} · {summaryText(d)}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if !review && !storyReview && !docReview}
		<div class="sandbox-review">
			{#if reviewError}<p class="error">{reviewError}</p>{:else}<p class="muted">Reading it…</p>{/if}
		</div>
	{:else if docReview}
		{@render docChanges(docReview, listed.length > 1, p.status === 'accepted')}
	{:else if storyReview}
		<div class="story-review">
			{#if reviewError}<p class="error">{reviewError}</p>
			{:else}
				<div class="story-play"><StoryPlayer story={storyReview.story} compact /></div>
				<div class="story-diff">
					<h3>{storyReview.baseStory ? `Changes from v${storyReview.baseStory.number}` : 'A new story'}</h3>
					<StoryChanges diff={storyReview.diff} fresh={!storyReview.baseStory} links={{ ...storyReview.baseStory?.links, ...storyReview.story.links }} />
					<Changes edits={storyReview.edits} />
				</div>
			{/if}
		</div>
	{:else}
	<div class="review-body" class:split={showSource}>
		<div class="built">
			{#if reviewError}<p class="error">{reviewError}</p>
			{:else if !review}<p class="muted">Reading it…</p>
			{:else}
				{#if review.builds.length > 1}
					<div class="tabs">{#each review.builds as b (b.hash)}<button class="btn small" class:ghost={shown !== b.hash} onclick={() => (shown = b.hash)}>{b.variant ?? b.label}</button>{/each}</div>
				{/if}
				{#if shown}
					<div class="stage">
						{#key shown}
							<BuildView grp={p.grp} hash={shown} title="{p.label} v{p.number} (proposed)" />
						{/key}
					</div>
				{/if}
				<p class="muted small">Built in the asset box: a sandboxed frame with no origin, running the frozen engine in a worker, with no network, no storage and no access to this page.</p>
				{#if review.pieces?.length}
					<p class="muted small">Its pieces, by hash, read from play's files: {#each review.pieces as pc, i (pc.hash)}{i ? ', ' : ''}<a href={pieceHref(pc.piece, pc.version)} title={pc.hash}>{pc.label} v{pc.version}</a> <code>{pc.hash.slice(0, 12)}…</code>{/each}</p>
				{/if}
				<!-- what else it changes (its source is beside it, a button away) and the edits it was made in -->
				<Changes changes={review.changes} edits={review.edits} seed={review.seedNumber} skip={['$.source']} />
			{/if}
		</div>
		{#if showSource && review}
			<div class="code">
				<div class="codebar">
					{#if diff}<button class="btn small ghost" onclick={() => (changes = !changes)}>{changes ? 'Whole file' : `Changes from v${review.baseVersion?.number}`}</button>{/if}
					{#if !review.baseVersion?.source && review.baseVersion}<span class="muted small">v{review.baseVersion.number} has no source to compare (imported)</span>{/if}
				</div>
				{#if diff && changes}
					<pre class="src">{#each diff as l, i (i)}<span class={l.op}>{l.op === 'add' ? '+ ' : l.op === 'del' ? '- ' : l.op === 'skip' ? '' : '  '}{l.text}
</span>{/each}</pre>
				{:else}
					<pre class="src">{code || 'Reading it…'}</pre>
				{/if}
			</div>
		{/if}
	</div>
	{/if}
	</div>
	<!-- the decision travels with the work (Samuel 2026-11-07): the same bar as the intent's detail, by detailOf, its
	     source a quiet button beside it -->
	{#if error}<p class="refused" role="alert">{error}</p>{/if}
	<Decision detail={of ? detailOf(of) : { decision: null, reject: false }} {busy} {ondecide}>
		{#snippet extra()}
			{#if review}<button class="btn small ghost" class:on={showSource} onclick={() => (showSource = !showSource)}>{showSource ? 'Hide source' : review.source ? 'Source' : 'Recipe file'}</button>{/if}
		{/snippet}
	</Decision>
</div>

<style>
	.meta { font-size: 0.78rem; color: var(--muted, #777); }
	.via { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; }
	/* a proposal's review: its intent's checks as one strip of marks */
	.gate { margin: 0.25rem 0 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.chk { padding: 0 0.5em; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: var(--paper, #f6f1e6); color: var(--muted, #777); white-space: nowrap; }
	.chk.pass { background: color-mix(in srgb, var(--sage, #8fae8b) 40%, transparent); color: var(--brand-green, #24452f); }
	.chk.fail { background: color-mix(in srgb, var(--terracotta, #c8744f) 25%, transparent); color: #9c3b22; }
	.link { all: unset; cursor: pointer; text-decoration: underline; font-weight: 600; color: var(--brand-green, #24452f); }
	.link:focus-visible { outline: 2px solid var(--mustard); }
	/* reviewing one: nearly the whole screen, the build as large as it can be */
	.review { position: absolute; inset: 0.4rem; z-index: 10; background: var(--bg, #fbf8f2); border-radius: 16px; box-shadow: 0 20px 60px rgb(0 0 0 / 0.25); display: flex; flex-direction: column; padding: 0.8rem 1rem 0.6rem; gap: 0.4rem; overflow: hidden; }
	.review-head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
	.who { min-width: 0; }
	/* ‹ Intents: back to the board from what is open on it; a tap's height (44 px), drawn as a quiet link */
	.to-board { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; min-height: 44px; margin: -0.65rem 0 -0.35rem -0.45rem; padding: 0 0.6rem 0 0.45rem; border-radius: 10px; font-size: 0.88rem; font-weight: 600; color: var(--ink-soft, #4d5d51); }
	.to-board:hover { background: color-mix(in srgb, var(--ink, #26382c) 6%, transparent); color: var(--ink, #1f2a22); }
	.to-board:focus-visible { outline: 2px solid var(--ink, #222); outline-offset: -2px; }
	.review-head h2 { margin: 0; font-size: 1.3rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
	.review-head .meta { margin: 0.15rem 0 0; }
	.btn.on { background: var(--ink, #222); color: var(--bg, #fff); }
	.note { flex: 0 0 auto; }
	.note p { margin: 0; font-size: 0.88rem; white-space: pre-line; }
	.note.folded p { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.note:not(.folded) { max-height: 30vh; overflow: auto; }
	.more { all: unset; flex: 0 0 auto; cursor: pointer; font-size: 0.8rem; font-weight: 600; text-decoration: underline; width: fit-content; }
	.review-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.8rem; }
	.review-body.split { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
	@media (max-width: 900px) { .review-body.split { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 3fr) minmax(0, 2fr); } }
	/* the build as large as there is room for, and never squeezed by what follows it (Samuel 2026-11-05: on a pad seven
	   steps squeezed it to a strip): the steps scroll below it */
	.built { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 0.3rem; }
	.stage { flex: 1 0 auto; min-height: clamp(16rem, 58dvh, 42rem); display: flex; flex-direction: column; }
	.stage > :global(*) { flex: 1 1 auto; min-height: 0; }
	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.code { min-height: 0; display: flex; flex-direction: column; gap: 0.4rem; }
	.codebar { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
	.src { flex: 1 1 auto; min-height: 0; overflow: auto; margin: 0; padding: 0.8rem; border-radius: 10px; background: var(--paper, #f6f1e6); font-size: 0.78rem; line-height: 1.45; white-space: pre; }
	.src .add { background: color-mix(in srgb, var(--sage, #8fae8b) 30%, transparent); display: block; }
	.src .del { background: color-mix(in srgb, var(--terracotta, #c96f53) 25%, transparent); display: block; }
	.src .same { display: block; opacity: 0.7; }
	.src .skip { display: block; opacity: 0.5; font-style: italic; padding: 0.2rem 0; }
	.small { font-size: 0.8rem; }
	/* a story's proposal: its timeline played, beside what changed against the head */
	.story-review { flex: 1 1 auto; min-height: 0; overflow: auto; display: grid; grid-template-columns: minmax(0, 3fr) minmax(16rem, 2fr); gap: 1rem; align-items: start; }
	.story-diff { min-width: 0; }
	.story-diff h3 { margin: 0 0 0.5rem; font-size: 1rem; }
	@media (max-width: 1000px) { .story-review { grid-template-columns: minmax(0, 1fr); } }
	/* every document the work changes, each opened on its own */
	.also-head { flex: 0 0 auto; margin: 0; }
	.also-docs { flex: 0 0 auto; list-style: none; margin: 0 0 0.3rem; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; max-height: 9.5rem; overflow-y: auto; }
	.also { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.1rem 0.6rem; padding: 0.3rem 0.6rem; border-radius: 8px; border: 1px solid rgb(0 0 0 / 0.08); }
	.also:hover { background: rgb(0 0 0 / 0.03); }
	.also.on { border-color: var(--forest, #2f5d46); background: color-mix(in srgb, var(--forest, #2f5d46) 8%, transparent); }
	.also .what { font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
	/* a document's review: what it changes, field by field ($lib/app/Changes.svelte) */
	.sandbox-review { flex: 1 1 auto; min-height: 0; overflow: auto; }
	.refused { flex: 0 0 auto; margin: 0; padding: 0.45rem 0.7rem; border-radius: 10px; font-size: 0.85rem; line-height: 1.4; max-height: 5.6em; overflow-y: auto; overflow-wrap: anywhere; color: #9c3b22; background: color-mix(in srgb, var(--terracotta, #c8744f) 12%, var(--card, #fff)); border: 1px solid color-mix(in srgb, var(--terracotta, #c8744f) 45%, transparent); }
	.work-pane { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 0.4rem; overflow: hidden; }
	/* a wide screen: the work large on the left, what it is (its header, its note) and the decision in an aside on the
	   right, as the intent's detail and every versioned thing on play (play/SPEC.md §4.15 One aside) */
	@media (min-width: 900px) {
		.review:not(:global(.item-review)) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem); grid-template-rows: auto auto auto minmax(0, 1fr) auto auto; column-gap: 1.4rem; align-content: stretch; }
		.work-pane { grid-column: 1; grid-row: 1 / -1; }
		.review > .review-head, .review > .note, .review > .more, .review > .refused, .review > :global(.decide) { grid-column: 2; }
		.review > .review-head { grid-row: 1; }
		.review > .note { grid-row: 2; }
		.review > .more { grid-row: 3; align-self: start; }
		.review > .refused { grid-row: 5; }
		.review > :global(.decide) { grid-row: 6; }
		.review .note:not(.folded) { max-height: none; }
	}
</style>
