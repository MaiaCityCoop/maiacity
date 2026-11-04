<!--
	STORIES (Samuel 2026-11-03) — Maia City's films, each one timeline (play/SPEC.md §12): pick one in the narrow list on
	the left and play it through, its storyboard frames beside the subtitles of its script, to feel whether the film
	works. Admins only. A viewer: a story changes only by proposal, over MCP (play/api/src/mcp.ts), decided on the
	Proposals page; any accepted version can be played again from the version picker.
	Laid out with the player (Samuel 2026-11-04): the list on the left only as tall as the picture, the title above the
	picture, the version picker and the history in the thin rail on the right with the notes, the timeline across the
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
	/** dragging along the bar scrubs through the steps */
	let scrubbing = false;
	function scrubAt(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
		const i = Math.max(0, Math.min(steps.length - 1, Math.floor(((e.clientX - r.left) / r.width) * steps.length)));
		if (steps[i]) pickStep(steps[i]);
	}
	const stepIndex = $derived(atStep ? steps.findIndex((s) => s.seq === atStep!.seq) : -1);
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

<!-- the rail's top: which version is playing, and its history step by step -->
{#snippet sideTop()}
	{#if story}
		{#if atStep}
			<button class="chip-back" onclick={backToHead}>Step {stepIndex + 1} · back to the head</button>
		{:else if (story.versions?.length ?? 0) > 0}
			<label class="versions">
				<span class="muted small">Version</span>
				<select value={String(story.number ?? '')} onchange={(e) => open(story!.id, Number((e.currentTarget as HTMLSelectElement).value) === story!.versions![0].number ? null : Number((e.currentTarget as HTMLSelectElement).value))}>
					{#each story.versions ?? [] as v, i (v.id)}
						<option value={String(v.number)}>v{v.number}{i === 0 ? ' (head)' : ''}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if steps.length > 1}
			<div class="history">
				<div
					class="ticks"
					role="slider"
					tabindex="0"
					aria-label="The story's history, step by step"
					aria-valuemin={1}
					aria-valuemax={steps.length}
					aria-valuenow={atStep ? stepIndex + 1 : steps.length}
					onpointerdown={(e) => { scrubbing = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrubAt(e); }}
					onpointermove={(e) => scrubbing && scrubAt(e)}
					onpointerup={() => (scrubbing = false)}
					onkeydown={(e) => {
						const i = atStep ? stepIndex : steps.length - 1;
						if (e.key === 'ArrowLeft' && i > 0) pickStep(steps[i - 1]);
						if (e.key === 'ArrowRight' && i < steps.length - 1) pickStep(steps[i + 1]);
					}}
				>
					{#each steps as s, i (s.seq)}
						<span
							class="tick"
							class:v={s.version}
							class:mcp={s.via === 'mcp'}
							class:merge={s.kind === 'merge'}
							class:on={atStep ? atStep.seq === s.seq : version === null && i === steps.length - 1}
							title="{s.message} · {s.author ?? 'play'}{s.via === 'mcp' ? ' (MCP)' : ''} · {when(s.at)}"
						>{#if s.version}<span class="vlabel">v{s.version}</span>{/if}</span>
					{/each}
				</div>
				<p class="muted caption">
					{#if atStep}
						Step {stepIndex + 1} of {steps.length}: “{atStep.message}” · {atStep.author ?? 'play'}{atStep.via === 'mcp' ? ' via MCP' : ''} · {when(atStep.at)}
					{:else}
						{steps.length} steps in its history, every one kept: drag along the bar to play it as it was at any of them
					{/if}
				</p>
			</div>
		{/if}
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
	/* in the rail: the version picker across it, the history bar under it */
	.versions { display: flex; align-items: center; gap: 0.4rem; }
	.versions select { font: inherit; flex: 1; min-width: 0; padding: 0.35rem 0.5rem; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); }
	.chip-back { font: inherit; font-size: 0.78rem; padding: 0.35rem 0.7rem; border-radius: 999px; border: 1px solid var(--line); background: var(--paper); cursor: pointer; justify-self: start; }
	/* the history: a thin bar of every step, versions marked, dragged to play the story as it was */
	.history { display: grid; gap: 0.25rem; }
	.ticks { position: relative; display: flex; align-items: flex-end; height: 1.6rem; padding-top: 0.7rem; cursor: ew-resize; touch-action: none; border-bottom: 1px solid var(--line); outline: none; }
	.ticks:focus-visible { box-shadow: 0 2px 0 var(--ink); }
	.tick { position: relative; flex: 1 1 0; height: 0.5rem; display: flex; justify-content: center; }
	.tick::before { content: ''; width: 2px; height: 100%; border-radius: 1px; background: color-mix(in srgb, var(--ink, #1f2a23) 35%, transparent); }
	.tick.mcp::before { background: var(--sage, #8fae8b); }
	.tick.merge::before { background: var(--ink, #1f2a23); }
	.tick.v { height: 0.85rem; }
	.tick.v::before { width: 3px; background: var(--ink, #1f2a23); }
	.tick.on::before { width: 4px; background: #c8744f; }
	.vlabel { position: absolute; bottom: 100%; font-size: 0.62rem; font-weight: 700; line-height: 1; color: var(--ink, #1f2a23); pointer-events: none; }
	.caption { margin: 0; font-size: 0.7rem; line-height: 1.3; }
	@media (max-width: 820px) {
		.stories { grid-template-columns: 1fr; }
		.list { grid-auto-flow: column; grid-auto-columns: 10rem; overflow-x: auto; }
		.list h1, .hint { display: none; }
	}
</style>
