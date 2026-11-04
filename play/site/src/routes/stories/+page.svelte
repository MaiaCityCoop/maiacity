<!--
	STORIES (Samuel 2026-11-03) — Maia City's films, each one timeline (play/SPEC.md §12): pick one in the narrow list on
	the left and play it through, its storyboard frames beside the subtitles of its script, to feel whether the film
	works. Admins only. A viewer: a story changes only by proposal, over MCP (play/api/src/mcp.ts), decided on the
	Proposals page; any accepted version can be played again from the versions down the rail.
	Laid out with the player (Samuel 2026-11-04): the list on the left only as tall as the picture, the title above the
	picture, the versions top down (the older ones folded away, each one's steps unfolded under it) in the thin rail on
	the right with the notes, the timeline across the
	whole width below.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';
	import { goto } from '$app/navigation';
	import StoryPlayer from '$lib/stories/StoryPlayer.svelte';
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

	// ---- its history, step by step (the story's Loro document, play/SPEC.md §4.4): every step kept, any of them played
	type Step = { seq: number; branch: number | null; kind: string; author: string | null; via: string; message: string; at: string; version: number | null };
	let steps = $state<Step[]>([]);
	let atStep = $state<Step | null>(null);
	let wanted = 0;
	const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	async function loadHistory(id: string) {
		steps = [];
		atStep = null;
		try {
			const h = await api<{ steps: Step[] }>(`/stories/${encodeURIComponent(id)}/history`);
			if (picked === id) steps = h.steps;
		} catch {
			/* no history to show: the player still plays */
		}
	}
	$effect(() => {
		if (picked) loadHistory(picked);
	});
	/** the story as it was at step `s` (the newest step, unpicked: its head) */
	async function pickStep(s: Step) {
		if (atStep?.seq === s.seq) return;
		const last = steps[steps.length - 1];
		if (s.seq === last?.seq && version === null) return backToHead();
		const ask = ++wanted;
		try {
			const r = await api<Story>(`/stories/${encodeURIComponent(picked)}/steps/${s.seq}`);
			if (ask !== wanted) return;
			story = r;
			atStep = s;
		} catch (e) {
			error = (e as Error).message;
		}
	}
	function backToHead() {
		wanted++;
		atStep = null;
		open(picked, null);
	}
	const stepIndex = $derived(atStep ? steps.findIndex((s) => s.seq === atStep!.seq) : -1);
	/** the versions down the rail: the newest FOLD, the older ones folded away until asked for (or one of them is shown) */
	const FOLD = 3;
	let showOld = $state(false);
	let unfolded = $state<number | null>(null);
	const shownVersions = $derived.by(() => {
		const all = versions;
		if (showOld || all.length <= FOLD) return all;
		const head = all.slice(0, FOLD);
		const cur = all.find((v) => v.number === story?.number);
		return cur && !head.includes(cur) ? [...head, cur] : head;
	});
	/** each version's steps: those after the version before it, up to the step that named it */
	const groups = $derived.by(() => {
		const out = new Map<number, Step[]>();
		let run: Step[] = [];
		for (const st of steps) {
			run.push(st);
			if (st.version) {
				out.set(st.version, run);
				run = [];
			}
		}
		return out;
	});
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
			{#if error}<p class="error">{error}</p>{/if}
		</header>
	{/if}
{/snippet}

<!-- the rail's top: the versions down the rail, newest first, the older ones folded away; each version's steps (how
     it got there) unfolded under it, any of them played as the story was then -->
{#snippet sideTop()}
	{#if story}
		<section class="vers" aria-label="The story's versions and history">
			<h4 class="vhead">Versions <span>{versions.length} · {steps.length} steps</span></h4>
			{#if atStep}
				<div class="playing">
					<span>Playing step {stepIndex + 1} of {steps.length}</span>
					<b>{atStep.message}</b>
					<small>{atStep.author ?? 'play'}{atStep.via === 'mcp' ? ' via MCP' : ''} · {when(atStep.at)}</small>
					<button onclick={backToHead}>Back to the newest version</button>
				</div>
			{/if}
			<ol class="vlist">
				{#each shownVersions as v (v.id)}
					{@const g = groups.get(v.number) ?? []}
					{@const on = !atStep && (story.number ?? null) === v.number}
					{@const newest = v.number === versions[0]?.number}
					<li class:on class:stepped={g.length > 1}>
						<button class="vrow" onclick={() => open(story!.id, newest ? null : v.number)} title={v.note || undefined}>
							<span class="vnum">v{v.number}</span>
							{#if newest}<span class="badge">newest</span>{/if}
							<span class="vwhen">{when(v.created)}{v.author ? ` · ${v.author}` : ''}</span>
							{#if v.note || g.length > 1}<span class="vnote">{v.note}</span>{/if}
						</button>
						{#if g.length > 1}
							<button class="vsteps" aria-expanded={unfolded === v.number} title="{unfolded === v.number ? 'Hide' : 'Show'} the {g.length} steps to it" onclick={() => (unfolded = unfolded === v.number ? null : v.number)}>
								{g.length} steps
							</button>
							{#if unfolded === v.number}
								<ol class="slist">
									{#each g as st (st.seq)}
										<li><button class:on={atStep?.seq === st.seq} onclick={() => pickStep(st)}><b>{st.message}</b><small>{st.author ?? 'play'}{st.via === 'mcp' ? ' · MCP' : ''} · {when(st.at)}</small></button></li>
									{/each}
								</ol>
							{/if}
						{/if}
					</li>
				{/each}
			</ol>
			{#if versions.length > FOLD}
				<button class="more" onclick={() => (showOld = !showOld)}>{showOld ? 'Fold the older versions' : `Show ${versions.length - FOLD} older version${versions.length - FOLD === 1 ? '' : 's'}`}</button>
			{/if}
		</section>
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
	/* in the rail: the versions top down, newest first, as a line of dots; a version's steps unfolded under it. Each one
	   compact (Samuel 2026-11-04: "each version number should be a bit more compact"): its number, when and by whom on
	   one line, what it changed in one small line under it, and its steps' fold as a count at that line's end */
	.vers { display: grid; gap: 0.4rem; }
	.vhead { margin: 0; display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-body); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
	.vhead span { letter-spacing: 0; text-transform: none; font-weight: 500; }
	.playing { display: grid; gap: 0.15rem; padding: 0.55rem 0.7rem; border-radius: 12px; background: var(--mustard-soft); font-size: 0.78rem; line-height: 1.35; }
	.playing span { font-size: 0.66rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-soft); }
	.playing small { color: var(--ink-soft); }
	.playing button { justify-self: start; margin-top: 0.25rem; font: inherit; font-size: 0.74rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 999px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer; }
	.vlist { list-style: none; margin: 0; padding: 0 0 0 0.7rem; border-left: 2px solid var(--line); display: grid; gap: 1px; }
	/* the steps' fold sits over the row's second line, at its end (the row stays one button, the fold another) */
	.vlist > li { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; }
	/* the dot on the line, level with the number */
	.vlist > li::before { content: ''; position: absolute; left: calc(-0.7rem - 5px); top: calc(0.15rem + 0.55rem - 4px); width: 8px; height: 8px; border-radius: 50%; background: var(--paper); border: 1.5px solid var(--sage); }
	.vlist > li.on::before { background: var(--mustard); border-color: var(--mustard); }
	.vrow { all: unset; box-sizing: border-box; grid-column: 1 / -1; grid-row: 1; display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: baseline; column-gap: 0.3rem; width: 100%; padding: 0.15rem 0.4rem; border-radius: 7px; cursor: pointer; }
	.vrow:hover { background: color-mix(in srgb, var(--sage) 16%, transparent); }
	.vrow:focus-visible { outline: 2px solid var(--ink); }
	li.on > .vrow { background: var(--paper); box-shadow: inset 0 0 0 1px var(--line); }
	.vnum { grid-row: 1; font-family: var(--font-display); font-size: 0.92rem; font-weight: 600; line-height: 1.2; }
	.badge { grid-row: 1; grid-column: 2; align-self: center; padding: 0 0.3rem; border-radius: 999px; background: var(--sage-soft); font-size: 0.54rem; font-weight: 700; line-height: 1.55; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-soft); }
	.vwhen { grid-row: 1; grid-column: 3; justify-self: end; max-width: 100%; font-size: 0.66rem; line-height: 1.2; font-variant-numeric: tabular-nums; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.vnote { grid-column: 1 / -1; min-height: 0.92rem; font-size: 0.68rem; line-height: 0.92rem; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	li.stepped .vnote { padding-right: 3.6rem; }
	.vsteps, .more { all: unset; cursor: pointer; font-weight: 600; color: var(--ink-soft); text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 2px; }
	.vsteps:hover, .more:hover { color: var(--ink); }
	.vsteps:focus-visible, .more:focus-visible { outline: 2px solid var(--ink); border-radius: 3px; }
	/* its tap area reaches the row's end and foot (an iPad's finger), its text where the note's line ends */
	.vsteps { grid-column: 2; grid-row: 1; align-self: end; position: relative; padding: 0 0.4rem 0.15rem 0.3rem; font-size: 0.64rem; line-height: 0.92rem; white-space: nowrap; }
	.vsteps::after { content: ''; display: inline-block; margin-left: 0.25rem; vertical-align: 0.05rem; border-left: 4px solid currentColor; border-block: 3px solid transparent; transition: transform 0.15s; }
	.vsteps[aria-expanded='true']::after { transform: rotate(90deg); }
	.more { justify-self: start; margin: 0 0 0 0.2rem; font-size: 0.68rem; }
	.slist { grid-column: 1 / -1; list-style: none; margin: 0.1rem 0 0.3rem 0.4rem; padding: 0; display: grid; gap: 1px; max-height: 16rem; overflow-y: auto; }
	.slist button { all: unset; box-sizing: border-box; display: grid; width: 100%; padding: 0.2rem 0.4rem; border-radius: 6px; cursor: pointer; font-size: 0.7rem; line-height: 1.3; }
	.slist button:hover { background: color-mix(in srgb, var(--sage) 14%, transparent); }
	.slist button.on { background: var(--mustard-soft); }
	.slist b { font-weight: 500; }
	.slist small { color: var(--muted); font-size: 0.62rem; }
	@media (max-width: 820px) {
		.stories { grid-template-columns: 1fr; }
		.list { grid-auto-flow: column; grid-auto-columns: 10rem; overflow-x: auto; }
		.list h1, .hint { display: none; }
	}
</style>
