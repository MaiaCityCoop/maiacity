<!--
	STORIES (Samuel 2026-11-03) — Maia City's films, each one timeline (play/SPEC.md §12): pick one in the narrow list on
	the left and play it through, its storyboard frames beside the subtitles of its script, to feel whether the film
	works. Admins only. A viewer: a story changes only by proposal, over MCP (play/api/src/mcp.ts), decided on the
	intents' board; any accepted version, any edit it was made in and any open intent variant of it can be played from
	its History.
	Laid out with the player (Samuel 2026-11-04): the list on the left only as tall as the picture, the title above the
	picture, the thin rail on the right with the notes and, a tab beside them, its History ($lib/app/History.svelte: its
	versions top down, each one's edits folded under it, its open intent variants), the timeline across the whole width
	below.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import History, { type Pick } from '$lib/app/History.svelte';
	import { clock, type Story } from '$lib/stories/timeline';

	type Item = { id: string; title: string; number: number; versions: number; duration: number; shots: number; tracks: number; updated: string; cover: string | null };

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let story = $state<Story | null>(null);
	let picked = $state('');
	let version = $state<number | null>(null);
	let error = $state('');
	/** the story's versions, kept while an edit or a variant of it plays (the document's state there carries none) */
	let versions = $state<NonNullable<Story['versions']>>([]);
	/** the story as play reads it at its version, whose note and the stories linking it an edit or a variant played keeps */
	let read: Story | null = null;
	let loading = $state(false);
	/** the last story, version, edit or variant asked for: an answer to an older ask is let go */
	let wanted = 0;

	/** the story and version in the address: #papaya-v2-devlog, or #papaya-v2-devlog@1 for an older version */
	const fromHash = () => {
		const [id, v] = decodeURIComponent(location.hash.slice(1)).split('@');
		return { id: id || '', v: v ? Number(v) : null };
	};
	async function open(id: string, v: number | null = null) {
		if (id !== picked) versions = [];
		picked = id;
		version = v;
		loading = true;
		error = '';
		const want = `#${id}${v ? `@${v}` : ''}`;
		if (location.hash !== want) history.replaceState(history.state, '', want);
		const mine = ++wanted;
		atNote = '';
		try {
			const s = await api<Story>(`/stories/${encodeURIComponent(id)}${v ? `?v=${v}` : ''}`);
			if (picked === id && mine === wanted) {
				story = s;
				read = s;
				if (s.versions) versions = s.versions;
			}
		} catch (e) {
			error = (e as Error).message;
			story = null;
		}
		loading = false;
	}
	onMount(async () => {
		// admins only (Samuel 2026-11-03): anyone else is taken back to the dashboard, as from the Factories and the
		// Proposals; the API hands stories to admins alone
		if (!admin) return void goto('/', { replaceState: true });
		try {
			list = await api<Item[]>('/stories');
		} catch (e) {
			error = (e as Error).message;
		}
		const h = fromHash();
		const first = list.find((s) => s.id === h.id) ?? list[0];
		if (first) open(first.id, first.id === h.id ? h.v : null);
	});
	const onHash = () => {
		const h = fromHash();
		if (h.id && (h.id !== picked || h.v !== version)) open(h.id, h.v);
	};

	// ---- its history (the story's Loro document, play/SPEC.md §4.4; $lib/app/History.svelte): any edit or open intent
	// variant of it played as the story stood there (GET /api/docs/<uuid>?edit=|variant=: its `json`, with the `links` of
	// the stories it links, played as the story)
	/** what the edit or variant played says of itself, shown under the title while it plays */
	let atNote = $state('');
	async function onPick(p: Pick, about = '') {
		if (!picked) return;
		if (p.kind === 'version') return open(picked, p.number === versions[0]?.number ? null : p.number);
		if (p.kind === 'main') return open(picked, null);
		const id = picked;
		const mine = ++wanted;
		const q = p.kind === 'edit' ? `edit=${p.seq}` : `variant=${encodeURIComponent(p.id)}`;
		const r = await api<{ json: Story; links?: Story['links'] }>(`/docs/${id}?${q}`);
		if (picked !== id || mine !== wanted) return;
		// its timeline as it stood there, with the versions of the stories it linked then
		story = { ...(read ?? ({} as Story)), ...r.json, id, links: r.links ?? {}, versions };
		atNote = about || (p.kind === 'edit' ? 'An edit of it' : 'An intent variant of it');
	}
	/** the version the page plays, the newest where none is named */
	const shownVersion = $derived(version ?? versions[0]?.number ?? null);
</script>

<svelte:head><title>Stories · maiaCITY play</title></svelte:head>
<svelte:window onhashchange={onHash} />

{#snippet listCol()}
	<nav class="list" aria-label="Stories">
		<h1>Stories</h1>
		{#each list as s (s.id)}
			<button class="item" class:on={s.id === picked} onclick={() => open(s.id)} title={s.title}>
				{#if s.cover}<img src="/api/files/{s.cover}" alt="" />{:else}<span class="blank"></span>{/if}
				<span class="text"><b>{s.title}</b><span class="muted">{clock(s.duration)} · v{s.number}</span></span>
			</button>
		{:else}
			<p class="muted small">{error ? '' : 'No stories yet.'}</p>
		{/each}
		<p class="muted small hint">Stories change by proposal, over MCP.</p>
	</nav>
{/snippet}

{#snippet headRow()}
	{#if story}
		<header class="head">
			<h2 title={story.title}>{story.title}</h2>
			<p class="muted small meta" title={story.note}>{story.format} · {story.fps} fps · {clock(story.duration)} · {story.tracks.length} tracks{story.note ? ` · ${story.note.split('\n')[0]}` : ''}</p>
			<!-- the stories whose newest version links this one, and which version of it each plays (Samuel 2026-11-04) -->
			{#if story.linked_by?.length}
				<p class="muted small meta">Linked by {#each story.linked_by as b, i (b.id + b.version)}{i ? ', ' : ''}<a href="#{b.id}">{b.title}</a> at v{b.plays ?? '?'}{/each}</p>
			{/if}
			{#if atNote}<p class="small meta at" title={atNote}>As it stood: “{atNote}”</p>{/if}
			{#if error}<p class="error">{error}</p>{/if}
		</header>
	{/if}
{/snippet}

<!-- the rail's History tab: its versions top down, each one's edits folded under it, its open intent variants, any of
     them played as the story was then -->
{#snippet historyTab()}
	{#if picked}
		<History doc={picked} {onPick} version={shownVersion} versions={versions.map((v) => ({ number: v.number, note: v.note, at: v.created, by: v.author }))} />
	{/if}
{/snippet}

{#if admin}
	<main class="stories" class:framed={!!story}>
		{#if story}
			<!-- one player for every version and edit, so the history's bar keeps hold while it is dragged -->
			<StoryPlayer {story} list={listCol} head={headRow} history={historyTab} />
		{:else}
			{@render listCol()}
			<section class="main">
				{#if error}<p class="error">{error}</p>{:else if loading}<p class="muted">Reading it…</p>{/if}
			</section>
		{/if}
	</main>
{/if}

<style>
	.stories { display: grid; grid-template-columns: 10rem minmax(0, 1fr); gap: 0.9rem; padding: 1rem 1rem var(--nav-room, 6rem); min-height: 100vh; box-sizing: border-box; }
	.stories.framed { display: block; }
	.list { display: grid; align-content: start; gap: 0.35rem; }
	.list h1 { font-size: 1.15rem; margin: 0.2rem 0 0.5rem; }
	.item { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 1.9rem 1fr; gap: 0.5rem; align-items: center; padding: 0.35rem; border-radius: 10px; cursor: pointer; }
	.item:hover { background: color-mix(in srgb, var(--sage, #8fae8b) 14%, transparent); }
	.item.on { background: var(--paper); box-shadow: inset 0 0 0 1px var(--line); }
	.item:focus-visible { outline: 2px solid var(--ink); }
	.item img, .item .blank { width: 1.9rem; height: 3.4rem; object-fit: cover; border-radius: 5px; background: #2a251d; display: block; }
	.text { display: grid; min-width: 0; font-size: 0.8rem; line-height: 1.25; }
	.text b { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
	.small { font-size: 0.78rem; }
	.hint { margin-top: 0.6rem; }
	.main { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.8rem; align-content: start; }
	.head { min-width: 0; }
	.head h2 { margin: 0; font-size: 1.2rem; line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
	.head .meta { margin: 0.15rem 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.head .error { margin: 0.3rem 0 0; }
	.head .at { padding: 0.1rem 0.5rem; border-radius: 8px; background: var(--mustard-soft); width: fit-content; max-width: 100%; box-sizing: border-box; }
	@media (max-width: 820px) {
		.stories { grid-template-columns: 1fr; }
		.list { grid-auto-flow: column; grid-auto-columns: 10rem; overflow-x: auto; }
		.list h1, .hint { display: none; }
	}
</style>
