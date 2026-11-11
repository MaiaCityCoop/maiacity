<!--
	The banner (intent 42a96129): the headline of outcome, speed and risk reversal, the call to action, and a live
	placeholder world. The world (./scene/apartment.ts, three.js) is asked for only once the page has loaded and the
	banner is near the screen; it rests out of view; with prefers-reduced-motion it stands still; and where the browser
	gives no 3D (no WebGPU and no WebGL 2) the drawn still below stays. The still is also what shows until the world's first frame.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { COPY } from './copy';
	import Cta from './Cta.svelte';
	import type { Apartment } from './scene/apartment';

	const c = COPY.hero;
	let stage: HTMLElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	let live = $state(false);

	onMount(() => {
		let world: Apartment | undefined, gone = false, asked = false;
		const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		async function start() {
			if (asked || gone) return;
			asked = true;
			// never in the way of the page itself: after its load
			if (document.readyState !== 'complete') await new Promise((r) => addEventListener('load', r, { once: true }));
			const started = performance.now();
			try {
				const { mount } = await import('./scene/apartment');
				if (gone || !canvas) return;
				const made = await mount(canvas, { still, started });
				if (gone) return made.dispose();
				world = made;
				world.setVisible(seen);
				live = true;
			} catch {
				// no WebGPU and no WebGL 2, or the chunk did not come: the still stays
				live = false;
			}
		}
		let seen = false;
		const near = new IntersectionObserver(
			(entries) => {
				seen = entries.some((e) => e.isIntersecting);
				if (seen) start();
				world?.setVisible(seen);
			},
			{ rootMargin: '200px' }
		);
		if (stage) near.observe(stage);
		return () => {
			gone = true;
			near.disconnect();
			world?.dispose();
		};
	});
</script>

<section class="bj-hero" data-section="hero">
	<div class="bj-hero-text">
		<p class="bj-eyebrow">{c.eyebrow}</p>
		<h1>{c.title}</h1>
		<p class="bj-lead">{c.lead}</p>
		<div class="bj-hero-actions">
			<Cta note />
			<a class="bj-link" href="#angebot">{c.second}</a>
		</div>
		<ul class="bj-promises">
			{#each c.promises as p}<li>{p}</li>{/each}
		</ul>
	</div>
	<figure class="bj-stage" bind:this={stage} data-live={live}>
		<svg class="bj-still" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label={c.sceneStill}>
			<rect class="s-wall" width="800" height="600" />
			<polygon class="s-side" points="0,0 150,90 150,430 0,600" />
			<polygon class="s-side" points="800,0 650,90 650,430 800,600" />
			<polygon class="s-floor" points="0,600 150,430 650,430 800,600" />
			<polygon class="s-ceil" points="0,0 150,90 650,90 800,0" />
			<rect class="s-sky" x="230" y="140" width="300" height="200" />
			<path class="s-frame" d="M230 140h300v200h-300zM330 140v200M430 140v200" />
			<polygon class="s-sun" points="250,440 520,440 640,560 200,560" />
			<rect class="s-sofa" x="215" y="372" width="250" height="62" rx="8" />
			<rect class="s-sofa" x="215" y="345" width="250" height="40" rx="8" />
			<rect class="s-table" x="290" y="462" width="150" height="14" rx="3" />
			<path class="s-lamp" d="M180 430v-150M160 280h40l-8-34h-24z" />
		</svg>
		<canvas bind:this={canvas} class:live aria-hidden={!live}></canvas>
		<figcaption>
			<span class="bj-stage-tags"><b data-scene-label>{c.sceneLabel}</b>{#if live}<span>{c.sceneHint}</span>{/if}</span>
			<span class="bj-stage-note">{c.sceneNote}</span>
		</figcaption>
	</figure>
</section>
