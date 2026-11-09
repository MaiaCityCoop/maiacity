<!--
	The Artifacts (Samuel 2026-11-06, first called Sources; play/SPEC.md §4.13, play/api/src/artifacts.ts): every link from
	the net Maia City keeps, all of them artifacts, kept over MCP by avenMAIA, the one identity of every agent connected there, for the admin whose token it came
	by. Laid out as the Library is (its Frame): down the left a search and the filters (who brought it, its kind, its
	tags, its authors); in the middle the artifacts, newest first, each its title, kind, date, authors, tags,
	its link (a new tab) and "Added by <the operator>" or "Sourced by avenMAIA". An artifact opens in the middle to be read
	(?artifact=<uuid>): its summary, a small report on its topic, as Markdown, and its authors; an author opens to their
	artifacts (?author=<uuid>). Read only: nothing here adds or changes one. Maia City's admins alone (the API says so too).
	An artifact is a document like any other (play/SPEC.md "Version control"): every change of it waits at Proposal as an
	intent's work, marked on its card until it is decided; the opened artifact has the one aside every document has
	($lib/app/Aside.svelte: Info and History), and opens as an intent would make it (?intent=<uuid>, from the intents' board).
-->
<script lang="ts">
	import { calendarDay, day as when } from '$lib/format';
	import { onMount } from 'svelte';
	import Frame from '$lib/app/Frame.svelte';
	import Icon from '$lib/app/Icon.svelte';
	import Aside, { type Pick } from '$lib/app/Aside.svelte';
	import { api, fileUrl } from '$lib/api';
	import { adminsOnly } from '$lib/admins.svelte';
	import { isAdmin } from '$lib/session.svelte';
	import { markdown } from '$lib/site/markdown/index.js';

	const PAGE = 50;
	type Origin = 'human' | 'agent';
	type AuthorRef = { id: string; name: string; kind: 'person' | 'organization'; url: string | null };
	type Artifact = {
		id: string; url: string; title: string; description: string; summary?: string; kind: string; tags: string[]; published: string | null;
		origin: Origin; by: string; authors: AuthorRef[]; created: string; text_hash?: string | null; updated_by?: string | null; updated_at?: string | null;
		/** an intent whose change of it waits, not yet decided */
		intent?: string | null;
	};
	/** an artifact's document, as /api/docs gives it: at a version, an edit, or as an intent would make it */
	type Doc = { id: string; number: number; version?: number; json: Record<string, any>; intent?: { id: string; stage: string } };
	type Counts = { all: number; origin: Record<Origin, number>; kind: Record<string, number> };
	type Page = { total: number; offset: number; limit: number; artifacts: Artifact[]; tags: { tag: string; count: number }[]; counts: Counts };
	type Author = { id: string; name: string; kind: 'person' | 'organization'; url: string | null; note: string | null; artifacts: number };
	type AuthorWhole = Omit<Author, 'artifacts'> & { created: string; artifacts: Artifact[] };

	const KINDS: Record<string, string> = { page: 'Web pages', article: 'Articles', paper: 'Papers', video: 'Videos', post: 'Posts', book: 'Books', podcast: 'Podcasts', code: 'Code', other: 'Other' };
	const ONE: Record<string, string> = { page: 'Web page', article: 'Article', paper: 'Paper', video: 'Video', post: 'Post', book: 'Book', podcast: 'Podcast', code: 'Code', other: 'Artifact' };
	const ORIGINS: { id: Origin; label: string }[] = [
		{ id: 'human', label: 'Added by people' },
		{ id: 'agent', label: 'Sourced by avenMAIA' }
	];

	// what the page shows, as its address says: the filters, and an artifact or an author opened
	let query = $state('');
	let kind = $state('');
	let tag = $state('');
	let origin = $state<'' | Origin>('');
	let authorId = $state('');
	let artifactId = $state('');
	let intentId = $state('');
	/** the opened artifact as its History picks it (a version, an edit) or as an intent would make it: its fields over the kept ones */
	let asOf = $state<Doc | null>(null);
	let shownV = $state<number | null>(null);

	let artifacts = $state<Artifact[]>([]);
	let total = $state(0);
	let tags = $state<Page['tags']>([]);
	let counts = $state<Counts | null>(null);
	let authors = $state<Author[]>([]);
	let opened = $state<Artifact | null>(null);
	let author = $state<AuthorWhole | null>(null);
	let loaded = $state(false);
	let busy = $state(false);
	let error = $state('');
	let side = $state<'' | 'nav' | 'aside'>('');
	adminsOnly();
	const admin = $derived(isAdmin());

	const host = (u: string) => {
		try {
			return new URL(u).host.replace(/^www\./, '');
		} catch {
			return u;
		}
	};
	const date = (d: string | null) => (d ? calendarDay(d) : '');
	const names = (a: AuthorRef[]) => a.map((x) => x.name).join(', ');

	/** the page's address from what it shows: an artifact or an author opened, and the filters */
	function address() {
		const q = new URLSearchParams();
		if (artifactId) q.set('artifact', artifactId);
		if (artifactId && intentId) q.set('intent', intentId);
		if (authorId) q.set('author', authorId);
		if (query.trim()) q.set('q', query.trim());
		if (kind) q.set('kind', kind);
		if (tag) q.set('tag', tag);
		if (origin) q.set('origin', origin);
		const s = q.toString();
		return `${location.pathname}${s ? `?${s}` : ''}`;
	}
	function fromAddress() {
		const q = new URLSearchParams(location.search);
		artifactId = q.get('artifact') ?? '';
		intentId = q.get('intent') ?? '';
		authorId = q.get('author') ?? '';
		query = q.get('q') ?? '';
		kind = q.get('kind') ?? '';
		tag = q.get('tag') ?? '';
		const o = q.get('origin');
		origin = o === 'human' || o === 'agent' ? o : '';
	}

	/** a page of artifacts as the filters say: the first (again) or the next */
	async function load(more = false) {
		busy = true;
		error = '';
		try {
			const q = new URLSearchParams({ offset: String(more ? artifacts.length : 0), limit: String(PAGE) });
			if (query.trim()) q.set('q', query.trim());
			if (kind) q.set('kind', kind);
			if (tag) q.set('tag', tag);
			if (origin) q.set('origin', origin);
			if (authorId) q.set('author', authorId);
			const page = await api<Page>(`/artifacts?${q}`);
			artifacts = more ? [...artifacts, ...page.artifacts] : page.artifacts;
			total = page.total;
			tags = page.tags;
			counts = page.counts;
		} catch (e) {
			error = (e as Error).message;
		}
		busy = false;
	}
	async function loadAuthors() {
		try {
			authors = (await api<Author[]>('/authors')).sort((a, b) => b.artifacts - a.artifacts || a.name.localeCompare(b.name));
		} catch {
			authors = [];
		}
	}
	/** what the address names: the artifact opened, the author opened, and the list under the filters */
	async function show() {
		error = '';
		opened = null;
		author = null;
		asOf = null;
		shownV = null;
		try {
			if (artifactId && intentId) asOf = await api<Doc>(`/docs/${encodeURIComponent(artifactId)}?intent=${encodeURIComponent(intentId)}`);
			if (artifactId) opened = await api<Artifact>(`/artifacts/${encodeURIComponent(artifactId)}`).catch((e) => (asOf ? null : Promise.reject(e)));
			if (artifactId && !opened && asOf) opened = { ...fromDoc(asOf), id: artifactId, by: 'Not kept yet: it waits at Proposal', authors: [], created: new Date().toISOString() };
			if (authorId) author = await api<AuthorWhole>(`/authors/${encodeURIComponent(authorId)}`);
		} catch (e) {
			error = (e as Error).message;
		}
		if (!artifactId) await load();
		loaded = true;
	}
	/** go to another view of the page: a new step in the history, so Back returns */
	function go(change: () => void, push = true) {
		change();
		history[push ? 'pushState' : 'replaceState'](history.state, '', address());
		side = '';
		void show();
		document.querySelector('.middle')?.scrollTo({ top: 0 });
	}
	const openArtifact = (id: string) => go(() => ((artifactId = id), (intentId = '')));
	/** an artifact's fields from its document */
	const fromDoc = (d: Doc) => {
		const j = d.json;
		return { url: j.url ?? '', title: j.title ?? '', description: j.description ?? '', summary: j.summary ?? '', kind: j.kind ?? 'other', tags: j.tags ?? [], published: j.published ?? null, origin: (j.origin ?? 'human') as Origin, text_hash: j.text_hash ?? null };
	};
	/** what the opened artifact shows: as kept, or as its History picks it */
	const view = $derived(opened && asOf ? { ...opened, ...fromDoc(asOf) } : opened);
	/** its History: a version or an edit picked shows it as it stood there; nothing picked, as it is kept */
	async function picked(p: Pick | null) {
		if (!opened) return;
		if (!p) return void ((asOf = intentId ? await api<Doc>(`/docs/${opened.id}?intent=${encodeURIComponent(intentId)}`) : null), (shownV = null));
		asOf = await api<Doc>(`/docs/${opened.id}?${'version' in p ? `v=${p.version}` : `edit=${p.edit.seq}`}`);
		shownV = 'version' in p ? p.version : null;
	}
	const openAuthor = (id: string) => go(() => ((authorId = id), (artifactId = '')));
	const filter = (change: () => void) => go(() => (change(), (artifactId = '')), false);
	const all = () => go(() => ((artifactId = ''), (authorId = ''), (kind = ''), (tag = ''), (origin = ''), (query = '')));

	onMount(() => {
		if (!admin) return;
		fromAddress();
		void show();
		void loadAuthors();
		const back = () => (fromAddress(), void show());
		addEventListener('popstate', back);
		return () => removeEventListener('popstate', back);
	});
	let searching: ReturnType<typeof setTimeout> | undefined;
	function search() {
		clearTimeout(searching);
		searching = setTimeout(() => filter(() => {}), 250);
	}
	const filtered = $derived(!!(query.trim() || kind || tag || origin || authorId));
</script>

<svelte:head><title>{opened ? `${opened.title} · ` : author ? `${author.name} · ` : ''}Artifacts · maiaCITY play</title></svelte:head>

{#snippet shelf()}
	<input class="nav-search" type="search" placeholder="Find in titles, summaries, links, authors" bind:value={query} oninput={search} aria-label="Find an artifact" />
	<h3 class="nav-group">Artifacts · every link we keep</h3>
	<a class="nav-item" class:on={!filtered && !artifactId} href="/artifacts/" onclick={(e) => (e.preventDefault(), all())} aria-current={!filtered && !artifactId ? 'page' : undefined}
		><Icon name="library" size={16} /><span>Everything</span><small>{(counts?.all ?? 0).toLocaleString('en-US')}</small></a
	>
	{#each ORIGINS as o (o.id)}
		<a class="nav-item" class:on={origin === o.id} href="?origin={o.id}" onclick={(e) => (e.preventDefault(), filter(() => (origin = origin === o.id ? '' : o.id)))} aria-current={origin === o.id ? 'true' : undefined}
			><Icon name={o.id === 'human' ? 'users' : 'spark'} size={16} /><span>{o.label}</span><small>{(counts?.origin[o.id] ?? 0).toLocaleString('en-US')}</small></a
		>
	{/each}
	<h3 class="nav-group">Kinds</h3>
	{#each Object.keys(KINDS).filter((k) => counts?.kind[k] || kind === k) as k (k)}
		<a class="nav-item" class:on={kind === k} href="?kind={k}" onclick={(e) => (e.preventDefault(), filter(() => (kind = kind === k ? '' : k)))} aria-current={kind === k ? 'true' : undefined}
			><Icon name={k === 'video' ? 'film' : k === 'code' ? 'code' : k === 'post' ? 'post' : k === 'paper' || k === 'book' ? 'article' : 'link'} size={16} /><span>{KINDS[k]}</span><small>{counts?.kind[k] ?? 0}</small></a
		>
	{:else}
		<p class="nav-empty soft">None yet.</p>
	{/each}
	{#if tags.length}
		<h3 class="nav-group">Tags</h3>
		<div class="tagcloud">
			{#each tags.slice(0, 40) as t (t.tag)}
				<button class="tagchip" class:on={tag === t.tag} data-pick onclick={() => filter(() => (tag = tag === t.tag ? '' : t.tag))} aria-pressed={tag === t.tag}>{t.tag} <small>{t.count}</small></button>
			{/each}
		</div>
	{/if}
	{#if authors.length}
		<h3 class="nav-group">Authors</h3>
		{#each authors.slice(0, 30) as a (a.id)}
			<a class="nav-item" class:on={authorId === a.id} href="?author={a.id}" onclick={(e) => (e.preventDefault(), openAuthor(a.id))} aria-current={authorId === a.id ? 'page' : undefined}
				><Icon name={a.kind === 'person' ? 'users' : 'vault'} size={16} /><span>{a.name}</span><small>{a.artifacts}</small></a
			>
		{/each}
		{#if authors.length > 30}<p class="nav-empty soft">…and {authors.length - 30} more: find them by name above.</p>{/if}
	{/if}
{/snippet}

{#snippet aside_()}
	<Aside doc={{ id: opened!.id, kind: 'artifact', ...(asOf ?? {}) }} where="Artifacts · {ONE[opened!.kind] ?? opened!.kind}" label={view?.title ?? opened!.title} shown={shownV} propose="Corrected over MCP (update_artifact): each change waits at Proposal." onPick={picked}>
		{#snippet info()}
			<p class="side-facts"><a href={opened!.url} target="_blank" rel="noopener noreferrer">{host(opened!.url)} ↗</a>{#if view?.authors.length} · by {names(view.authors)}{/if} · {opened!.by}</p>
		{/snippet}
	</Aside>
{/snippet}

{#snippet card(s: Artifact)}
	<article class="card">
		<p class="meta">
			<span class="kind">{ONE[s.kind] ?? s.kind}</span>
			{#if s.published}<span>{date(s.published)}</span>{/if}
			{#if s.authors.length}<span class="who">{names(s.authors)}</span>{/if}
		</p>
		<!-- the title alone, no description, so a list stays short (Samuel 2026-11-06): the description is the opened
		     artifact's, and the title's tooltip -->
		<h2><a class="stretch" href="?artifact={s.id}" title={s.description} onclick={(e) => (e.preventDefault(), openArtifact(s.id))}>{s.title}</a></h2>
		<p class="foot">
			<span class="by" class:agent={s.origin === 'agent'}>{#if s.origin === 'agent'}<Icon name="spark" size={13} />{/if}{s.by}</span>
			<a class="out" href={s.url} target="_blank" rel="noopener noreferrer" title={s.url}>{host(s.url)} ↗</a>
			{#each s.tags as t (t)}<button class="tagchip small" onclick={() => filter(() => (tag = t))}>{t}</button>{/each}
			{#if s.intent}<a class="waits" href="/intents/#{s.intent}" title="A change of it waits at Proposal">A change waits</a>{/if}
		</p>
	</article>
{/snippet}

{#if admin}
	<div class="pg">
		<Frame nav={loaded ? shelf : undefined} aside={artifactId && opened ? aside_ : undefined} bind:open={side} navLabel="Find and filter the artifacts" asideLabel="The artifact's history" navIcon="search" flush>
			{#if !loaded}
				<p class="note soft">Opening the Artifacts…</p>
			{:else if artifactId}
				<!-- one artifact, to be read -->
				<div class="scroll">
					<div class="read">
						<button class="backlink" onclick={() => history.length > 1 ? history.back() : all()}>← Artifacts</button>
						{#if error}<p class="bad">{error}</p>{/if}
						{#if view}
							<p class="eyebrow">{ONE[view.kind] ?? view.kind}{view.published ? ` · ${date(view.published)}` : ''}</p>
							{#if asOf}<p class="asif soft">{asOf.intent ? `As intent ${asOf.intent.id.slice(0, 8)} would make it (${asOf.intent.stage})` : shownV ? `Version ${shownV}` : 'As it stood at that edit'}</p>{/if}
							<h1>{view.title}</h1>
							<p class="lede">{view.description}</p>
							<div class="facts">
								<p class="authors" hidden={!view.authors.length}>
									By
									{#each view.authors as a, i (a.id)}{#if i}, {/if}<a href="?author={a.id}" onclick={(e) => (e.preventDefault(), openAuthor(a.id))}>{a.name}</a>{/each}
								</p>
								<p class="by" class:agent={view.origin === 'agent'}>{#if view.origin === 'agent'}<Icon name="spark" size={13} />{/if}{view.by} · kept {when(view.created)}{view.updated_at ? ` · corrected ${when(view.updated_at)}${view.updated_by ? ` by ${view.updated_by}` : ''}` : ''}</p>
							</div>
							<p class="actions">
								<a class="go" href={view.url} target="_blank" rel="noopener noreferrer">Open the link ↗ <small>{host(view.url)}</small></a>
								{#if view.text_hash}<a class="chip" href={fileUrl(view.text_hash)} target="_blank" rel="noopener">The page as it was kept</a>{/if}
							</p>
							{#if view.tags.length}
								<p class="tags">{#each view.tags as t (t)}<button class="tagchip" onclick={() => filter(() => (tag = t))}>{t}</button>{/each}</p>
							{/if}
							<div class="summary">{@html markdown(view.summary ?? '')}</div>
							<p class="url mono soft">{view.url}</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="sheet">
					<div class="bar">
						{#if author}
							<button class="backlink" onclick={() => filter(() => (authorId = ''))}>← All artifacts</button>
						{/if}
						<b>{author ? author.name : origin ? ORIGINS.find((o) => o.id === origin)?.label : kind ? KINDS[kind] : tag ? `#${tag}` : 'Everything'}</b>
						<span class="soft"
							>{total.toLocaleString('en-US')} {total === 1 ? 'artifact' : 'artifacts'}{query.trim() ? ` matching “${query.trim()}”` : ''}{author && (kind || tag || origin) ? ' (filtered)' : ''}{!author && tag && (kind || origin) ? ' (filtered)' : ''} · newest first</span
						>
						{#if filtered && !author}<button class="chip" onclick={all}>Clear</button>{/if}
					</div>
					{#if error}<p class="bad">{error}</p>{/if}
					<div class="list" class:busy>
						{#if author}
							<header class="authorhead">
								<p class="eyebrow">{author.kind === 'person' ? 'Author' : 'Organization'}</p>
								<h1>{author.name}</h1>
								{#if author.note}<p class="lede">{author.note}</p>{/if}
								{#if author.url}<p><a class="out" href={author.url} target="_blank" rel="noopener noreferrer">{host(author.url)} ↗</a></p>{/if}
							</header>
						{/if}
						{#each artifacts as s (s.id)}
							{@render card(s)}
						{:else}
							<p class="note soft">{filtered ? 'No artifact matches that.' : 'No artifact is kept yet: paste a link to your agent, and it keeps it here.'}</p>
						{/each}
						{#if artifacts.length < total}
							<div class="more"><button class="chip" disabled={busy} onclick={() => load(true)}>{busy ? 'Loading…' : `Show more (${total - artifacts.length} left)`}</button></div>
						{/if}
					</div>
				</div>
			{/if}
		</Frame>
	</div>
{/if}

<style>
	.side-facts { margin: 0.5rem 0 0; font-size: 0.78rem; overflow-wrap: anywhere; }
	.waits {
		font-size: 0.75rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		background: rgb(196 140 40 / 0.16);
		color: inherit;
		text-decoration: none;
	}
	.pg {
		position: fixed;
		inset: 0;
		background: var(--cream);
		--soft: rgb(38 56 44 / 0.6);
	}
	.pg :global(.soft) { color: var(--soft); }
	.pg :global(.chip) { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.6rem; border: 0; border-radius: 999px; background: rgb(0 0 0 / 0.06); font: inherit; font-size: 0.74rem; font-weight: 500; color: inherit; text-decoration: none; cursor: pointer; }
	.pg :global(.chip:disabled) { opacity: 0.45; cursor: default; }
	.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
	.note { margin: 1rem clamp(1rem, 3vw, 2.4rem); }
	.bad { margin: 0.5rem 1rem; color: var(--terracotta); font-size: 0.85rem; }
	.nav-empty { margin: 0.2rem 0.6rem 0.4rem; font-size: 0.78rem; }

	/* the tags: small round chips */
	.tagcloud { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0 0.4rem 0.4rem; }
	.tagchip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.12rem 0.55rem; border: 1px solid var(--line); border-radius: 999px; background: var(--paper, #fff); font: inherit; font-size: 0.74rem; color: inherit; cursor: pointer; }
	.tagchip small { color: var(--soft); font-size: 0.68rem; }
	.tagchip.on { border-color: var(--brand-green, #24452f); background: var(--brand-green, #24452f); color: #fff; }
	.tagchip.on small { color: rgb(255 255 255 / 0.75); }
	.tagchip.small { padding: 0.05rem 0.45rem; font-size: 0.7rem; }

	/* the list */
	.sheet { display: flex; flex-direction: column; height: 100%; }
	.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.9rem; padding: 0.7rem 1rem; border-bottom: 1px solid var(--line); background: rgb(255 255 255 / 0.94); font-size: 0.85rem; }
	.bar b { font-size: 1rem; }
	.list { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem clamp(0.8rem, 3vw, 1.6rem) var(--nav-room, 6rem); }
	.list.busy { opacity: 0.55; }
	.card { position: relative; max-width: 46rem; width: 100%; box-sizing: border-box; padding: 0.75rem 1rem 0.7rem; border: 1px solid var(--line); border-radius: 14px; background: var(--paper, #fff); transition: box-shadow 150ms ease, transform 150ms ease; }
	.card:hover { box-shadow: 0 6px 18px rgb(38 56 44 / 0.08); transform: translateY(-1px); }
	.meta { display: flex; flex-wrap: wrap; gap: 0.15rem 0.55rem; margin: 0; font-size: 0.72rem; color: var(--soft); }
	.meta .kind { color: var(--terracotta); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	.meta .who { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
	.card h2 { margin: 0.25rem 0 0.2rem; font-family: var(--font-display); font-size: 1.15rem; font-weight: 500; line-height: 1.25; overflow-wrap: anywhere; }
	.card h2 a { color: var(--ink); text-decoration: none; }
	/* the title's link covers the card; the link out and the tags stand above it */
	.stretch::after { content: ''; position: absolute; inset: 0; border-radius: 14px; }
	.foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.6rem; margin: 0.45rem 0 0; font-size: 0.76rem; }
	.foot > * { position: relative; z-index: 1; }
	.by { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--soft); font-weight: 500; }
	.by.agent { color: var(--brand-green, #24452f); }
	.by :global(svg) { color: var(--mustard); }
	.out { color: var(--brand-green, #24452f); font-weight: 600; text-decoration: none; overflow-wrap: anywhere; }
	.out:hover { text-decoration: underline; }
	.more { display: flex; justify-content: center; padding: 0.5rem 0 1rem; max-width: 46rem; }
	.authorhead { max-width: 46rem; margin-bottom: 0.4rem; }

	/* one artifact, to be read */
	.scroll { height: 100%; overflow: auto; }
	.read { max-width: 44rem; margin: 0 auto; padding: 1.2rem clamp(1rem, 4vw, 2rem) var(--nav-room, 6rem); box-sizing: border-box; }
	.backlink { margin: 0 0 0.9rem; padding: 0; border: 0; background: none; font: inherit; font-size: 0.85rem; font-weight: 600; color: var(--brand-green, #24452f); cursor: pointer; }
	.bar .backlink { margin: 0; }
	.eyebrow { margin: 0; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--terracotta); }
	h1 { margin: 0.3rem 0 0.5rem; font-family: var(--font-display); font-size: clamp(1.6rem, 4vw, 2.3rem); font-weight: 500; line-height: 1.15; overflow-wrap: anywhere; }
	.lede { margin: 0 0 0.9rem; font-size: 1.05rem; line-height: 1.5; color: var(--ink); opacity: 0.85; }
	.facts { display: grid; gap: 0.2rem; margin-bottom: 0.9rem; font-size: 0.85rem; }
	.facts p { margin: 0; }
	.authors a { color: var(--ink); font-weight: 600; }
	.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0 0 0.8rem; }
	.go { display: inline-flex; align-items: baseline; gap: 0.45rem; padding: 0.5rem 0.95rem; border-radius: 999px; background: var(--ink); color: var(--paper, #fff); font-size: 0.88rem; font-weight: 600; text-decoration: none; }
	.go small { font-weight: 400; opacity: 0.75; }
	.tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0 0 1rem; }
	.summary { padding-top: 0.4rem; border-top: 1px solid var(--line); font-size: 0.98rem; line-height: 1.6; overflow-wrap: anywhere; }
	.summary :global(h2) { margin: 1.4rem 0 0.4rem; font-family: var(--font-display); font-size: 1.3rem; font-weight: 500; }
	.summary :global(h3) { margin: 1rem 0 0.3rem; font-size: 1rem; }
	.summary :global(p), .summary :global(ul), .summary :global(ol) { margin: 0 0 0.7rem; }
	.summary :global(li) { margin: 0.2rem 0; }
	.summary :global(a) { color: var(--brand-green, #24452f); }
	.url { margin: 1.4rem 0 0; font-size: 0.72rem; overflow-wrap: anywhere; }
</style>
