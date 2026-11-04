<!--
	THE STORY PLAYER — a story's timeline played through (./timeline.ts): its storyboard frame large, the narration as a
	subtitle over it, what the editor reads beside it, and the timeline below (the sections, the mood rising and falling,
	a lane per track) with a playhead to drag. Everything shown comes from `renderAt(story, t)`: play and scrub only
	move t, and the crossfade between two shots is worked out from t, never left to a CSS transition, so a moment is
	the same picture every time (a frame-by-frame export later renders exactly this). A viewer: nothing is edited here.
	Its sound (./sound.ts): every clip with a recording (the voice's takes, music, sfx, ambience) laid on one Web Audio
	clock; while it plays, t follows that clock, so picture and sound stay together. Lines with no take yet can be read
	by the browser's voice.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { clipsOf, clock, cueOf, moodLevel, renderAt, sectionsOf, shotEdge, soundsOf, type Notes, type Shot, type StoryBody, type Voice } from './timeline';
	import { StorySound } from './sound';

	let { story, compact = false, keys = true }: { story: StoryBody & { title?: string }; compact?: boolean; keys?: boolean } = $props();

	let t = $state(0);
	let playing = $state(false);
	let speed = $state(1);
	let voiceOn = $state(false);
	let soundOn = $state(true);
	let soundState = $state<'none' | 'loading' | 'ready' | 'failed'>('none');
	const audio = new StorySound();
	const SPEEDS = [1, 1.25, 1.5];

	const moment = $derived(renderAt(story, t));
	const shots = $derived(clipsOf<Shot>(story, 'shots'));
	const voices = $derived(clipsOf<Voice>(story, 'voice'));
	const notes = $derived(clipsOf<Notes>(story, 'notes'));
	const sounds = $derived(soundsOf(story));
	/** the tracks that sound besides the voice (music, sfx, ambience, a mix), each its own lane: their recordings, and the
	 *  cues still to be made, written as notes (a preview's music, effects and beds, read before anything is recorded) */
	const soundTracks = $derived((story?.tracks ?? []).filter((x) => x.kind !== 'voice' && x.kind !== 'shots' && x.kind !== 'notes' && x.clips.some((c) => typeof c.audio === 'string' || cueOf(c))));
	const KIND_NAME: Record<string, string> = { music: 'Music', sfx: 'Effect', ambience: 'Ambience' };
	/** what is heard (or planned to be) at the playhead, track by track */
	const soundNow = $derived(
		soundTracks.flatMap((tr) => tr.clips.filter((c) => t >= c.at - 1e-6 && t < c.at + c.duration && cueOf(c)).map((c) => ({ track: KIND_NAME[tr.kind] ?? tr.id, text: cueOf(c), planned: typeof c.audio !== 'string' })))
	);
	/** voice clips with no take yet: only these may be read by the browser's voice */
	const unrecorded = $derived(voices.filter((v) => typeof (v as any).audio !== 'string').length);
	const sections = $derived(sectionsOf(story));
	const D = $derived(Math.max(0.001, story?.duration ?? 0));
	const pct = (s: number) => `${(s / D) * 100}%`;
	/** the film's width over its height (9:16 → 0.5625) */
	const ratio = $derived.by(() => {
		const [w, h] = (story?.format ?? '9:16').split(':').map(Number);
		return w > 0 && h > 0 ? w / h : 9 / 16;
	});
	const frameUrl = (h: string | null | undefined) => (h ? `/api/files/${h}` : '');

	// a new story starts at its beginning, its frames fetched ahead so no shot arrives late
	let shown = '';
	$effect(() => {
		const key = JSON.stringify(story?.tracks?.map((x) => x.id)) + (story?.duration ?? 0) + ((story as any)?.version ?? '');
		if (key === shown) return;
		shown = key;
		t = 0;
		playing = false;
		audio.stop();
		for (const s of clipsOf<Shot>(story, 'shots')) if (s.frame) new Image().src = frameUrl(s.frame);
		// its recordings fetched and decoded ahead, so the first Play sounds at once
		if (!soundsOf(story).length) soundState = 'none';
		else {
			soundState = 'loading';
			const asked = key;
			audio.load(story, frameUrl).then(() => {
				if (shown === asked) soundState = audio.failed.length && audio.failed.length >= new Set(soundsOf(story).map((x) => x.hash)).size ? 'failed' : 'ready';
			});
		}
	});

	/** the sound laid again from t (Play, a seek or a new speed while playing) */
	function resound() {
		if (playing && soundOn && sounds.length) audio.start(t, speed);
		else audio.stop();
	}
	$effect(() => {
		// on Play and Pause, on a new speed, and when sound is turned on or off
		void playing, void speed, void soundOn;
		untrack(() => !dragging && resound()); // t and the rest read inside are not what this follows
	});

	// the clock: only while playing, t moves on by the wall clock times the speed; everything else follows from t
	$effect(() => {
		if (!playing) return;
		let last = performance.now(), raf = 0;
		const tick = (now: number) => {
			// while the sound runs its clock is the story's; otherwise the wall clock times the speed
			const heard = dragging ? null : audio.now();
			t = Math.min(D, heard ?? t + ((now - last) / 1000) * speed);
			last = now;
			if (t >= D) playing = false;
			else raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// the browser's voice, if asked for: each line read as its clip begins, while playing
	let said = '';
	$effect(() => {
		const v = moment.voice;
		if (typeof speechSynthesis === 'undefined') return;
		if (!playing || !voiceOn) {
			if (said) speechSynthesis.cancel();
			said = '';
			return;
		}
		if (v && v.id !== said && typeof (v as any).audio !== 'string') {
			said = v.id;
			speechSynthesis.cancel();
			const u = new SpeechSynthesisUtterance(v.line);
			u.rate = speed;
			speechSynthesis.speak(u);
		}
	});
	onMount(() => () => {
		if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
		audio.stop();
	});

	/** in the user's own tap: the sound's context made now, so Safari lets it sound when it starts a moment later */
	const gesture = () => soundOn && sounds.length && audio.prime();
	const toggle = () => {
		if (t >= D - 0.01) t = 0;
		if (!playing) gesture();
		playing = !playing;
	};
	const seek = (to: number) => {
		gesture();
		t = Math.max(0, Math.min(D, to));
		if (playing && !dragging) resound();
	};
	const step = (dir: 1 | -1) => seek(shotEdge(story, t, dir));

	function onKey(e: KeyboardEvent) {
		if (!keys) return;
		const el = e.target as HTMLElement | null;
		if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName) && e.key !== ' ')) return;
		if (e.key === ' ') {
			e.preventDefault();
			toggle();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			step(1);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			step(-1);
		}
	}

	// scrubbing: a press on the timeline puts the playhead there, and dragging moves it
	let lanes: HTMLElement | undefined = $state();
	let dragging = $state(false);
	const timeAt = (x: number) => {
		const r = lanes!.getBoundingClientRect();
		return ((x - r.left) / r.width) * D;
	};
	function down(e: PointerEvent) {
		if (!lanes) return;
		dragging = true;
		audio.stop();
		lanes.setPointerCapture(e.pointerId);
		seek(timeAt(e.clientX));
	}
	const move = (e: PointerEvent) => dragging && seek(timeAt(e.clientX));
	const up = () => {
		if (!dragging) return;
		dragging = false;
		resound();
	};

	// a calm colour for each section, the same every time
	const PALETTE = ['#8fae8b', '#d9a441', '#c96f53', '#7c9cb8', '#a98bb5', '#6f9e95', '#c4a27a', '#9aa35c'];
	const colourOf = (s: string) => PALETTE[[...(s ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
	const sectionOf = (time: number) => notes.find((n) => time >= n.at - 1e-6 && time < n.at + n.duration)?.section ?? '';

	// the mood: a line through each note's mood, rising and falling with the story
	const moodPath = $derived.by(() => {
		if (!notes.length) return '';
		const pts = notes.map((n) => [((n.at + n.duration / 2) / D) * 1000, 30 - moodLevel(n.mood) * 8]);
		return 'M' + [[0, pts[0][1]], ...pts, [1000, pts[pts.length - 1][1]]].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
	});
</script>

<svelte:window onkeydown={onKey} />

<div class="player" class:compact>
	<div class="stage-row">
		<!-- a tap on the picture plays and pauses it, as on any film player (Samuel 2026-11-04) -->
		<div class="screen" style:--ratio={ratio} role="button" tabindex="0" aria-label={playing ? 'Pause' : 'Play'} onclick={toggle} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), e.stopPropagation(), toggle())}>
			{#if moment.prev?.frame}<img class="frame" src={frameUrl(moment.prev.frame)} alt="" draggable="false" />{/if}
			{#if moment.shot?.frame}
				<img class="frame" src={frameUrl(moment.shot.frame)} alt="Shot {moment.index + 1}" draggable="false" style:opacity={moment.mix} />
			{:else if moment.shot}
				<div class="frame empty" style:opacity={moment.mix}><span>Shot {moment.index + 1}: no frame yet</span></div>
			{/if}
			<!-- one line at a time, large, as the film shows it; words set on screen are in the frame once it has one -->
			{#if moment.voice && moment.cue && !(moment.voice.who === 'ON SCREEN' && moment.shot?.frame)}
				<div class="subtitle">
					<span class="who">{moment.voice.who}</span>
					<span class="line">{moment.cue.text}</span>
				</div>
			{/if}
			{#if !playing}<span class="play-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span>{/if}
		</div>
		<aside class="details">
			<p class="beat">
				<span class="badge" style:background={colourOf(moment.notes?.section ?? '')}>{moment.notes?.section || '—'}</span>
				{#if shots.length}<span class="muted">Shot {Math.max(1, moment.index + 1)} of {shots.length}</span>{/if}
				{#if moment.notes?.mood}<span class="mood">{moment.notes.mood}</span>{/if}
			</p>
			{#if moment.notes?.camera}<div class="field"><b>Camera</b><p>{moment.notes.camera}</p></div>{/if}
			{#if moment.shot?.transition}<div class="field"><b>Into the next shot</b><p>{moment.shot.transition}</p></div>{/if}
			{#if moment.notes?.retention}<div class="field"><b>Retention</b><p>{moment.notes.retention}</p></div>{/if}
			{#if moment.notes?.pace}<div class="field"><b>Pace</b><p>{moment.notes.pace}</p></div>{/if}
			{#if soundNow.length || moment.notes?.sound}
				<div class="field">
					<b>Sound</b>
					{#if moment.notes?.sound}<p>{moment.notes.sound}</p>{/if}
					{#each soundNow as s, i (i)}<p><span class="kind">{s.track}{s.planned ? ' (to make)' : ''}</span> {s.text}</p>{/each}
				</div>
			{/if}
		</aside>
	</div>

	<div class="controls">
		<button class="btn small" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Pause' : t >= D - 0.01 ? 'Replay' : 'Play'}</button>
		<button class="btn small ghost" onclick={() => step(-1)} aria-label="Previous shot">‹</button>
		<button class="btn small ghost" onclick={() => step(1)} aria-label="Next shot">›</button>
		<span class="time">{clock(t)} <span class="muted">/ {clock(D)}</span></span>
		<span class="spacer"></span>
		<button class="btn small ghost" onclick={() => (gesture(), (speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]))} title="Speed">{speed}×</button>
		{#if sounds.length}
			<button class="btn small ghost" class:on={soundOn} onclick={() => (!soundOn && sounds.length && audio.prime(), (soundOn = !soundOn))} title="The story's own sound: its voice takes, music and effects">
				Sound {soundState === 'loading' ? '…' : soundState === 'failed' ? '(failed)' : soundOn ? 'on' : 'off'}
			</button>
		{/if}
		{#if unrecorded}
			<button class="btn small ghost" class:on={voiceOn} onclick={() => (voiceOn = !voiceOn)} title="Read each line that has no take yet aloud with the browser's voice">Voice {voiceOn ? 'on' : 'off'}</button>
		{/if}
	</div>

	<div class="timeline">
		<div class="sections">
			{#each sections as s, i (i)}
				<span class="section" style:left={pct(s.at)} style:width={pct(s.end - s.at)} style:border-color={colourOf(s.section)} title={s.section}>{s.section}</span>
			{/each}
		</div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="lanes" bind:this={lanes} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
			<svg class="mood-line" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
				<line x1="0" x2="1000" y1="30" y2="30" />
				{#if moodPath}<path d={moodPath} />{/if}
			</svg>
			<div class="lane shots-lane">
				{#each shots as s, i (s.id)}
					<span class="seg" class:on={i === moment.index} style:left={pct(s.at)} style:width={pct(s.duration)} style:background-image={s.frame ? `url(${frameUrl(s.frame)})` : 'none'} style:border-top-color={colourOf(sectionOf(s.at + 0.01))} title="Shot {i + 1}"></span>
				{/each}
			</div>
			<div class="lane voice-lane">
				{#each voices as v (v.id)}
					<span class="bar" class:on={v.id === moment.voice?.id} class:samuel={/samuel/i.test(v.who)} class:recorded={typeof (v as any).audio === 'string'} style:left={pct(v.at)} style:width={pct(v.duration)} title="{v.who}: {v.line}">{v.who.split(/\s/)[0]}</span>
				{/each}
			</div>
			{#each soundTracks as tr (tr.id)}
				<div class="lane sound-lane" title={tr.id}>
					{#each tr.clips.filter((c) => typeof c.audio === 'string' || cueOf(c)) as c (c.id)}
						<span class="bar sound {tr.kind}" class:muted-track={(tr as any).mute} class:planned={typeof c.audio !== 'string'} style:left={pct(c.at)} style:width={pct(c.duration)} title="{tr.id}: {cueOf(c) || c.id}">{typeof c.audio === 'string' ? tr.id : cueOf(c)}</span>
					{/each}
				</div>
			{/each}
			<div class="playhead" style:left={pct(t)}></div>
		</div>
		<div class="legend muted"><span>Shots</span><span>Voice{voices.length && !unrecorded ? ' (recorded)' : ''}</span>{#each soundTracks as tr (tr.id)}<span>{tr.id}</span>{/each}<span>Mood ↑↓</span></div>
	</div>
</div>

<style>
	.player { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.7rem; min-width: 0; container-type: inline-size; }
	/* the frame in the middle of the row, what the editor reads beside it on the right (Samuel 2026-11-03) */
	.stage-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(16rem, 1fr); gap: 1rem; align-items: start; min-height: 0; }
	.stage-row .screen { grid-column: 2; }
	.stage-row .details { grid-column: 3; }
	/* the frame as tall as leaves the controls and the timeline in view above the nav pill (a page may say otherwise) */
	/* its width worked out from its height: the subtitles are sized to the frame (container-type: size), and a box
	   contained that way has no width of its own to give a grid column (it collapsed to nothing) */
	.screen { position: relative; --h: min(var(--story-screen, clamp(15rem, calc(100vh - 24.5rem), 660px)), calc((100cqw - 20rem) / var(--ratio))); height: var(--h); width: calc(var(--h) * var(--ratio)); max-width: 100%; border-radius: 14px; overflow: hidden; background: #15130f; box-shadow: var(--shadow); user-select: none; container-type: size; }
	.compact .screen { --h: min(var(--story-screen, clamp(14rem, calc(100vh - 25rem), 520px)), calc((100cqw - 20rem) / var(--ratio))); }
	.frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
	.screen { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
	.screen:focus-visible { outline: 3px solid var(--terracotta, #c96f53); outline-offset: 3px; }
	/* paused: a quiet play mark in the middle of the picture, gone the moment it plays */
	.play-mark { position: absolute; left: 50%; top: 46%; width: clamp(2.6rem, 16cqw, 4.5rem); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: rgb(10 10 8 / 0.45); display: grid; place-items: center; pointer-events: none; }
	.play-mark svg { width: 55%; height: 55%; fill: #fff; margin-left: 8%; }
	.frame.empty { display: grid; place-items: center; color: #cfc8b8; background: #24211b; font-size: 0.9rem; }
	.subtitle { position: absolute; left: 3%; right: 3%; bottom: 9%; display: grid; gap: 0.3rem; justify-items: center; text-align: center; pointer-events: none; }
	/* the subtitle sized to the frame, as it would be in the film: one line of about 26 characters across it (CUE_CHARS) */
	.who { font-size: clamp(0.55rem, 2.8cqw, 0.85rem); font-weight: 700; letter-spacing: 0.08em; color: #ffe6a8; text-shadow: 0 1px 3px rgb(0 0 0 / 0.85); }
	.line { font-size: clamp(0.85rem, 5.6cqw, 2rem); font-weight: 700; line-height: 1.2; color: #fff; text-wrap: balance; background: rgb(10 10 8 / 0.5); padding: 0.18em 0.45em; border-radius: 0.3em; text-shadow: 0 1px 4px rgb(0 0 0 / 0.7); }
	.details { display: grid; gap: 0.6rem; align-content: start; min-width: 0; }
	.details h2 { margin: 0; font-size: 1.25rem; }
	.beat { margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.badge { font-size: 0.75rem; font-weight: 700; padding: 0.15em 0.6em; border-radius: 999px; color: #1b1b17; }
	.mood { font-weight: 700; color: var(--terracotta, #c96f53); }
	.field b { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
	.field p { margin: 0.15rem 0 0; font-size: 0.92rem; line-height: 1.4; }
	.controls { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
	.controls .time { font-variant-numeric: tabular-nums; font-weight: 600; margin-left: 0.3rem; }
	.controls .spacer { flex: 1; }
	.btn.on { background: var(--ink); color: var(--paper); }
	.timeline { display: grid; gap: 0.25rem; }
	.sections { position: relative; height: 1.3rem; }
	.section { position: absolute; top: 0; bottom: 0; border-top: 3px solid; font-size: 0.66rem; font-weight: 700; padding-top: 0.15rem; padding-left: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink-soft, #444); box-sizing: border-box; }
	.lanes { position: relative; display: grid; gap: 3px; cursor: pointer; touch-action: none; user-select: none; padding-top: 2.6rem; }
	.mood-line { position: absolute; left: 0; right: 0; top: 0; height: 2.4rem; width: 100%; pointer-events: none; }
	.mood-line line { stroke: var(--line); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.mood-line path { fill: none; stroke: var(--terracotta, #c96f53); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
	.lane { position: relative; border-radius: 6px; background: color-mix(in srgb, var(--line) 50%, transparent); }
	.shots-lane { height: 3.4rem; }
	.compact .shots-lane { height: 2.8rem; }
	.voice-lane { height: 1.25rem; }
	.seg { position: absolute; top: 0; bottom: 0; background-size: cover; background-position: center 35%; border-top: 3px solid; border-left: 1px solid rgb(255 255 255 / 0.7); box-sizing: border-box; filter: saturate(0.85) brightness(0.92); }
	.seg.on { filter: none; box-shadow: inset 0 0 0 2px var(--ink); }
	.bar { position: absolute; top: 2px; bottom: 2px; border-radius: 4px; background: var(--sage-soft, #dfe8dc); border: 1px solid color-mix(in srgb, var(--sage, #8fae8b) 60%, transparent); font-size: 0.6rem; font-weight: 700; padding: 0 0.25rem; overflow: hidden; white-space: nowrap; box-sizing: border-box; line-height: 1rem; }
	.bar.recorded { border-style: solid; box-shadow: inset 3px 0 0 color-mix(in srgb, var(--sage, #8fae8b) 90%, black); }
	.sound-lane { height: 1rem; }
	.bar.sound { background: color-mix(in srgb, var(--sky, #7c9cb8) 30%, white); border-color: color-mix(in srgb, var(--sky, #7c9cb8) 70%, transparent); line-height: 0.8rem; font-size: 0.55rem; }
	.bar.sound.music, .bar.sound.score { background: color-mix(in srgb, #a98bb5 30%, white); border-color: #a98bb5; }
	.bar.sound.sfx { background: color-mix(in srgb, #c96f53 25%, white); border-color: #c96f53; }
	/* a cue still to be made: its note in a dashed outline, read before anything is recorded */
	.bar.sound.planned { background: transparent; border-style: dashed; font-weight: 600; color: var(--ink, #2b2a26); }
	.field .kind { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-right: 0.25rem; }
	.bar.sound.ambience { background: color-mix(in srgb, #6f9e95 25%, white); border-color: #6f9e95; }
	.bar.muted-track { opacity: 0.4; }
	.bar.samuel { background: var(--mustard-soft, #f3e3b5); border-color: color-mix(in srgb, var(--mustard, #d9a441) 60%, transparent); }
	.bar.on { background: var(--ink); color: var(--paper); }
	.playhead { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--terracotta, #c96f53); pointer-events: none; }
	.playhead::before { content: ''; position: absolute; top: 2.3rem; left: -5px; border: 6px solid transparent; border-top-color: var(--terracotta, #c96f53); }
	.legend { display: flex; gap: 1rem; font-size: 0.7rem; }
	/* on a phone: the frame, right under it the controls and the timeline, and only then what the editor reads (Samuel
	   2026-11-04: play directly below the view, no prose between) */
	@media (max-width: 820px) {
		.stage-row { display: contents; }
		.stage-row .screen, .stage-row .details { grid-column: 1; }
		.screen { --h: min(58vh, 560px, calc(100cqw / var(--ratio))); justify-self: center; order: 1; }
		.compact .screen { --h: min(50vh, 480px, calc(100cqw / var(--ratio))); }
		.controls { order: 2; }
		.timeline { order: 3; }
		.details { order: 4; justify-self: stretch; }
	}
</style>
