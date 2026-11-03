<!--
	STORIES (Samuel 2026-11-03) — Maia City's films, each one timeline (play/SPEC.md §12): pick one in the narrow list on
	the left and play it through, its storyboard frames beside the subtitles of its script, to feel whether the film
	works. Admins only. A viewer: a story changes only by proposal, over MCP (play/api/src/mcp.ts), decided on the
	Proposals page; any accepted version can be played again from the version picker.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
	import { clock, type Story } from '$lib/stories/timeline';

	type Item = { id: string; title: string; number: number; versions: number; duration: number; shots: number; tracks: number; updated: string; cover: string | null };

	const admin = $derived(session.me?.level === 'admin');
	let list = $state<Item[]>([]);
	let story = $state<Story | null>(null);
	let picked = $state('');
	let version = $state<number | null>(null);
	let error = $state('');
	let loading = $state(false);

	/** the story and version in the address: #papaya-v2-devlog, or #papaya-v2-devlog@1 for an older version */
	const fromHash = () => {
		const [id, v] = decodeURIComponent(location.hash.slice(1)).split('@');
		return { id: id || '', v: v ? Number(v) : null };
	};
	async function open(id: string, v: number | null = null) {
		picked = id;
		version = v;
		loading = true;
		error = '';
		const want = `#${id}${v ? `@${v}` : ''}`;
		if (location.hash !== want) history.replaceState(history.state, '', want);
		try {
			const s = await api<Story>(`/stories/${encodeURIComponent(id)}${v ? `?v=${v}` : ''}`);
			if (picked === id) story = s;
		} catch (e) {
			error = (e as Error).message;
			story = null;
		}
		loading = false;
	}
	onMount(async () => {
		if (!admin) return;
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
</script>

<svelte:head><title>Stories · maiaCITY play</title></svelte:head>
<svelte:window onhashchange={onHash} />

{#if !session.me || !admin}
	<main class="page"><h1>Stories</h1><p class="muted">Admins only.</p></main>
{:else}
	<main class="stories">
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
		<section class="main">
			{#if error}<p class="error">{error}</p>{/if}
			{#if story}
				<header class="head">
					<div class="titles">
						<h2>{story.title}</h2>
						<p class="muted small meta" title={story.note}>{story.format} · {story.fps} fps · {clock(story.duration)} · {story.tracks.length} tracks{story.note ? ` · ${story.note.split('\n')[0]}` : ''}</p>
					</div>
					{#if (story.versions?.length ?? 0) > 0}
						<label class="versions">
							<span class="muted small">Version</span>
							<select value={String(story.number ?? '')} onchange={(e) => open(story!.id, Number((e.currentTarget as HTMLSelectElement).value) === story!.versions![0].number ? null : Number((e.currentTarget as HTMLSelectElement).value))}>
								{#each story.versions ?? [] as v, i (v.id)}
									<option value={String(v.number)}>v{v.number}{i === 0 ? ' (head)' : ''}</option>
								{/each}
							</select>
						</label>
					{/if}
				</header>
				{#key story.version}
					<StoryPlayer {story} />
				{/key}
			{:else if loading}
				<p class="muted">Reading it…</p>
			{/if}
		</section>
	</main>
{/if}

<style>
	.stories { display: grid; grid-template-columns: 11.5rem minmax(0, 1fr); gap: 1.2rem; padding: 1rem 1rem var(--nav-room, 6rem); min-height: 100vh; box-sizing: border-box; }
	.list { display: grid; align-content: start; gap: 0.35rem; position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow: auto; }
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
	.head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
	.titles { min-width: 0; }
	.head h2 { margin: 0; font-size: 1.35rem; }
	.head .meta { margin: 0.15rem 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.versions { display: flex; align-items: center; gap: 0.4rem; flex: 0 0 auto; }
	.versions select { font: inherit; padding: 0.35rem 0.5rem; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); }
	@media (max-width: 760px) {
		.stories { grid-template-columns: 1fr; }
		.list { position: static; max-height: none; grid-auto-flow: column; grid-auto-columns: 10rem; overflow-x: auto; }
		.list h1, .hint { display: none; }
	}
</style>
