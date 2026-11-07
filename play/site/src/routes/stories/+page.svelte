<!--
	STORIES (Samuel 2026-11-03) — Maia City's films, each one timeline (play/SPEC.md §12): pick one in the narrow list on
	the left and play it through, its storyboard frames beside the subtitles of its script, to feel whether the film
	works. Admins only. A viewer: a story changes only by proposal, over MCP (play/api/src/mcp.ts), decided on the
	intents' board; any accepted version, or any edit of its history, can be played again from its History tab.
	Laid out with the player (Samuel 2026-11-04): the list on the left only as tall as the picture, the title above the
	picture, the History tab ($lib/app/History.svelte, the one History of every view: its versions top down, each one's
	edits folded under it, the scrubber over every edit) at the top of the rail on the right with the notes, the
	timeline across the whole width below.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import History, { type ChainVersion, type Pick } from '$lib/app/History.svelte';
	import { clock, type Story } from '$lib/stories/timeline';

	type Item = { id: string; title: string; number: number; versions: number; duration: number; shots: number; tracks: number; updated: string; cover: string | null };

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let story = $state<Story | null>(null);
	let picked = $state('');
	let version = $state<number | null>(null);
	let error = $state('');
	/** the story's versions, kept while a step of its history plays (a step's story carries none) */
	let versions = $state<NonNullable<Story['versions']>>([]);
	let loading = $state(false);

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
		try {
			const s = await api<Story>(`/stories/${encodeURIComponent(id)}${v ? `?v=${v}` : ''}`);
			if (picked === id) {
				story = s;
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

	// ---- its History (the story's Loro document, play/SPEC.md "Version control"): a version picked is played; an edit
	// picked, the story as it was then (GET /api/stories/<id>?edit=, its links resolved)
	let atEdit = $state<number | null>(null);
	let wanted = 0;
	const chainOf = (vs: NonNullable<Story['versions']>): ChainVersion[] => vs.map((v) => ({ number: v.number, note: v.note, at: v.created, by: v.author, acceptedBy: v.approved_by }));
	async function picked_(p: Pick | null) {
		const ask = ++wanted;
		if (!p) return void ((atEdit = null), open(picked, version));
		if ('version' in p) return void ((atEdit = null), open(picked, p.version === versions[0]?.number ? null : p.version));
		const r = await api<Story>(`/stories/${encodeURIComponent(picked)}?edit=${p.edit.seq}`);
		if (ask !== wanted) return;
		story = r;
		atEdit = p.edit.seq;
	}
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
			{#if error}<p class="error">{error}</p>{/if}
		</header>
	{/if}
{/snippet}

<!-- the rail's top: its History tab, the one History of every view -->
{#snippet sideTop()}
	{#if story}
		<div class="tabs" role="tablist"><button role="tab" aria-selected="true" class="on">History</button></div>
		<History doc={story.id} shown={version ?? versions[0]?.number ?? null} label="the story" versions={chainOf(versions)} onPick={picked_} />
	{/if}
{/snippet}

{#if admin}
	<main class="stories" class:framed={!!story}>
		{#if story}
			<!-- one player for every version and step, so the history bar keeps hold while it is dragged -->
			<StoryPlayer {story} list={listCol} head={headRow} side={sideTop} />
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
	/* the rail's tab: History */
	.tabs { display: flex; gap: 4px; margin: 0 0 0.6rem; }
	.tabs button { font: inherit; font-size: 0.82rem; padding: 0.35rem 0.8rem; border-radius: 999px; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); }
	@media (max-width: 820px) {
		.stories { grid-template-columns: 1fr; }
		.list { grid-auto-flow: column; grid-auto-columns: 10rem; overflow-x: auto; }
		.list h1, .hint { display: none; }
	}
</style>
