<!--
	PROPOSALS, AS A BOARD (Samuel 2026-11-03) — every proposed version of Maia City's assets as a card in its column
	(Open, Accepted, Archived), newest first. A card opened is reviewed nearly full screen: the version
	built in the asset box as large as the screen allows, what it says of itself folded to two lines, its source (beside
	its base's, as the lines that changed) a button away. Admins decide here; nothing is proposed or edited here:
	versions come over MCP only (play/api/src/mcp.ts).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api, may } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';
	import { admitProposed, source as catalogSource } from '$lib/content/assets/catalog.js';
	import { changesOnly, lineDiff } from '$lib/diff';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import StoryChanges, { type StoryDiff } from '$lib/stories/StoryChanges.svelte';
	import type { Story } from '$lib/stories/timeline';

	const viewer = import('$lib/content/assets/VaultAsset.svelte');

	// admins only for now (Samuel 2026-11-02): anyone else is taken back to the dashboard
	const admin = $derived(session.me?.level === 'admin');
	onMount(() => {
		if (!admin) goto('/', { replaceState: true });
	});

	type P = { id: string; kind?: 'asset_version' | 'story_version' | 'sandbox_change' | 'factory_version' | 'game_config_version'; asset_id: string | null; label: string; grp: string; slug: string | null; version_label: string | null; number: number | null; changes?: number; status: string; note: string; author: string | null; decided_by: string | null; created: string; decided_at?: string | null; via?: 'web' | 'mcp' };
	const COLUMNS = [
		['open', 'Open'],
		['accepted', 'Accepted'],
		['archived', 'Archived']
	] as const;
	let list = $state<P[]>([]);
	let loaded = $state(false);
	let error = $state('');
	const load = async () => {
		try {
			list = await api<P[]>('/proposals');
			error = '';
		} catch (e) {
			error = (e as Error).message;
		}
		loaded = true;
	};
	onMount(() => {
		if (admin) load();
	});
	const inColumn = (s: string) => list.filter((p) => p.status === s);
	async function act(id: string, verdict: string) {
		try {
			// accepting may still archive it (its head moved and the two changes touch the same field): say why
			const r = await api<{ status: string; message?: string }>(`/proposals/${id}/${verdict}`, { method: 'POST' });
			error = r?.message ?? '';
			await load();
		} catch (e) {
			error = (e as Error).message;
		}
	}
	const deciding = $derived(may(session.me, 'decide', 'asset_version'));
	const when = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	/** a note's first line, for its card */
	const gist = (s: string) => (s ?? '').split('\n')[0];

	// reviewing one: the version built in the asset box (the sandboxed frame every recipe runs in), large; its note
	// folded; its readable source beside its base's, as the lines that changed, a button away. Code is only text here.
	type Build = { hash: string; variant: string | null; label: string; first: boolean };
	type Review = { id: string; source: string | null; recipe: string | null; baseVersion: { number: number; source: string | null } | null; builds: Build[]; steps?: Step[] };
	let open = $state<P | null>(null);
	let review = $state<Review | null>(null);
	let code = $state('');
	let baseCode = $state<string | null>(null);
	let shown = $state('');
	let changes = $state(true);
	let showSource = $state(false);
	let noteOpen = $state(false);
	let reviewError = $state('');
	const text = async (hash: string) => {
		const r = await fetch(`/api/files/${hash}`, { credentials: 'same-origin' });
		if (!r.ok) throw new Error(`The file could not be read (HTTP ${r.status}).`);
		return r.text();
	};
	// a story's proposal (play/api/src/stories.ts): its timeline played in the Stories player, beside what changed
	/** each step the proposal was made in (its branch of the story's Loro document, play/SPEC.md §4.4) */
	type Step = { seq: number; message: string; author: string | null; via: string; at: string };
	type StoryReview = { story: Story; baseStory: (Story & { number: number }) | null; diff: StoryDiff; steps?: Step[] };
	let storyReview = $state<StoryReview | null>(null);
	// a sandbox's change (play/api/src/sandboxes.ts): what each edit changes, before and after, and the sandbox as it would be
	type PinShown = { label: string; group: string; slug: string; number: number; variant: string | null; usedVariant: string | null; params: Record<string, string> | null } | null;
	type SandboxChange =
		| { kind: 'pin'; slot: string; before: PinShown; after: PinShown }
		| { kind: 'config'; config: string; path: (string | number)[]; before: unknown; after: unknown };
	type SandboxReview = { sandbox: { id: string; title: string; route: string }; changes: SandboxChange[]; holds: boolean; why: string | null; moved: boolean };
	let sandboxReview = $state<SandboxReview | null>(null);
	// a factory's: what changed, field by field (its document's paths, list items named by their ids), and its steps
	type FactoryReview = { factory: { id: string; label: string }; baseNumber: number | null; moved: boolean; changes: { path: string; kind: 'added' | 'removed' | 'changed'; from?: unknown; to?: unknown }[]; steps: { seq: number; message: string; author: string | null; via: string; at: string }[] };
	let factoryReview = $state<FactoryReview | null>(null);
	// a game config's: the same, field by field (the Game editor, routes/game-editor)
	type ConfigReview = Omit<FactoryReview, 'factory'> & { config: { id: string; label: string } };
	let configReview = $state<ConfigReview | null>(null);
	/** a document path as people read it: $.line.stations[id=weld].servers → line › stations › weld › servers */
	const pathText = (path: string) => path.replace(/^\$\.?/, '').replace(/\[id=([^\]]+)\]/g, '.$1').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
	const pinText = (x: PinShown) =>
		x ? `${x.label} v${x.number}${x.usedVariant ? ` · ${x.usedVariant}${x.variant ? '' : ' (default)'}` : ''}${x.params ? ` · ${Object.entries(x.params).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}` : 'none';
	const valueText = (v: unknown) => (v === undefined ? '(none)' : JSON.stringify(v, null, 1));
	/** a title for a card: an asset's or story's version, or a sandbox's change */
	const titleOf = (p: P) => (p.kind === 'sandbox_change' ? `${p.changes ?? 0} change${p.changes === 1 ? '' : 's'}` : `v${p.number}`);
	async function openCard(p: P) {
		open = p;
		review = null;
		storyReview = null;
		sandboxReview = null;
		factoryReview = null;
		configReview = null;
		code = '';
		baseCode = null;
		shown = '';
		showSource = false;
		noteOpen = false;
		reviewError = '';
		if (p.kind === 'story_version') {
			try {
				const r = await api<StoryReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) storyReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		if (p.kind === 'sandbox_change') {
			try {
				const r = await api<SandboxReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) sandboxReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		if (p.kind === 'factory_version') {
			try {
				const r = await api<FactoryReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) factoryReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		if (p.kind === 'game_config_version') {
			try {
				const r = await api<ConfigReview>(`/proposals/${p.id}`);
				if (open?.id === p.id) configReview = r;
			} catch (e) {
				reviewError = (e as Error).message;
			}
			return;
		}
		try {
			const r = await api<Review & { builds: any[] }>(`/proposals/${p.id}`);
			if (open?.id !== p.id) return;
			await admitProposed(r.builds);
			review = r;
			shown = (r.builds.find((b) => b.first) ?? r.builds[0])?.hash ?? '';
			code = r.source ? await text(r.source) : r.recipe ? await text(r.recipe) : '';
			baseCode = r.baseVersion?.source ? await text(r.baseVersion.source) : null;
		} catch (e) {
			reviewError = (e as Error).message;
		}
	}
	const close = () => (open = null);
	const diff = $derived(baseCode !== null && code ? changesOnly(lineDiff(baseCode, code)) : null);
	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && open) close();
	};
</script>

<svelte:head><title>Proposals · maiaCITY play</title></svelte:head>
<svelte:window onkeydown={onKey} />

{#if admin}
	<main class="board-page">
		<header class="head">
			<h1>Proposals</h1>
			<p class="muted">New versions of Maia City's assets and stories, and changes of its sandboxes, proposed by agents over MCP. Open one to see it and decide.</p>
		</header>
		{#if error}<p class="error">{error}</p>{/if}
		<div class="board">
			{#each COLUMNS as [s, name] (s)}
				{@const cards = inColumn(s)}
				<section class="column" data-status={s}>
					<h2>{name} <span class="count">{cards.length}</span></h2>
					{#each cards as p (p.id)}
						<article class="card">
							<button class="open" onclick={() => openCard(p)}>
								<span class="title">{p.label} <span class="muted">{titleOf(p)}</span></span>
								<span class="meta">{p.grp}{#if p.via === 'mcp'} <span class="via">MCP</span>{/if}</span>
								{#if p.note}<span class="gist">{gist(p.note)}</span>{/if}
								<span class="meta">{p.author ?? 'someone'} · {when(p.created)}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}</span>
							</button>
							{#if p.status === 'open' && (deciding || p.author === session.me?.name)}
								<div class="actions">
									{#if deciding}<button class="btn small" onclick={() => act(p.id, 'accept')}>Accept</button>{/if}
									<button class="btn small ghost" onclick={() => act(p.id, 'archive')}>Archive</button>
								</div>
							{/if}
						</article>
					{:else}
						<p class="empty muted">{loaded ? 'None' : '…'}</p>
					{/each}
				</section>
			{/each}
		</div>
	</main>

	{#if open}
		{@const p = open}
		<div class="review" role="dialog" aria-modal="true" aria-label="{p.label} {titleOf(p)}">
			<header class="review-head">
				<div class="who">
					<h2>{p.label} <span class="muted">{titleOf(p)}</span> <span class="pill">{p.status}</span></h2>
					<p class="meta">{p.grp} · by {p.author ?? 'someone'}{#if p.via === 'mcp'} <span class="via" title="Proposed by an agent working for them over MCP">via MCP</span>{/if} · {when(p.created)}{p.decided_by ? ` · ${p.status} by ${p.decided_by}` : ''}</p>
				</div>
				<div class="actions">
					{#if p.status === 'open' && deciding}<button class="btn small" onclick={() => (act(p.id, 'accept'), close())}>Accept</button>{/if}
					{#if p.status === 'open' && (deciding || p.author === session.me?.name)}<button class="btn small ghost" onclick={() => (act(p.id, 'archive'), close())}>Archive</button>{/if}
					{#if review}<button class="btn small ghost" class:on={showSource} onclick={() => (showSource = !showSource)}>{showSource ? 'Hide source' : review.source ? 'Source' : 'Recipe file'}</button>{/if}
					<button class="btn small ghost" onclick={close} aria-label="Close">Close</button>
				</div>
			</header>
			{#if p.note}
				<div class="note" class:folded={!noteOpen}>
					<p>{p.note}</p>
				</div>
				<button class="more" onclick={() => (noteOpen = !noteOpen)}>{noteOpen ? 'Less' : 'More'}</button>
			{/if}
			{#if p.kind === 'sandbox_change'}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !sandboxReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = sandboxReview}
						{#if p.status === 'open'}
							{#if !r.holds}<p class="error">It no longer holds on {r.sandbox.title} as it is now: {r.why} Accepting it archives it.</p>
							{:else}
								<p>
									<a class="btn small" href="{r.sandbox.route}?layout={encodeURIComponent(`${r.sandbox.id}/${p.id}`)}" target="_blank" rel="noopener">Open {r.sandbox.title} as it would be</a>
									{#if r.moved}<span class="muted small"> {r.sandbox.title} changed since it was proposed: shown as accepting would apply it now.</span>{/if}
								</p>
							{/if}
						{/if}
						<h3>{p.status === 'accepted' ? 'What it changed' : 'What it changes'}</h3>
						<ol class="changes">
							{#each r.changes as c, i (i)}
								<li>
									{#if c.kind === 'pin'}
										<span class="where">{c.slot}</span>
										<span class="was">{pinText(c.before)}</span> → <span class="now">{pinText(c.after)}</span>
									{:else}
										<span class="where">{c.config}{#each c.path as k}<span class="muted"> › </span>{k}{/each}</span>
										<div class="vals"><pre class="was">{valueText(c.before)}</pre><pre class="now">{valueText(c.after)}</pre></div>
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			{:else if p.kind === 'factory_version'}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !factoryReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = factoryReview}
						<p>
							<a class="btn small" href="/factories/?factory={encodeURIComponent(r.factory.id)}&proposal={encodeURIComponent(p.id)}" target="_blank" rel="noopener">Open {r.factory.label} as it would be</a>
							{#if r.moved}<span class="muted small"> It was made on v{r.baseNumber}; the factory has a newer version since. Accepting merges it where the two touch different fields, and archives it where they touch the same.</span>{/if}
						</p>
						<h3>{p.status === 'accepted' ? 'What it changed' : 'What it changes'}{r.baseNumber ? ` from v${r.baseNumber}` : ''}</h3>
						<ol class="changes">
							{#each r.changes as c, i (i)}
								<li>
									<span class="where">{#each pathText(c.path) as k, j}{#if j}<span class="muted"> › </span>{/if}{k}{/each}</span>
									<div class="vals"><pre class="was">{c.kind === 'added' ? '(none)' : valueText(c.from)}</pre><pre class="now">{c.kind === 'removed' ? '(none)' : valueText(c.to)}</pre></div>
								</li>
							{/each}
						</ol>
						{#if r.steps.length > 1}
							<h3 class="steps-head">Made in {r.steps.length} steps</h3>
							<ol class="steps">
								{#each r.steps as s (s.seq)}
									<li>
										<span class="msg">{s.message}</span>
										<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
									</li>
								{/each}
							</ol>
						{/if}
					{/if}
				</div>
			{:else if p.kind === 'game_config_version'}
				<div class="sandbox-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !configReview}<p class="muted">Reading it…</p>
					{:else}
						{@const r = configReview}
						<p>
							<a class="btn small" href="/game-editor/?config={encodeURIComponent(r.config.id)}&proposal={encodeURIComponent(p.id)}" target="_blank" rel="noopener">Open {r.config.label} as it would be</a>
							{#if r.moved}<span class="muted small"> It was made on v{r.baseNumber}; the config has a newer version since. Accepting merges it where the two touch different fields, and archives it where they touch the same.</span>{/if}
						</p>
						<h3>{p.status === 'accepted' ? 'What it changed' : 'What it changes'}{r.baseNumber ? ` from v${r.baseNumber}` : ''}</h3>
						<ol class="changes">
							{#each r.changes as c, i (i)}
								<li>
									<span class="where">{#each pathText(c.path) as k, j}{#if j}<span class="muted"> › </span>{/if}{k}{/each}</span>
									<div class="vals"><pre class="was">{c.kind === 'added' ? '(none)' : valueText(c.from)}</pre><pre class="now">{c.kind === 'removed' ? '(none)' : valueText(c.to)}</pre></div>
								</li>
							{/each}
						</ol>
						{#if r.steps.length > 1}
							<h3 class="steps-head">Made in {r.steps.length} steps</h3>
							<ol class="steps">
								{#each r.steps as s (s.seq)}
									<li>
										<span class="msg">{s.message}</span>
										<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
									</li>
								{/each}
							</ol>
						{/if}
					{/if}
				</div>
			{:else if p.kind === 'story_version'}
				<div class="story-review">
					{#if reviewError}<p class="error">{reviewError}</p>
					{:else if !storyReview}<p class="muted">Reading it…</p>
					{:else}
						<div class="story-play"><StoryPlayer story={storyReview.story} compact /></div>
						<div class="story-diff">
							<h3>{storyReview.baseStory ? `Changes from v${storyReview.baseStory.number}` : 'A new story'}</h3>
							<StoryChanges diff={storyReview.diff} fresh={!storyReview.baseStory} />
							{#if (storyReview.steps?.length ?? 0) > 1}
								<h3 class="steps-head">Made in {storyReview.steps!.length} steps</h3>
								<ol class="steps">
									{#each storyReview.steps! as s (s.seq)}
										<li>
											<span class="msg">{s.message}</span>
											<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
										</li>
									{/each}
								</ol>
							{/if}
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
									{#await viewer then { default: VaultAsset }}
										<VaultAsset source={catalogSource} hash={shown} title="{p.label} v{p.number} (proposed)" fill />
									{/await}
								{/key}
							</div>
						{/if}
						<p class="muted small">Built in the asset box: a sandboxed frame with no origin, running the frozen engine in a worker, with no network, no storage and no access to this page.</p>
						{#if (review.steps?.length ?? 0) > 1}
							<!-- the steps it was made in: its branch of the asset's Loro document (play/SPEC.md §4.4) -->
							<h3 class="steps-head">Made in {review.steps!.length} steps</h3>
							<ol class="steps">
								{#each review.steps! as s (s.seq)}
									<li>
										<span class="msg">{s.message}</span>
										<span class="muted small">{s.author ?? 'play'}{s.via === 'mcp' ? ' · MCP' : ''} · {new Date(s.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
									</li>
								{/each}
							</ol>
						{/if}
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
	{/if}
{/if}

<style>
	.board-page { padding: 1.5rem 1rem 6rem; max-width: none; }
	.head h1 { margin: 0; }
	.head p { margin: 0.3rem 0 1.2rem; }
	/* the board: a column per status, side by side, the board scrolling sideways on a narrow screen */
	.board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(16rem, 1fr); gap: 0.8rem; overflow-x: auto; align-items: start; padding-bottom: 0.5rem; }
	.column { background: color-mix(in srgb, var(--paper, #f6f1e6) 70%, transparent); border-radius: 14px; padding: 0.7rem; display: grid; gap: 0.55rem; min-width: 0; }
	.column h2 { margin: 0 0.2rem 0.2rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem; }
	.count { font-size: 0.75rem; font-weight: 600; padding: 0 0.5em; border-radius: 999px; background: var(--card, #fff); }
	.card { padding: 0; overflow: hidden; }
	.open { all: unset; box-sizing: border-box; cursor: pointer; display: grid; gap: 0.2rem; padding: 0.7rem 0.8rem; width: 100%; }
	.open:hover { background: color-mix(in srgb, var(--sage, #8fae8b) 10%, transparent); }
	.open:focus-visible { outline: 2px solid var(--ink, #222); outline-offset: -2px; }
	.title { font-weight: 600; font-size: 1rem; }
	.meta { font-size: 0.78rem; color: var(--muted, #777); }
	.gist { font-size: 0.85rem; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.card .actions { display: flex; gap: 0.35rem; padding: 0 0.8rem 0.7rem; flex-wrap: wrap; }
	.empty { margin: 0.2rem; font-size: 0.85rem; }
	.via { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; }
	/* reviewing one: nearly the whole screen, the build as large as it can be */
	.review { position: fixed; inset: 0.6rem; z-index: 60; background: var(--bg, #fbf8f2); border-radius: 16px; box-shadow: 0 20px 60px rgb(0 0 0 / 0.25); display: flex; flex-direction: column; padding: 0.8rem 1rem 0.6rem; gap: 0.4rem; overflow: hidden; }
	.review-head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
	.review-head h2 { margin: 0; font-size: 1.3rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
	.review-head .meta { margin: 0.15rem 0 0; }
	.review-head .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
	.btn.on { background: var(--ink, #222); color: var(--bg, #fff); }
	.note { flex: 0 0 auto; }
	.note p { margin: 0; font-size: 0.88rem; white-space: pre-line; }
	.note.folded p { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.note:not(.folded) { max-height: 30vh; overflow: auto; }
	.more { all: unset; flex: 0 0 auto; cursor: pointer; font-size: 0.8rem; font-weight: 600; text-decoration: underline; width: fit-content; }
	.review-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.8rem; }
	.review-body.split { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
	@media (max-width: 900px) { .review-body.split { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 3fr) minmax(0, 2fr); } }
	.built { min-height: 0; display: flex; flex-direction: column; gap: 0.3rem; }
	.stage { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
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
	.story-diff .steps-head { margin-top: 1rem; }
	.steps { margin: 0; padding-left: 1.3rem; display: grid; gap: 0.35rem; font-size: 0.85rem; }
	.steps li { display: grid; gap: 0.05rem; }
	.steps .small { font-size: 0.74rem; }
	@media (max-width: 1000px) { .story-review { grid-template-columns: minmax(0, 1fr); } }
	/* a sandbox's change: each edit, before and after */
	.sandbox-review { flex: 1 1 auto; min-height: 0; overflow: auto; }
	.sandbox-review h3 { margin: 0.4rem 0 0.5rem; font-size: 1rem; }
	.changes { margin: 0; padding-left: 1.4rem; display: grid; gap: 0.55rem; font-size: 0.88rem; }
	.changes .where { font-weight: 600; margin-right: 0.5rem; }
	.changes .was { color: var(--muted, #777); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--terracotta, #c96f53) 70%, transparent); }
	.changes .now { font-weight: 600; }
	.vals { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.4rem; margin-top: 0.25rem; }
	.vals pre { margin: 0; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--paper, #f6f1e6); font-size: 0.76rem; white-space: pre-wrap; max-height: 14rem; overflow: auto; }
	.vals pre.was { text-decoration: none; background: color-mix(in srgb, var(--terracotta, #c96f53) 14%, transparent); }
	.vals pre.now { font-weight: 400; background: color-mix(in srgb, var(--sage, #8fae8b) 22%, transparent); }
</style>
