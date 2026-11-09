<!--
	THE STORY PLAYER — a story played through one engine (play/SPEC.md §12): its version compiled into one HyperFrames
	composition (./compose.ts), played by HyperFrames' player in play's sealed frame (no same origin, no connection: the
	page hands it its files, code held to its hash), the same composition HyperFrames' renderer renders. Its picture and
	sound are the composition's; play, pause, scrubbing, the shot buttons and full screen only play, pause and seek it.
	What the editor reads beside it and the timeline below (the sections, the mood rising and falling, a lane per track,
	the links) are read from story/1 itself (./timeline.ts). A viewer: nothing is edited here.
	Its layout (Samuel 2026-11-04): the picture large in the middle, what the editor reads in a thin rail on its right, and
	the controls and the timeline across the whole width below. A page may hand it `list` (a column on the left, as tall
	as the picture), `head` (above the picture) and `side` (the top of the rail): the Stories page's list, title and
	version picker.
	A tap on the picture lands in the frame, which plays or pauses there and then, inside the tap, as a phone's sound needs.
	Its links (Samuel 2026-11-04: the trailer its own story, linked into every film): each linked version plays in its
	place, nested in the composition; a lane of the links names each one's story and opens it on the Stories page.
	Full screen (Samuel 2026-11-06): the picture alone on the whole screen, black around it and kept to the film's format
	(letterboxed, never cropped); the Full screen button or F, Esc or F again to leave. A bar (play, the time, a line to
	seek on, exit) shows while it is paused or the pointer moves, and goes with the cursor while it plays. Where the
	browser has no full screen for a page's element (an iPhone's Safari), the same mode fills the window.
