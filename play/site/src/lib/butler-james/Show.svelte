<!--
	THE SHOW (intent 42a96129): one 3D apartment on a canvas that fills the screen and stays in place while four chapters
	scroll over it, each telling a part of the offer with the apartment itself: finished (the hero), sunk into its floor
	plan (all we need: a photo of every room and the plan), built up again (what we do), walked into (what a buyer gets).
	The scroll is handed to the world (./scene/apartment.ts) as 0..1.

	The world is asked for only once the page has loaded; it rests out of view; with prefers-reduced-motion it makes no
	motion of its own; and where the browser gives no 3D (no WebGPU and no WebGL 2) the drawn plan below stays.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { COPY } from './copy';
	import Cta from './Cta.svelte';
	import Risk from './Risk.svelte';
	import { scrollerOf } from './motion';
	import type { Apartment, RoomId } from './scene/apartment';

	const c = COPY;
	const rooms = Object.keys(c.scene.rooms) as RoomId[];
	let show: HTMLElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let live = $state(false);
	let evening = $state(false);
	let room: { id: RoomId; x: number; y: number } | null = $state(null);
	let world: Apartment | undefined;

	$effect(() => world?.setEvening(evening));
	/** a room lit from the page: the cards of the photos name the rooms */
	let light: (id: RoomId) => void = $state(() => {});

	onMount(() => {
		let gone = false, asked = false, seen = false;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const scroller = scrollerOf(show!);
		const target: HTMLElement | Window = scroller === document.scrollingElement ? window : scroller;
		/** how far the show is scrolled: 0 at its top, 1 when its last chapter fills the screen */
		const scrolled = () => {
			const r = show!.getBoundingClientRect(), top = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
			const way = r.height - scroller.clientHeight;
			return way > 0 ? Math.min(1, Math.max(0, (top - r.top) / way)) : 0;
		};
		const onScroll = () => {
			const p = scrolled();
			show!.style.setProperty('--bj-show', p.toFixed(4));
			world?.setScroll(p);
		};
		target.addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);

		async function start() {
			if (asked || gone) return;
			asked = true;
			// never in the way of the page itself: after its load
			if (document.readyState !== 'complete') await new Promise((r) => addEventListener('load', r, { once: true }));
			const started = performance.now();
			try {
				const { mount } = await import('./scene/apartment');
				if (gone || !canvas) return;
				const made = await mount(canvas, { still, started, onRoom: (r) => (room = r) });
				if (gone) return made.dispose();
				world = made;
				world.setScroll(scrolled());
				world.setEvening(evening);
				world.setVisible(seen);
				light = (id) => canvas?.dispatchEvent(new CustomEvent('bj-room', { detail: id }));
				live = true;
			} catch {
				// no WebGPU and no WebGL 2, or the chunk did not come: the still stays
				live = false;
			}
		}
		const near = new IntersectionObserver(
			(entries) => {
				seen = entries.some((e) => e.isIntersecting);
				if (seen) start();
				world?.setVisible(seen);
			},
			{ root: scroller === document.scrollingElement ? null : scroller }
		);
		near.observe(show!);
		onScroll();
		return () => {
			gone = true;
			near.disconnect();
			target.removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
			world?.dispose();
		};
	});
</script>

<div class="bj-show" bind:this={show}>
	<div class="bj-stage" data-live={live}>
		<svg class="bj-still" viewBox="0 0 1000 700" preserveAspectRatio="xMaxYMid meet" role="img" aria-label={c.scene.still}>
			<g transform="translate(420 185) scale(48)">
				<path class="s-plan" d="M0 0h10v7h-10zM0 4h1.7M2.6 4h2.5M5.9 4h2.1M8.9 4h1.1M6 0v1.3M6 3.1v0.9M4.5 4v3M7 4v3" />
				<path class="s-fine" d="M1 0h2.5M7.2 0h1.8M1.2 7h2M10 5v0.9" />
			</g>
		</svg>
		<canvas bind:this={canvas} class:live aria-hidden="true"></canvas>
		<div class="bj-stage-ui">
			<p class="bj-stage-tags"><b data-scene-label>{c.scene.label}</b>{#if live}<span>{c.scene.hint}</span>{/if}</p>
			{#if live}
				<div class="bj-light" role="group" aria-label={c.scene.light}>
					<button type="button" aria-pressed={!evening} onclick={() => (evening = false)}>{c.scene.day}</button>
					<button type="button" aria-pressed={evening} data-evening onclick={() => (evening = true)}>{c.scene.evening}</button>
				</div>
				{#if room}<span class="bj-room" data-room-label style="left:{room.x}px;top:{room.y}px">{c.scene.rooms[room.id]}</span>{/if}
			{/if}
		</div>
	</div>

	<div class="bj-chapters">
		<section class="bj-chapter first" data-section="hero">
			<div class="bj-copy">
				<p class="bj-eyebrow">{c.hero.eyebrow}</p>
				<h1>{#each c.hero.title as line, i}<span style="--bj-line:{i}">{line}</span>{/each}</h1>
				<p class="bj-lead">{c.hero.lead}</p>
				<div class="bj-hero-actions">
					<Cta />
					<a class="bj-link" href="#test">{c.hero.second}</a>
				</div>
				<Risk />
			</div>
			<p class="bj-scroll" aria-hidden="true"><i></i>{c.hero.scroll}</p>
		</section>

		<section class="bj-chapter" id="aufwand" data-section="need">
			<div class="bj-copy">
				<p class="bj-eyebrow">{c.need.eyebrow}</p>
				<h2 class="bj-need">
					<span class="quiet">{c.need.title}</span>
					{#each c.need.items as item}<span>{item}</span>{/each}
					<em>{c.need.punch}</em>
				</h2>
				<p class="bj-lead">{c.need.text}</p>
				<ul class="bj-cards">
					{#each rooms as id, i}
						<li style="--bj-card:{i}">
							<button type="button" data-card={id} onclick={() => light(id)}>
								<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="12" cy="12" r="3.4" /><path d="M7.5 5l1.2-1.8h6.6L16.5 5" /></svg>
								<small>{c.need.photo}</small><b>{c.scene.rooms[id]}</b>
							</button>
						</li>
					{/each}
					<li class="plan" style="--bj-card:{rooms.length}">
						<span>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v16H3zM3 12h6M12 12h9M12 4v4M9 12v8" /></svg>
							<small>&nbsp;</small><b>{c.need.plan}</b>
						</span>
					</li>
				</ul>
			</div>
		</section>

		<section class="bj-chapter" data-section="build">
			<div class="bj-copy">
				<p class="bj-eyebrow">{c.build.eyebrow}</p>
				<h2>{c.build.title}</h2>
				<p class="bj-lead">{c.build.text}</p>
			</div>
		</section>

		<section class="bj-chapter" data-section="walk">
			<div class="bj-copy">
				<p class="bj-eyebrow">{c.walk.eyebrow}</p>
				<h2>{c.walk.title}</h2>
				<p class="bj-lead">{c.walk.text}</p>
				<Cta />
				<p class="bj-note">{c.scene.note}</p>
			</div>
		</section>
	</div>
</div>
