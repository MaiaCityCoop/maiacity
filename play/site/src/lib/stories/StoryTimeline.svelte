<!--
	A story's timeline under the Stories player (./StoryPlayer.svelte): its sections and their emotions, the mood rising
	and falling, a lane per track (the links, the shots, the voice, each sound track), the playhead; a press seeks.
-->
<script lang="ts">
	import { fileUrl } from '$lib/api';
	import { clipAt, colourOf, cueOf, linkHref, linkName, moodLevel, newerOf, sectionsOf, spansOf, type Notes, type Shot, type Slot, type StoryBody, type Track, type Voice } from './timeline';

	let { story, t, D, shots, index, voices, voice, unrecorded, slots, inLink, soundTracks, seek, dragging = $bindable(false) }: {
		story: StoryBody; t: number; D: number; shots: Shot[]; index: number; voices: Voice[]; voice: Voice | null; unrecorded: number;
		slots: Slot[]; inLink: Slot | undefined; soundTracks: Track[]; seek: (to: number) => void; dragging?: boolean;
	} = $props();

	const sections = $derived(sectionsOf(story));
	const pct = (s: number) => `${(s / D) * 100}%`;
	const laneName = (tr: Track) => tr.name ?? tr.id;

	// scrubbing: a press on the timeline puts the playhead there, and dragging moves it. The lanes scroll up and down
	// inside it (a wheel or a vertical swipe), so a touch scrubs only once it moves sideways, and a tap seeks
	let lanes: HTMLElement | undefined = $state();
	let pressed: { id: number; x: number; y: number } | null = null;
	const timeAt = (x: number) => {
		const r = lanes!.getBoundingClientRect();
		return ((x - r.left) / r.width) * D;
	};
	function grab(e: PointerEvent, x: number) {
		dragging = true;
		lanes!.setPointerCapture(e.pointerId);
		seek(timeAt(x));
	}
	function down(e: PointerEvent) {
		if (!lanes) return;
		if (e.pointerType === 'mouse') grab(e, e.clientX);
		else pressed = { id: e.pointerId, x: e.clientX, y: e.clientY };
	}
	function move(e: PointerEvent) {
		if (dragging) return void seek(timeAt(e.clientX));
		if (pressed?.id === e.pointerId && Math.abs(e.clientX - pressed.x) > 8 && Math.abs(e.clientX - pressed.x) > Math.abs(e.clientY - pressed.y)) grab(e, e.clientX);
	}
	function up(e: PointerEvent) {
		// a tap (no drag, not taken over by a scroll) seeks where it fell
		if (!dragging && pressed?.id === e.pointerId && e.type === 'pointerup') seek(timeAt(pressed.x));
		pressed = null;
		dragging = false;
	}
	// the lanes scrolled: a soft fade at the edge that has more
	let lanesBox: HTMLElement | undefined = $state();
	let more = $state({ up: false, down: false });
	const scrolled = () => lanesBox && (more = { up: lanesBox.scrollTop > 1, down: lanesBox.scrollTop + lanesBox.clientHeight < lanesBox.scrollHeight - 1 });
	$effect(() => {
		if (!lanesBox) return;
		const ro = new ResizeObserver(scrolled);
		ro.observe(lanesBox);
		for (const c of lanesBox.children) ro.observe(c);
		return () => ro.disconnect();
	});

	const sectionOf = (time: number) => clipAt<Notes>(story, 'notes', time)?.section ?? '';

	// the mood: a line through each note's mood, rising and falling with the story (a linked story's inside its link)
	const moodPath = $derived.by(() => {
		const spans = spansOf<Notes>(story, 'notes');
		if (!spans.length) return '';
		const pts = spans.map((n) => [((n.at + n.end) / 2 / D) * 1000, 30 - moodLevel(n.clip.mood) * 8]);
		return 'M' + [[0, pts[0][1]], ...pts, [1000, pts[pts.length - 1][1]]].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
	});
</script>