-->
<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { clipAt, clipsOf, clock, colourOf, cueOf, LINK, linkHref, linkName, newerOf, shotEdge, slotsOf, type Links, type Notes, type Shot, type StoryBody, type Voice } from './timeline';
	import { compose, feed, FRAME, seal } from './compose';
	import { fileOf, inputsOf } from './inputs';
	import { fileUrl } from '$lib/api';
	import StoryTimeline from './StoryTimeline.svelte';

	let dragging = $state(false);
	let { story, compact = false, keys = true, list, head, side }: { story: StoryBody & { id?: string; title?: string; number?: number | null; version?: string; links?: Links | null }; compact?: boolean; keys?: boolean; list?: Snippet; head?: Snippet; side?: Snippet } = $props();

	let t = $state(0);
	let playing = $state(false);
	let speed = $state(1);
	let voiceOn = $state(false);
	let soundOn = $state(true);
	/** the film: being made, its files coming in, ready, or not to be had (and why) */
	let film = $state<'making' | 'loading' | 'ready' | 'failed'>('making');
	let failure = $state('');
	/** what the film is doing while it loads (intent 90de96fb): the page's own steps, then each world shot's build in the
	 *  frame, told by the live runtime */
	let loading = $state('');
	const loadingText = $derived(loading ? `Loading the film… ${loading}` : 'Loading the film…');
	const SPEEDS = [1, 1.25, 1.5];

	const shots = $derived(clipsOf<Shot>(story, 'shots'));
	const voices = $derived(clipsOf<Voice>(story, 'voice'));
	/** the shot at t (between shots, the last one holds), the line and the notes */
	const index = $derived(shots.findLastIndex((s) => s.at <= t + 1e-9));
	const shot = $derived(shots[index] ?? null);
	const voice = $derived(clipAt<Voice>(story, 'voice', t));
	const note = $derived(clipAt<Notes>(story, 'notes', t));
	const slots = $derived(slotsOf(story));
	const inLink = $derived(slots.find((s) => t >= s.at - 1e-6 && t < s.at + s.duration));
	/** the tracks that sound besides the voice (music, sfx, ambience, a mix), each its own lane: their recordings, and the
	 *  cues still to be made, written as notes (a preview's music, effects and beds, read before anything is recorded) */
	const soundTracks = $derived(story.tracks.filter((x) => x.kind !== 'voice' && x.kind !== 'shots' && x.kind !== 'notes' && x.kind !== LINK && x.clips.some((c) => typeof c.audio === 'string' || cueOf(c))));
	const sounding = $derived(story.tracks.some((x) => x.clips.some((c) => typeof c.audio === 'string')));
	const KIND_NAME: Record<string, string> = { music: 'Music', sfx: 'Effect', ambience: 'Ambience' };
	/** what is heard (or planned to be) at the playhead, track by track */
	const soundNow = $derived(
		soundTracks.flatMap((tr) => tr.clips.filter((c) => t >= c.at - 1e-6 && t < c.at + c.duration && cueOf(c)).map((c) => ({ track: KIND_NAME[tr.kind] ?? tr.name ?? tr.id, text: cueOf(c), planned: typeof c.audio !== 'string' })))
	);
	/** voice clips with no take yet: only these may be read by the browser's voice */
	const unrecorded = $derived(voices.filter((v) => typeof v.audio !== 'string').length);
	const D = $derived(Math.max(0.001, story?.duration ?? 0));
	const pct = (s: number) => `${(s / D) * 100}%`;
	/** the film's width over its height (9:16 → 0.5625) */
	const ratio = $derived.by(() => {
		const [w, h] = (story?.format ?? '9:16').split(':').map(Number);
		return w > 0 && h > 0 ? w / h : 9 / 16;
	});
	const frameUrl = (h: string | null | undefined) => (h ? fileUrl(h) : '');

	// ---- the one engine: HyperFrames' player, its frame play's
	let hf = $state<any>();
	let upgraded = $state(false);
	/** the playhead's last word from the player, and when it came: between two, t runs on by the clock; a word older than
	 *  the last seek is not taken (the player answers a seek a moment later) */
	let base = { t: 0, at: 0 };
	let sought = 0;
	const fresh = () => performance.now() - sought > 400;
	onMount(() => {
		let gone = false;
		import('@hyperframes/player').then(() => {
			if (gone || !hf) return;
			const frame: HTMLIFrameElement = hf.iframeElement;
			frame.setAttribute('sandbox', FRAME.sandbox);
			frame.setAttribute('allow', FRAME.allow);
			const on = (name: string, f: (e: any) => void) => hf.addEventListener(name, f);
			on('ready', () => ((film = 'ready'), (hf.muted = !soundOn), (hf.playbackRate = speed), hf.seek(t)));
			on('play', () => ((playing = true), (base = { t: hf.currentTime, at: performance.now() })));
			on('pause', () => ((playing = false), !dragging && fresh() && (t = hf.currentTime)));
			on('ended', () => ((playing = false), (t = D)));
			on('timeupdate', (e) => fresh() && (base = { t: e.detail.currentTime, at: performance.now() }));
			on('error', (e) => ((film = 'failed'), (failure = e.detail?.message ?? 'the player failed')));
			upgraded = true;
		});
		return () => ((gone = true), typeof speechSynthesis !== 'undefined' && speechSynthesis.cancel());
	});

	// a new story (or another version or step of it: the player stays) is made again, from its beginning: the compositions its
	// shots name fetched and held to their hash, the whole compiled and sealed into the frame
	let made = '';
	$effect(() => {
		const s = story, links = story?.links ?? {};
		const key = JSON.stringify(s?.tracks) + (s?.duration ?? 0) + (s?.version ?? '') + Object.keys(links).join();
		if (!upgraded || key === made) return;
		made = key;
		untrack(() => {
			t = 0;
			playing = false;
			film = 'making';
			loading = '';
			make(s, links, key);
		});
	});
	async function make(s: typeof story, links: Links, key: string) {
		const got = await inputsOf(s, links, (text) => (loading = text));
		if (made !== key) return;
		film = 'loading';
		try {
			hf.setAttribute('srcdoc', seal(compose(s, links, got.compositions, got.assets, got.worlds)));
		} catch (e) {
			film = 'failed';
			failure = String((e as Error)?.message ?? e);
		}
	}
	/** the frame's asks: its files (handed in), a tap in it (it played or paused itself), a key pressed in it */
	function fromFrame(e: MessageEvent) {
		const frame = hf?.iframeElement as HTMLIFrameElement | undefined;
		if (!frame || e.source !== frame.contentWindow || e.data?.play !== 1) return;
		const m = e.data;
		if (m.op === 'need') feed(frame.contentWindow!, m, fileOf).catch((x) => ((film = 'failed'), (failure = String(x?.message ?? x))));
		// a world shot's build, told by the live runtime: how far it is, or why it failed (never "Loading" for ever)
		else if (m.op === 'progress') film !== 'ready' && film !== 'failed' && (loading = String(m.text ?? '').slice(0, 120));
		else if (m.op === 'failed') film !== 'failed' && ((film = 'failed'), (failure = String(m.error ?? 'a shot could not be built').slice(0, 400)));
		else if (m.op === 'tap') stir();
		else if (m.op === 'key' && !m.meta) onKey({ key: m.key, target: null, metaKey: false, ctrlKey: false, altKey: false, preventDefault() {} } as unknown as KeyboardEvent);
	}
	$effect(() => void (upgraded && film === 'ready' && (hf.playbackRate = speed)));
	$effect(() => void (upgraded && film === 'ready' && (hf.muted = !soundOn)));

	// while it plays, the playhead runs on from the player's last word by the clock; everything shown follows t
	$effect(() => {
		if (!playing) return;
		let raf = 0;
		const tick = (now: number) => {
			if (!dragging) t = Math.min(D, base.t + ((now - base.at) / 1000) * speed);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	// the browser's voice, if asked for: each line with no take read as its clip begins, while playing
	let said = '';
	$effect(() => {
		const v = voice;
		if (typeof speechSynthesis === 'undefined') return;
		if (!playing || !voiceOn) {
			if (said) speechSynthesis.cancel();
			said = '';
			return;
		}
		if (v && v.id !== said && typeof v.audio !== 'string') {
			said = v.id;
			speechSynthesis.cancel();
			const u = new SpeechSynthesisUtterance(v.line);
			u.rate = speed;
			speechSynthesis.speak(u);
		}
	});

	const toggle = () => {
		if (film !== 'ready') return;
		if (playing) return hf.pause();
		if (t >= D - 0.01) seek(0);
		hf.play();
	};
	const seek = (to: number) => {
		t = Math.max(0, Math.min(D, to));
		base = { t, at: (sought = performance.now()) };
		if (film !== 'ready') return;
		hf.seek(t);
		// a seek leaves HyperFrames' player paused: playing, it plays on from there
		if (playing && hf.paused) hf.play();
	};
	const step = (dir: 1 | -1) => seek(shotEdge(story, t, dir));
	// full screen: the browser's own where it has it for an element, else the picture over the whole window (an iPhone)
	let screenEl: HTMLElement | undefined = $state();
	let full = $state(false);
	/** full only in the window, without the browser's full screen */
	let inWindow = $state(false);
	/** the bar and the cursor hidden while it plays and the pointer rests */
	let resting = $state(false);
	let restTimer: ReturnType<typeof setTimeout> | undefined;
	// Safari on iPhone and older WebKit name the full screen with a webkit prefix only
	type WebkitDocument = Document & { webkitFullscreenElement?: Element | null; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => Promise<void> };
	type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
	const doc = () => document as WebkitDocument;
	const fsElement = () => document.fullscreenElement ?? doc().webkitFullscreenElement ?? null;
	async function enterFull() {
		const el = screenEl as WebkitElement | undefined;
		const ask = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
		if (ask && (document.fullscreenEnabled || doc().webkitFullscreenEnabled)) {
			try {
				await ask.call(el);
				return;
			} catch {
				// refused (not in a tap, or not allowed here): the window instead
			}
		}
		inWindow = true;
		full = true;
	}
	async function exitFull() {
		if (fsElement()) await (document.exitFullscreen ?? doc().webkitExitFullscreen)?.call(document);
		inWindow = false;
		full = false;
	}
	const toggleFull = () => void (full ? exitFull() : enterFull());
	/** the pointer moved over the picture: the bar back, hidden again after a moment of rest while it plays */
	function stir() {
		resting = false;
		clearTimeout(restTimer);
		restTimer = setTimeout(() => (resting = true), 2500);
	}
	onMount(() => {
		const sync = () => {
			if (!inWindow) full = !!screenEl && fsElement() === screenEl;
		};
		document.addEventListener('fullscreenchange', sync);
		document.addEventListener('webkitfullscreenchange', sync);
		return () => {
			document.removeEventListener('fullscreenchange', sync);
			document.removeEventListener('webkitfullscreenchange', sync);
			clearTimeout(restTimer);
		};
	});
	// seeking on the full screen's line: the time where the pointer is along it
	let barLine: HTMLElement | undefined = $state();
	let barDragging = false;
	const barSeek = (e: PointerEvent) => {
		const r = barLine!.getBoundingClientRect();
		seek(((e.clientX - r.left) / r.width) * D);
	};

	function onKey(e: KeyboardEvent) {
		if (!keys) return;
		const el = e.target as HTMLElement | null;
		if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName) && e.key !== ' ')) return;
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.key === ' ') {
			e.preventDefault();
			toggle();
		} else if (e.key === 'f' || e.key === 'F') {
			e.preventDefault();
			toggleFull();
		} else if (e.key === 'Escape' && full) {
			e.preventDefault();
			void exitFull();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			step(1);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			step(-1);
		}
	}

