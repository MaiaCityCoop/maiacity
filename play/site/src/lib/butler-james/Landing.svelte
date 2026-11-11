<!--
	BUTLER JAMES'S LANDING PAGE (intent 42a96129; play/SPEC.md §8): the offer of walkable 3D worlds of apartments and
	houses, after Hormozi's Grand Slam Offer: outcome, certainty, time and effort; the flat prices and their calculator;
	the guarantee and the 24 hours as sections of their own; the steps; the demo slots; the objections; and the call to
	action throughout. In Butler James's own brand (./brand.ts), German, and self-contained: it takes nothing from play
	but the shell it scrolls in, so it can move to a home of its own.
-->
<script lang="ts">
	import './fonts/faces.css';
	import './landing.css';
	import { cssVars } from './brand';
	import { COPY } from './copy';
	import Closing from './Closing.svelte';
	import Cta from './Cta.svelte';
	import Faq from './Faq.svelte';
	import Gallery from './Gallery.svelte';
	import Guarantee from './Guarantee.svelte';
	import Hero from './Hero.svelte';
	import Mark from './Mark.svelte';
	import Offer from './Offer.svelte';
	import Speed from './Speed.svelte';
	import Steps from './Steps.svelte';
</script>

<svelte:head><title>{COPY.brand} · {COPY.hero.eyebrow}</title></svelte:head>

<div class="bj" lang="de" style={cssVars()} data-butler-james>
	<header class="bj-top">
		<Mark />
		<nav aria-label={COPY.brand}>
			<a href="#angebot">{COPY.nav.offer}</a>
			<a href="#ablauf">{COPY.nav.steps}</a>
			<a href="#demos">{COPY.nav.demos}</a>
			<a href="#fragen">{COPY.nav.faq}</a>
		</nav>
		<Cta quiet short />
	</header>
	<main>
		<Hero />
		<Offer />
		<Guarantee />
		<Speed />
		<Steps />
		<Gallery />
		<Faq />
		<Closing />
	</main>
	<div class="bj-sticky" data-sticky><Cta /></div>
</div>
