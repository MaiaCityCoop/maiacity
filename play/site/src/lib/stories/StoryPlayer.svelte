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
	import { clipAt, clipsOf, clock, cueOf, LINK, linkedOf, moodLevel, sectionsOf, shotEdge, spansOf, type Links, type Notes, type Shot, type StoryBody, type Track, type Voice } from './timeline';
	import { compose, feed, FRAME, seal, VENDOR } from './compose';
	import { hashText } from '$lib/content/game/hash.js';
	import { enginesOf, pathOf } from '$lib/kernel/engines.js';
	import type { Live, LiveAsset, World, WorldAsset } from './live';
	import fontUrl from '../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';

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
	/** the links, each in its place: the story it plays (null: it can't be read), its version's number, its newest */
	type Slot = { clip: string; at: number; duration: number; story: string; title: string | null; number: number | null; newest: number | null };
	const slots = $derived<Slot[]>(
		story.tracks.filter((x) => x.kind === LINK).flatMap((x) => x.clips.map((c) => {
			const l = linkedOf(c, story.links);
			return { clip: `${x.id}/${c.id}`, at: c.at, duration: c.duration, story: l?.id ?? String(c.story ?? ''), title: l?.title ?? null, number: l?.number ?? null, newest: l?.newest ?? null };
		}))
	);
	/** the link playing at t, if any */
	const inLink = $derived(slots.find((s) => t >= s.at - 1e-6 && t < s.at + s.duration));
	/** a link as people read it: the story's title and the version it plays, "Trailer · v3" */
	const linkName = (s: Slot) => (s.title ? `${s.title} · v${s.number}` : 'A story that can no longer be read');
	/** a newer accepted version of the linked story, if there is one: only shown (moving to it is a proposal on this story) */
	const newer = (s: Slot) => (s.newest != null && s.number != null && s.newest > s.number ? s.newest : null);
	/** the Stories page at the linked story (by its UUID), at the version this link plays */
	const linkHref = (s: Slot) => `/stories/#${s.story}${s.number ? `@${s.number}` : ''}`;
	const laneName = (tr: Track) => tr.name ?? tr.id;
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
	const sections = $derived(sectionsOf(story));
	const D = $derived(Math.max(0.001, story?.duration ?? 0));
	const pct = (s: number) => `${(s / D) * 100}%`;
	/** the film's width over its height (9:16 → 0.5625) */
	const ratio = $derived.by(() => {
		const [w, h] = (story?.format ?? '9:16').split(':').map(Number);
		return w > 0 && h > 0 ? w / h : 9 / 16;
	});
	const frameUrl = (h: string | null | undefined) => (h ? `/api/files/${h}` : '');

	// ---- the one engine: HyperFrames' player, its frame play's
	let hf = $state<any>();
	let upgraded = $state(false);
	/** where the frame's files come from: HyperFrames' runtime and GSAP (their text, fetched when a film first plays) and
	 *  the font come with the site, the rest are play's files */
	const CODE: Record<string, () => Promise<{ default: string }>> = {
		[VENDOR.runtime.hash]: () => import('../../../node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js?raw'),
		[VENDOR.gsap.hash]: () => import('../../../node_modules/gsap/dist/gsap.min.js?raw')
	};
	/** a live shot's code the site serves (intent f270269e), held to its hash by feed: the frozen box engines, as every
	 *  asset viewer loads them, and the live runtime, frozen beside them (scripts/live-runtime.ts --check rebuilds it) */
	const ENGINES: Record<string, string> = { ...Object.fromEntries(enginesOf('box').map((e: { v: number; blake3: string }) => [e.blake3, pathOf('box', e.v)])), [VENDOR.live.hash]: '/live/live-runtime.js' };
	const fileOf = (h: string): Promise<Blob> =>
		CODE[h] ? CODE[h]().then((m) => new Blob([m.default])) : fetch(h === VENDOR.font.hash ? fontUrl : ENGINES[h] ?? frameUrl(h), { credentials: 'same-origin' }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`file ${h.slice(0, 10)}…: ${r.status}`))));
	/** what play knows of each asset version a live shot draws (GET /api/assets/<its UUID>): its recipe, pieces and engine */
	async function liveAssets(bodies: StoryBody[]): Promise<Record<string, LiveAsset>> {
		const lives = bodies.flatMap((b) => clipsOf<Shot>(b, 'shots')).map((x) => x.live as Live | undefined).filter((l): l is Live => !!l && typeof l.asset === 'string');
		const out: Record<string, LiveAsset> = {};
		await Promise.all([...new Set(lives.map((l) => l.asset))].map(async (id) => {
			const r = await fetch(`/api/assets/${encodeURIComponent(id)}`, { credentials: 'same-origin' }).catch(() => null);
			if (!r?.ok) return;
			const a = await r.json();
			const pieces = (v: any) => (Array.isArray(v?.pieces) ? v.pieces.map((p: any) => (typeof p === 'string' ? p : p?.hash)).filter((p: unknown) => typeof p === 'string') : []);
			for (const v of a.versions ?? [])
				if (v.recipe || v.variants?.length)
					out[v.id] = { asset: id, version: v.id, recipe: v.recipe ?? v.variants.find((x: any) => x.name === v.defaultVariant)?.recipe, pieces: pieces(v), engine: v.engine ?? 1, variants: Object.fromEntries((v.variants ?? []).map((x: any) => [x.name, { recipe: x.recipe, pieces: pieces(v) }])) };
		}));
		return out;
	}
	/** a file of play's as text, held to its hash */
	const fileText = (h: string) => fetch(frameUrl(h), { credentials: 'same-origin' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`file ${h.slice(0, 10)}…: ${r.status}`)))).then((text) => (hashText(text) === h ? text : Promise.reject(new Error(`file ${h.slice(0, 10)}… does not hash to its name`))));
	/** every piece a recipe's code requires, to any depth (../content/assets/box/pieces.js MOST_DEEP) */
	async function piecesDeep(code: string, depth = 0, seen = new Set<string>()): Promise<string[]> {
		const { piecesOf, MOST_DEEP } = await import('$lib/content/assets/box/pieces.js');
		if (depth >= MOST_DEEP) return [...seen];
		for (const h of piecesOf(code) as string[]) if (!seen.has(h)) seen.add(h), await piecesDeep(await fileText(h), depth + 1, seen);
		return [...seen];
	}
	/** what play knows of each world version a world shot plays (intent 65d04790; GET /api/assets/<its UUID>): its recipe,
	 *  pieces and engine, and the guests it plants, read off its build made once here in the page's own box */
	async function worldAssets(bodies: StoryBody[]): Promise<Record<string, WorldAsset>> {
		const worlds = bodies.flatMap((b) => clipsOf<Shot>(b, 'shots')).map((x) => x.world as World | undefined).filter((w): w is World => !!w && typeof w.asset === 'string' && typeof w.version === 'string');
		const out: Record<string, WorldAsset> = {};
		const once = new Map(worlds.map((w) => [w.version, w]));
		await Promise.all([...once.values()].map(async (w) => {
			try {
				loading = 'Reading the world';
				const r = await fetch(`/api/assets/${encodeURIComponent(w.asset)}`, { credentials: 'same-origin' });
				if (!r.ok) return;
				const v = ((await r.json()).versions ?? []).find((x: any) => x.id === w.version);
				if (!v?.recipe) return;
				const code = await fileText(v.recipe), pieces = await piecesDeep(code), engine = v.engine ?? 1;
				const [{ boxOf }, { rebuild }, { plantingsOf }] = await Promise.all([import('$lib/content/assets/load.js'), import('$lib/content/assets/box/rebuild.js'), import('$lib/content/assets/uses.js')]);
				const m = await boxOf(engine).build({ hash: v.recipe, code, pieces }, {});
				const guests: Record<string, string[]> = {};
				const kinds = [...new Set(plantingsOf(rebuild(m.data)).map((u: { ref: string }) => u.ref.slice(0, 64)))] as string[];
				let read = 0;
				await Promise.all(kinds.map(async (g) => {
					guests[g] = await piecesDeep(await fileText(g)).catch(() => []);
					loading = `Reading its guests: ${++read} of ${kinds.length}`;
				}));
				out[w.version] = { asset: w.asset, version: w.version, recipe: v.recipe, pieces, engine, guests };
			} catch (e) {
				console.warn(`world ${w.asset.slice(0, 8)}: ${(e as Error)?.message ?? e}`);
			}
		}));
		return out;
	}
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
		const want = [...new Set([s, ...Object.values(links).map((l) => l.body)].filter(Boolean).flatMap((b) => clipsOf<Shot>(b, 'shots')).map((x) => x.composition).filter((h): h is string => typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)))];
		const got = await Promise.all(want.map((h) => fetch(frameUrl(h)).then((r) => (r.ok ? r.text() : '')).then((text) => (hashText(text) === h ? [[h, text]] : [])).catch(() => [])));
		const bodies = [s, ...Object.values(links).map((l) => l.body)].filter(Boolean) as StoryBody[];
		const [assets, worlds] = await Promise.all([liveAssets(bodies), worldAssets(bodies)]);
		if (made !== key) return;
		film = 'loading';
		try {
			hf.setAttribute('srcdoc', seal(compose(s, links, Object.fromEntries(got.flat()), assets, worlds)));
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
	const fsElement = () => document.fullscreenElement ?? (document as any).webkitFullscreenElement ?? null;
	async function enterFull() {
		const el = screenEl as any;
		const ask = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
		if (ask && (document.fullscreenEnabled || (document as any).webkitFullscreenEnabled)) {
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
		if (fsElement()) await (document.exitFullscreen ?? (document as any).webkitExitFullscreen)?.call(document);
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

	// scrubbing: a press on the timeline puts the playhead there, and dragging moves it. The lanes scroll up and down
	// inside it (a wheel or a vertical swipe), so a touch scrubs only once it moves sideways, and a tap seeks
	let lanes: HTMLElement | undefined = $state();
	let dragging = $state(false);
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

	// a calm colour for each section, the same every time
	const PALETTE = ['#8fae8b', '#d9a441', '#c96f53', '#7c9cb8', '#a98bb5', '#6f9e95', '#c4a27a', '#9aa35c'];
	const colourOf = (s: string) => PALETTE[[...(s ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
	const sectionOf = (time: number) => clipAt<Notes>(story, 'notes', time)?.section ?? '';

	// the mood: a line through each note's mood, rising and falling with the story (a linked story's inside its link)
	const moodPath = $derived.by(() => {
		const spans = spansOf<Notes>(story, 'notes');
		if (!spans.length) return '';
		const pts = spans.map((n) => [((n.at + n.end) / 2 / D) * 1000, 30 - moodLevel(n.clip.mood) * 8]);
		return 'M' + [[0, pts[0][1]], ...pts, [1000, pts[pts.length - 1][1]]].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
	});
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
			<div class="field"><b>Linked story</b><p><a class="in-link" href={linkHref(inLink)}>{linkName(inLink)}</a>{#if newer(inLink)}<span class="muted">{` · v${newer(inLink)} available`}</span>{/if}</p></div>
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
						{@const later = newer(s)}
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
						<span class="seg" class:on={i === index} style:left={pct(s.at)} style:width={pct(s.duration)} style:background-image={s.frame ? `url(${frameUrl(s.frame)})` : 'none'} style:border-top-color={colourOf(sectionOf(s.at + 0.01))} title="Shot {i + 1}{s.composition ? ' · motion' : s.video ? ' · video' : ''}"></span>
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
						<span class="bar sound {tr.kind}" class:muted-track={(tr as any).mute} class:planned={typeof c.audio !== 'string'} style:left={pct(c.at)} style:width={pct(c.duration)} title="{laneName(tr)}: {cueOf(c) || c.id}">{typeof c.audio === 'string' ? tr.name ?? tr.id : cueOf(c)}</span>
					{/each}
				</div>
			{/each}
			</div>
			<div class="playhead" style:left={pct(t)}></div>
		</div>
	</div>
</div>

<style>
	/* the frame in the middle, what the editor reads beside it on the right (Samuel 2026-11-03), the controls and the
	   timeline across the whole width below */
	.player { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(16rem, 1fr); grid-template-areas: '. screen side' 'ctl ctl ctl' 'tl tl tl'; column-gap: 1rem; row-gap: 0.7rem; align-items: start; min-width: 0; container-type: inline-size; }
	.screen { grid-area: screen; }
	.details { grid-area: side; }
	.controls { grid-area: ctl; }
	.timeline { grid-area: tl; min-width: 0; }
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
	.timeline { display: grid; gap: 0.25rem; }
	.sections { position: relative; height: 1.3rem; }
	/* a section: its name, and beside it the primary emotion it should leave the viewer with, on one line */
	.section { position: absolute; top: 0; bottom: 0; display: flex; align-items: baseline; gap: 0.3rem; border-top: 3px solid; padding-top: 0.1rem; padding-left: 0.2rem; overflow: hidden; color: var(--ink-soft, #444); box-sizing: border-box; }
	.section b, .section em { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.section b { font-size: 0.62rem; font-weight: 700; flex: none; max-width: 100%; }
	.section em { font-size: 0.64rem; font-style: italic; min-width: 0; color: var(--terracotta, #c96f53); }
	.field .emotion { font-family: var(--font-display); font-size: 1.05rem; font-style: italic; color: var(--terracotta, #c96f53); }
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
	.compact .shots-lane { height: 1.8rem; }
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
	.field .kind { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-right: 0.25rem; }
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