<div class="timeline">
	<div class="sections">
		{#each sections as s, i (i)}
			<span class="section" style:left={pct(s.at)} style:width={pct(s.end - s.at)} style:border-color={colourOf(s.section)} title="{s.section}{s.emotion ? ` · ${s.emotion}` : ''}"><b>{s.section}</b>{#if s.emotion}<em>{s.emotion}</em>{/if}</span>
		{/each}
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="lanes" bind:this={lanes} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
		<svg class="mood-line" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
			<line x1="0" x2="1000" y1="30" y2="30" />
			{#if moodPath}<path d={moodPath} />{/if}
		</svg>
		<!-- each link's span marked across the lanes under it: what lies in it there is the linked story's -->
		{#each slots as s (s.clip)}<span class="link-band" style:left={pct(s.at)} style:width={pct(s.duration)} aria-hidden="true"></span>{/each}
		<div class="lanes-scroll" class:more-up={more.up} class:more-down={more.down} bind:this={lanesBox} onscroll={scrolled}>
		{#if slots.length}
			<!-- the stories it links, each a block in its place; a press opens that story (never a scrub) -->
			<div class="lane link-lane" title="Links" aria-label="Links">
				{#each slots as s (s.clip)}
					{@const later = newerOf(s)}
					<a class="link" class:on={s === inLink} class:lost={!s.title} href={linkHref(s)} style:left={pct(s.at)} style:width={pct(s.duration)} onpointerdown={(e) => e.stopPropagation()}
						title="{linkName(s)}{later ? ` (v${later} available: a proposal on this story moves it there)` : ''}. Open it on the Stories page.">
						<b>{s.title ?? 'missing story'}</b>{#if s.number}<span>· v{s.number}</span>{/if}{#if later}<em>v{later} available</em>{/if}
					</a>
				{/each}
			</div>
		{/if}
		{#if shots.length}
			<div class="lane shots-lane" title="Shots" aria-label="Shots">
				{#each shots as s, i (s.id)}
					<span class="seg" class:on={i === index} style:left={pct(s.at)} style:width={pct(s.duration)} style:background-image={s.frame ? `url(${fileUrl(s.frame)})` : 'none'} style:border-top-color={colourOf(sectionOf(s.at + 0.01))} title="Shot {i + 1}{s.composition ? ' · motion' : s.video ? ' · video' : ''}"></span>
				{/each}
			</div>
		{/if}
		<div class="lane voice-lane" title="Voice{voices.length && !unrecorded ? ' (recorded)' : ''}" aria-label="Voice{voices.length && !unrecorded ? ' (recorded)' : ''}">
			{#each voices as v (v.id)}
				<span class="bar" class:on={v.id === voice?.id} class:samuel={/samuel/i.test(v.who)} class:recorded={typeof v.audio === 'string'} style:left={pct(v.at)} style:width={pct(v.duration)} title="{v.who}: {v.line}">{v.who.split(/\s/)[0]}</span>
			{/each}
		</div>
		{#each soundTracks as tr (tr.id)}
			<div class="lane sound-lane" title={laneName(tr)} aria-label={laneName(tr)}>
				{#each tr.clips.filter((c) => typeof c.audio === 'string' || cueOf(c)) as c (c.id)}
					<span class="bar sound {tr.kind}" class:muted-track={tr.mute} class:planned={typeof c.audio !== 'string'} style:left={pct(c.at)} style:width={pct(c.duration)} title="{laneName(tr)}: {cueOf(c) || c.id}">{typeof c.audio === 'string' ? tr.name ?? tr.id : cueOf(c)}</span>
				{/each}
			</div>
		{/each}
		</div>
		<div class="playhead" style:left={pct(t)}></div>
	</div>
</div>

<style>
	.timeline { grid-area: tl; min-width: 0; display: grid; gap: 0.25rem; }
	.sections { position: relative; height: 1.3rem; }
	/* a section: its name, and beside it the primary emotion it should leave the viewer with, on one line */
	.section { position: absolute; top: 0; bottom: 0; display: flex; align-items: baseline; gap: 0.3rem; border-top: 3px solid; padding-top: 0.1rem; padding-left: 0.2rem; overflow: hidden; color: var(--ink-soft, #444); box-sizing: border-box; }
	.section b, .section em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.section b { font-size: 0.62rem; font-weight: 700; flex: none; max-width: 100%; }
	.section em { font-size: 0.64rem; font-style: italic; min-width: 0; color: var(--terracotta, #c96f53); }
	/* the lanes under the mood line scroll up and down inside the timeline, its height at most --tl (Samuel 2026-11-07);
	   no scrollbar, which would narrow them against the time; a fade says there is more */
	.lanes { position: relative; cursor: pointer; touch-action: pan-y; user-select: none; padding-top: 1.35rem; }
	.lanes-scroll { position: relative; display: grid; gap: 2px; max-height: calc(var(--tl, 8.5rem) - 2.9rem); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; touch-action: pan-y; }
	.lanes-scroll::-webkit-scrollbar { display: none; }
	.lanes-scroll.more-down { mask-image: linear-gradient(to bottom, #000 calc(100% - 1.2rem), transparent); }
	.lanes-scroll.more-up { mask-image: linear-gradient(to top, #000 calc(100% - 1.2rem), transparent); }
	.lanes-scroll.more-up.more-down { mask-image: linear-gradient(transparent, #000 1.2rem, #000 calc(100% - 1.2rem), transparent); }
	.mood-line { position: absolute; left: 0; right: 0; top: 0; height: 1.2rem; width: 100%; pointer-events: none; }
	.mood-line line { stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.mood-line path { fill: none; stroke: var(--terracotta, #c96f53); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
	.lane { position: relative; border-radius: 6px; background: color-mix(in srgb, var(--line) 50%, transparent); }
	.shots-lane { height: 2rem; }
	:global(.compact) .shots-lane { height: 1.8rem; }
	.voice-lane { height: 1rem; }
	.seg { position: absolute; top: 0; bottom: 0; background-size: cover; background-position: center 35%; border-top: 3px solid; border-left: 1px solid rgb(255 255 255 / 0.7); box-sizing: border-box; filter: saturate(0.85) brightness(0.92); }
	.seg.on { filter: none; box-shadow: inset 0 0 0 2px var(--ink); }
	.bar { position: absolute; top: 2px; bottom: 2px; border-radius: 4px; background: var(--sage-soft, #dfe8dc); border: 1px solid color-mix(in srgb, var(--sage, #8fae8b) 60%, transparent); font-size: 0.6rem; font-weight: 700; padding: 0 0.25rem; overflow: hidden; white-space: nowrap; box-sizing: border-box; line-height: calc(1rem - 6px); }
	.bar.recorded { border-style: solid; box-shadow: inset 3px 0 0 color-mix(in srgb, var(--sage, #8fae8b) 90%, black); }
	.sound-lane { height: 0.85rem; }
	.bar.sound { top: 1px; bottom: 1px; background: color-mix(in srgb, var(--sky, #7c9cb8) 30%, white); border-color: color-mix(in srgb, var(--sky, #7c9cb8) 70%, transparent); line-height: calc(0.85rem - 4px); font-size: 0.52rem; }
	.bar.sound.music, .bar.sound.score { background: color-mix(in srgb, #a98bb5 30%, white); border-color: #a98bb5; }
	.bar.sound.sfx { background: color-mix(in srgb, #c96f53 25%, white); border-color: #c96f53; }
	/* a cue still to be made: its note in a dashed outline, read before anything is recorded */
	.bar.sound.planned { background: transparent; border-style: dashed; font-weight: 600; color: var(--ink, #2b2a26); }
	.bar.sound.ambience { background: color-mix(in srgb, #6f9e95 25%, white); border-color: #6f9e95; }
	.bar.muted-track { opacity: 0.4; }
	.bar.samuel { background: var(--mustard-soft, #f3e3b5); border-color: color-mix(in srgb, var(--mustard, #d9a441) 60%, transparent); }
	.bar.on { background: var(--ink); color: var(--paper); }
	.playhead { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--terracotta, #c96f53); pointer-events: none; }
	.playhead::before { content: ''; position: absolute; top: 1.1rem; left: -5px; border: 6px solid transparent; border-top-color: var(--terracotta, #c96f53); }
	/* the links (Samuel 2026-11-04): a lane of blocks, each the story it plays, mustard as a picked version is */
	.link-lane { height: 1.1rem; background: transparent; }
	.link { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; gap: 0.35rem; padding: 0 0.45rem; box-sizing: border-box; border-radius: 6px; overflow: hidden; white-space: nowrap; text-decoration: none; color: var(--ink, #2b2a26); background: var(--mustard-soft, #f3e3b5); border: 1.5px solid var(--mustard, #d9a441); font-size: 0.66rem; line-height: 1; cursor: pointer; }
	.link b { font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
	.link span { color: var(--ink-soft, #555); font-weight: 500; flex: none; }
	/* a newer version of the linked story: only said, in a quiet chip at the block's end */
	.link em { margin-left: auto; flex: none; font-style: normal; font-weight: 600; font-size: 0.6rem; padding: 0.12rem 0.4rem; border-radius: 999px; background: var(--paper, #fffdf6); color: var(--ink-soft, #555); border: 1px solid color-mix(in srgb, var(--mustard, #d9a441) 60%, transparent); }
	.link:hover { background: color-mix(in srgb, var(--mustard, #d9a441) 45%, white); }
	.link:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
	.link.on { box-shadow: inset 0 0 0 1.5px var(--ink); }
	.link.lost { background: transparent; border-style: dashed; border-color: var(--terracotta, #c96f53); color: var(--terracotta, #c96f53); }
	/* the link's span, under every lane: a faint mustard wash between dashed edges */
	.link-band { position: absolute; top: 1.35rem; bottom: -2px; border-left: 1.5px dashed var(--mustard, #d9a441); border-right: 1.5px dashed var(--mustard, #d9a441); background: color-mix(in srgb, var(--mustard, #d9a441) 13%, transparent); box-sizing: border-box; pointer-events: none; }
</style>