</script>

<svelte:window onkeydown={onKey} onmessage={fromFrame} />

<div class="player" class:compact class:framed={!!(list || side)} class:windowed={full && inWindow} style:--tl="min({3.9 + (shots.length ? 2.15 : 0) + soundTracks.length * 1 + (slots.length ? 1.25 : 0)}rem, 16vh, 8.5rem)">
	{#if list}<div class="p-list">{@render list()}</div>{/if}
	{#if head}<div class="p-head">{@render head()}</div>{/if}
	<!-- a tap on the picture plays and pauses it, as on any film player (Samuel 2026-11-04) -->
	<div class="screen" class:full class:resting={full && playing && resting} bind:this={screenEl} style:--ratio={ratio} role="button" tabindex="0" aria-label={playing ? 'Pause' : 'Play'} onclick={toggle} onpointermove={stir} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), e.stopPropagation(), toggle())}>
		<!-- the picture: the whole screen, or in full screen the film's format as large as fits, black around it -->
		<div class="picture">
			<!-- the film: HyperFrames' player in play's sealed frame (a tap on it lands in the frame, which plays or pauses) -->
			<hyperframes-player bind:this={hf} sandbox-origin="opaque" no-load-timeout disable-click-to-play assets-loading-ui="none"></hyperframes-player>
			<!-- until the film is ready (a live shot's asset building, intent f270269e), the shot's still: its poster -->
			{#if film !== 'ready'}<div class="wait" class:poster={film !== 'failed' && !!shots[index]?.frame} style:background-image={film !== 'failed' && shots[index]?.frame ? `url(${frameUrl(shots[index].frame)})` : null}><span>{#if film === 'failed'}{`The film could not be played: ${failure}`}{:else}{loadingText}{/if}</span></div>{/if}
			{#if !playing}<span class="play-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span>{/if}
		</div>
		{#if full}
			<!-- the bar's own presses and keys stay its own: they never reach the picture, which would play or pause again -->
			<div class="full-bar" role="toolbar" tabindex="-1" aria-label="Playback" onclick={(e) => e.stopPropagation()} onpointerdown={(e) => e.stopPropagation()} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && e.stopPropagation()}>
				<button type="button" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Pause' : t >= D - 0.01 ? 'Replay' : 'Play'}</button>
				<span class="full-time">{clock(t)} <span>/ {clock(D)}</span></span>
				<div class="full-line" bind:this={barLine} role="slider" tabindex="-1" aria-label="Time" aria-valuemin={0} aria-valuemax={Math.round(D)} aria-valuenow={Math.round(t)}
					onpointerdown={(e) => (barLine!.setPointerCapture(e.pointerId), (barDragging = true), barSeek(e))}
					onpointermove={(e) => barDragging && barSeek(e)}
					onpointerup={() => (barDragging = false)}
					onpointercancel={() => (barDragging = false)}>
					<span style:width={pct(t)}></span>
				</div>
				<button type="button" onclick={() => void exitFull()} aria-label="Leave full screen" title="Leave full screen (Esc)">Exit</button>
			</div>
		{/if}
	</div>
	<aside class="details">
		{#if side}<div class="p-side">{@render side()}</div>{/if}
		<p class="beat">
			<span class="badge" style:background={colourOf(note?.section ?? '')}>{note?.section || '—'}</span>
			{#if shots.length}<span class="muted">Shot {Math.max(1, index + 1)} of {shots.length}</span>{/if}
			{#if note?.mood}<span class="mood">{note.mood}</span>{/if}
		</p>
		{#if inLink}
			<div class="field"><b>Linked story</b><p><a class="in-link" href={linkHref(inLink)}>{linkName(inLink)}</a>{#if newerOf(inLink)}<span class="muted">{` · v${newerOf(inLink)} available`}</span>{/if}</p></div>
		{/if}
		{#if note?.emotion}<div class="field"><b>Emotion</b><p class="emotion">{note.emotion}</p></div>{/if}
		{#if note?.camera}<div class="field"><b>Camera</b><p>{note.camera}</p></div>{/if}
		{#if shot?.transition}<div class="field"><b>Transition</b><p>{shot.transition}</p></div>{/if}
		{#if note?.retention}<div class="field"><b>Retention</b><p>{note.retention}</p></div>{/if}
		{#if note?.pace}<div class="field"><b>Pace</b><p>{note.pace}</p></div>{/if}
		{#if soundNow.length || note?.sound}
			<div class="field">
				<b>Sound</b>
				{#if note?.sound}<p>{note.sound}</p>{/if}
				{#each soundNow as s, i (i)}<p><span class="kind">{s.track}{s.planned ? ' (to make)' : ''}</span> {s.text}</p>{/each}
			</div>
		{/if}
	</aside>

	<div class="controls">
		<button class="btn small" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'Pause' : t >= D - 0.01 ? 'Replay' : 'Play'}</button>
		<button class="btn small ghost" onclick={() => step(-1)} aria-label="Previous shot">‹</button>
		<button class="btn small ghost" onclick={() => step(1)} aria-label="Next shot">›</button>
		<span class="time">{clock(t)} <span class="muted">/ {clock(D)}</span></span>
		<span class="spacer"></span>
		<button class="btn small ghost" onclick={() => (speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} title="Speed">{speed}×</button>
		{#if sounding}
			<button class="btn small ghost" class:on={soundOn} onclick={() => (soundOn = !soundOn)} title="The story's own sound: its voice takes, music and effects">Sound {soundOn ? 'on' : 'off'}</button>
		{/if}
		<button class="btn small ghost" onclick={toggleFull} title="Full screen: the picture alone, on the whole screen (F)">Full screen</button>
		{#if unrecorded}
			<button class="btn small ghost" class:on={voiceOn} onclick={() => (voiceOn = !voiceOn)} title="Read each line that has no take yet aloud with the browser's voice">Voice {voiceOn ? 'on' : 'off'}</button>
		{/if}
	</div>

	<StoryTimeline {story} {t} {D} {shots} {index} {voices} {voice} {unrecorded} {slots} {inLink} {soundTracks} {seek} bind:dragging />
</div>

<style>
	/* the frame in the middle, what the editor reads beside it on the right (Samuel 2026-11-03), the controls and the
	   timeline across the whole width below */
	.player { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(16rem, 1fr); grid-template-areas: '. screen side' 'ctl ctl ctl' 'tl tl tl'; column-gap: 1rem; row-gap: 0.7rem; align-items: start; min-width: 0; container-type: inline-size; }
	.screen { grid-area: screen; }
	.details { grid-area: side; }
	.controls { grid-area: ctl; }
	/* with a page's list and rail (Samuel 2026-11-04): the list on the left only as tall as the picture, the picture larger
	   in the middle, a thin rail on the right with the version picker and the notes, the timeline across everything */
	.framed { grid-template-columns: 10rem minmax(0, 1fr) 13.5rem; grid-template-areas: 'list head side' 'list screen side' 'ctl ctl ctl' 'tl tl tl'; column-gap: 0.9rem; }
	.p-list { grid-area: list; }
	.p-head { grid-area: head; min-width: 0; }
	/* the list and the rail fill the rows the title and the picture make and scroll inside them, never stretching them */
	.framed .p-list, .framed .details { align-self: stretch; contain: size; overflow: auto; overscroll-behavior: contain; }
	.framed .screen { justify-self: center; --h: min(var(--story-screen, clamp(15rem, calc(100vh - 14.7rem - var(--tl)), 760px)), calc((100cqw - 25.5rem) / var(--ratio))); }
	/* the rail's last lines fade out where it scrolls on, and scroll clear of the fade */
	.framed .details { gap: 0.5rem; padding: 0 0.15rem 1.6rem 0; mask-image: linear-gradient(to bottom, #000 calc(100% - 1.6rem), transparent); }
	.framed .field p { font-size: 0.84rem; line-height: 1.38; }
	.p-side { display: grid; gap: 0.5rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--line); }
	/* the frame as tall as leaves the controls and the timeline in view above the nav pill (a page may say otherwise) */
	/* its width worked out from its height: a box sized to the frame (container-type: size), and a box
	   contained that way has no width of its own to give a grid column (it collapsed to nothing) */
	.screen { position: relative; --h: min(var(--story-screen, clamp(15rem, calc(100vh - 11.5rem - var(--tl)), 660px)), calc((100cqw - 20rem) / var(--ratio))); height: var(--h); width: calc(var(--h) * var(--ratio)); max-width: 100%; border-radius: 14px; overflow: hidden; background: #15130f; box-shadow: var(--shadow); user-select: none; }
	/* the picture's layers, sized to it (container-type: size: the play mark scales with the picture) */
	.picture { position: absolute; inset: 0; overflow: hidden; container-type: size; }
	/* full screen: the whole screen black, the picture the film's format as large as fits in the middle of it */
	.screen.full { position: fixed; inset: 0; z-index: 2000; width: 100vw; height: 100vh; height: 100dvh; max-width: none; border-radius: 0; background: #000; box-shadow: none; }
	.full .picture { inset: auto; left: 50%; top: 50%; width: min(100vw, 100dvh * var(--ratio)); height: min(100dvh, 100vw / var(--ratio)); transform: translate(-50%, -50%); }
	.screen.resting { cursor: none; }
	/* the window filled without the browser's full screen: the player is no container then, which would hold the fixed
	   screen inside it (a container contains its layout) */
	.player.windowed { container-type: normal; }
	.full-bar { position: absolute; z-index: 6; left: 50%; bottom: max(1rem, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(44rem, calc(100% - 2rem)); display: flex; align-items: center; gap: 0.8rem; padding: 0.55rem 0.8rem; border-radius: 14px; background: rgb(20 18 14 / 0.72); backdrop-filter: blur(8px); color: #f3efe6; cursor: default; transition: opacity 0.3s; }
	.resting .full-bar { opacity: 0; pointer-events: none; }
	.full-bar button { border: 1px solid rgb(255 255 255 / 0.25); background: rgb(255 255 255 / 0.08); color: inherit; font: inherit; font-size: 0.85rem; font-weight: 600; padding: 0.3rem 0.75rem; border-radius: 9px; cursor: pointer; }
	.full-time { font-variant-numeric: tabular-nums; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
	.full-time span { opacity: 0.6; }
	.full-line { flex: 1; height: 1.4rem; position: relative; cursor: pointer; touch-action: none; }
	.full-line::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 4px; transform: translateY(-50%); border-radius: 2px; background: rgb(255 255 255 / 0.22); }
	.full-line span { position: absolute; left: 0; top: 50%; height: 4px; transform: translateY(-50%); border-radius: 2px; background: #efb54d; }
	.compact .screen { --h: min(var(--story-screen, clamp(14rem, calc(100vh - 12rem - var(--tl)), 520px)), calc((100cqw - 20rem) / var(--ratio))); }
	.screen { cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
	.screen:focus-visible { outline: 3px solid var(--terracotta, #c96f53); outline-offset: 3px; }
	/* paused: a quiet play mark in the middle of the picture, gone the moment it plays */
	/* HyperFrames' player, the film's picture and sound, filling the picture; a word over it until the film is in */
	.picture hyperframes-player { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
	.wait { position: absolute; z-index: 5; inset: 0; display: grid; place-items: center; padding: 1rem; text-align: center; color: #cfc8b8; background: #15130f; font-size: 0.9rem; pointer-events: none; }
	.wait.poster { place-items: end center; background-size: cover; background-position: center; }
	.wait.poster span { margin-bottom: 1rem; padding: 0.25rem 0.6rem; border-radius: 999px; background: rgb(10 10 8 / 0.55); color: #f3eee2; font-size: 0.8rem; }
	.play-mark { position: absolute; z-index: 4; left: 50%; top: 46%; width: clamp(2.6rem, 16cqw, 4.5rem); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: rgb(10 10 8 / 0.45); display: grid; place-items: center; pointer-events: none; }
	.play-mark svg { width: 55%; height: 55%; fill: #fff; margin-left: 8%; }
	.details { display: grid; gap: 0.6rem; align-content: start; min-width: 0; }
	.beat { margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.badge { font-size: 0.75rem; font-weight: 700; padding: 0.15em 0.6em; border-radius: 999px; color: #1b1b17; }
	.mood { font-weight: 700; color: var(--terracotta, #c96f53); }
	.field b { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
	.field p { margin: 0.15rem 0 0; font-size: 0.92rem; line-height: 1.4; }
	.controls { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
	.controls .time { font-variant-numeric: tabular-nums; font-weight: 600; margin-left: 0.3rem; }
	.controls .spacer { flex: 1; }
	.btn.on { background: var(--ink); color: var(--paper); }
	.field .emotion { font-family: var(--font-display); font-size: 1.05rem; font-style: italic; color: var(--terracotta, #c96f53); }
	.field .kind { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-right: 0.25rem; }
	.in-link { font-weight: 700; color: var(--ink); }
	/* on a phone: the frame, right under it the controls and the timeline, and only then what the editor reads (Samuel
	   2026-11-04: play directly below the view, no prose between) */
	@media (max-width: 820px) {
		.player { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'screen' 'ctl' 'tl' 'side'; }
		.framed { grid-template-areas: 'list' 'head' 'screen' 'ctl' 'tl' 'side'; }
		.framed .p-list, .framed .details { contain: none; overflow: visible; mask-image: none; padding-bottom: 0; }
		.screen, .framed .screen { --h: min(58vh, 560px, calc(100cqw / var(--ratio))); justify-self: center; }
		.compact .screen { --h: min(50vh, 480px, calc(100cqw / var(--ratio))); }
		.details { justify-self: stretch; }
	}
</style>
